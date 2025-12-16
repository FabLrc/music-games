"use client"

import { useState, useCallback, useRef } from "react"
import { GameTrack, RoundResult, GameStats } from "@/types/game"

interface UseGameEngineProps {
  onGameEnd?: (results: RoundResult[], stats: GameStats) => void
}

export function useGameEngine({ onGameEnd }: UseGameEngineProps = {}) {
  const [gameTracks, setGameTracks] = useState<GameTrack[]>([])
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [roundResults, setRoundResults] = useState<RoundResult[]>([])
  const [gameStats, setGameStats] = useState<GameStats>({
    correctAnswers: 0,
    totalQuestions: 0,
    averageTime: 0,
    combo: 0,
    maxCombo: 0,
  })
  
  const answerStartTimeRef = useRef<number>(0)

  // Initialiser une nouvelle partie
  const initializeGame = useCallback((tracks: GameTrack[]) => {
    setGameTracks(tracks)
    setCurrentTrackIndex(0)
    setRoundResults([])
    setGameStats({
      correctAnswers: 0,
      totalQuestions: 0,
      averageTime: 0,
      combo: 0,
      maxCombo: 0,
    })
  }, [])

  // Obtenir la track actuelle
  const getCurrentTrack = useCallback(() => {
    return gameTracks[currentTrackIndex] || null
  }, [gameTracks, currentTrackIndex])

  // Démarrer le chronomètre pour une réponse
  const startAnswerTimer = useCallback(() => {
    answerStartTimeRef.current = Date.now()
  }, [])

  // Soumettre une réponse
  const submitAnswer = useCallback((userAnswer: string, isSurvival: boolean = false) => {
    const currentTrack = getCurrentTrack()
    if (!currentTrack) return { isGameOver: false, isCorrect: false }

    const timeToAnswer = (Date.now() - answerStartTimeRef.current) / 1000
    const isCorrect = userAnswer.toLowerCase().trim() === currentTrack.question.correctAnswer.toLowerCase().trim()

    // Créer le résultat du round
    const result: RoundResult = {
      trackName: currentTrack.track.name,
      artist: currentTrack.track.artists[0]?.name || "",
      albumName: currentTrack.track.album.name,
      correct: isCorrect,
      userAnswer: userAnswer || "(Temps écoulé)",
      correctAnswer: currentTrack.question.correctAnswer,
      questionType: currentTrack.question.type,
      timeToAnswer,
    }

    // Mettre à jour les résultats
    const newResults = [...roundResults, result]
    setRoundResults(newResults)

    // Mettre à jour les stats
    const newCombo = isCorrect ? gameStats.combo + 1 : 0
    const newStats: GameStats = {
      correctAnswers: isCorrect ? gameStats.correctAnswers + 1 : gameStats.correctAnswers,
      totalQuestions: gameStats.totalQuestions + 1,
      averageTime: ((gameStats.averageTime || 0) * gameStats.totalQuestions + timeToAnswer) / (gameStats.totalQuestions + 1),
      combo: newCombo,
      maxCombo: Math.max(gameStats.maxCombo, newCombo),
    }
    setGameStats(newStats)

    // En mode Survival, une mauvaise réponse termine la partie
    if (isSurvival && !isCorrect) {
      onGameEnd?.(newResults, newStats)
      return { isGameOver: true, isCorrect: false }
    }

    // Vérifier si c'est la fin de la partie
    const isGameOver = currentTrackIndex + 1 >= gameTracks.length
    
    if (isGameOver) {
      onGameEnd?.(newResults, newStats)
      return { isGameOver: true, isCorrect }
    }

    return { isGameOver: false, isCorrect }
  }, [getCurrentTrack, roundResults, gameStats, currentTrackIndex, gameTracks.length, onGameEnd])

  // Passer à la track suivante
  const nextTrack = useCallback(() => {
    setCurrentTrackIndex((prev) => Math.min(prev + 1, gameTracks.length - 1))
  }, [gameTracks.length])

  // Réinitialiser la partie
  const resetGame = useCallback(() => {
    setGameTracks([])
    setCurrentTrackIndex(0)
    setRoundResults([])
    setGameStats({
      correctAnswers: 0,
      totalQuestions: 0,
      averageTime: 0,
      combo: 0,
      maxCombo: 0,
    })
  }, [])

  return {
    gameTracks,
    currentTrackIndex,
    currentTrack: getCurrentTrack(),
    roundResults,
    gameStats,
    initializeGame,
    submitAnswer,
    nextTrack,
    resetGame,
    startAnswerTimer,
  }
}
