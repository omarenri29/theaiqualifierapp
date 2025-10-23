import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { AuthenticationError, getClientErrorMessage, getStatusCode } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { HttpStatus } from '@/lib/constants'
import { ZodSchema } from 'zod'

export interface AuthenticatedRequest extends NextApiRequest {
  userId: string
  token: string
}

// Auth middleware - checks JWT token and adds userId to request
export function withAuth(handler: any) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '')
      if (!token) {
        throw new AuthenticationError('No authorization token provided')
      }

      const supabase = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          global: {
            headers: { Authorization: `Bearer ${token}` }
          }
        }
      )

      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      
      if (authError || !user) {
        throw new AuthenticationError('Invalid or expired token')
      }

      const authReq = req as AuthenticatedRequest
      authReq.userId = user.id
      authReq.token = token

      await handler(authReq, res)
    } catch (error) {
      logger.error('Authentication error', error, {
        path: req.url,
        method: req.method,
      })
      
      const statusCode = getStatusCode(error)
      const message = getClientErrorMessage(error)
      
      res.status(statusCode).json({ error: message })
    }
  }
}

// Validates request body against a Zod schema
export function withValidation<T>(schema: ZodSchema<T>) {
  return (handler: any) => {
    return async (req: any, res: NextApiResponse) => {
      try {
        const validatedBody = schema.parse(req.body)
        req.validatedBody = validatedBody
        await handler(req, res)
      } catch (error) {
        logger.error('Validation error', error, {
          path: req.url,
          method: req.method,
          body: req.body,
        })
        
        const statusCode = getStatusCode(error)
        const message = getClientErrorMessage(error)
        
        res.status(statusCode).json({ error: message })
      }
    }
  }
}

// Checks HTTP method (GET, POST, etc.)
export function withMethod(method: string | string[]) {
  return (handler: any) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      const methods = Array.isArray(method) ? method : [method]
      
      if (!methods.includes(req.method || '')) {
        return res.status(HttpStatus.METHOD_NOT_ALLOWED).json({ error: 'Method not allowed' })
      }

      await handler(req, res)
    }
  }
}

// Chains middleware functions together
export function compose(...middlewares: Array<(handler: any) => any>) {
  return (handler: any) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler)
  }
}
