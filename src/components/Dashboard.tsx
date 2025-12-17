"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { DynamicBackground } from "@/components/DynamicBackground"
import { GameModeSelector } from "@/components/game/GameModeSelector"
import { MultiplayerLobbySelect } from "@/components/multiplayer/MultiplayerLobbySelect"
import { MusicQuiz } from "@/components/game/MusicQuiz2"
import { GameConfiguration, GameModeType } from "@/types/game"
import { useSpotifyPlayer } from "@/hooks/useSpotifyPlayer"

const MAX_TRACKS = 20

export function Dashboard() {
  const { data: session } = useSession()
  const { isReady } = useSpotifyPlayer()
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [activeTab, setActiveTab] = useState<"solo" | "multiplayer">("solo")
  
  // Game Configuration State
  const [gameConfig, setGameConfig] = useState<GameConfiguration>({
    gameMode: "lyrics-quiz",
    source: "random",
    trackCount: 5,
  })

  // Source selection state
  const [playlists, setPlaylists] = useState<SpotifyApi.PlaylistObjectSimplified[]>([])
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SpotifyApi.TrackObjectFull[]>([])
  const [selectedAlbum, setSelectedAlbum] = useState<string>("")

  // Load playlists
  useEffect(() => {
    if (session?.accessToken) {
      fetch("/api/spotify/playlists")
        .then(res => res.json())
        .then(data => setPlaylists(data.items || []))
        .catch(err => console.error("Failed to load playlists:", err))
    }
  }, [session])

  // Search tracks
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(searchQuery)}`)
    const data = await response.json()
    setSearchResults(data.tracks?.items || [])
  }

  const handleStartSoloGame = () => {
    setIsPlaying(true)
  }

  const handleExitGame = () => {
    setIsPlaying(false)
  }

  if (isPlaying) {
    return <MusicQuiz config={gameConfig} onExit={handleExitGame} />
  }

  return (
    <DynamicBackground className="flex min-h-screen flex-col p-4 md:p-8">
      <div className="w-full max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex justify-between items-center bg-black/40 p-6 rounded-xl border border-white/10 backdrop-blur-md">
          <div>
            <h1 className="text-4xl font-black tracking-wider uppercase text-white mb-1" style={{ fontFamily: 'Impact, Arial Black, sans-serif', textShadow: '0 0 20px rgba(236, 72, 153, 0.8)' }}>
              MUSIC GAMES
            </h1>
            {session?.user?.name && (
              <p className="text-gray-300 font-medium">
                👋 Bienvenue, {session.user.name}
              </p>
            )}
          </div>
          <Button variant="ghost" onClick={() => signOut()} className="text-gray-400 hover:text-white">
            Déconnexion
          </Button>
        </header>

        {/* Main Content */}
        <Tabs defaultValue="solo" value={activeTab} onValueChange={(v) => setActiveTab(v as "solo" | "multiplayer")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-16 bg-black/60 border border-white/10 p-1 rounded-xl mb-8">
            <TabsTrigger value="solo" className="text-xl font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-fuchsia-600 data-[state=active]:text-white h-full rounded-lg transition-all">
              🎮 MODE SOLO
            </TabsTrigger>
            <TabsTrigger value="multiplayer" className="text-xl font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white h-full rounded-lg transition-all">
              👥 MULTIJOUEUR
            </TabsTrigger>
          </TabsList>

          <TabsContent value="solo" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Game Mode & Settings */}
              <div className="lg:col-span-7 space-y-6">
                <Card className="border-2 border-white/10 bg-black/60 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold text-white">Configuration de la partie</CardTitle>
                    <CardDescription>Personnalisez votre expérience de jeu</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <GameModeSelector
                      selectedMode={gameConfig.gameMode}
                      onModeChange={(mode) => setGameConfig({ ...gameConfig, gameMode: mode })}
                    />

                    {gameConfig.gameMode !== "survival" && (
                      <div className="space-y-4">
                        <label className="text-sm font-bold text-gray-200 uppercase tracking-wide block">Nombre de titres</label>
                        <div className="space-y-3 bg-black/40 p-4 rounded-lg border border-white/5">
                          <div className="flex items-center gap-4">
                            <Slider
                              min={1}
                              max={MAX_TRACKS}
                              step={1}
                              value={[gameConfig.trackCount]}
                              onValueChange={(value) => setGameConfig({ ...gameConfig, trackCount: value[0] })}
                              className="flex-1"
                            />
                            <span className="text-3xl font-black bg-gradient-to-r from-pink-400 to-fuchsia-500 bg-clip-text text-transparent w-12 text-center">
                              {gameConfig.trackCount}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Music Source */}
              <div className="lg:col-span-5 space-y-6">
                <Card className="border-2 border-white/10 bg-black/60 backdrop-blur-md h-full">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold text-white">Source Musicale</CardTitle>
                    <CardDescription>D'où viennent les chansons ?</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setGameConfig({ ...gameConfig, source: "random", sourceId: undefined })}
                        className={gameConfig.source === "random" 
                          ? "bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold border-2 border-pink-400 shadow-lg shadow-pink-500/50 py-6" 
                          : "border-2 border-gray-600 bg-transparent text-white font-semibold py-6 hover:bg-gray-800/50"}
                      >
                        🎲 ALÉATOIRE
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setGameConfig({ ...gameConfig, source: "liked", sourceId: undefined })}
                        className={gameConfig.source === "liked" 
                          ? "bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold border-2 border-pink-400 shadow-lg shadow-pink-500/50 py-6" 
                          : "border-2 border-gray-600 bg-transparent text-white font-semibold py-6 hover:bg-gray-800/50"}
                      >
                        ❤️ LIKÉS
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setGameConfig({ ...gameConfig, source: "playlist", sourceId: undefined })}
                        className={gameConfig.source === "playlist" 
                          ? "bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold border-2 border-pink-400 shadow-lg shadow-pink-500/50 py-6" 
                          : "border-2 border-gray-600 bg-transparent text-white font-semibold py-6 hover:bg-gray-800/50"}
                      >
                        📜 PLAYLIST
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setGameConfig({ ...gameConfig, source: "album", sourceId: undefined })}
                        className={gameConfig.source === "album" 
                          ? "bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold border-2 border-pink-400 shadow-lg shadow-pink-500/50 py-6" 
                          : "border-2 border-gray-600 bg-transparent text-white font-semibold py-6 hover:bg-gray-800/50"}
                      >
                        💽 ALBUM
                      </Button>
                    </div>

                    {/* Playlist Selection */}
                    {gameConfig.source === "playlist" && (
                      <div className="space-y-3 pt-4 border-t border-gray-700 animate-in fade-in slide-in-from-top-2">
                        <label className="text-sm font-bold text-gray-200 uppercase tracking-wide block">Vos Playlists</label>
                        <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                          {playlists.map((playlist) => (
                            <Card
                              key={playlist.id}
                              className={`cursor-pointer transition-all border-0 ${selectedPlaylist === playlist.id ? "bg-pink-900/40 ring-2 ring-pink-500" : "bg-gray-800/40 hover:bg-gray-700/40"}`}
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
                                    className="rounded shadow-md"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-white truncate">{playlist.name}</p>
                                  <p className="text-sm text-gray-400">{playlist.tracks.total} titres</p>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Search (Album/Random) */}
                    {(gameConfig.source === "album" || gameConfig.source === "random") && (
                      <div className="space-y-3 pt-4 border-t border-gray-700 animate-in fade-in slide-in-from-top-2">
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
                          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {gameConfig.source === "random" ? (
                              <p className="text-sm text-green-400 font-medium">
                                ✅ {searchResults.length} chansons trouvées
                              </p>
                            ) : (
                              searchResults.map((track) => (
                                <Card
                                  key={track.id}
                                  className={`cursor-pointer transition-all border-0 ${selectedAlbum === track.album.id ? "bg-pink-900/40 ring-2 ring-pink-500" : "bg-gray-800/40 hover:bg-gray-700/40"}`}
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
                                        className="rounded shadow-md"
                                      />
                                    ) : (
                                      <div className="w-12 h-12 rounded bg-gray-700 flex items-center justify-center">
                                        <span className="text-xl">🎵</span>
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-white truncate">{track.album.name}</p>
                                      <p className="text-sm text-gray-400 truncate">
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
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Start Button */}
            <div className="flex justify-center pt-8 pb-12">
              <Button
                onClick={handleStartSoloGame}
                className="w-full max-w-md bg-gradient-to-r from-pink-500 via-fuchsia-500 to-pink-600 hover:from-pink-600 hover:via-fuchsia-600 hover:to-pink-700 text-white font-black text-2xl py-8 border-2 border-pink-400 shadow-2xl shadow-pink-500/50 hover:shadow-pink-500/80 hover:scale-105 transition-all duration-200 uppercase tracking-widest"
                size="lg"
                disabled={
                  !isReady ||
                  (gameConfig.source === "playlist" && !gameConfig.sourceId) ||
                  (gameConfig.source === "album" && !gameConfig.sourceId) ||
                  (gameConfig.source === "random" && searchResults.length === 0)
                }
              >
                {!isReady ? "Chargement Spotify..." : "🎸 LANCER LA PARTIE 🎸"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="multiplayer">
            <MultiplayerLobbySelect onBack={() => setActiveTab("solo")} />
          </TabsContent>
        </Tabs>
      </div>
    </DynamicBackground>
  )
}
