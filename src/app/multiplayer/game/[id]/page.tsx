/**
 * Page de jeu multijoueur
 */

import { MultiplayerGame } from '@/components/multiplayer/MultiplayerGame';

export default function GamePage({ params }: { params: { id: string } }) {
  return <MultiplayerGame roomId={params.id} />;
}
