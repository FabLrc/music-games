"use client"

import { useState, useEffect, useMemo } from "react"
import { useSession, signOut } from "next-auth/react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { DynamicBackground } from "@/components/DynamicBackground"
import { MultiplayerLobbySelect } from "@/components/multiplayer/MultiplayerLobbySelect"
import { MusicQuiz } from "@/components/game/MusicQuiz2"
import { GameConfiguration, GameModeType } from "@/types/game"
import { useSpotifyPlayer } from "@/hooks/useSpotifyPlayer"

const MAX_TRACKS = 20

const GAME_MODES = [
  { id: "lyrics-quiz" as GameModeType, name: "Lyrics Quiz", icon: "🎤", description: "Devinez les paroles manquantes" },
  { id: "blind-test-title" as GameModeType, name: "Blind Test", icon: "🎵", description: "Devinez le titre" },
  { id: "blind-test-artist" as GameModeType, name: "Artiste", icon: "🎸", description: "Devinez l'artiste" },
  { id: "survival" as GameModeType, name: "Survival", icon: "⚡", description: "Une seule vie" },
  { id: "karaoke" as GameModeType, name: "Karaoké", icon: "🎙️", description: "Chantez en live" },
]

const SOURCE_OPTIONS = [
  { id: "random", icon: "🎲", label: "Aléatoire" },
  { id: "liked", icon: "❤️", label: "Likés" },
  { id: "playlist", icon: "📜", label: "Playlist" },
  { id: "album", icon: "💽", label: "Album" },
]

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
    timeLimit: 20,
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

  // Get current mode info for preview
  const currentMode = useMemo(() => GAME_MODES.find(m => m.id === gameConfig.gameMode), [gameConfig.gameMode])
  const currentSource = useMemo(() => SOURCE_OPTIONS.find(s => s.id === gameConfig.source), [gameConfig.source])
  const selectedPlaylistInfo = useMemo(() => playlists.find(p => p.id === gameConfig.sourceId), [playlists, gameConfig.sourceId])

  // Check if game can start
  const canStartGame = useMemo(() => {
    if (!isReady) return false
    if (gameConfig.source === "playlist" && !gameConfig.sourceId) return false
    if (gameConfig.source === "album" && !gameConfig.sourceId) return false
    return true
  }, [isReady, gameConfig.source, gameConfig.sourceId])

  if (isPlaying) {
    return <MusicQuiz config={gameConfig} onExit={handleExitGame} />
  }

  return (
    <DynamicBackground className="flex h-[calc(100vh-4rem)] flex-col p-3 md:p-4 overflow-hidden">
      <div className="w-full max-w-6xl mx-auto flex flex-col h-full gap-3">
        {/* Header compact */}
        <div className="flex items-center justify-between shrink-0">
          <h2 className="text-lg md:text-xl font-bold text-white">
            Bienvenue, {session?.user?.name} 👋
          </h2>
        </div>

        {/* Mode Tabs - More compact */}
        <Tabs defaultValue="solo" value={activeTab} onValueChange={(v) => setActiveTab(v as "solo" | "multiplayer")} className="w-full flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 h-11 shrink-0 bg-black/70 border border-white/10 p-1 rounded-full mb-3">
            <TabsTrigger value="solo" className="text-sm font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-fuchsia-600 data-[state=active]:text-white rounded-full transition-all">
              🎮 Solo
            </TabsTrigger>
            <TabsTrigger value="multiplayer" className="text-sm font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white rounded-full transition-all">
              👥 Multi
            </TabsTrigger>
          </TabsList>

          <TabsContent value="solo" className="flex-1 flex flex-col overflow-hidden data-[state=active]:flex gap-3">
            {/* Main Grid - 3 columns layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 overflow-hidden">
              
              {/* Column 1: Game Modes */}
              <Card className="border border-white/10 bg-black/50 backdrop-blur-md overflow-hidden">
                <CardContent className="p-3 h-full flex flex-col">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Mode de jeu</h3>
                  <div className="grid grid-cols-1 gap-2 flex-1 overflow-y-auto custom-scrollbar">
                    {GAME_MODES.map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setGameConfig({ ...gameConfig, gameMode: mode.id })}
                        className={`flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                          gameConfig.gameMode === mode.id
                            ? "bg-gradient-to-r from-pink-500/90 to-fuchsia-600/90 text-white shadow-lg shadow-pink-500/30 ring-1 ring-pink-400"
                            : "bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white"
                        }`}
                      >
                        <span className="text-2xl w-10 text-center">{mode.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{mode.name}</p>
                          <p className="text-[11px] text-gray-300/80">{mode.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Column 2: Music Source */}
              <Card className="border border-white/10 bg-black/50 backdrop-blur-md overflow-hidden">
                <CardContent className="p-3 h-full flex flex-col">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Source musicale</h3>
                  
                  {/* Source buttons - 2x2 grid compact */}
                  <div className="grid grid-cols-2 gap-1.5 mb-3">
                    {SOURCE_OPTIONS.map((source) => (
                      <button
                        key={source.id}
                        onClick={() => setGameConfig({ ...gameConfig, source: source.id as GameConfiguration["source"], sourceId: undefined })}
                        className={`flex items-center justify-center gap-1.5 p-2 rounded-lg text-xs font-medium transition-all ${
                          gameConfig.source === source.id
                            ? "bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white shadow-md"
                            : "bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white"
                        }`}
                      >
                        <span>{source.icon}</span>
                        <span>{source.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Playlist Selection */}
                  {gameConfig.source === "playlist" && (
                    <div className="flex-1 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2">
                      <div className="grid grid-cols-1 gap-1.5">
                        {playlists.map((playlist) => (
                          <button
                            key={playlist.id}
                            onClick={() => {
                              setSelectedPlaylist(playlist.id)
                              setGameConfig({ ...gameConfig, sourceId: playlist.id })
                            }}
                            className={`flex items-center gap-2 p-2 rounded-lg text-left transition-all ${
                              selectedPlaylist === playlist.id
                                ? "bg-pink-500/30 ring-1 ring-pink-500"
                                : "bg-white/5 hover:bg-white/10"
                            }`}
                          >
                            {playlist.images[0] && (
                              <Image
                                src={playlist.images[0].url}
                                alt={playlist.name}
                                width={32}
                                height={32}
                                className="rounded"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white text-xs truncate">{playlist.name}</p>
                              <p className="text-[10px] text-gray-400">{playlist.tracks.total} titres</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Search (Album/Random) */}
                  {(gameConfig.source === "album" || gameConfig.source === "random") && (
                    <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2">
                      <div className="flex gap-1.5 mb-2">
                        <Input
                          placeholder={gameConfig.source === "album" ? "Rechercher album..." : "Rechercher..."}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 h-8 text-xs"
                        />
                        <Button 
                          onClick={handleSearch}
                          className="bg-pink-500 hover:bg-pink-600 text-white h-8 w-8 p-0 shrink-0"
                          size="sm"
                        >
                          🔍
                        </Button>
                      </div>

                      {searchResults.length > 0 && (
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                          {gameConfig.source === "random" ? (
                            <p className="text-xs text-green-400 font-medium p-2 bg-green-500/10 rounded-lg">
                              ✅ {searchResults.length} chansons trouvées
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 gap-1.5">
                              {searchResults.map((track) => (
                                <button
                                  key={track.id}
                                  onClick={() => {
                                    setSelectedAlbum(track.album.id)
                                    setGameConfig({ ...gameConfig, sourceId: track.album.id })
                                  }}
                                  className={`flex items-center gap-2 p-2 rounded-lg text-left transition-all ${
                                    selectedAlbum === track.album.id
                                      ? "bg-pink-500/30 ring-1 ring-pink-500"
                                      : "bg-white/5 hover:bg-white/10"
                                  }`}
                                >
                                  {track.album?.images?.length > 0 ? (
                                    <Image
                                      src={track.album.images[2]?.url || track.album.images[0]?.url || ""}
                                      alt={track.album.name}
                                      width={32}
                                      height={32}
                                      className="rounded"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center text-sm">🎵</div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-white text-xs truncate">{track.album.name}</p>
                                    <p className="text-[10px] text-gray-400 truncate">{track.artists.map((a) => a.name).join(", ")}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Column 3: Preview & Launch */}
              <Card className="border border-white/10 bg-black/50 backdrop-blur-md overflow-hidden">
                <CardContent className="p-3 h-full flex flex-col">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Configuration</h3>
                  
                  {/* Session Preview */}
                  <div className="flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
                    {/* Selected mode preview */}
                    <div className="bg-gradient-to-br from-pink-500/20 to-fuchsia-600/20 rounded-xl p-3 border border-pink-500/30">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{currentMode?.icon}</span>
                        <div>
                          <p className="font-bold text-white">{currentMode?.name}</p>
                          <p className="text-xs text-gray-300">{currentMode?.description}</p>
                        </div>
                      </div>
                    </div>

                    {/* Source info */}
                    <div className="flex justify-between items-center py-2 px-3 bg-white/5 rounded-lg">
                      <span className="text-xs text-gray-400">Source</span>
                      <span className="text-white text-sm font-medium">{currentSource?.icon} {currentSource?.label}</span>
                    </div>
                    
                    {gameConfig.source === "playlist" && selectedPlaylistInfo && (
                      <div className="flex items-center gap-2 py-2 px-3 bg-white/5 rounded-lg">
                        {selectedPlaylistInfo.images[0] && (
                          <Image
                            src={selectedPlaylistInfo.images[0].url}
                            alt={selectedPlaylistInfo.name}
                            width={28}
                            height={28}
                            className="rounded"
                          />
                        )}
                        <span className="text-white text-xs font-medium truncate">{selectedPlaylistInfo.name}</span>
                      </div>
                    )}

                    {/* Track count slider */}
                    {gameConfig.gameMode !== "survival" && (
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-400">Nombre de titres</span>
                          <span className="text-lg font-black bg-gradient-to-r from-pink-400 to-fuchsia-500 bg-clip-text text-transparent">
                            {gameConfig.trackCount}
                          </span>
                        </div>
                        <Slider
                          min={1}
                          max={MAX_TRACKS}
                          step={1}
                          value={[gameConfig.trackCount]}
                          onValueChange={(value) => setGameConfig({ ...gameConfig, trackCount: value[0] })}
                        />
                      </div>
                    )}
                    
                    {/* Time limit for blind test */}
                    {(gameConfig.gameMode === "blind-test-title" || gameConfig.gameMode === "blind-test-artist") && (
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-400">Temps de réponse</span>
                          <span className="text-lg font-black bg-gradient-to-r from-blue-400 to-cyan-500 bg-clip-text text-transparent">
                            {gameConfig.timeLimit || 20}s
                          </span>
                        </div>
                        <Slider
                          min={5}
                          max={60}
                          step={5}
                          value={[gameConfig.timeLimit || 20]}
                          onValueChange={(value) => setGameConfig({ ...gameConfig, timeLimit: value[0] })}
                        />
                      </div>
                    )}

                    {/* Validation messages */}
                    {!canStartGame && (
                      <div className="mt-auto">
                        {!isReady && (
                          <p className="text-xs text-yellow-400 bg-yellow-500/10 p-2 rounded-lg">
                            ⏳ Connexion à Spotify...
                          </p>
                        )}
                        {isReady && gameConfig.source === "playlist" && !gameConfig.sourceId && (
                          <p className="text-xs text-orange-400 bg-orange-500/10 p-2 rounded-lg">
                            📜 Sélectionnez une playlist
                          </p>
                        )}
                        {isReady && gameConfig.source === "album" && !gameConfig.sourceId && (
                          <p className="text-xs text-orange-400 bg-orange-500/10 p-2 rounded-lg">
                            💽 Recherchez et sélectionnez un album
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Start Button */}
                  <Button
                    onClick={handleStartSoloGame}
                    className="w-full mt-4 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-pink-600 hover:from-pink-600 hover:via-fuchsia-600 hover:to-pink-700 text-white font-bold text-sm py-3 border border-pink-400/50 shadow-xl shadow-pink-500/40 hover:shadow-pink-500/60 hover:scale-[1.02] transition-all duration-200 uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    size="lg"
                    disabled={!canStartGame}
                  >
                    {!isReady ? "⏳ Chargement..." : "🎸 Lancer la partie"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="multiplayer" className="flex-1 overflow-hidden data-[state=active]:flex flex-col">
            <MultiplayerLobbySelect onBack={() => setActiveTab("solo")} />
          </TabsContent>
        </Tabs>
      </div>
    </DynamicBackground>
  )
}
