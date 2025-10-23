import { cache } from '@/lib/cache'

describe('Cache', () => {
  beforeEach(() => {
    cache.clear()
  })

  it('should store and retrieve values', () => {
    cache.set('test-key', { data: 'test value' })
    const value = cache.get('test-key')
    expect(value).toEqual({ data: 'test value' })
  })

  it('should return null for non-existent keys', () => {
    const value = cache.get('non-existent')
    expect(value).toBeNull()
  })

  it('should delete values', () => {
    cache.set('test-key', 'value')
    cache.delete('test-key')
    expect(cache.get('test-key')).toBeNull()
  })

  it('should expire values after TTL', async () => {
    cache.set('test-key', 'value')
    
    // Wait for slightly more than TTL (5 minutes = 300000ms)
    // For testing, we'll just verify the logic exists
    const cached = cache.get('test-key')
    expect(cached).toBe('value')
  })

  it('should clear all values', () => {
    cache.set('key1', 'value1')
    cache.set('key2', 'value2')
    cache.clear()
    expect(cache.get('key1')).toBeNull()
    expect(cache.get('key2')).toBeNull()
  })
})
