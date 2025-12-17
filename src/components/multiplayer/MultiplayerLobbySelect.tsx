"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { GameModeSelector } from "@/components/game/GameModeSelector"
import { useMultiplayerRoom } from "@/hooks/useMultiplayerRoom"
import { useRouter } from "next/navigation"
import { GameConfiguration, GameModeType } from "@/types/game"

const MAX_TRACKS = 20

interface MultiplayerLobbySelectProps {
  onBack: () => void
}

export function MultiplayerLobbySelect({ onBack }: MultiplayerLobbySelectProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { createRoom, joinRoom, isLoading, error } = useMultiplayerRoom()
  
  const [activeTab, setActiveTab] = useState<"create" | "join" | "matchmaking">("create")
  const [roomCode, setRoomCode] = useState("")
  
  // Game Configuration State
  const [gameConfig, setGameConfig] = useState<GameConfiguration>({
    gameMode: "lyrics-quiz",
    source: "random",
    trackCount: 5,
  })
  const [isPrivate, setIsPrivate] = useState(false)

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

  const handleCreateRoom = async () => {
    if (!session?.user?.id) {
      console.error("User ID missing from session")
      return
    }
    
    // Validation
    if (gameConfig.source === "playlist" && !gameConfig.sourceId) return
    if (gameConfig.source === "album" && !gameConfig.sourceId) return
    if (gameConfig.source === "random" && searchResults.length === 0) return

    let finalSourceId = gameConfig.sourceId || ""
    if (gameConfig.source === "random") finalSourceId = "random" // Placeholder
    if (gameConfig.source === "liked") finalSourceId = "liked" // Placeholder

    try {
      const room = await createRoom({
        game_mode: gameConfig.gameMode,
        source_type: gameConfig.source,
        source_id: finalSourceId,
        is_private: isPrivate,
        host_id: session.user.id!,
        host_username: session.user.name || 'Anonymous',
        host_avatar_url: session.user.image || undefined,
      })

      router.push(`/multiplayer/lobby/${room.id}`)
    } catch (err) {
      console.error('Failed to create room:', err)
      if (typeof err === 'object' && err !== null) {
        console.error('Error details:', JSON.stringify(err, null, 2))
      }
    }
  }

  const handleJoinRoom = async () => {
    if (!session?.user?.id || !roomCode) return

    try {
      const room = await joinRoom({
        room_code: roomCode.toUpperCase(),
        user_id: session.user.id,
        username: session.user.name || 'Anonymous',
        avatar_url: session.user.image || undefined,
      })

      router.push(`/multiplayer/lobby/${room.id}`)
    } catch (err) {
      console.error('Failed to join room:', err)
    }
  }

  if (!session) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle>Connexion requise</CardTitle>
          <CardDescription>
            Vous devez être connecté à Spotify pour jouer en multijoueur
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onBack} className="w-full">
            Retour
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button onClick={onBack} variant="ghost" className="text-white hover:text-pink-400">
          ← Retour au menu
        </Button>
      </div>

      {error && (
        <Card className="border-red-500 bg-red-900/20">
          <CardContent className="pt-6">
            <p className="text-red-400 font-bold">⚠️ {error}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="create" value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-14 bg-black/40 border border-white/10 p-1 rounded-lg mb-6">
          <TabsTrigger value="create" className="text-lg font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            ➕ CRÉER
          </TabsTrigger>
          <TabsTrigger value="join" className="text-lg font-bold data-[state=active]:bg-green-600 data-[state=active]:text-white">
            🔑 REJOINDRE
          </TabsTrigger>
          <TabsTrigger value="matchmaking" className="text-lg font-bold data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            🎲 MATCHMAKING
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Game Mode & Settings */}
            <div className="lg:col-span-7 space-y-6">
              <Card className="border-2 border-white/10 bg-black/60 backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-white">Configuration de la salle</CardTitle>
                  <CardDescription>Paramètres de la partie multijoueur</CardDescription>
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
                          <span className="text-3xl font-black bg-gradient-to-r from-blue-400 to-cyan-500 bg-clip-text text-transparent w-12 text-center">
                            {gameConfig.trackCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-3 bg-black/40 p-4 rounded-lg border border-white/5">
                    <input
                      type="checkbox"
                      id="private-room"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      className="w-6 h-6 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-700"
                    />
                    <label htmlFor="private-room" className="text-lg font-medium text-white cursor-pointer select-none">
                      🔒 Partie Privée (Code requis)
                    </label>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Music Source */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="border-2 border-white/10 bg-black/60 backdrop-blur-md h-full">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-white">Source Musicale</CardTitle>
                  <CardDescription>Choix des morceaux pour tous les joueurs</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setGameConfig({ ...gameConfig, source: "random", sourceId: undefined })}
                      className={gameConfig.source === "random" 
                        ? "bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-bold border-2 border-blue-400 shadow-lg shadow-blue-500/50 py-6" 
                        : "border-2 border-gray-600 bg-transparent text-white font-semibold py-6 hover:bg-gray-800/50"}
                    >
                      🎲 ALÉATOIRE
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setGameConfig({ ...gameConfig, source: "liked", sourceId: undefined })}
                      className={gameConfig.source === "liked" 
                        ? "bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-bold border-2 border-blue-400 shadow-lg shadow-blue-500/50 py-6" 
                        : "border-2 border-gray-600 bg-transparent text-white font-semibold py-6 hover:bg-gray-800/50"}
                    >
                      ❤️ LIKÉS
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setGameConfig({ ...gameConfig, source: "playlist", sourceId: undefined })}
                      className={gameConfig.source === "playlist" 
                        ? "bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-bold border-2 border-blue-400 shadow-lg shadow-blue-500/50 py-6" 
                        : "border-2 border-gray-600 bg-transparent text-white font-semibold py-6 hover:bg-gray-800/50"}
                    >
                      📜 PLAYLIST
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setGameConfig({ ...gameConfig, source: "album", sourceId: undefined })}
                      className={gameConfig.source === "album" 
                        ? "bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-bold border-2 border-blue-400 shadow-lg shadow-blue-500/50 py-6" 
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
                            className={`cursor-pointer transition-all border-0 ${selectedPlaylist === playlist.id ? "bg-blue-900/40 ring-2 ring-blue-500" : "bg-gray-800/40 hover:bg-gray-700/40"}`}
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
                          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold border-2 border-blue-400"
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
                                className={`cursor-pointer transition-all border-0 ${selectedAlbum === track.album.id ? "bg-blue-900/40 ring-2 ring-blue-500" : "bg-gray-800/40 hover:bg-gray-700/40"}`}
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

          <div className="flex justify-center pt-8">
            <Button
              onClick={handleCreateRoom}
              className="w-full max-w-md bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 hover:from-blue-600 hover:via-cyan-600 hover:to-blue-700 text-white font-black text-2xl py-8 border-2 border-blue-400 shadow-2xl shadow-blue-500/50 hover:shadow-blue-500/80 hover:scale-105 transition-all duration-200 uppercase tracking-widest"
              size="lg"
              disabled={
                isLoading ||
                (gameConfig.source === "playlist" && !gameConfig.sourceId) ||
                (gameConfig.source === "album" && !gameConfig.sourceId) ||
                (gameConfig.source === "random" && searchResults.length === 0)
              }
            >
              {isLoading ? "CRÉATION..." : "🚀 CRÉER LA SALLE"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="join" className="flex justify-center py-12">
          <Card className="w-full max-w-md border-2 border-white/10 bg-black/60 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-white text-center">Rejoindre une partie</CardTitle>
              <CardDescription className="text-center">Entrez le code à 6 caractères</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Input
                placeholder="CODE"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="text-center text-4xl font-black tracking-[0.5em] h-20 uppercase bg-black/50 border-2 border-white/20 focus:border-green-500 transition-all"
              />
              <Button
                onClick={handleJoinRoom}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-xl py-6"
                disabled={isLoading || roomCode.length !== 6}
              >
                {isLoading ? 'CONNEXION...' : 'REJOINDRE'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matchmaking" className="flex justify-center py-12">
          <Card className="w-full max-w-md border-2 border-white/10 bg-black/60 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-white text-center">Matchmaking</CardTitle>
              <CardDescription className="text-center">Trouvez des joueurs rapidement</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <div className="text-6xl mb-4">🎲</div>
              <p className="text-gray-300">
                Le système de matchmaking est en cours de développement.
                Revenez bientôt pour affronter des joueurs du monde entier !
              </p>
              <Button variant="outline" disabled className="w-full">
                Bientôt disponible
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
