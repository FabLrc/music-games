/**
 * Hook pour gérer la progression du joueur (XP et niveau)
 */

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  PlayerProgress,
  LevelInfo,
  XPGain,
  getPlayerProgress,
  addXP,
  getLevelInfo,
  calculateXPGain
} from '@/lib/player-progress'

export function usePlayerProgress() {
  const { data: session } = useSession()
  const [progress, setProgress] = useState<PlayerProgress | null>(null)
  const [levelInfo, setLevelInfo] = useState<LevelInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Charger la progression du joueur au montage du hook
  useEffect(() => {
    if (!session?.user) {
      setLoading(false)
      return
    }

    const loadProgress = async () => {
      try {
        setLoading(true)
        setError(null)

        const userId = session.user.id || session.user.email || ''
        const username = session.user.name || 'Anonymous'

        const data = await getPlayerProgress(userId, username)
        setProgress(data)

        if (data) {
          const info = getLevelInfo(data.total_xp)
          setLevelInfo(info)
        }
      } catch (err) {
        console.error('Error loading player progress:', err)
        setError('Erreur lors du chargement de la progression')
      } finally {
        setLoading(false)
      }
    }

    loadProgress()
  }, [session])

  // Rafraîchir la progression
  const refresh = useCallback(async () => {
    if (!session?.user) return

    try {
      setLoading(true)
      setError(null)

      const userId = session.user.id || session.user.email || ''
      const username = session.user.name || 'Anonymous'

      const data = await getPlayerProgress(userId, username)
      setProgress(data)

      if (data) {
        const info = getLevelInfo(data.total_xp)
        setLevelInfo(info)
      }
    } catch (err) {
      console.error('Error refreshing player progress:', err)
      setError('Erreur lors du rafraîchissement de la progression')
    } finally {
      setLoading(false)
    }
  }, [session])

  // Ajouter de l'XP
  const earnXP = useCallback(
    async (correctAnswers: number): Promise<XPGain | null> => {
      if (!session?.user) return null

      try {
        const userId = session.user.id || session.user.email || ''
        const username = session.user.name || 'Anonymous'
        const xpToAdd = calculateXPGain(correctAnswers)

        const gain = await addXP(userId, username, xpToAdd)
        
        // Rafraîchir la progression après gain d'XP
        if (gain) {
          await refresh()
        }

        return gain
      } catch (err) {
        console.error('Error earning XP:', err)
        setError('Erreur lors de l\'ajout d\'XP')
        return null
      }
    },
    [session, refresh]
  )

  return {
    progress,
    levelInfo,
    loading,
    error,
    refresh,
    earnXP
  }
}
