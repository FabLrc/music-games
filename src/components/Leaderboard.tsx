"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { getLocalStats, getLocalHistory, type LocalGameSession } from "@/lib/leaderboard-storage"
import type { LeaderboardEntry } from "@/lib/supabase"
import { GameModeType } from "@/types/game"

type Tab = "global" | "personal"

interface PersonalStats {
  totalGames: number
  totalScore: number
  bestScore: number
  averageScore: number
}

export function Leaderboard() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<Tab>("global")
  const [selectedGameMode, setSelectedGameMode] = useState<GameModeType | "all">("all")
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardEntry[]>([])
  const [personalStats, setPersonalStats] = useState<PersonalStats | null>(null)
  const [personalHistory, setPersonalHistory] = useState<LocalGameSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadGlobalLeaderboard = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const url = selectedGameMode === "all" 
        ? "/api/leaderboard/top?limit=50"
        : `/api/leaderboard/top?limit=50&gameMode=${selectedGameMode}`
      const response = await fetch(url)
      const data = await response.json()
      
      if (response.ok) {
        setGlobalLeaderboard(data.leaderboard || [])
      } else {
        setError(data.error || "Failed to load leaderboard")
      }
    } catch (err) {
      console.error("Error loading leaderboard:", err)
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [selectedGameMode])

  const loadPersonalStats = useCallback(() => {
    setIsLoading(true)
    const stats = getLocalStats(selectedGameMode === "all" ? undefined : selectedGameMode)
    const history = getLocalHistory()
    const filteredHistory = selectedGameMode === "all" 
      ? history 
      : history.filter(g => g.gameMode === selectedGameMode)
    setPersonalStats(stats)
    setPersonalHistory(filteredHistory)
    setIsLoading(false)
  }, [selectedGameMode])

  // Load global leaderboard
  useEffect(() => {
    if (activeTab === "global") {
      loadGlobalLeaderboard()
    }
  }, [activeTab, loadGlobalLeaderboard])

  // Load personal stats
  useEffect(() => {
    if (activeTab === "personal") {
      loadPersonalStats()
    }
  }, [activeTab, loadPersonalStats])

  const GAME_MODE_FILTERS = [
    { id: "all" as const, name: "🎯 Tous", icon: "" },
    { id: "lyrics-quiz" as const, name: "Paroles", icon: "🎤" },
    { id: "blind-test-title" as const, name: "Titre", icon: "🎵" },
    { id: "blind-test-artist" as const, name: "Artiste", icon: "🎸" },
    { id: "survival" as const, name: "Survival", icon: "⚡" },
  ]

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 justify-center">
        <Button
          variant={activeTab === "global" ? "default" : "outline"}
          onClick={() => setActiveTab("global")}
          className="min-w-[120px]"
        >
          🌍 Global
        </Button>
        <Button
          variant={activeTab === "personal" ? "default" : "outline"}
          onClick={() => setActiveTab("personal")}
          className="min-w-[120px]"
        >
          👤 Personnel
        </Button>
      </div>

      {/* Game Mode Filter */}
      <div className="flex gap-2 justify-center flex-wrap">
        {GAME_MODE_FILTERS.map((mode) => (
          <Button
            key={mode.id}
            variant={selectedGameMode === mode.id ? "default" : "outline"}
            onClick={() => setSelectedGameMode(mode.id)}
            size="sm"
            className="min-w-[100px]"
          >
            {mode.icon} {mode.name}
          </Button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "global" ? (
        <GlobalLeaderboard
          leaderboard={globalLeaderboard}
          isLoading={isLoading}
          error={error}
          currentUserId={session?.user?.email || session?.user?.id}
        />
      ) : (
        <PersonalStats
          stats={personalStats}
          history={personalHistory}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}

function GlobalLeaderboard({
  leaderboard,
  isLoading,
  error,
  currentUserId,
}: {
  leaderboard: LeaderboardEntry[]
  isLoading: boolean
  error: string | null
  currentUserId?: string
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
            <p className="mt-4 text-gray-400">Chargement du classement...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-red-400">❌ {error}</p>
            <p className="text-sm text-gray-500 mt-2">
              Configurez Supabase pour activer le leaderboard global
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (leaderboard.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-gray-400">🎮 Soyez le premier à jouer !</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">🏆 Top Joueurs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {leaderboard.map((entry, index) => {
            const isCurrentUser = entry.user_id === currentUserId
            const rankEmoji = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`

            return (
              <div
                key={entry.user_id}
                className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                  isCurrentUser
                    ? "bg-gradient-to-r from-pink-500/20 to-purple-500/20 border-2 border-pink-500"
                    : "bg-white/5 hover:bg-white/10"
                }`}
              >
                {/* Rank */}
                <div className="text-2xl font-bold w-12 text-center">
                  {rankEmoji}
                </div>

                {/* Avatar */}
                {entry.avatar_url ? (
                  <Image
                    src={entry.avatar_url}
                    alt={entry.username}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    {entry.username.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Username */}
                <div className="flex-1">
                  <p className="font-semibold">{entry.username}</p>
                  <p className="text-sm text-gray-400">
                    {entry.total_games} partie{entry.total_games > 1 ? "s" : ""}
                  </p>
                </div>

                {/* Score */}
                <div className="text-right">
                  <p className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                    {entry.total_score}
                  </p>
                  <p className="text-xs text-gray-400">
                    Meilleur: {entry.best_score}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function PersonalStats({
  stats,
  history,
  isLoading,
}: {
  stats: PersonalStats | null
  history: LocalGameSession[]
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats || stats.totalGames === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-gray-400">🎮 Aucune partie jouée</p>
            <p className="text-sm text-gray-500 mt-2">
              Jouez votre première partie pour voir vos statistiques
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-pink-400">{stats.totalGames}</p>
            <p className="text-sm text-gray-400 mt-1">Parties</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-purple-400">{stats.totalScore}</p>
            <p className="text-sm text-gray-400 mt-1">Points Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-blue-400">{stats.bestScore}</p>
            <p className="text-sm text-gray-400 mt-1">Meilleur Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-green-400">{stats.averageScore}</p>
            <p className="text-sm text-gray-400 mt-1">Moyenne</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Games */}
      <Card>
        <CardHeader>
          <CardTitle>📜 Historique récent</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {history.slice(0, 10).map((game) => {
              const getModeIcon = (mode: string) => {
                switch (mode) {
                  case "lyrics-quiz": return "🎤"
                  case "blind-test-title": return "🎵"
                  case "blind-test-artist": return "🎸"
                  case "survival": return "⚡"
                  default: return "🎮"
                }
              }
              
              return (
                <div
                  key={game.id}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getModeIcon(game.gameMode)}</span>
                    <div>
                      <p className="font-semibold">
                        {game.score} / {game.totalQuestions} points
                      </p>
                      <p className="text-sm text-gray-400">
                        {new Date(game.date).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">{game.sourceType}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
