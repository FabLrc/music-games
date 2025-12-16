/**
 * Types pour le système multijoueur
 */

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface MatchmakingQueue {
  id: string;
  game_mode: string;
  source_type: string;
  source_id: string;
  created_at: string;
}

export interface Room {
  id: string;
  code: string;
  host_id: string;
  status: RoomStatus;
  game_mode: string;
  source_type: string;
  source_id: string;
  current_track: number;
  is_private: boolean;
  matchmaking_queue_id: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface RoomPlayer {
  id: string;
  room_id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  score: number;
  is_ready: boolean;
  is_host: boolean;
  is_connected: boolean;
  joined_at: string;
  last_activity: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  username: string;
  message: string;
  created_at: string;
}

// Types pour les événements Realtime Broadcast
export type GameEvent =
  | { type: 'player_joined'; player: RoomPlayer }
  | { type: 'player_left'; user_id: string }
  | { type: 'player_ready'; user_id: string; is_ready: boolean }
  | { type: 'player_kicked'; user_id: string }
  | { type: 'host_changed'; new_host_id: string }
  | { type: 'game_start'; started_at: string }
  | { type: 'next_track'; track_index: number }
  | { type: 'player_answer'; user_id: string; is_correct: boolean; score: number }
  | { type: 'game_end'; final_scores: Array<{ user_id: string; score: number }> }
  | { type: 'chat_message'; message: ChatMessage };

// Payload pour créer une salle
export interface CreateRoomPayload {
  game_mode: string;
  source_type: string;
  source_id: string;
  is_private: boolean;
  host_id: string;
  host_username: string;
  host_avatar_url?: string;
}

// Payload pour rejoindre une salle
export interface JoinRoomPayload {
  room_code?: string;
  room_id?: string;
  user_id: string;
  username: string;
  avatar_url?: string;
}

// État du lobby
export interface LobbyState {
  room: Room;
  players: RoomPlayer[];
  messages: ChatMessage[];
  currentUser: RoomPlayer | null;
}
