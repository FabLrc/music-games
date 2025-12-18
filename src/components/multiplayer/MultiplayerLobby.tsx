/**
 * Composant du lobby multijoueur
 */

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useMultiplayerRoom } from '@/hooks/useMultiplayerRoom';
import type { RoomPlayer } from '@/types/multiplayer';

interface MultiplayerLobbyProps {
  roomId: string;
}

export function MultiplayerLobby({ roomId }: MultiplayerLobbyProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const {
    lobbyState,
    isLoading,
    error,
    leaveRoom,
    kickPlayer,
    toggleReady,
    startGame,
    sendChatMessage,
  } = useMultiplayerRoom(roomId);

  const [chatInput, setChatInput] = useState('');

  // Vérifier si tous les joueurs sont prêts
  const allPlayersReady =
    lobbyState?.players.filter((p) => p.is_connected).every((p) => p.is_ready) || false;

  const canStart = lobbyState?.currentUser?.is_host && allPlayersReady;

  useEffect(() => {
    // Rediriger vers le jeu quand la partie démarre
    if (lobbyState?.room.status === 'playing') {
      router.push(`/multiplayer/game/${roomId}`);
    }
  }, [lobbyState?.room.status, roomId, router]);

  const handleLeave = async () => {
    if (!session?.user?.id) return;
    await leaveRoom(roomId, session.user.id);
    router.push('/');
  };

  const handleKick = async (userId: string) => {
    await kickPlayer(roomId, userId);
  };

  const handleToggleReady = async () => {
    if (!session?.user?.id || !lobbyState?.currentUser) return;
    await toggleReady(roomId, session.user.id, !lobbyState.currentUser.is_ready);
  };

  const handleStart = async () => {
    try {
      await startGame(roomId);
    } catch (err) {
      console.error('Failed to start game:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    await sendChatMessage(roomId, chatInput);
    setChatInput('');
  };

  if (isLoading && !lobbyState) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardContent className="pt-6">
            <p className="text-center">Chargement du lobby...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!lobbyState) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardContent className="pt-6">
            <p className="text-center text-destructive">Salle introuvable</p>
            <Button onClick={() => router.push('/')} className="w-full mt-4">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { room, players, messages, currentUser } = lobbyState;

  return (
    <div className="h-screen flex flex-col overflow-hidden p-4 md:p-8">
      <div className="w-full max-w-7xl mx-auto flex flex-col h-full space-y-4">
        {/* En-tête */}
        <div className="shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold">Lobby</h1>
            <Button onClick={handleLeave} variant="outline">
              Quitter
            </Button>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Code: <span className="font-mono font-bold text-lg text-foreground">{room.code}</span></span>
            <span>•</span>
            <span>Mode: {room.game_mode}</span>
            <span>•</span>
            <span className="capitalize">
              {room.status === 'waiting' && '⏳ En attente'}
              {room.status === 'playing' && '▶️ En cours'}
              {room.status === 'finished' && '✅ Terminé'}
            </span>
          </div>
        </div>

        {error && (
          <Card className="mb-6 border-destructive shrink-0">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
          {/* Liste des joueurs */}
          <div className="lg:col-span-2 h-full overflow-y-auto custom-scrollbar">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle>Joueurs ({players.filter(p => p.is_connected).length}/10)</CardTitle>
                <CardDescription>
                  {allPlayersReady
                    ? '✅ Tous les joueurs sont prêts !'
                    : 'En attente que tous les joueurs soient prêts...'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                  {players
                    .filter((p) => p.is_connected)
                    .map((player) => (
                      <PlayerCard
                        key={player.id}
                        player={player}
                        isCurrentUser={player.user_id === session?.user?.id}
                        canKick={!!(currentUser?.is_host && !player.is_host)}
                        onKick={() => handleKick(player.user_id)}
                      />
                    ))}
                </div>

                {/* Boutons d'action */}
                <div className="mt-6 flex gap-2 shrink-0">
                  {currentUser && !currentUser.is_host && (
                    <Button
                      onClick={handleToggleReady}
                      variant={currentUser.is_ready ? 'outline' : 'default'}
                      className="flex-1"
                    >
                      {currentUser.is_ready ? '❌ Pas prêt' : '✅ Prêt'}
                    </Button>
                  )}
                  {currentUser?.is_host && (
                    <Button
                      onClick={handleStart}
                      disabled={!canStart}
                      className="flex-1"
                    >
                      {canStart ? '🚀 Lancer la partie' : '⏳ En attente des joueurs'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat */}
          <div className="h-full flex flex-col overflow-hidden">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle>Chat</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-0">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto mb-4 space-y-2 custom-scrollbar">
                  {messages.map((msg) => (
                    <div key={msg.id} className="text-sm">
                      <span className="font-semibold">{msg.username}:</span>{' '}
                      <span>{msg.message}</span>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucun message pour le moment
                    </p>
                  )}
                </div>

                {/* Input de chat */}
                <form onSubmit={handleSendMessage} className="flex gap-2 shrink-0">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Envoyer un message..."
                    maxLength={200}
                  />
                  <Button type="submit" disabled={!chatInput.trim()}>
                    Envoyer
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PlayerCardProps {
  player: RoomPlayer;
  isCurrentUser: boolean;
  canKick: boolean;
  onKick: () => void;
}

function PlayerCard({ player, isCurrentUser, canKick, onKick }: PlayerCardProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded border bg-card">
      <div className="flex items-center gap-3">
        {player.avatar_url && (
          <img
            src={player.avatar_url}
            alt={player.username}
            className="w-10 h-10 rounded-full"
          />
        )}
        <div>
          <p className="font-semibold flex items-center gap-2">
            {player.username}
            {player.is_host && <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">HOST</span>}
            {isCurrentUser && <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">VOUS</span>}
          </p>
          <p className="text-xs text-muted-foreground">
            {player.is_ready ? '✅ Prêt' : '⏳ Pas prêt'}
          </p>
        </div>
      </div>
      {canKick && (
        <Button
          onClick={onKick}
          variant="ghost"
          size="sm"
          className="text-destructive"
        >
          Exclure
        </Button>
      )}
    </div>
  );
}
