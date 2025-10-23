import { z } from 'zod'
import { VALIDATION_LIMITS } from '@/lib/constants'

// API request validation schemas

export const analyzeCompanySchema = z.object({
  domain: z
    .string()
    .min(VALIDATION_LIMITS.DOMAIN_MIN_LENGTH, `Domain must be at least ${VALIDATION_LIMITS.DOMAIN_MIN_LENGTH} characters`)
    .max(VALIDATION_LIMITS.DOMAIN_MAX_LENGTH, `Domain must be less than ${VALIDATION_LIMITS.DOMAIN_MAX_LENGTH} characters`)
    .transform(domain => 
      domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
    )
    .pipe(
      z.string().regex(
        /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i,
        'Invalid domain format'
      )
    ),
})

export const qualifyProspectsSchema = z.object({
  icpId: z
    .string()
    .uuid('Invalid ICP ID format'),
  domains: z
    .array(
      z.string().min(VALIDATION_LIMITS.DOMAIN_MIN_LENGTH, `Domain must be at least ${VALIDATION_LIMITS.DOMAIN_MIN_LENGTH} characters`)
    )
    .min(1, 'At least one domain is required')
    .max(VALIDATION_LIMITS.MAX_DOMAINS_PER_REQUEST, `Maximum ${VALIDATION_LIMITS.MAX_DOMAINS_PER_REQUEST} domains allowed per request`),
})

export type AnalyzeCompanyInput = z.infer<typeof analyzeCompanySchema>
export type QualifyProspectsInput = z.infer<typeof qualifyProspectsSchema>
