"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { signOut, useSession } from "next-auth/react"
import Image from "next/image"
import { useSpotifyPlayer } from "@/hooks/useSpotifyPlayer"
import { useGameEngine } from "@/hooks/useGameEngine"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { DynamicBackground } from "@/components/DynamicBackground"
import { GameModeSelector } from "@/components/game/GameModeSelector"
import { Karaoke } from "@/components/game/Karaoke"
import { generateQuestions } from "@/lib/question-generator"
import { getCurrentLyric } from "@/lib/lrc-parser"
import { GameConfiguration, LyricsQuestion, TitleQuestion, ArtistQuestion, RoundResult, GameStats } from "@/types/game"

type GameState = "setup" | "playing" | "answering" | "results" | "revealing"

const MAX_TRACKS = 20

export function MusicQuiz() {
  const { data: session } = useSession()
  const {
    isReady,
    position,
    duration,
    currentTrack: spotifyTrack,
    play,
    pause,
    resume,
    seek,
  } = useSpotifyPlayer()

  const [gameState, setGameState] = useState<GameState>("setup")
  const [gameConfig, setGameConfig] = useState<GameConfiguration>({
    gameMode: "lyrics-quiz",
    source: "random",
    trackCount: 5,
  })

  // Source selection
  const [playlists, setPlaylists] = useState<SpotifyApi.PlaylistObjectSimplified[]>([])
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SpotifyApi.TrackObjectFull[]>([])
  const [selectedAlbum, setSelectedAlbum] = useState<string>("")

  const [isLoading, setIsLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 })
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [timeLeft, setTimeLeft] = useState(10)

  // Game engine
  const {
    gameTracks,
    currentTrackIndex,
    currentTrack,
    roundResults,
    gameStats,
    initializeGame,
    submitAnswer: engineSubmitAnswer,
    nextTrack,
    resetGame,
    startAnswerTimer,
  } = useGameEngine({
    onGameEnd: saveScore,
  })

  // Load playlists
  const loadPlaylists = async () => {
    try {
      const response = await fetch("/api/spotify/playlists")
      const data = await response.json()
      setPlaylists(data.items || [])
    } catch (error) {
      console.error("Failed to load playlists:", error)
    }
  }

  useEffect(() => {
    if (isReady) {
      loadPlaylists()
    }
  }, [isReady])

  // Search tracks
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(searchQuery)}`)
    const data = await response.json()
    setSearchResults(data.tracks?.items || [])
  }

  // Start game
  const startGame = async () => {
    // En mode survival, permettre jusqu'à 50 pistes au lieu de 20
    const maxTracks = gameConfig.gameMode === "survival" ? 50 : MAX_TRACKS
    const validatedTrackCount = Math.min(Math.max(1, gameConfig.trackCount || 5), maxTracks)
    setGameConfig({ ...gameConfig, trackCount: validatedTrackCount })

    setIsLoading(true)
    setLoadingProgress({ current: 0, total: 0 })

    const controller = new AbortController()
    setAbortController(controller)

    let tracks: SpotifyApi.TrackObjectFull[] = []

    try {
      // Fetch tracks based on source
      if (gameConfig.source === "playlist" && gameConfig.sourceId) {
        const tracksNeeded = validatedTrackCount * 3
        const response = await fetch(`/api/spotify/playlist/${gameConfig.sourceId}?count=${tracksNeeded}`, { signal: controller.signal })
        const data = await response.json()
        tracks = data.items?.map((item: { track: SpotifyApi.TrackObjectFull }) => item.track).filter(Boolean) || []
      } else if (gameConfig.source === "liked") {
        const tracksNeeded = validatedTrackCount * 3
        const response = await fetch(`/api/spotify/liked?count=${tracksNeeded}`, { signal: controller.signal })
        const data = await response.json()
        tracks = data.items?.map((item: { track: SpotifyApi.TrackObjectFull }) => item.track).filter(Boolean) || []
      } else if (gameConfig.source === "album" && gameConfig.sourceId) {
        const response = await fetch(`/api/spotify/album/${gameConfig.sourceId}`, { signal: controller.signal })
        const data = await response.json()
        tracks = data.items || []
      } else if (gameConfig.source === "random") {
        tracks = searchResults.slice(0, validatedTrackCount * 3)
      }

      if (tracks.length === 0) {
        alert("Aucune chanson trouvée!")
        return
      }

      // Shuffle tracks
      const shuffled = tracks.sort(() => Math.random() - 0.5)

      // Generate questions based on game mode
      const gameTracks = await generateQuestions(
        shuffled,
        gameConfig.gameMode,
        validatedTrackCount,
        (current, total) => setLoadingProgress({ current, total })
      )

      if (gameTracks.length === 0) {
        alert("Impossible de générer les questions. Essayez une autre source.")
        return
      }

      // Initialize game
      initializeGame(gameTracks)
      loadTrackForRound(0, gameTracks)
    } catch (error) {
      console.error("Failed to start game:", error)
      // Don't show error if user cancelled
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Loading cancelled by user')
        return
      }
      if (!controller.signal.aborted) {
        alert("Erreur lors du chargement des chansons")
      }
    } finally {
      setIsLoading(false)
      setLoadingProgress({ current: 0, total: 0 })
      setAbortController(null)
    }
  }

  // Cancel loading
  const cancelLoading = () => {
    if (abortController) {
      abortController.abort()
      setIsLoading(false)
      setLoadingProgress({ current: 0, total: 0 })
    }
  }

  // Load a track for a round
  const loadTrackForRound = useCallback(async (index: number, tracks = gameTracks) => {
    if (!tracks[index]) return

    const gameTrack = tracks[index]
    
    // Vérifier que le player est prêt avant de jouer
    if (!isReady) {
      alert("Le lecteur Spotify n'est pas encore prêt. Veuillez patienter...")
      return
    }
    
    try {
      await play(gameTrack.track.uri)

      let seekTime = 0

      // Determine seek time based on question type
      if (gameTrack.question.type === "lyrics") {
        const lyricsQuestion = gameTrack.question as LyricsQuestion
        seekTime = Math.max(0, (lyricsQuestion.hiddenLyric.time - 5) * 1000)
      } else if (gameTrack.question.type === "title" || gameTrack.question.type === "artist") {
        const blindTestQuestion = gameTrack.question as TitleQuestion | ArtistQuestion
        seekTime = blindTestQuestion.startTime * 1000
      }

      setTimeout(() => {
        seek(seekTime)
        setGameState("playing")
        setTimeLeft(10)
      }, 200)
    } catch (error) {
      console.error("Failed to load track:", error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      alert(`Erreur lors du chargement de la piste: ${errorMessage}\n\nAssurez-vous qu'un appareil Spotify est actif (ouvrez Spotify sur votre ordinateur ou téléphone).`)
    }
  }, [gameTracks, play, seek, isReady])

  // Compute current lyric (for lyrics mode)
  const currentLyric = useMemo(() => {
    if (!currentTrack || currentTrack.question.type !== "lyrics") return null
    
    const lyricsQuestion = currentTrack.question as LyricsQuestion
    if (lyricsQuestion.lyrics.length > 0 && position > 0) {
      const positionSeconds = position / 1000
      return getCurrentLyric(lyricsQuestion.lyrics, positionSeconds)
    }
    return null
  }, [position, currentTrack])

  // Auto-pause for lyrics mode
  useEffect(() => {
    if (gameState === "playing" && currentTrack && currentTrack.question.type === "lyrics" && position > 0) {
      const lyricsQuestion = currentTrack.question as LyricsQuestion
      const positionSeconds = position / 1000

      if (positionSeconds >= lyricsQuestion.hiddenLyric.time) {
        pause()
        startAnswerTimer()
        setTimeout(() => setGameState("answering"), 0)
      }
    }
  }, [gameState, position, currentTrack, pause, startAnswerTimer])

  // Auto-pause for blind test modes (after 15 seconds)
  useEffect(() => {
    if (gameState === "playing" && currentTrack && 
        (currentTrack.question.type === "title" || currentTrack.question.type === "artist") && 
        position > 0) {
      const question = currentTrack.question as TitleQuestion | ArtistQuestion
      const positionSeconds = position / 1000
      const playTime = positionSeconds - question.startTime

      if (playTime >= 15) { // 15 seconds of music
        pause()
        startAnswerTimer()
        setTimeout(() => setGameState("answering"), 0)
      }
    }
  }, [gameState, position, currentTrack, pause, startAnswerTimer])

  // Submit answer
  const submitAnswer = useCallback((selectedOption?: string) => {
    if (!currentTrack) return

    const answerToCheck = selectedOption || ""
    const { isGameOver } = engineSubmitAnswer(answerToCheck, gameConfig.gameMode === "survival")

    setGameState("revealing")
    resume()

    setTimeout(() => {
      if (isGameOver) {
        pause()
        setGameState("results")
      } else {
        // Masquer l'interface AVANT de charger la prochaine piste
        pause()
        setGameState("playing")
        nextTrack()
        // Petit délai pour s'assurer que l'état est bien mis à jour
        setTimeout(() => {
          loadTrackForRound(currentTrackIndex + 1)
        }, 100)
      }
    }, 5000)
  }, [currentTrack, engineSubmitAnswer, gameConfig.gameMode, resume, pause, nextTrack, currentTrackIndex, loadTrackForRound])

  // Timer countdown
  useEffect(() => {
    if (gameState === "answering") {
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            submitAnswer()
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [gameState, submitAnswer])

  // Save score
  async function saveScore(results: RoundResult[], stats: GameStats) {
    if (!session?.user) return

    try {
      const response = await fetch("/api/leaderboard/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          score: stats.correctAnswers,
          totalQuestions: stats.totalQuestions,
          gameMode: gameConfig.gameMode,
          sourceType: gameConfig.source,
        }),
      })

      if (!response.ok) {
        console.error("Failed to submit score:", await response.text())
      } else {
        console.log("Score submitted successfully!")
      }
    } catch (error) {
      console.error("Error submitting score:", error)
    }
  }

  // Setup screen
  if (gameState === "setup") {
    // Redirect to Karaoke component if karaoke mode is selected
    if (gameConfig.gameMode === "karaoke") {
      return <Karaoke onBack={() => setGameConfig({ ...gameConfig, gameMode: "lyrics-quiz" })} />
    }

    return (
      <DynamicBackground className="flex min-h-screen flex-col items-center justify-center p-8 gap-4">
          <Card className="w-full max-w-2xl border-2 neon-border-magenta bg-gradient-to-br from-gray-900 to-black shadow-2xl">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-5xl font-black tracking-wider uppercase text-white mb-3" style={{ fontFamily: 'Impact, Arial Black, sans-serif', textShadow: '0 0 20px rgba(236, 72, 153, 0.8), 0 0 40px rgba(236, 72, 153, 0.5)' }}>
                ♫ THE ULTIMATE JAM SESSION ♫
              </CardTitle>
              {session?.user?.name && (
                <p className="text-sm text-gray-300 mt-2">
                  🎸 {session.user.name} is in the house!
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-8 px-8 pb-8">
              {!isReady && <p className="text-muted-foreground">Chargement du lecteur Spotify...</p>}

              {isReady && (
                <>
                  {/* Game mode selector */}
                  <GameModeSelector
                    selectedMode={gameConfig.gameMode}
                    onModeChange={(mode) => setGameConfig({ ...gameConfig, gameMode: mode })}
                  />

                  {/* Track count (not for survival mode) */}
                  {gameConfig.gameMode !== "survival" && (
                    <div className="space-y-4">
                      <label className="text-sm font-bold text-gray-200 uppercase tracking-wide block">Nombre de titres</label>
                      <div className="space-y-3">
                        <Slider
                          min={1}
                          max={MAX_TRACKS}
                          step={1}
                          value={[gameConfig.trackCount]}
                          onValueChange={(value) => setGameConfig({ ...gameConfig, trackCount: value[0] })}
                          className="w-full"
                        />
                        <div className="text-center">
                          <span className="text-4xl font-black bg-gradient-to-r from-pink-400 to-fuchsia-500 bg-clip-text text-transparent" style={{ textShadow: '0 0 20px rgba(236, 72, 153, 0.5)' }}>
                            {gameConfig.trackCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Source selection */}
                  <div className="space-y-4">
                    <label className="text-sm font-bold text-gray-200 uppercase tracking-wide block">Source des musiques</label>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setGameConfig({ ...gameConfig, source: "random", sourceId: undefined })}
                        className={gameConfig.source === "random" 
                          ? "bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold border-2 border-pink-400 shadow-lg shadow-pink-500/50 hover:shadow-pink-500/70 py-6" 
                          : "border-2 border-gray-600 hover:border-pink-400/50 bg-transparent text-white font-semibold py-6 hover:bg-gray-800/50"}
                      >
                        🎲 ALÉATOIRE
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setGameConfig({ ...gameConfig, source: "liked", sourceId: undefined })}
                        className={gameConfig.source === "liked" 
                          ? "bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold border-2 border-pink-400 shadow-lg shadow-pink-500/50 hover:shadow-pink-500/70 py-6" 
                          : "border-2 border-gray-600 hover:border-pink-400/50 bg-transparent text-white font-semibold py-6 hover:bg-gray-800/50"}
                      >
                        ❤️ LIKÉS
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setGameConfig({ ...gameConfig, source: "playlist", sourceId: undefined })}
                        className={gameConfig.source === "playlist" 
                          ? "bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold border-2 border-pink-400 shadow-lg shadow-pink-500/50 hover:shadow-pink-500/70 py-6" 
                          : "border-2 border-gray-600 hover:border-pink-400/50 bg-transparent text-white font-semibold py-6 hover:bg-gray-800/50"}
                      >
                        📜 PLAYLIST
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setGameConfig({ ...gameConfig, source: "album", sourceId: undefined })}
                        className={gameConfig.source === "album" 
                          ? "bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold border-2 border-pink-400 shadow-lg shadow-pink-500/50 hover:shadow-pink-500/70 py-6" 
                          : "border-2 border-gray-600 hover:border-pink-400/50 bg-transparent text-white font-semibold py-6 hover:bg-gray-800/50"}
                      >
                        💽 ALBUM
                      </Button>
                    </div>
                  </div>

                  {/* Playlist selection */}
                  {gameConfig.source === "playlist" && (
                    <div className="space-y-3 pt-4 border-t border-gray-700">
                      <label className="text-sm font-bold text-gray-200 uppercase tracking-wide block">Sélectionner une playlist</label>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {playlists.map((playlist) => (
                          <Card
                            key={playlist.id}
                            className={`cursor-pointer ${selectedPlaylist === playlist.id ? "bg-accent" : "hover:bg-accent/50"}`}
                            onClick={() => {
                              setSelectedPlaylist(playlist.id)
                              setGameConfig({ ...gameConfig, sourceId: playlist.id })
                            }}
                          >
                            <CardContent className="p-3 flex items-center gap-3">
                              {playlist.images[0] && (
                                <Image
                                  src={playlist.images[0].url}
                                  alt={playlist.name}
                                  width={48}
                                  height={48}
                                  className="rounded"
                                />
                              )}
                              <div className="flex-1">
                                <p className="font-semibold">{playlist.name}</p>
                                <p className="text-sm text-muted-foreground">{playlist.tracks.total} titres</p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Album/Random search */}
                  {(gameConfig.source === "album" || gameConfig.source === "random") && (
                    <div className="space-y-3 pt-4 border-t border-gray-700">
                      <label className="text-sm font-bold text-gray-200 uppercase tracking-wide block">
                        {gameConfig.source === "album" ? "Rechercher un album" : "Rechercher des chansons"}
                      </label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Rechercher..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                          className="bg-gray-900/70 border-gray-600 text-white placeholder:text-gray-500"
                        />
                        <Button 
                          onClick={handleSearch}
                          className="bg-pink-500 hover:bg-pink-600 text-white font-semibold border-2 border-pink-400"
                        >
                          🔍
                        </Button>
                      </div>

                      {searchResults.length > 0 && (
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {gameConfig.source === "random" ? (
                            <p className="text-sm text-muted-foreground">
                              {searchResults.length} chansons trouvées (prêt à jouer)
                            </p>
                          ) : (
                            searchResults.map((track) => (
                              <Card
                                key={track.id}
                                className={`cursor-pointer ${selectedAlbum === track.album.id ? "bg-accent" : "hover:bg-accent/50"}`}
                                onClick={() => {
                                  setSelectedAlbum(track.album.id)
                                  setGameConfig({ ...gameConfig, sourceId: track.album.id })
                                }}
                              >
                                <CardContent className="p-3 flex items-center gap-3">
                                  {track.album?.images?.length > 0 ? (
                                    <Image
                                      src={track.album.images[2]?.url || track.album.images[0]?.url || ""}
                                      alt={track.album.name}
                                      width={48}
                                      height={48}
                                      className="rounded"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded bg-gray-700 flex items-center justify-center">
                                      <span className="text-xl">🎵</span>
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    <p className="font-semibold">{track.album.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {track.artists.map((a) => a.name).join(", ")}
                                    </p>
                                  </div>
                                </CardContent>
                              </Card>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Loading progress */}
                  {isLoading && loadingProgress.total > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-300">
                        {gameConfig.gameMode === "lyrics-quiz" || gameConfig.gameMode === "survival" 
                          ? `Chargement des paroles... ${loadingProgress.current}/${loadingProgress.total}`
                          : `Préparation des questions... ${loadingProgress.current}/${loadingProgress.total}`
                        }
                      </p>
                      <Progress value={(loadingProgress.current / loadingProgress.total) * 100} />
                    </div>
                  )}

                  {/* Start button */}
                  <div className="flex gap-2 pt-4">
                    {isLoading ? (
                      <Button onClick={cancelLoading} variant="destructive" className="w-full border-2 border-red-400 py-7" size="lg">
                        ⛔ ANNULER
                      </Button>
                    ) : (
                      <Button
                        onClick={startGame}
                        className="w-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-pink-600 hover:from-pink-600 hover:via-fuchsia-600 hover:to-pink-700 text-white font-black text-2xl py-8 border-2 border-pink-400 shadow-2xl shadow-pink-500/50 hover:shadow-pink-500/80 hover:scale-105 transition-all duration-200 uppercase tracking-widest"
                        size="lg"
                        disabled={
                          (gameConfig.source === "playlist" && !gameConfig.sourceId) ||
                          (gameConfig.source === "album" && !gameConfig.sourceId) ||
                          (gameConfig.source === "random" && searchResults.length === 0)
                        }
                      >
                        🎸 GROOVE ON! 🎸
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
      </DynamicBackground>
    )
  }

  // Results screen
  if (gameState === "results") {
    const score = roundResults.length > 0 
      ? Math.round((gameStats.correctAnswers / roundResults.length) * 100)
      : 0

    return (
      <DynamicBackground className="flex min-h-screen flex-col items-center justify-center p-8 gap-4">
        <Card className="w-full max-w-2xl border-2 neon-border-magenta bg-gradient-to-br from-gray-900 to-black shadow-2xl">
          <CardHeader className="text-center bg-gradient-to-r from-pink-900/30 via-fuchsia-900/30 to-pink-900/30 pb-8">
            <CardTitle className="text-5xl font-black tracking-wider uppercase text-white" style={{ fontFamily: 'Impact, Arial Black, sans-serif', textShadow: '0 0 20px rgba(236, 72, 153, 0.8), 0 0 40px rgba(236, 72, 153, 0.5)' }}>
              🎶 FINAL SCORE 🎶
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 px-8 pb-8">
            <div className="text-center p-8 bg-gradient-to-r from-pink-500/20 via-fuchsia-500/20 to-pink-500/20 rounded-lg border-2 border-pink-400/50">
              <p className="text-8xl font-black mb-4" style={{
                background: 'linear-gradient(45deg, #ec4899, #d946ef, #c026d3)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 30px rgba(236, 72, 153, 0.5))'
              }}>{score}%</p>
              <p className="text-2xl font-bold text-white">
                ✨ {gameStats.correctAnswers} / {roundResults.length} HITS! ✨
              </p>
              {gameStats.maxCombo > 1 && (
                <p className="text-lg text-pink-300 mt-2">
                  🔥 Combo Max: {gameStats.maxCombo}x
                </p>
              )}
            </div>

            <div className="space-y-3">
              {roundResults.map((result, index) => (
                <Card key={index} className={`border-2 transition-all duration-300 ${
                  result.correct 
                    ? "border-green-400 bg-gradient-to-r from-green-900/30 to-emerald-900/30 shadow-lg shadow-green-500/30" 
                    : "border-red-400 bg-gradient-to-r from-red-900/30 to-pink-900/30 shadow-lg shadow-red-500/30"
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-bold text-lg text-white">{result.trackName}</p>
                        <p className="text-sm text-gray-300 font-semibold">{result.artist}</p>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-gray-200">
                            <span className="font-bold text-pink-300">
                              {result.questionType === "lyrics" && "🎤"}
                              {result.questionType === "title" && "🎵"}
                              {result.questionType === "artist" && "🎸"}
                              {" "}Votre réponse:
                            </span> {result.userAnswer}
                          </p>
                          {!result.correct && (
                            <p className="text-sm text-green-400 font-semibold">
                              <span className="font-bold">✅ Bonne réponse:</span> {result.correctAnswer}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-4xl animate-bounce">
                        {result.correct ? "✅" : "❌"}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4">
              <Button 
                onClick={() => {
                  setGameState("setup")
                  resetGame()
                }} 
                className="bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-600 hover:to-gray-800 border-2 border-gray-500 text-white font-bold text-lg py-6"
              >
                🔄 CONFIG
              </Button>
              <Button 
                onClick={startGame} 
                className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-pink-600 hover:from-pink-600 hover:via-fuchsia-600 hover:to-pink-700 border-2 border-pink-400 text-white font-black text-lg py-6 shadow-lg shadow-pink-500/50 hover:shadow-pink-500/80 hover:scale-105 transition-all duration-200"
              >
                🎸 REJOUER!
              </Button>
            </div>
          </CardContent>
        </Card>
      </DynamicBackground>
    )
  }

  // Playing/Answering screen
  const questionTypeLabel = currentTrack 
    ? currentTrack.question.type === "lyrics" ? "🎤 Paroles" 
    : currentTrack.question.type === "title" ? "🎵 Devinez le Titre"
    : currentTrack.question.type === "artist" ? "🎸 Devinez l'Artiste"
    : currentTrack.question.type === "album" ? "💿 Devinez l'Album"
    : "Question"
    : ""

  return (
    <DynamicBackground className="flex min-h-screen flex-col items-center justify-center p-8 gap-4">
      <Card className="w-full max-w-2xl border-2 neon-border-magenta bg-gradient-to-br from-gray-900 to-black shadow-2xl">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-white">
              {gameConfig.gameMode === "survival" 
                ? `Survival Mode - Manche ${currentTrackIndex + 1}`
                : `Manche ${currentTrackIndex + 1} / ${gameTracks.length}`
              }
            </CardTitle>
            {gameStats.combo > 1 && (
              <div className="text-pink-400 font-bold text-xl animate-pulse">
                🔥 x{gameStats.combo}
              </div>
            )}
          </div>
          <p className="text-sm text-gray-400">{questionTypeLabel}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentTrack && (
            <>
              <div className="flex items-center gap-4 p-4 rounded-lg bg-black/50 border-2 border-pink-500/30">
                {/* Modes blind test : masquer uniquement l'information à deviner */}
                {(currentTrack.question.type === "title" || currentTrack.question.type === "artist" || currentTrack.question.type === "album") && gameState !== "revealing" ? (
                  <>
                    {/* Toujours masquer la couverture en blind test (sinon trop facile) */}
                    <div className="relative w-20 h-20 rounded border-2 border-gray-600 bg-gray-800 flex items-center justify-center">
                      <span className="text-4xl">❓</span>
                    </div>
                    <div className="flex-1">
                      {/* Masquer SEULEMENT l'information à deviner */}
                      <p className="font-bold text-xl text-gray-500">
                        {currentTrack.question.type === "title" || currentTrack.question.type === "album" 
                          ? "🎵 ???" 
                          : currentTrack.track.name
                        }
                      </p>
                      <p className="text-gray-500 font-semibold">
                        {currentTrack.question.type === "artist" 
                          ? "🎸 ???" 
                          : currentTrack.track.artists.map((a) => a.name).join(", ")
                        }
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="relative">
                      {currentTrack.track.album?.images?.[0]?.url ? (
                        <Image
                          src={currentTrack.track.album.images[0].url}
                          alt="Album cover"
                          width={80}
                          height={80}
                          className="rounded border-2 border-pink-400 shadow-lg shadow-pink-400/50"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded border-2 border-pink-400 bg-gradient-to-br from-pink-900/50 to-fuchsia-900/50 flex items-center justify-center">
                          <span className="text-3xl">🎵</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-xl text-white">{currentTrack.track.name}</p>
                      <p className="text-gray-300 font-semibold">
                        {currentTrack.track.artists?.map((a) => a.name).join(", ") || "Artiste inconnu"}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="relative">
                <div className="h-4 bg-black/70 rounded-full border-2 border-gray-700 overflow-hidden">
                  <div 
                    className="h-full transition-all duration-300 rounded-full"
                    style={{
                      width: `${duration > 0 ? (position / duration) * 100 : 0}%`,
                      background: `linear-gradient(90deg, #ec4899 0%, #d946ef 50%, #c026d3 100%)`,
                      boxShadow: '0 0 10px rgba(236, 72, 153, 0.7)'
                    }}
                  />
                </div>
              </div>

              {/* Current Lyric Display (lyrics mode only) */}
              {currentLyric && (gameState === "playing" || gameState === "revealing") && (
                <div className="text-center p-6 bg-gradient-to-r from-pink-900/30 via-fuchsia-900/30 to-pink-900/30 rounded-lg border-2 border-pink-500/50 shadow-lg shadow-pink-500/30">
                  <p className="text-2xl font-bold text-white" style={{ textShadow: '0 0 10px rgba(236, 72, 153, 0.5)' }}>{currentLyric.text}</p>
                </div>
              )}

              {/* Answering mode */}
              {(gameState === "answering" || gameState === "revealing") && (
                <div className="space-y-4">
                  <p className="text-center font-black text-3xl uppercase tracking-wider" style={{
                    fontFamily: 'Impact, Arial Black, sans-serif',
                    color: gameState === "answering" ? '#ec4899' : '#00FF00',
                    textShadow: gameState === "answering" ? '0 0 20px rgba(236, 72, 153, 0.8), 0 0 40px rgba(217, 70, 239, 0.5)' : '0 0 20px #00FF00'
                  }}>
                    {gameState === "answering" 
                      ? `⏰ ${timeLeft}s`
                      : "✨ RÉSULTAT"
                    }
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    {currentTrack.question.options.map((option, idx) => {
                      let buttonClasses = "w-full text-left justify-start h-auto py-4 px-6 whitespace-normal font-bold text-lg transition-all duration-200 border-2 "
                      
                      if (gameState === "revealing") {
                        const isCorrect = option === currentTrack.question.correctAnswer
                        const isSelected = roundResults[roundResults.length - 1]?.userAnswer === option
                        
                        if (isCorrect) {
                          buttonClasses += "bg-gradient-to-r from-green-400 to-emerald-500 text-black border-green-300 shadow-2xl shadow-green-500/70 scale-105 animate-pulse"
                        } else if (isSelected) {
                          buttonClasses += "bg-gradient-to-r from-red-600 to-red-800 text-white border-red-400 shadow-lg shadow-red-500/50"
                        } else {
                          buttonClasses += "bg-gray-800/50 text-gray-400 border-gray-600"
                        }
                      } else {
                        buttonClasses += "bg-gradient-to-r from-gray-800 to-gray-900 hover:from-pink-900/50 hover:to-fuchsia-900/50 text-white border-gray-600 hover:border-pink-400 hover:shadow-lg hover:shadow-pink-400/50 hover:scale-105"
                      }

                      return (
                        <Button
                          key={idx}
                          onClick={() => gameState === "answering" && submitAnswer(option)}
                          className={buttonClasses}
                          disabled={gameState === "revealing"}
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-pink-400 font-black">{String.fromCharCode(65 + idx)}.</span>
                            {option}
                          </span>
                        </Button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Progress indicator */}
              {gameConfig.gameMode !== "survival" && (
                <div className="flex gap-2 justify-center p-4 bg-black/30 rounded-lg flex-wrap">
                  {gameTracks.map((_, index) => (
                    <div
                      key={index}
                      className={`w-4 h-4 rounded-full transition-all duration-300 ${
                        index < currentTrackIndex
                          ? roundResults[index]?.correct
                            ? "bg-green-400 shadow-lg shadow-green-400/70"
                            : "bg-red-500 shadow-lg shadow-red-500/70"
                          : index === currentTrackIndex
                          ? "bg-pink-400 shadow-lg shadow-pink-400/70 animate-pulse scale-125"
                          : "bg-gray-600 shadow-inner"
                      }`}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </DynamicBackground>
  )
}
