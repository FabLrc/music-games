"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Image from "next/image"
import { useSpotifyPlayer } from "@/hooks/useSpotifyPlayer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getLyrics } from "@/lib/lrclib"
import { parseLRC, getCurrentLyric, type LyricLine } from "@/lib/lrc-parser"

type GameState = "idle" | "playing" | "paused" | "answering" | "revealed"

export function MusicQuiz() {
  const {
    isReady,
    position,
    duration,
    currentTrack,
    play,
    pause,
    seek,
  } = useSpotifyPlayer()

  const [gameState, setGameState] = useState<GameState>("idle")
  const [lyrics, setLyrics] = useState<LyricLine[]>([])
  const [hiddenLyric, setHiddenLyric] = useState<LyricLine | null>(null)
  const [userAnswer, setUserAnswer] = useState("")
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(10)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SpotifyApi.TrackObjectFull[]>([])

  // Search tracks
  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(searchQuery)}`)
    const data = await response.json()
    setSearchResults(data.tracks?.items || [])
  }

  // Load a track and fetch lyrics
  const loadTrack = async (track: SpotifyApi.TrackObjectFull) => {
    setSearchResults([])
    setSearchQuery("")
    setGameState("idle")
    setLyrics([])
    setHiddenLyric(null)
    setUserAnswer("")

    await play(track.uri)

    // Fetch lyrics from LRCLIB
    const artistName = track.artists[0]?.name || ""
    const trackName = track.name
    const durationSeconds = Math.floor(track.duration_ms / 1000)

    const lyricsData = await getLyrics(trackName, artistName, durationSeconds)

    if (lyricsData?.syncedLyrics) {
      const parsedLyrics = parseLRC(lyricsData.syncedLyrics)
      setLyrics(parsedLyrics)
      console.log(`Loaded ${parsedLyrics.length} lyric lines`)
    } else {
      console.warn("No synced lyrics found")
    }
  }

  // Compute current lyric from position
  const currentLyric = useMemo(() => {
    if (lyrics.length > 0 && position > 0) {
      const positionSeconds = position / 1000
      return getCurrentLyric(lyrics, positionSeconds)
    }
    return null
  }, [position, lyrics])

  // Start game: pick a random lyric to hide
  const startGame = useCallback(() => {
    if (lyrics.length < 5) {
      alert("Pas assez de paroles synchronisées pour jouer")
      return
    }

    // Pick a random lyric (not first or last)
    const randomIndex = Math.floor(Math.random() * (lyrics.length - 2)) + 1
    const targetLyric = lyrics[randomIndex]
    setHiddenLyric(targetLyric)

    // Seek to a few seconds before the target
    const seekTime = Math.max(0, (targetLyric.time - 3) * 1000)
    seek(seekTime)

    setGameState("playing")
    setUserAnswer("")
    setTimeLeft(10)
  }, [lyrics, seek])

  // Game loop: pause when reaching hidden lyric
  useEffect(() => {
    if (gameState === "playing" && hiddenLyric && position > 0) {
      const positionSeconds = position / 1000

      if (positionSeconds >= hiddenLyric.time) {
        pause()
        setTimeout(() => setGameState("answering"), 0)
      }
    }
  }, [gameState, hiddenLyric, position, pause])

  // Timer countdown when answering
  useEffect(() => {
    if (gameState === "answering") {
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            setGameState("revealed")
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [gameState])

  // Submit answer
  const submitAnswer = () => {
    if (!hiddenLyric) return

    const normalizedAnswer = userAnswer.toLowerCase().trim()
    const normalizedCorrect = hiddenLyric.text.toLowerCase().trim()

    const isCorrect = normalizedAnswer === normalizedCorrect

    if (isCorrect) {
      setScore((prev) => prev + 1)
      alert("✅ Correct !")
    } else {
      alert(`❌ Incorrect. La bonne réponse était : "${hiddenLyric.text}"`)
    }

    setGameState("revealed")
  }

  // Continue playing after reveal
  const continueGame = () => {
    setGameState("idle")
    setHiddenLyric(null)
    setUserAnswer("")
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 gap-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Music Quiz - N&apos;oubliez pas les paroles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isReady && <p className="text-muted-foreground">Chargement du lecteur Spotify...</p>}

          {isReady && (
            <>
              {/* Search Section */}
              {!currentTrack && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Rechercher une chanson..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                    <Button onClick={handleSearch}>Rechercher</Button>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {searchResults.map((track) => (
                        <Card
                          key={track.id}
                          className="cursor-pointer hover:bg-accent"
                          onClick={() => loadTrack(track)}
                        >
                          <CardContent className="p-3 flex items-center gap-3">
                            <Image
                              src={track.album.images[2]?.url || track.album.images[0]?.url}
                              alt={track.name}
                              width={48}
                              height={48}
                              className="rounded"
                            />
                            <div className="flex-1">
                              <p className="font-semibold">{track.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {track.artists.map((a) => a.name).join(", ")}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Now Playing */}
              {currentTrack && (
                <div className="space-y-4">
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

                  <div className="text-sm text-muted-foreground">
                    {Math.floor(position / 1000)}s / {Math.floor(duration / 1000)}s
                  </div>

                  {/* Current Lyric Display */}
                  {currentLyric && gameState === "playing" && (
                    <div className="text-center p-4 bg-accent rounded">
                      <p className="text-xl font-semibold">{currentLyric.text}</p>
                    </div>
                  )}

                  {/* Game Controls */}
                  {gameState === "idle" && lyrics.length > 0 && (
                    <Button onClick={startGame} className="w-full">
                      Commencer le jeu
                    </Button>
                  )}

                  {gameState === "answering" && (
                    <div className="space-y-3">
                      <p className="text-center font-bold text-lg">
                        Quelle est la suite ? ({timeLeft}s)
                      </p>
                      <Input
                        placeholder="Entrez la suite des paroles..."
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && submitAnswer()}
                        autoFocus
                      />
                      <Button onClick={submitAnswer} className="w-full">
                        Valider
                      </Button>
                    </div>
                  )}

                  {gameState === "revealed" && hiddenLyric && (
                    <div className="space-y-3">
                      <p className="text-center text-lg">
                        La réponse était : <strong>{hiddenLyric.text}</strong>
                      </p>
                      <div className="flex gap-2">
                        <Button onClick={continueGame} className="flex-1">
                          Continuer
                        </Button>
                        <Button onClick={startGame} variant="outline" className="flex-1">
                          Nouvelle partie
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="text-center font-bold text-xl">Score: {score}</div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
