/**
 * Local storage for leaderboard data (personal history)
 */

export interface LocalGameSession {
  id: string
  score: number
  totalQuestions: number
  gameMode: string
  sourceType: string
  date: string
}

const STORAGE_KEY = 'music_quiz_history'

/**
 * Get all local game sessions
 */
export function getLocalHistory(): LocalGameSession[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return []
    return JSON.parse(data)
  } catch (error) {
    console.error('Error reading local history:', error)
    return []
  }
}

/**
 * Add a game session to local history
 */
export function addLocalSession(session: Omit<LocalGameSession, 'id' | 'date'>): void {
  try {
    const history = getLocalHistory()
    const newSession: LocalGameSession = {
      ...session,
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
    }
    
    history.unshift(newSession) // Add to beginning
    
    // Keep only last 50 games
    const trimmed = history.slice(0, 50)
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch (error) {
    console.error('Error saving local session:', error)
  }
}

/**
 * Get local statistics
 */
export function getLocalStats(gameMode?: string) {
  let history = getLocalHistory()
  
  // Filter by game mode if specified
  if (gameMode) {
    history = history.filter(game => game.gameMode === gameMode)
  }
  
  if (history.length === 0) {
    return {
      totalGames: 0,
      totalScore: 0,
      bestScore: 0,
      averageScore: 0,
    }
  }
  
  const totalGames = history.length
  const totalScore = history.reduce((sum, game) => sum + game.score, 0)
  const bestScore = Math.max(...history.map(game => game.score))
  const averageScore = totalScore / totalGames
  
  return {
    totalGames,
    totalScore,
    bestScore,
    averageScore: Math.round(averageScore * 10) / 10,
  }
}

/**
 * Clear all local history
 */
export function clearLocalHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Error clearing local history:', error)
  }
}
