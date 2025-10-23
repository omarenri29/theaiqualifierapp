// Enums
export enum FitLevel {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  MODERATE = 'moderate',
  POOR = 'poor',
}

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}

export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
}

// API and Service Configuration
export const OPENAI_CONFIG = {
  MODEL: 'gpt-4-turbo-preview',
  TEMPERATURE: 0.7,
  TIMEOUT_MS: 30000,
} as const

// Scraping Configuration
export const SCRAPER_CONFIG = {
  TIMEOUT_MS: 10000,
  MAX_PARAGRAPHS: 5,
  MAX_CONTENT_LENGTH: 1000,
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
} as const

// Cache Configuration
export const CACHE_CONFIG = {
  TTL_MS: 5 * 60 * 1000, // 5 minutes
  KEY_PREFIXES: {
    COMPANY: 'company:',
    ICP: 'icp:',
  },
} as const

// Qualification Score Thresholds
export const SCORE_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 70,
  MODERATE: 50,
  MIN: 0,
  MAX: 100,
} as const

// Default ICP Values
export const ICP_DEFAULTS = {
  COMPANY_SIZE_MIN: 50,
  COMPANY_SIZE_MAX: 5000,
  REVENUE_MIN: 5_000_000, // $5M
  REVENUE_MAX: 100_000_000, // $100M
  INDUSTRIES: ['Technology'],
  REGIONS: ['North America'],
  FUNDING_STAGES: ['Series A', 'Series B', 'Series C'],
} as const

// Validation Limits
export const VALIDATION_LIMITS = {
  DOMAIN_MIN_LENGTH: 3,
  DOMAIN_MAX_LENGTH: 255,
  MAX_DOMAINS_PER_REQUEST: 50,
  MAX_PERSONAS_PER_ICP: 5,
} as const

// App Limits
export const APP_LIMITS = {
  MAX_SCRAPE_RETRIES: 3,
  MAX_OPENAI_RETRIES: 2,
  REQUEST_TIMEOUT_MS: 30000,
} as const
