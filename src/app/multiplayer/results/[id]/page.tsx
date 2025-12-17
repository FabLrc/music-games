/**
 * Page de résultats multijoueur
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMultiplayerRoom } from '@/hooks/useMultiplayerRoom';

export default function ResultsPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { lobbyState } = useMultiplayerRoom(id);
  const [sortedPlayers, setSortedPlayers] = useState<any[]>([]);

  useEffect(() => {
    if (lobbyState?.players) {
      // Trier les joueurs par score décroissant
      const sorted = [...lobbyState.players].sort((a, b) => b.score - a.score);
      setSortedPlayers(sorted);
    }
  }, [lobbyState]);

  if (!lobbyState) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardContent className="pt-6">
            <p className="text-center">Chargement des résultats...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getMedalEmoji = (position: number) => {
    if (position === 0) return '🥇';
    if (position === 1) return '🥈';
    if (position === 2) return '🥉';
    return `${position + 1}.`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-center text-3xl">🏆 Résultats de la partie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sortedPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-4 rounded border ${
                    index === 0 ? 'bg-yellow-50 border-yellow-300 dark:bg-yellow-950/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold w-10 text-center">
                      {getMedalEmoji(index)}
                    </span>
                    {player.avatar_url && (
                      <img
                        src={player.avatar_url}
                        alt={player.username}
                        className="w-12 h-12 rounded-full"
                      />
                    )}
                    <div>
                      <p className="font-semibold text-lg">{player.username}</p>
                      {player.is_host && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                          HOST
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">{player.score}</p>
                    <p className="text-sm text-muted-foreground">
                      {Math.round((player.score / 10) * 100)}% de réussite
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex gap-3 justify-center">
              <Button onClick={() => router.push('/multiplayer')} size="lg">
                Nouvelle partie
              </Button>
              <Button onClick={() => router.push('/')} variant="outline" size="lg">
                Retour à l'accueil
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
