/**
 * Hook pour gérer le matchmaking automatique
 */

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabase';
import type { Room } from '@/types/multiplayer';

interface MatchmakingOptions {
  gameMode: string;
  sourceType: string;
  sourceId: string;
}

export function useMatchmaking(options?: MatchmakingOptions) {
  const { data: session } = useSession();
  const [isSearching, setIsSearching] = useState(false);
  const [foundRoom, setFoundRoom] = useState<Room | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Rechercher une salle publique disponible
  const findAvailableRoom = useCallback(async (): Promise<Room | null> => {
    if (!options) return null;

    const { data: rooms, error } = await supabase
      .from('rooms')
      .select('*, room_players(count)')
      .eq('status', 'waiting')
      .eq('is_private', false)
      .eq('game_mode', options.gameMode)
      .eq('source_type', options.sourceType)
      .eq('source_id', options.sourceId)
      .lt('room_players.count', 10)
      .order('created_at', { ascending: true })
      .limit(1);

    if (error || !rooms || rooms.length === 0) {
      return null;
    }

    return rooms[0] as Room;
  }, [options]);

  // Créer une nouvelle salle pour le matchmaking
  const createMatchmakingRoom = useCallback(async (): Promise<Room> => {
    if (!session?.user || !options) {
      throw new Error('Session or options not available');
    }

    // Créer une entrée dans la file d'attente
    const { data: queue, error: queueError } = await supabase
      .from('matchmaking_queues')
      .insert({
        game_mode: options.gameMode,
        source_type: options.sourceType,
        source_id: options.sourceId,
      })
      .select()
      .single();

    if (queueError) throw queueError;

    // Générer un code de salle
    const { data: code, error: codeError } = await supabase.rpc('generate_room_code');
    if (codeError) throw codeError;

    // Créer la salle
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({
        code,
        host_id: session.user.id,
        game_mode: options.gameMode,
        source_type: options.sourceType,
        source_id: options.sourceId,
        is_private: false,
        matchmaking_queue_id: queue.id,
        status: 'waiting',
      })
      .select()
      .single();

    if (roomError) throw roomError;

    // Ajouter le joueur à la salle
    const { error: playerError } = await supabase.from('room_players').insert({
      room_id: room.id,
      user_id: session.user.id,
      username: session.user.name || 'Anonymous',
      avatar_url: session.user.image,
      is_host: true,
      is_ready: false,
    });

    if (playerError) throw playerError;

    return room;
  }, [session, options]);

  // Démarrer la recherche de matchmaking
  const startMatchmaking = useCallback(async () => {
    if (!session?.user || !options) {
      setError('Session or options not available');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      // D'abord, chercher une salle disponible
      const availableRoom = await findAvailableRoom();

      if (availableRoom) {
        // Rejoindre la salle trouvée
        const { error: joinError } = await supabase.from('room_players').insert({
          room_id: availableRoom.id,
          user_id: session.user.id,
          username: session.user.name || 'Anonymous',
          avatar_url: session.user.image,
          is_host: false,
          is_ready: false,
        });

        if (joinError) throw joinError;

        setFoundRoom(availableRoom);
      } else {
        // Créer une nouvelle salle
        const newRoom = await createMatchmakingRoom();
        setFoundRoom(newRoom);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Matchmaking failed';
      setError(message);
      setIsSearching(false);
    }
  }, [session, options, findAvailableRoom, createMatchmakingRoom]);

  // Annuler la recherche
  const cancelMatchmaking = useCallback(async () => {
    setIsSearching(false);
    setFoundRoom(null);
    setQueuePosition(null);
  }, []);

  // Surveiller la file d'attente
  useEffect(() => {
    if (!isSearching || !options) return;

    const channel = supabase
      .channel('matchmaking')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'matchmaking_queues',
          filter: `game_mode=eq.${options.gameMode}`,
        },
        async () => {
          // Nouvelle salle créée, vérifier si on peut rejoindre
          if (!foundRoom) {
            const room = await findAvailableRoom();
            if (room && session?.user) {
              const { error } = await supabase.from('room_players').insert({
                room_id: room.id,
                user_id: session.user.id,
                username: session.user.name || 'Anonymous',
                avatar_url: session.user.image,
                is_host: false,
                is_ready: false,
              });

              if (!error) {
                setFoundRoom(room);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [isSearching, options, foundRoom, session, findAvailableRoom]);

  return {
    isSearching,
    foundRoom,
    queuePosition,
    error,
    startMatchmaking,
    cancelMatchmaking,
  };
}
