"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { signOut, useSession } from "next-auth/react"
import Image from "next/image"
import { useSpotifyPlayer } from "@/hooks/useSpotifyPlayer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getLyrics } from "@/lib/lrclib"
import { parseLRC, getCurrentLyric, type LyricLine } from "@/lib/lrc-parser"

type GameMode = "setup" | "playing" | "answering" | "results" | "revealing"

const MAX_TRACKS = 20
const LYRICS_FETCH_TIMEOUT = 10000 // 10 secondes par piste

interface GameTrack {
  track: SpotifyApi.TrackObjectFull
  lyrics: LyricLine[]
  hiddenLyric: LyricLine
  options: string[]
}

interface RoundResult {
  trackName: string
  artist: string
  correct: boolean
  userAnswer: string
  correctAnswer: string
}

export function MusicQuiz() {
  const { data: session } = useSession()
  const {
    isReady,
    position,
    duration,
    currentTrack,
    play,
    pause,
    resume,
    seek,
  } = useSpotifyPlayer()

  // Game configuration
  const [gameConfig, setGameConfig] = useState<GameConfig>({
    source: "random",
    trackCount: 5,
  })
  const [gameMode, setGameMode] = useState<GameMode>("setup")

  // Source selection
  const [playlists, setPlaylists] = useState<SpotifyApi.PlaylistObjectSimplified[]>([])
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SpotifyApi.TrackObjectFull[]>([])
  const [selectedAlbum, setSelectedAlbum] = useState<string>("")

  // Game state
  const [gameTracks, setGameTracks] = useState<GameTrack[]>([])
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [roundResults, setRoundResults] = useState<RoundResult[]>([])
  const [timeLeft, setTimeLeft] = useState(10)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 })
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  const loadPlaylists = async () => {
    try {
      const response = await fetch("/api/spotify/playlists")
      const data = await response.json()
      setPlaylists(data.items || [])
    } catch (error) {
      console.error("Failed to load playlists:", error)
    }
  }

  // Load playlists when ready
  useEffect(() => {
    if (isReady) {
      loadPlaylists()
    }
  }, [isReady])

  // Search tracks for album/random selection
  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(searchQuery)}`)
    const data = await response.json()
    setSearchResults(data.tracks?.items || [])
  }

  // Start game based on config
  const startGame = async () => {
    // Validate trackCount
    const validatedTrackCount = Math.min(Math.max(1, gameConfig.trackCount || 5), MAX_TRACKS)
    if (validatedTrackCount !== gameConfig.trackCount) {
      setGameConfig({ ...gameConfig, trackCount: validatedTrackCount })
    }

    setIsLoading(true)
    setLoadingProgress({ current: 0, total: 0 })
    
    // Create abort controller for cancellation
    const controller = new AbortController()
    setAbortController(controller)
    
    let tracks: SpotifyApi.TrackObjectFull[] = []

    try {
      if (gameConfig.source === "playlist" && gameConfig.sourceId) {
        const response = await fetch(`/api/spotify/playlist/${gameConfig.sourceId}`)
        const data = await response.json()
        tracks = data.items?.map((item: { track: SpotifyApi.TrackObjectFull }) => item.track).filter(Boolean) || []
      } else if (gameConfig.source === "liked") {
        const response = await fetch("/api/spotify/liked")
        const data = await response.json()
        tracks = data.items?.map((item: { track: SpotifyApi.TrackObjectFull }) => item.track).filter(Boolean) || []
      } else if (gameConfig.source === "album" && gameConfig.sourceId) {
        const response = await fetch(`/api/spotify/album/${gameConfig.sourceId}`)
        const data = await response.json()
        tracks = data.items || []
      } else if (gameConfig.source === "random") {
        // Use search results
        tracks = searchResults.slice(0, gameConfig.trackCount)
      }

      console.log(`Found ${tracks.length} tracks from source`)

      // Shuffle and limit tracks
      const shuffled = tracks.sort(() => Math.random() - 0.5)
      const selectedTracks = shuffled.slice(0, validatedTrackCount)

      console.log(`Selected ${selectedTracks.length} tracks to check for lyrics`)

      // Load lyrics for each track
      const tracksWithLyrics: GameTrack[] = []
      setLoadingProgress({ current: 0, total: selectedTracks.length })
      
      for (let i = 0; i < selectedTracks.length; i++) {
        // Check if cancelled
        if (controller.signal.aborted) {
          console.log("Loading cancelled by user")
          return
        }
        
        const track = selectedTracks[i]
        if (!track || !track.artists || track.artists.length === 0) {
          console.warn("Skipping invalid track:", track)
          continue
        }

        const artistName = track.artists[0]?.name || ""
        const trackName = track.name
        const durationSeconds = Math.floor(track.duration_ms / 1000)

        console.log(`Checking lyrics for: ${trackName} by ${artistName} (${i + 1}/${selectedTracks.length})`)
        setLoadingProgress({ current: i + 1, total: selectedTracks.length })

        // Fetch lyrics with timeout
        const lyricsData = await Promise.race([
          getLyrics(trackName, artistName, durationSeconds),
          new Promise<null>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), LYRICS_FETCH_TIMEOUT)
          )
        ]).catch(err => {
          console.warn(`Failed to get lyrics for ${trackName}:`, err.message)
          return null
        })

        if (lyricsData?.syncedLyrics) {
          const parsedLyrics = parseLRC(lyricsData.syncedLyrics)
          
          console.log(`Found ${parsedLyrics.length} lyric lines for ${trackName}`)

          if (parsedLyrics.length >= 5) {
            // Pick random lyric to hide (not first or last)
            const randomIndex = Math.floor(Math.random() * (parsedLyrics.length - 2)) + 1
            const hiddenLyric = parsedLyrics[randomIndex]

            // Generate options
            const allLines = parsedLyrics.map(l => l.text).filter(t => t.trim() !== "")
            const uniqueLines = Array.from(new Set(allLines))
            const distractors = uniqueLines
              .filter(l => l !== hiddenLyric.text)
              .sort(() => Math.random() - 0.5)
              .slice(0, 3)
            
            // Ensure we have at least 4 options (even if we have to duplicate)
            let options: string[]
            if (distractors.length >= 3) {
              options = [hiddenLyric.text, ...distractors].sort(() => Math.random() - 0.5)
            } else {
              // Not enough unique lines, add what we have and pad if necessary
              options = [hiddenLyric.text, ...distractors]
              while (options.length < 4 && uniqueLines.length > 0) {
                const randomLine = uniqueLines[Math.floor(Math.random() * uniqueLines.length)]
                if (!options.includes(randomLine)) {
                  options.push(randomLine)
                }
              }
              options = options.sort(() => Math.random() - 0.5)
            }

            tracksWithLyrics.push({
              track,
              lyrics: parsedLyrics,
              hiddenLyric,
              options,
            })

            console.log(`Added ${trackName} to game tracks with ${options.length} options`)
          } else {
            console.log(`Not enough lyrics for ${trackName}`)
          }
        } else {
          console.log(`No synced lyrics found for ${trackName}`)
        }
      }

      console.log(`Final tracks with lyrics: ${tracksWithLyrics.length}`)

      if (tracksWithLyrics.length === 0) {
        alert(`Aucune chanson avec paroles synchronisées trouvée parmi les ${selectedTracks.length} chansons vérifiées. Essayez une autre source.`)
        return
      }

      // Limit to requested track count (in case we got more with lyrics)
      const finalTracks = tracksWithLyrics.slice(0, validatedTrackCount)

      setGameTracks(finalTracks)
      setCurrentTrackIndex(0)
      setRoundResults([])
      loadTrackForRound(finalTracks[0])
    } catch (error) {
      console.error("Failed to start game:", error)
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

  // Load a specific track for a round
  const loadTrackForRound = useCallback(async (gameTrack: GameTrack) => {
    try {
      await play(gameTrack.track.uri)
      
      // Seek to a few seconds before the hidden lyric
      const seekTime = Math.max(0, (gameTrack.hiddenLyric.time - 5) * 1000)
      
      // Wait a bit before seeking to ensure track is loaded
      setTimeout(() => {
        seek(seekTime)
        setGameMode("playing")
        setTimeLeft(10)
      }, 500)
    } catch (error) {
      console.error("Failed to load track:", error)
      alert(`Erreur lors du chargement de la piste: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
  }, [play, seek])

  // Compute current lyric from position
  const currentLyric = useMemo(() => {
    const currentGameTrack = gameTracks[currentTrackIndex]
    if (currentGameTrack && currentGameTrack.lyrics.length > 0 && position > 0) {
      const positionSeconds = position / 1000
      return getCurrentLyric(currentGameTrack.lyrics, positionSeconds)
    }
    return null
  }, [position, gameTracks, currentTrackIndex])

  // Game loop: pause when reaching hidden lyric
  useEffect(() => {
    const currentGameTrack = gameTracks[currentTrackIndex]
    
    if (gameMode === "playing" && currentGameTrack && position > 0) {
      const positionSeconds = position / 1000

      if (positionSeconds >= currentGameTrack.hiddenLyric.time) {
        pause()
        setTimeout(() => setGameMode("answering"), 0)
      }
    }
  }, [gameMode, position, gameTracks, currentTrackIndex, pause])

  // Submit answer
  const submitAnswer = useCallback((selectedOption?: string) => {
    const currentGameTrack = gameTracks[currentTrackIndex]
    if (!currentGameTrack) return

    const answerToCheck = selectedOption || ""
    const normalizedAnswer = answerToCheck.toLowerCase().trim()
    const normalizedCorrect = currentGameTrack.hiddenLyric.text.toLowerCase().trim()
    const isCorrect = normalizedAnswer === normalizedCorrect

    const result: RoundResult = {
      trackName: currentGameTrack.track.name,
      artist: currentGameTrack.track.artists[0]?.name || "",
      correct: isCorrect,
      userAnswer: answerToCheck || "(Temps écoulé)",
      correctAnswer: currentGameTrack.hiddenLyric.text,
    }

    setRoundResults([...roundResults, result])
    setGameMode("revealing")
    resume()

    setTimeout(() => {
      // Check if game is over
      if (currentTrackIndex + 1 >= gameTracks.length) {
        pause()
        setGameMode("results")
      } else {
        // Next track
        setCurrentTrackIndex(currentTrackIndex + 1)
        loadTrackForRound(gameTracks[currentTrackIndex + 1])
      }
    }, 5000)
  }, [gameTracks, currentTrackIndex, roundResults, loadTrackForRound, resume, pause])

  // Timer countdown when answering
  useEffect(() => {
    if (gameMode === "answering") {
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
  }, [gameMode, submitAnswer])

  // Render setup screen
  if (gameMode === "setup") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 gap-4">
        <div className="absolute top-4 right-4">
          <Button variant="outline" onClick={() => signOut()}>
            Déconnexion
          </Button>
        </div>
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Configuration de la partie</CardTitle>
            {session?.user?.name && (
              <p className="text-sm text-muted-foreground">
                Connecté en tant que {session.user.name}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {!isReady && <p className="text-muted-foreground">Chargement du lecteur Spotify...</p>}

            {isReady && (
              <>
                {/* Track count selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nombre de musiques</label>
                  <Input
                    type="number"
                    min={1}
                    max={MAX_TRACKS}
                    value={gameConfig.trackCount}
                    onChange={(e) => {
                      const value = Math.min(Math.max(1, parseInt(e.target.value) || 5), MAX_TRACKS)
                      setGameConfig({ ...gameConfig, trackCount: value })
                    }}
                  />
                </div>

                {/* Source selection */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Source des musiques</label>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={gameConfig.source === "random" ? "default" : "outline"}
                      onClick={() => setGameConfig({ ...gameConfig, source: "random", sourceId: undefined })}
                    >
                      Aléatoire
                    </Button>
                    <Button
                      variant={gameConfig.source === "liked" ? "default" : "outline"}
                      onClick={() => setGameConfig({ ...gameConfig, source: "liked", sourceId: undefined })}
                    >
                      Titres likés
                    </Button>
                    <Button
                      variant={gameConfig.source === "playlist" ? "default" : "outline"}
                      onClick={() => setGameConfig({ ...gameConfig, source: "playlist", sourceId: undefined })}
                    >
                      Playlist
                    </Button>
                    <Button
                      variant={gameConfig.source === "album" ? "default" : "outline"}
                      onClick={() => setGameConfig({ ...gameConfig, source: "album", sourceId: undefined })}
                    >
                      Album
                    </Button>
                  </div>
                </div>

                {/* Playlist selection */}
                {gameConfig.source === "playlist" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sélectionner une playlist</label>
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {gameConfig.source === "album" ? "Rechercher un album" : "Rechercher des chansons"}
                    </label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Rechercher..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      />
                      <Button onClick={handleSearch}>Rechercher</Button>
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
                                <Image
                                  src={track.album.images[2]?.url || track.album.images[0]?.url}
                                  alt={track.album.name}
                                  width={48}
                                  height={48}
                                  className="rounded"
                                />
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

                {/* Start button */}
                {isLoading && loadingProgress.total > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Chargement des paroles... {loadingProgress.current}/{loadingProgress.total}
                    </p>
                    <Progress value={(loadingProgress.current / loadingProgress.total) * 100} />
                  </div>
                )}

                <div className="flex gap-2">
                  {isLoading ? (
                    <Button onClick={cancelLoading} variant="destructive" className="w-full" size="lg">
                      Annuler
                    </Button>
                  ) : (
                    <Button
                      onClick={startGame}
                      className="w-full"
                      size="lg"
                      disabled={
                        (gameConfig.source === "playlist" && !gameConfig.sourceId) ||
                        (gameConfig.source === "album" && !gameConfig.sourceId) ||
                        (gameConfig.source === "random" && searchResults.length === 0)
                      }
                    >
                      Commencer la partie
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render results screen
  if (gameMode === "results") {
    const correctCount = roundResults.filter((r) => r.correct).length
    const score = Math.round((correctCount / roundResults.length) * 100)

    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 gap-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Résultats de la partie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-6xl font-bold mb-2">{score}%</p>
              <p className="text-xl text-muted-foreground">
                {correctCount} / {roundResults.length} bonnes réponses
              </p>
            </div>

            <div className="space-y-3">
              {roundResults.map((result, index) => (
                <Card key={index} className={result.correct ? "border-green-500" : "border-red-500"}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold">{result.trackName}</p>
                        <p className="text-sm text-muted-foreground">{result.artist}</p>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm">
                            <span className="font-medium">Votre réponse:</span> {result.userAnswer}
                          </p>
                          {!result.correct && (
                            <p className="text-sm text-green-600">
                              <span className="font-medium">Bonne réponse:</span> {result.correctAnswer}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-2xl">
                        {result.correct ? "✅" : "❌"}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setGameMode("setup")} className="flex-1" variant="outline">
                Nouvelle configuration
              </Button>
              <Button onClick={startGame} className="flex-1">
                Rejouer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render playing/answering screen
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 gap-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>
            Manche {currentTrackIndex + 1} / {gameTracks.length}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentTrack && gameTracks[currentTrackIndex] && (
            <>
              <div className="flex items-center gap-4">
                <Image
                  src={currentTrack.album.images[0]?.url}
                  alt={currentTrack.name}
                  width={80}
                  height={80}
                  className="rounded"
                />
                <div className="flex-1">
                  <p className="font-bold text-lg">{currentTrack.name}</p>
                  <p className="text-muted-foreground">
                    {currentTrack.artists.map((a) => a.name).join(", ")}
                  </p>
                </div>
              </div>

              <Progress value={(position / duration) * 100} />

              {/* Current Lyric Display */}
              {currentLyric && (gameMode === "playing" || gameMode === "revealing") && (
                <div className="text-center p-4 bg-accent rounded">
                  <p className="text-xl font-semibold">{currentLyric.text}</p>
                </div>
              )}

              {/* Answering mode */}
              {(gameMode === "answering" || gameMode === "revealing") && gameTracks[currentTrackIndex] && (
                <div className="space-y-3">
                  <p className="text-center font-bold text-lg">
                    {gameMode === "answering" 
                      ? `Quelle est la suite ? (${timeLeft}s)`
                      : "Résultat"
                    }
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {gameTracks[currentTrackIndex].options.map((option, idx) => {
                      let variant: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" = "outline"
                      
                      if (gameMode === "revealing") {
                        const isCorrect = option === gameTracks[currentTrackIndex].hiddenLyric.text
                        const isSelected = roundResults[roundResults.length - 1]?.userAnswer === option
                        
                        if (isCorrect) variant = "default"
                        else if (isSelected) variant = "destructive"
                      }

                      return (
                        <Button
                          key={idx}
                          onClick={() => gameMode === "answering" && submitAnswer(option)}
                          className={`w-full text-left justify-start h-auto py-3 px-4 whitespace-normal ${
                            gameMode === "revealing" && option === gameTracks[currentTrackIndex].hiddenLyric.text ? "bg-green-600 hover:bg-green-700 text-white border-green-600" : ""
                          }`}
                          variant={variant}
                          disabled={gameMode === "revealing"}
                        >
                          {option}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Progress indicator */}
              <div className="flex gap-2 justify-center">
                {gameTracks.map((_, index) => (
                  <div
                    key={index}
                    className={`w-3 h-3 rounded-full ${
                      index < currentTrackIndex
                        ? roundResults[index]?.correct
                          ? "bg-green-500"
                          : "bg-red-500"
                        : index === currentTrackIndex
                        ? "bg-blue-500"
                        : "bg-gray-300"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
