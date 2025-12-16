/**
 * Cache system for lyrics data to avoid repeated API calls
 */

import { LyricsData } from './lrclib'

const CACHE_KEY_PREFIX = 'lyrics_cache_'
const CACHE_VERSION = 'v1'
const CACHE_EXPIRY_DAYS = 30

interface CachedLyrics {
  data: LyricsData | null
  timestamp: number
  version: string
}

/**
 * Generate a unique cache key for a track
 */
function getCacheKey(trackName: string, artistName: string, duration: number): string {
  const normalized = `${trackName.toLowerCase()}_${artistName.toLowerCase()}_${duration}`
  return `${CACHE_KEY_PREFIX}${CACHE_VERSION}_${normalized}`
}

/**
 * Check if cached data is still valid
 */
function isExpired(timestamp: number): boolean {
  const now = Date.now()
  const expiryMs = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  return now - timestamp > expiryMs
}

/**
 * Get lyrics from cache
 */
export function getCachedLyrics(
  trackName: string,
  artistName: string,
  duration: number
): LyricsData | null | undefined {
  try {
    const key = getCacheKey(trackName, artistName, duration)
    const cached = localStorage.getItem(key)
    
    if (!cached) {
      return undefined // Not in cache
    }

    const parsed: CachedLyrics = JSON.parse(cached)
    
    // Check version and expiry
    if (parsed.version !== CACHE_VERSION || isExpired(parsed.timestamp)) {
      localStorage.removeItem(key)
      return undefined
    }

    return parsed.data
  } catch (error) {
    console.error('Error reading from lyrics cache:', error)
    return undefined
  }
}

/**
 * Save lyrics to cache
 */
export function setCachedLyrics(
  trackName: string,
  artistName: string,
  duration: number,
  data: LyricsData | null
): void {
  try {
    const key = getCacheKey(trackName, artistName, duration)
    const cached: CachedLyrics = {
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    }
    
    localStorage.setItem(key, JSON.stringify(cached))
  } catch (error) {
    console.error('Error writing to lyrics cache:', error)
    // If localStorage is full, try to clear old entries
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      clearOldCache()
      // Try again
      try {
        const key = getCacheKey(trackName, artistName, duration)
        const cached: CachedLyrics = {
          data,
          timestamp: Date.now(),
          version: CACHE_VERSION,
        }
        localStorage.setItem(key, JSON.stringify(cached))
      } catch {
        // Still failed, ignore
      }
    }
  }
}

/**
 * Clear old cache entries to free up space
 */
function clearOldCache(): void {
  try {
    const keys = Object.keys(localStorage)
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX))
    
    // Sort by timestamp and remove oldest half
    const entries = cacheKeys.map(key => {
      try {
        const data: CachedLyrics = JSON.parse(localStorage.getItem(key) || '{}')
        return { key, timestamp: data.timestamp || 0 }
      } catch {
        return { key, timestamp: 0 }
      }
    })
    
    entries.sort((a, b) => a.timestamp - b.timestamp)
    const toRemove = entries.slice(0, Math.ceil(entries.length / 2))
    
    toRemove.forEach(entry => localStorage.removeItem(entry.key))
    
    console.log(`Cleared ${toRemove.length} old cache entries`)
  } catch (error) {
    console.error('Error clearing cache:', error)
  }
}

/**
 * Clear all lyrics cache
 */
export function clearLyricsCache(): void {
  try {
    const keys = Object.keys(localStorage)
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX))
    cacheKeys.forEach(key => localStorage.removeItem(key))
    console.log(`Cleared ${cacheKeys.length} cache entries`)
  } catch (error) {
    console.error('Error clearing cache:', error)
  }
}
