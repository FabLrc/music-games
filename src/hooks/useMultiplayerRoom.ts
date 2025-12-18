/**
 * Hook pour gérer les salles de jeu multijoueur
 */

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabase';
import type {
  Room,
  CreateRoomPayload,
  JoinRoomPayload,
  GameEvent,
  LobbyState,
} from '@/types/multiplayer';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useMultiplayerRoom(roomId?: string) {
  const { data: session } = useSession();
  const [lobbyState, setLobbyState] = useState<LobbyState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // Fonction pour générer un code de salle (Client-side)
  const generateRoomCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Créer une salle
  const createRoom = useCallback(
    async (payload: CreateRoomPayload): Promise<Room> => {
      setIsLoading(true);
      setError(null);

      try {
        const code = generateRoomCode();

        // Créer la salle
        const { data: room, error: roomError } = await supabase
          .from('rooms')
          .insert({
            code,
            host_id: payload.host_id,
            game_mode: payload.game_mode,
            source_type: payload.source_type,
            source_id: payload.source_id,
            is_private: payload.is_private,
            status: 'waiting',
          })
          .select()
          .single();

        if (roomError) throw roomError;

        // Ajouter le host comme premier joueur
        const { error: playerError } = await supabase.from('room_players').insert({
          room_id: room.id,
          user_id: payload.host_id,
          username: payload.host_username,
          avatar_url: payload.host_avatar_url,
          is_host: true,
          is_ready: false,
          is_connected: true,
        });

        if (playerError) throw playerError;

        return room;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create room';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Rejoindre une salle
  const joinRoom = useCallback(
    async (payload: JoinRoomPayload): Promise<Room> => {
      setIsLoading(true);
      setError(null);

      try {
        // Trouver la salle par code ou ID
        let query = supabase.from('rooms').select('*');
        
        if (payload.room_code) {
          query = query.eq('code', payload.room_code);
        } else if (payload.room_id) {
          query = query.eq('id', payload.room_id);
        } else {
          throw new Error('Room code or ID required');
        }

        const { data: room, error: roomError } = await query.single();

        if (roomError) throw new Error('Room not found');

        // Vérifier le nombre de joueurs (compter tous les joueurs, pas seulement ceux connectés)
        const { count } = await supabase
          .from('room_players')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', room.id);

        if (count && count >= 10) {
          throw new Error('Room is full (max 10 players)');
        }

        // Vérifier si le joueur est déjà dans la salle
        const { data: existingPlayer } = await supabase
          .from('room_players')
          .select('*')
          .eq('room_id', room.id)
          .eq('user_id', payload.user_id)
          .single();

        if (existingPlayer) {
          // Réactiver le joueur
          const { error: updateError } = await supabase
            .from('room_players')
            .update({
              is_connected: true,
              last_activity: new Date().toISOString(),
            })
            .eq('id', existingPlayer.id);

          if (updateError) throw updateError;
        } else {
          // Ajouter un nouveau joueur
          const { error: playerError } = await supabase.from('room_players').insert({
            room_id: room.id,
            user_id: payload.user_id,
            username: payload.username,
            avatar_url: payload.avatar_url,
            is_host: false,
            is_ready: false,
            is_connected: true,
          });

          if (playerError) throw playerError;
        }

        return room;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to join room';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Quitter une salle
  const leaveRoom = useCallback(async (roomId: string, userId: string) => {
    try {
      await supabase
        .from('room_players')
        .update({ is_connected: false })
        .eq('room_id', roomId)
        .eq('user_id', userId);
    } catch (err) {
      console.error('Failed to leave room:', err);
    }
  }, []);

  // Exclure un joueur (host uniquement)
  const kickPlayer = useCallback(
    async (roomId: string, userId: string) => {
      if (!lobbyState?.currentUser?.is_host) {
        throw new Error('Only host can kick players');
      }

      await supabase
        .from('room_players')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', userId);
    },
    [lobbyState]
  );

  // Changer le statut de prêt
  const toggleReady = useCallback(
    async (roomId: string, userId: string, isReady: boolean) => {
      await supabase
        .from('room_players')
        .update({ is_ready: isReady })
        .eq('room_id', roomId)
        .eq('user_id', userId);
    },
    []
  );

  // Démarrer la partie (host uniquement)
  const startGame = useCallback(
    async (roomId: string) => {
      if (!lobbyState?.currentUser?.is_host) {
        throw new Error('Only host can start the game');
      }

      // Vérifier que tous les joueurs sont prêts
      const notReadyPlayers = lobbyState.players.filter(
        (p) => !p.is_ready && p.is_connected
      );

      if (notReadyPlayers.length > 0) {
        throw new Error('All players must be ready');
      }

      await supabase
        .from('rooms')
        .update({
          status: 'playing',
          started_at: new Date().toISOString(),
        })
        .eq('id', roomId);
    },
    [lobbyState]
  );

  // Envoyer un message de chat
  const sendChatMessage = useCallback(async (roomId: string, message: string) => {
    if (!session?.user) return;

    await supabase.from('chat_messages').insert({
      room_id: roomId,
      user_id: session.user.id,
      username: session.user.name || 'Anonymous',
      message,
    });
  }, [session]);

  // Charger l'état du lobby
  const loadLobbyState = useCallback(async (roomId: string, showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }
    try {
      // Charger la salle
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (roomError) throw roomError;

      // Charger les joueurs
      const { data: players, error: playersError } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomId)
        .order('joined_at', { ascending: true });

      if (playersError) throw playersError;

      // Charger les messages récents
      const { data: messages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (messagesError) throw messagesError;

      // Trouver le joueur actuel
      const currentUser = session?.user
        ? players.find((p) => p.user_id === session.user.id) || null
        : null;

      setLobbyState({
        room,
        players,
        messages: messages || [],
        currentUser,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load lobby';
      setError(message);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [session]);

  // S'abonner aux changements en temps réel
  useEffect(() => {
    if (!roomId) return;

    loadLobbyState(roomId);

    // Debounce pour éviter trop de rechargements
    let reloadTimeout: NodeJS.Timeout | null = null;
    const debouncedReload = () => {
      if (reloadTimeout) clearTimeout(reloadTimeout);
      reloadTimeout = setTimeout(() => {
        loadLobbyState(roomId, false); // Ne pas afficher le loader pour les updates en temps réel
      }, 200);
    };

    // Créer un channel Realtime
    const realtimeChannel = supabase.channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_players',
          filter: `room_id=eq.${roomId}`,
        },
        debouncedReload
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`,
        },
        debouncedReload
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        debouncedReload
      )
      .on('broadcast', { event: 'game_event' }, (payload) => {
        // Handler pour les événements de jeu broadcastés
        console.log('Game event received:', payload);
        // Note: Les composants qui utilisent ce hook peuvent écouter ces événements
        // via une callback supplémentaire si nécessaire dans le futur
      })
      .subscribe();

    setChannel(realtimeChannel);

    return () => {
      if (reloadTimeout) clearTimeout(reloadTimeout);
      realtimeChannel.unsubscribe();
    };
  }, [roomId, loadLobbyState]);

  // Broadcast d'événements de jeu
  const broadcastGameEvent = useCallback(
    async (event: GameEvent) => {
      if (!channel) return;
      await channel.send({
        type: 'broadcast',
        event: 'game_event',
        payload: event,
      });
    },
    [channel]
  );

  return {
    lobbyState,
    isLoading,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    kickPlayer,
    toggleReady,
    startGame,
    sendChatMessage,
    broadcastGameEvent,
  };
}
