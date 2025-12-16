/**
 * Composant pour créer ou rejoindre une salle multijoueur
 */

'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useMultiplayerRoom } from '@/hooks/useMultiplayerRoom';
import { useRouter } from 'next/navigation';
import type { GameMode } from '@/types/game';

interface MultiplayerLobbySelectProps {
  onBack: () => void;
}

export function MultiplayerLobbySelect({ onBack }: MultiplayerLobbySelectProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { createRoom, joinRoom, isLoading, error } = useMultiplayerRoom();
  const [roomCode, setRoomCode] = useState('');
  const [selectedMode, setSelectedMode] = useState<'create' | 'join' | 'matchmaking' | null>(null);

  // États pour la création de partie
  const [gameMode, setGameMode] = useState<GameMode>('lyrics-quiz');
  const [isPrivate, setIsPrivate] = useState(false);
  const [sourceType, setSourceType] = useState<'playlist' | 'album'>('playlist');
  const [sourceId, setSourceId] = useState('');

  const handleCreateRoom = async () => {
    if (!session?.user || !sourceId) return;

    try {
      const room = await createRoom({
        game_mode: gameMode,
        source_type: sourceType,
        source_id: sourceId,
        is_private: isPrivate,
        host_id: session.user.id!,
        host_username: session.user.name || 'Anonymous',
        host_avatar_url: session.user.image || undefined,
      });

      router.push(`/multiplayer/lobby/${room.id}`);
    } catch (err) {
      console.error('Failed to create room:', err);
    }
  };

  const handleJoinRoom = async () => {
    if (!session?.user || !roomCode) return;

    try {
      const room = await joinRoom({
        room_code: roomCode.toUpperCase(),
        user_id: session.user.id!,
        username: session.user.name || 'Anonymous',
        avatar_url: session.user.image || undefined,
      });

      router.push(`/multiplayer/lobby/${room.id}`);
    } catch (err) {
      console.error('Failed to join room:', err);
    }
  };

  const handleMatchmaking = () => {
    // TODO: Implémenter le matchmaking
    router.push('/multiplayer/matchmaking');
  };

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
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
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Button onClick={onBack} variant="outline">
            ← Retour
          </Button>
          <h1 className="text-3xl font-bold">Mode Multijoueur</h1>
        </div>

        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {!selectedMode && (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Créer une partie */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary">
              <CardHeader>
                <CardTitle>➕ Créer une partie</CardTitle>
                <CardDescription>Créez votre propre salle de jeu</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full" 
                  onClick={() => setSelectedMode('create')}
                  disabled={isLoading}
                >
                  Créer
                </Button>
              </CardContent>
            </Card>

            {/* Rejoindre avec un code */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary">
              <CardHeader>
                <CardTitle>🔑 Rejoindre</CardTitle>
                <CardDescription>Entrez un code de partie</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full" 
                  onClick={() => setSelectedMode('join')}
                  disabled={isLoading}
                >
                  Rejoindre
                </Button>
              </CardContent>
            </Card>

            {/* Matchmaking */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary">
              <CardHeader>
                <CardTitle>🎲 Matchmaking</CardTitle>
                <CardDescription>Trouvez une partie automatiquement</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full" 
                  onClick={() => setSelectedMode('matchmaking')}
                  disabled={isLoading}
                >
                  Rechercher
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Formulaire de création */}
        {selectedMode === 'create' && (
          <Card>
            <CardHeader>
              <CardTitle>Créer une partie</CardTitle>
              <CardDescription>Configurez votre partie multijoueur</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Mode de jeu</label>
                <select
                  className="w-full p-2 border rounded"
                  value={gameMode}
                  onChange={(e) => setGameMode(e.target.value as GameMode)}
                >
                  <option value="lyrics-quiz">Lyrics Quiz</option>
                  <option value="blind-test-title">Blind Test - Titre</option>
                  <option value="blind-test-artist">Blind Test - Artiste</option>
                  <option value="survival">Mode Survie</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Source</label>
                <select
                  className="w-full p-2 border rounded mb-2"
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value as 'playlist' | 'album')}
                >
                  <option value="playlist">Playlist</option>
                  <option value="album">Album</option>
                </select>
                <Input
                  placeholder={`ID ${sourceType === 'playlist' ? 'de la playlist' : "de l'album"}`}
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="private"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                />
                <label htmlFor="private" className="text-sm">
                  Partie privée (code requis pour rejoindre)
                </label>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setSelectedMode(null)}
                  variant="outline"
                  className="flex-1"
                  disabled={isLoading}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleCreateRoom}
                  className="flex-1"
                  disabled={isLoading || !sourceId}
                >
                  {isLoading ? 'Création...' : 'Créer la partie'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Formulaire de rejoindre */}
        {selectedMode === 'join' && (
          <Card>
            <CardHeader>
              <CardTitle>Rejoindre une partie</CardTitle>
              <CardDescription>Entrez le code de la partie</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Code de la partie (6 caractères)"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="text-center text-2xl font-mono"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => setSelectedMode(null)}
                  variant="outline"
                  className="flex-1"
                  disabled={isLoading}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleJoinRoom}
                  className="flex-1"
                  disabled={isLoading || roomCode.length !== 6}
                >
                  {isLoading ? 'Connexion...' : 'Rejoindre'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Matchmaking */}
        {selectedMode === 'matchmaking' && (
          <Card>
            <CardHeader>
              <CardTitle>Matchmaking</CardTitle>
              <CardDescription>Recherche d'une partie en cours...</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setSelectedMode(null)}
                variant="outline"
                className="w-full"
              >
                Annuler
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
