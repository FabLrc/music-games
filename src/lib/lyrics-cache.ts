/**
 * Cache system for lyrics data to avoid repeated API calls
 * Phase 2: Migrated to Supabase for persistent, shared caching
 */

import { LyricsData } from './lrclib'
import { supabase } from './supabase'

/**
 * Generate a unique track ID for cache key
 */
function getTrackId(trackName: string, artistName: string, duration: number): string {
  const normalized = `${trackName.toLowerCase()}_${artistName.toLowerCase()}_${duration}`
  return normalized.replace(/[^a-z0-9_]/g, '_')
}

/**
 * Get lyrics from Supabase cache
 */
export async function getCachedLyrics(
  trackName: string,
  artistName: string,
  duration: number
): Promise<LyricsData | null | undefined> {
  try {
    const trackId = getTrackId(trackName, artistName, duration)
    
    const { data, error } = await supabase
      .from('lyrics_cache')
      .select('lyrics_json, has_synced')
      .eq('track_id', trackId)
      .single()
    
    if (error) {
      // Not found in cache
      if (error.code === 'PGRST116') {
        return undefined
      }
      console.error('Error reading from Supabase lyrics cache:', error)
      return undefined
    }

    // Return the cached lyrics data
    return data?.lyrics_json as LyricsData | null
  } catch (error) {
    console.error('Error reading from lyrics cache:', error)
    return undefined
  }
}

/**
 * Save lyrics to Supabase cache
 */
export async function setCachedLyrics(
  trackName: string,
  artistName: string,
  duration: number,
  data: LyricsData | null
): Promise<void> {
  try {
    const trackId = getTrackId(trackName, artistName, duration)
    
    const { error } = await supabase
      .from('lyrics_cache')
      .upsert({
        track_id: trackId,
        track_name: trackName,
        artist_name: artistName,
        duration,
        lyrics_json: data,
        has_synced: data?.syncedLyrics ? true : false,
      }, {
        onConflict: 'track_id'
      })
    
    if (error) {
      console.error('Error writing to Supabase lyrics cache:', error)
    }
  } catch (error) {
    console.error('Error writing to lyrics cache:', error)
  }
}

/**
 * Clear all lyrics cache from Supabase
 * Useful for testing or maintenance
 */
export async function clearLyricsCache(): Promise<number> {
  try {
    // Get count first
    const { count } = await supabase
      .from('lyrics_cache')
      .select('*', { count: 'exact', head: true })
    
    // Then delete
    const { error } = await supabase
      .from('lyrics_cache')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    
    if (error) {
      console.error('Error clearing lyrics cache:', error)
      return 0
    }
    
    console.log(`Cleared ${count || 0} cache entries`)
    return count || 0
  } catch (error) {
    console.error('Error clearing cache:', error)
    return 0
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  total: number
  withSynced: number
  withoutLyrics: number
}> {
  try {
    const { count: total } = await supabase
      .from('lyrics_cache')
      .select('*', { count: 'exact', head: true })
    
    const { count: withSynced } = await supabase
      .from('lyrics_cache')
      .select('*', { count: 'exact', head: true })
      .eq('has_synced', true)
    
    const { count: withoutLyrics } = await supabase
      .from('lyrics_cache')
      .select('*', { count: 'exact', head: true })
      .is('lyrics_json', null)
    
    return {
      total: total || 0,
      withSynced: withSynced || 0,
      withoutLyrics: withoutLyrics || 0
    }
  } catch (error) {
    console.error('Error getting cache stats:', error)
    return { total: 0, withSynced: 0, withoutLyrics: 0 }
  }
}
