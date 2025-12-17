/**
 * Page de jeu multijoueur
 */

import { MultiplayerGame } from '@/components/multiplayer/MultiplayerGame';

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MultiplayerGame roomId={id} />;
}
