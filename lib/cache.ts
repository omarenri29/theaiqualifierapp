import { CACHE_CONFIG } from '@/lib/constants'

// Simple in-memory cache for development
// In production, use Redis or similar
class SimpleCache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map()
  private ttl: number = CACHE_CONFIG.TTL_MS

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }

  get(key: string): any | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }
}

export const cache = new SimpleCache()
