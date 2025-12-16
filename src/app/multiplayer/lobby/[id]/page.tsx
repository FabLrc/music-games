/**
 * Page du lobby multijoueur
 */

import { MultiplayerLobby } from '@/components/multiplayer/MultiplayerLobby';

export default function LobbyPage({ params }: { params: { id: string } }) {
  return <MultiplayerLobby roomId={params.id} />;
}
