import { ErrorCode, HttpStatus } from '@/lib/constants'

// Custom error classes with HTTP status codes

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
    public isOperational: boolean = true,
    public code?: string
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: any) {
    super(message, HttpStatus.BAD_REQUEST, true, ErrorCode.VALIDATION_ERROR)
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, HttpStatus.UNAUTHORIZED, true, ErrorCode.AUTHENTICATION_ERROR)
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, HttpStatus.FORBIDDEN, true, ErrorCode.AUTHORIZATION_ERROR)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, HttpStatus.NOT_FOUND, true, ErrorCode.NOT_FOUND)
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, HttpStatus.TOO_MANY_REQUESTS, true, ErrorCode.RATE_LIMIT_ERROR)
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, originalError?: Error) {
    super(`${service} service error: ${originalError?.message || 'Unknown error'}`, HttpStatus.BAD_GATEWAY, true, ErrorCode.EXTERNAL_SERVICE_ERROR)
  }
}

// Returns safe error messages (hides internal details in production)
export function getClientErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message
  }
  
  if (error instanceof Error) {
    if (process.env.NODE_ENV === 'production') {
      return 'An unexpected error occurred'
    }
    return error.message
  }
  
  return 'An unexpected error occurred'
}

export function getStatusCode(error: unknown): number {
  if (error instanceof AppError) {
    return error.statusCode
  }
  return HttpStatus.INTERNAL_SERVER_ERROR
}
