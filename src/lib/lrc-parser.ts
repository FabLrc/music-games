export interface LyricLine {
  time: number; // in seconds
  text: string;
}

/**
 * Parse LRC format lyrics
 * Example: [00:12.50]Line of lyrics
 */
export function parseLRC(lrcString: string): LyricLine[] {
  const lines = lrcString.split('\n')
  const lyrics: LyricLine[] = []

  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g

  for (const line of lines) {
    const matches = Array.from(line.matchAll(timeRegex))
    
    if (matches.length > 0) {
      const textStart = line.lastIndexOf(']') + 1
      const text = line.substring(textStart).trim()

      for (const match of matches) {
        const minutes = parseInt(match[1], 10)
        const seconds = parseInt(match[2], 10)
        const centiseconds = parseInt(match[3].padEnd(3, '0'), 10)

        const time = minutes * 60 + seconds + centiseconds / 1000

        if (text) {
          lyrics.push({ time, text })
        }
      }
    }
  }

  // Sort by time
  return lyrics.sort((a, b) => a.time - b.time)
}

/**
 * Get current lyric line based on current position
 */
export function getCurrentLyric(lyrics: LyricLine[], positionSeconds: number): LyricLine | null {
  if (!lyrics.length) return null

  for (let i = lyrics.length - 1; i >= 0; i--) {
    if (lyrics[i].time <= positionSeconds) {
      return lyrics[i]
    }
  }

  return null
}

/**
 * Get next lyric line
 */
export function getNextLyric(lyrics: LyricLine[], positionSeconds: number): LyricLine | null {
  if (!lyrics.length) return null

  for (let i = 0; i < lyrics.length; i++) {
    if (lyrics[i].time > positionSeconds) {
      return lyrics[i]
    }
  }

  return null
}
