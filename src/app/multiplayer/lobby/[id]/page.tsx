/**
 * Page du lobby multijoueur
 */

import { MultiplayerLobby } from '@/components/multiplayer/MultiplayerLobby';

export default async function LobbyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MultiplayerLobby roomId={id} />;
}
