/**
 * Page d'accueil du multijoueur
 */

'use client';

import { useState } from 'react';
import { PlayModeSelect } from '@/components/multiplayer/PlayModeSelect';
import { MultiplayerLobbySelect } from '@/components/multiplayer/MultiplayerLobbySelect';
import { useRouter } from 'next/navigation';

export default function MultiplayerPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'select' | 'solo' | 'multiplayer'>('select');

  const handleModeSelect = (selectedMode: 'solo' | 'multiplayer') => {
    if (selectedMode === 'solo') {
      // Rediriger vers la page de jeu solo existante
      router.push('/');
    } else {
      setMode('multiplayer');
    }
  };

  if (mode === 'select') {
    return <PlayModeSelect onSelectMode={handleModeSelect} />;
  }

  if (mode === 'multiplayer') {
    return <MultiplayerLobbySelect onBack={() => setMode('select')} />;
  }

  return null;
}
