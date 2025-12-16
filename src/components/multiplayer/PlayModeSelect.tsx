/**
 * Composant pour choisir entre mode solo et multijoueur
 */

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PlayModeSelectProps {
  onSelectMode: (mode: 'solo' | 'multiplayer') => void;
}

export function PlayModeSelect({ onSelectMode }: PlayModeSelectProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">Choisissez votre mode de jeu</h1>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Mode Solo */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary">
            <CardHeader>
              <CardTitle className="text-2xl">🎮 Solo</CardTitle>
              <CardDescription>Jouez seul et battez vos propres records</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Plusieurs modes de jeu disponibles</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Vos playlists et albums Spotify</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Classement global pour chaque mode</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Pas de temps d'attente</span>
                </li>
              </ul>
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => onSelectMode('solo')}
              >
                Jouer en Solo
              </Button>
            </CardContent>
          </Card>

          {/* Mode Multijoueur */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary">
            <CardHeader>
              <CardTitle className="text-2xl">👥 Multijoueur</CardTitle>
              <CardDescription>Affrontez d'autres joueurs en temps réel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Jusqu'à 10 joueurs par partie</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Créez une partie privée ou publique</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Chat en direct dans le lobby</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Matchmaking automatique disponible</span>
                </li>
              </ul>
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => onSelectMode('multiplayer')}
              >
                Jouer en Multijoueur
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>💡 Astuce : Le mode multijoueur nécessite que vous soyez connecté à Spotify</p>
        </div>
      </div>
    </div>
  );
}
