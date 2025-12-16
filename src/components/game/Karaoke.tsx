"use client"

import { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import Image from "next/image"
import { useSpotifyPlayer } from "@/hooks/useSpotifyPlayer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { DynamicBackground } from "@/components/DynamicBackground"
import { getLyrics } from "@/lib/lrclib"
import { parseLRC, LyricLine, getCurrentLyric } from "@/lib/lrc-parser"

type KaraokeState = "setup" | "loading" | "playing"

interface KaraokeProps {
  onBack?: () => void
}

export function Karaoke({ onBack }: KaraokeProps = {}) {
  const { data: session } = useSession()
  const {
    isReady,
    position,
    duration,
    isPaused,
    play,
    pause,
    resume,
    seek,
  } = useSpotifyPlayer()

  const [karaokeState, setKaraokeState] = useState<KaraokeState>("setup")
  
  // Source selection
  const [playlists, setPlaylists] = useState<SpotifyApi.PlaylistObjectSimplified[]>([])
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SpotifyApi.TrackObjectFull[]>([])
  const [selectedTrack, setSelectedTrack] = useState<SpotifyApi.TrackObjectFull | null>(null)
  
  const [lyrics, setLyrics] = useState<LyricLine[]>([])

  useEffect(() => {
    if (!isReady) return
    
    const loadPlaylists = async () => {
      try {
        const response = await fetch("/api/spotify/playlists")
        const data = await response.json()
        setPlaylists(data.items || [])
      } catch (error) {
        console.error("Failed to load playlists:", error)
      }
    }
    
    loadPlaylists()
  }, [isReady])

  // Search tracks
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(searchQuery)}`)
    const data = await response.json()
    setSearchResults(data.tracks?.items || [])
  }

  // Load playlist tracks
  const handlePlaylistSelect = async (playlistId: string) => {
    setSelectedPlaylist(playlistId)
    try {
      const response = await fetch(`/api/spotify/playlist/${playlistId}?count=50`)
      const data = await response.json()
      const tracks = data.items?.map((item: { track: SpotifyApi.TrackObjectFull }) => item.track).filter(Boolean) || []
      setSearchResults(tracks)
    } catch (error) {
      console.error("Failed to load playlist:", error)
    }
  }

  // Start karaoke with selected track
  const startKaraoke = async (track: SpotifyApi.TrackObjectFull) => {
    setSelectedTrack(track)
    setKaraokeState("loading")

    try {
      // Fetch lyrics
      const trackName = track.name.split(" - ")[0].split("(")[0].trim()
      const artistName = track.artists[0]?.name || ""
      const durationSeconds = Math.round(track.duration_ms / 1000)

      const lyricsData = await getLyrics(trackName, artistName, durationSeconds)

      if (lyricsData?.syncedLyrics) {
        const parsedLyrics = parseLRC(lyricsData.syncedLyrics)
        setLyrics(parsedLyrics)
      } else {
        setLyrics([])
        alert("Pas de paroles synchronisées disponibles pour cette piste 😢")
      }

      // Play the track
      await play(track.uri)
      setKaraokeState("playing")
    } catch (error) {
      console.error("Failed to start karaoke:", error)
      alert("Erreur lors du chargement de la piste")
      setKaraokeState("setup")
    }
  }

  // Get current and upcoming lyrics
  const { currentLyric, upcomingLyrics, pastLyrics } = useMemo(() => {
    if (lyrics.length === 0 || position === 0) {
      return { currentLyric: null, upcomingLyrics: [], pastLyrics: [] }
    }

    const positionSeconds = position / 1000
    const current = getCurrentLyric(lyrics, positionSeconds)
    
    // Find current index
    const currentIndex = current ? lyrics.findIndex(l => l.time === current.time) : -1
    
    // Get 2 past lyrics
    const past = currentIndex > 0 ? lyrics.slice(Math.max(0, currentIndex - 2), currentIndex) : []
    
    // Get 3 upcoming lyrics
    const upcoming = currentIndex >= 0 ? lyrics.slice(currentIndex + 1, currentIndex + 4) : lyrics.slice(0, 3)

    return {
      currentLyric: current,
      upcomingLyrics: upcoming,
      pastLyrics: past,
    }
  }, [lyrics, position])

  // Playback controls
  const handlePlayPause = () => {
    if (isPaused) {
      resume()
    } else {
      pause()
    }
  }

  const handleSeek = (seconds: number) => {
    const newPosition = Math.max(0, Math.min(duration, position + seconds * 1000))
    seek(newPosition)
  }

  const handleSeekToPosition = (value: number[]) => {
    seek(value[0])
  }

  const backToSetup = () => {
    pause()
    setKaraokeState("setup")
    setSelectedTrack(null)
    setLyrics([])
    setSearchResults([])
    setSearchQuery("")
  }

  // Format time
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  if (!session) {
    return (
      <DynamicBackground className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md border-2 neon-border-magenta bg-gradient-to-br from-gray-900 to-black">
          <CardHeader>
            <CardTitle className="text-center text-white">🎙️ Mode Karaoké</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-300">Connectez-vous avec Spotify pour commencer</p>
          </CardContent>
        </Card>
      </DynamicBackground>
    )
  }

  // Setup screen
  if (karaokeState === "setup") {
    return (
      <DynamicBackground className="flex min-h-screen flex-col items-center justify-center p-8 gap-4">
        <Card className="w-full max-w-2xl border-2 neon-border-magenta bg-gradient-to-br from-gray-900 to-black shadow-2xl">
          <CardHeader className="text-center bg-gradient-to-r from-pink-900/30 via-fuchsia-900/30 to-pink-900/30 pb-8">
            <div className="flex justify-between items-center">
              {onBack && (
                <Button
                  onClick={onBack}
                  variant="outline"
                  className="border-2 border-gray-600 hover:border-pink-400/50 bg-transparent text-white"
                >
                  ⬅️ Retour
                </Button>
              )}
              <CardTitle className="flex-1 text-4xl font-black tracking-wider uppercase text-white text-center">
                🎙️ KARAOKÉ 🎙️
              </CardTitle>
              {onBack && <div className="w-24" />}
            </div>
          </CardHeader>
          <CardContent className="space-y-6 px-8 pb-8">
            <div className="text-center space-y-2">
              <p className="text-gray-300">Sélectionnez une chanson pour commencer</p>
            </div>

            {/* Search */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-200 uppercase tracking-wide block">
                Rechercher une chanson
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
            </div>

            {/* Playlists */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-200 uppercase tracking-wide block">
                Ou choisir dans une playlist
              </label>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {playlists.slice(0, 5).map((playlist) => (
                  <Button
                    key={playlist.id}
                    variant="outline"
                    onClick={() => handlePlaylistSelect(playlist.id)}
                    className={`w-full justify-start ${
                      selectedPlaylist === playlist.id 
                        ? "bg-pink-500/20 border-pink-400" 
                        : "border-gray-600 hover:border-pink-400/50"
                    }`}
                  >
                    <span className="truncate">{playlist.name}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-200 uppercase tracking-wide block">
                  Résultats ({searchResults.length} chansons)
                </label>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {searchResults.map((track) => (
                    <Card
                      key={track.id}
                      className="cursor-pointer hover:bg-pink-500/10 border-gray-700 hover:border-pink-400/50 transition-all"
                      onClick={() => startKaraoke(track)}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <Image
                          src={track.album.images[2]?.url || track.album.images[0]?.url}
                          alt={track.album.name}
                          width={48}
                          height={48}
                          className="rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white truncate">{track.name}</p>
                          <p className="text-sm text-gray-400 truncate">
                            {track.artists.map((a) => a.name).join(", ")}
                          </p>
                        </div>
                        <span className="text-2xl">🎤</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </DynamicBackground>
    )
  }

  // Loading screen
  if (karaokeState === "loading") {
    return (
      <DynamicBackground className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md border-2 neon-border-magenta bg-gradient-to-br from-gray-900 to-black">
          <CardContent className="p-8 text-center space-y-4">
            <div className="text-6xl animate-bounce">🎙️</div>
            <p className="text-2xl font-bold text-white">Chargement des paroles...</p>
            <p className="text-gray-400">{selectedTrack?.name}</p>
          </CardContent>
        </Card>
      </DynamicBackground>
    )
  }

  // Playing screen
  return (
    <DynamicBackground className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-4xl space-y-4">
        {/* Header with track info */}
        <Card className="border-2 neon-border-magenta bg-gradient-to-br from-gray-900 to-black">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Image
                src={selectedTrack?.album.images[0]?.url || ""}
                alt="Album cover"
                width={80}
                height={80}
                className="rounded border-2 border-pink-400 shadow-lg shadow-pink-400/50"
              />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xl text-white truncate">{selectedTrack?.name}</p>
                <p className="text-gray-300 truncate">
                  {selectedTrack?.artists.map((a) => a.name).join(", ")}
                </p>
                <p className="text-sm text-gray-500">{selectedTrack?.album.name}</p>
              </div>
              <Button
                onClick={backToSetup}
                variant="outline"
                className="border-2 border-gray-600 hover:border-pink-400 text-white"
              >
                ⬅️ Retour
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lyrics display */}
        <Card className="border-2 neon-border-magenta bg-gradient-to-br from-gray-900 to-black min-h-[400px]">
          <CardContent className="p-8">
            {lyrics.length === 0 ? (
              <div className="text-center text-gray-500 text-xl py-20">
                Pas de paroles synchronisées disponibles 😢
              </div>
            ) : (
              <div className="space-y-3 text-center overflow-hidden relative min-h-[300px] flex flex-col justify-center">
                {/* Past lyrics */}
                {pastLyrics.map((lyric, idx) => (
                  <p 
                    key={`past-${lyric.time}-${idx}`} 
                    className="text-gray-600 text-lg transition-all duration-500 ease-out transform"
                    style={{
                      animation: 'slideUp 0.5s ease-out',
                      opacity: 0.4 + (idx * 0.2)
                    }}
                  >
                    {lyric.text}
                  </p>
                ))}
                
                {/* Current lyric */}
                {currentLyric && (
                  <p 
                    key={`current-${currentLyric.time}`}
                    className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-fuchsia-400 to-pink-400 py-4 transition-all duration-500 ease-out transform"
                    style={{ 
                      textShadow: '0 0 30px rgba(236, 72, 153, 0.8)',
                      filter: 'drop-shadow(0 0 20px rgba(236, 72, 153, 0.5))',
                      animation: 'slideUpCurrent 0.5s ease-out, pulse 2s ease-in-out infinite'
                    }}
                  >
                    {currentLyric.text}
                  </p>
                )}
                
                {/* Upcoming lyrics */}
                {upcomingLyrics.map((lyric, idx) => (
                  <p 
                    key={`upcoming-${lyric.time}-${idx}`} 
                    className="text-gray-400 text-xl transition-all duration-500 ease-out transform"
                    style={{ 
                      opacity: 0.8 - (idx * 0.25),
                      animation: 'slideUp 0.5s ease-out'
                    }}
                  >
                    {lyric.text}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Playback controls */}
        <Card className="border-2 neon-border-magenta bg-gradient-to-br from-gray-900 to-black">
          <CardContent className="p-6 space-y-4">
            {/* Progress bar */}
            <div className="space-y-2">
              <Slider
                value={[position]}
                max={duration}
                step={100}
                onValueChange={handleSeekToPosition}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-400">
                <span>{formatTime(position)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Control buttons */}
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Button
                onClick={() => handleSeek(-15)}
                className="bg-gray-700 hover:bg-gray-600 border-2 border-gray-500 text-white font-bold px-6 py-6"
              >
                ⏪ 15s
              </Button>
              
              <Button
                onClick={handlePlayPause}
                className="bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:from-pink-600 hover:to-fuchsia-700 border-2 border-pink-400 text-white font-bold text-2xl px-10 py-8 shadow-lg shadow-pink-500/50"
              >
                {isPaused ? "▶️" : "⏸️"}
              </Button>
              
              <Button
                onClick={() => handleSeek(15)}
                className="bg-gray-700 hover:bg-gray-600 border-2 border-gray-500 text-white font-bold px-6 py-6"
              >
                15s ⏩
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DynamicBackground>
  )
}
