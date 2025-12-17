/**
 * Utilitaires pour gérer la progression des joueurs (XP et niveau)
 * 
 * Système de progression :
 * - +10 XP par bonne réponse
 * - Niveau 1 → 2 : 100 XP
 * - Chaque niveau suivant nécessite 1.2x l'XP du niveau précédent
 * - Formule : XP_pour_niveau_N = 100 * (1.2)^(N-2)
 */

import { supabase } from './supabase'

const XP_PER_CORRECT_ANSWER = 10
const BASE_XP_FOR_LEVEL_2 = 100
const LEVEL_MULTIPLIER = 1.2

export interface PlayerProgress {
  id?: string
  user_id: string
  username: string
  level: number
  current_xp: number
  total_xp: number
  created_at?: string
  updated_at?: string
}

export interface LevelInfo {
  currentLevel: number
  currentXP: number
  xpForCurrentLevel: number
  xpForNextLevel: number
  progressPercent: number
}

export interface XPGain {
  xpEarned: number
  newTotalXP: number
  oldLevel: number
  newLevel: number
  leveledUp: boolean
}

/**
 * Calcule l'XP nécessaire pour atteindre un niveau donné
 * @param level Niveau cible
 * @returns XP nécessaire pour ce niveau
 */
export function getXPRequiredForLevel(level: number): number {
  if (level <= 1) return 0
  return Math.floor(BASE_XP_FOR_LEVEL_2 * Math.pow(LEVEL_MULTIPLIER, level - 2))
}

/**
 * Calcule l'XP total nécessaire pour atteindre un niveau
 * (somme de tous les XP des niveaux précédents)
 */
export function getTotalXPForLevel(level: number): number {
  let total = 0
  for (let i = 2; i <= level; i++) {
    total += getXPRequiredForLevel(i)
  }
  return total
}

/**
 * Calcule le niveau actuel en fonction de l'XP total
 * @param totalXP XP total du joueur
 * @returns Niveau calculé
 */
export function calculateLevel(totalXP: number): number {
  let level = 1
  let xpNeeded = 0
  
  while (xpNeeded <= totalXP) {
    level++
    xpNeeded += getXPRequiredForLevel(level)
  }
  
  return level - 1
}

/**
 * Calcule l'XP actuel dans le niveau en cours
 * @param totalXP XP total du joueur
 * @returns XP dans le niveau actuel
 */
export function getCurrentLevelXP(totalXP: number): number {
  const level = calculateLevel(totalXP)
  const totalXPForCurrentLevel = getTotalXPForLevel(level)
  return totalXP - totalXPForCurrentLevel
}

/**
 * Récupère les informations de niveau d'un joueur
 * @param totalXP XP total du joueur
 * @returns Informations détaillées sur le niveau
 */
export function getLevelInfo(totalXP: number): LevelInfo {
  const currentLevel = calculateLevel(totalXP)
  const currentXP = getCurrentLevelXP(totalXP)
  const xpForCurrentLevel = 0
  const xpForNextLevel = getXPRequiredForLevel(currentLevel + 1)
  const progressPercent = (currentXP / xpForNextLevel) * 100

  return {
    currentLevel,
    currentXP,
    xpForCurrentLevel,
    xpForNextLevel,
    progressPercent: Math.min(100, Math.max(0, progressPercent))
  }
}

/**
 * Calcule l'XP gagné lors d'une partie
 * @param correctAnswers Nombre de bonnes réponses
 * @returns XP gagné
 */
export function calculateXPGain(correctAnswers: number): number {
  return correctAnswers * XP_PER_CORRECT_ANSWER
}

/**
 * Récupère ou crée la progression d'un joueur
 */
export async function getPlayerProgress(userId: string, username: string): Promise<PlayerProgress | null> {
  try {
    // Essayer de récupérer la progression existante
    const { data, error } = await supabase
      .from('player_progress')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching player progress:', error)
      return null
    }

    // Si la progression existe, la retourner
    if (data) {
      return data
    }

    // Sinon, créer une nouvelle progression
    const newProgress: Omit<PlayerProgress, 'id' | 'created_at' | 'updated_at'> = {
      user_id: userId,
      username,
      level: 1,
      current_xp: 0,
      total_xp: 0
    }

    const { data: created, error: createError } = await supabase
      .from('player_progress')
      .insert(newProgress)
      .select()
      .single()

    if (createError) {
      console.error('Error creating player progress:', createError)
      return null
    }

    return created
  } catch (error) {
    console.error('Error in getPlayerProgress:', error)
    return null
  }
}

/**
 * Ajoute de l'XP à un joueur et met à jour son niveau
 */
export async function addXP(
  userId: string,
  username: string,
  xpToAdd: number
): Promise<XPGain | null> {
  try {
    // Récupérer la progression actuelle
    const progress = await getPlayerProgress(userId, username)
    if (!progress) {
      return null
    }

    const oldLevel = progress.level
    const oldTotalXP = progress.total_xp
    const newTotalXP = oldTotalXP + xpToAdd

    // Calculer le nouveau niveau
    const newLevel = calculateLevel(newTotalXP)
    const newCurrentXP = getCurrentLevelXP(newTotalXP)

    // Mettre à jour la base de données
    const { error } = await supabase
      .from('player_progress')
      .update({
        level: newLevel,
        current_xp: newCurrentXP,
        total_xp: newTotalXP,
        username // Mettre à jour le nom au cas où il a changé
      })
      .eq('user_id', userId)

    if (error) {
      console.error('Error updating player progress:', error)
      return null
    }

    return {
      xpEarned: xpToAdd,
      newTotalXP,
      oldLevel,
      newLevel,
      leveledUp: newLevel > oldLevel
    }
  } catch (error) {
    console.error('Error in addXP:', error)
    return null
  }
}

/**
 * Récupère le classement des meilleurs joueurs par niveau
 */
export async function getTopPlayersByLevel(limit: number = 10): Promise<PlayerProgress[]> {
  try {
    const { data, error } = await supabase
      .from('player_progress')
      .select('*')
      .order('level', { ascending: false })
      .order('current_xp', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching top players:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getTopPlayersByLevel:', error)
    return []
  }
}

/**
 * Récupère le classement des meilleurs joueurs par XP total
 */
export async function getTopPlayersByXP(limit: number = 10): Promise<PlayerProgress[]> {
  try {
    const { data, error } = await supabase
      .from('player_progress')
      .select('*')
      .order('total_xp', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching top players:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getTopPlayersByXP:', error)
    return []
  }
}
