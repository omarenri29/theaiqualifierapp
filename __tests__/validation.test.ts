import { analyzeCompanySchema, qualifyProspectsSchema } from '@/lib/validation'

describe('Validation Schemas', () => {
  describe('analyzeCompanySchema', () => {
    it('should validate a correct domain', () => {
      const result = analyzeCompanySchema.parse({ domain: 'example.com' })
      expect(result.domain).toBe('example.com')
    })

    it('should remove https:// prefix', () => {
      const result = analyzeCompanySchema.parse({ domain: 'https://example.com' })
      expect(result.domain).toBe('example.com')
    })

    it('should remove trailing slash', () => {
      const result = analyzeCompanySchema.parse({ domain: 'example.com/' })
      expect(result.domain).toBe('example.com')
    })

    it('should convert to lowercase', () => {
      const result = analyzeCompanySchema.parse({ domain: 'EXAMPLE.COM' })
      expect(result.domain).toBe('example.com')
    })

    it('should reject invalid domain format', () => {
      expect(() => analyzeCompanySchema.parse({ domain: 'invalid domain!' })).toThrow()
    })

    it('should reject too short domain', () => {
      expect(() => analyzeCompanySchema.parse({ domain: 'ab' })).toThrow()
    })
  })

  describe('qualifyProspectsSchema', () => {
    it('should validate correct input', () => {
      const input = {
        icpId: '123e4567-e89b-12d3-a456-426614174000',
        domains: ['example.com', 'test.com'],
      }
      const result = qualifyProspectsSchema.parse(input)
      expect(result.icpId).toBe(input.icpId)
      expect(result.domains).toEqual(input.domains)
    })

    it('should reject invalid UUID', () => {
      const input = {
        icpId: 'not-a-uuid',
        domains: ['example.com'],
      }
      expect(() => qualifyProspectsSchema.parse(input)).toThrow()
    })

    it('should reject empty domains array', () => {
      const input = {
        icpId: '123e4567-e89b-12d3-a456-426614174000',
        domains: [],
      }
      expect(() => qualifyProspectsSchema.parse(input)).toThrow()
    })

    it('should reject too many domains', () => {
      const input = {
        icpId: '123e4567-e89b-12d3-a456-426614174000',
        domains: Array(51).fill('example.com'),
      }
      expect(() => qualifyProspectsSchema.parse(input)).toThrow()
    })
  })
})
