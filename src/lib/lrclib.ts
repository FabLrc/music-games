import axios from 'axios';
import { getCachedLyrics, setCachedLyrics } from './lyrics-cache';

export interface LyricsData {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string;
  syncedLyrics: string;
}

const LRCLIB_API_URL = 'https://lrclib.net/api';

export const getLyrics = async (
  trackName: string,
  artistName: string,
  duration: number
): Promise<LyricsData | null> => {
  // Check Supabase cache first
  const cached = await getCachedLyrics(trackName, artistName, duration);
  if (cached !== undefined) {
    console.log(`Cache hit for: ${trackName} by ${artistName}`);
    return cached;
  }

  try {
    const response = await axios.get<LyricsData>(`${LRCLIB_API_URL}/get`, {
      params: {
        track_name: trackName,
        artist_name: artistName,
        duration: duration,
      },
      validateStatus: (status) => {
        return status >= 200 && status < 300 || status === 404;
      }
    });
    
    const result = response.status === 404 ? null : response.data;
    
    // Cache the result in Supabase (even if null to avoid repeated failed requests)
    await setCachedLyrics(trackName, artistName, duration, result);
    
    return result;
  } catch (error) {
    console.error('Error fetching lyrics:', error);
    return null;
  }
};

export const searchLyrics = async (q: string) => {
    try {
        const response = await axios.get(`${LRCLIB_API_URL}/search`, {
            params: { q }
        });
        return response.data;
    } catch (error) {
        console.error('Error searching lyrics:', error);
        return [];
    }
}
