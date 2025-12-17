-- Script SQL à exécuter dans Supabase SQL Editor
-- Crée la table game_sessions pour le leaderboard

-- Table des sessions de jeu
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  spotify_id TEXT NOT NULL,
  avatar_url TEXT,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  game_mode TEXT NOT NULL DEFAULT 'lyrics-quiz',
  source_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Index pour accélérer les requêtes
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_created_at ON game_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_sessions_score ON game_sessions(score DESC);

-- Row Level Security (RLS) - Sécurité
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- Politique : Tout le monde peut lire
DROP POLICY IF EXISTS "Anyone can read game sessions" ON game_sessions;
CREATE POLICY "Anyone can read game sessions"
  ON game_sessions
  FOR SELECT
  USING (true);

-- Politique : Seuls les utilisateurs authentifiés peuvent insérer
DROP POLICY IF EXISTS "Authenticated users can insert their sessions" ON game_sessions;
CREATE POLICY "Authenticated users can insert their sessions"
  ON game_sessions
  FOR INSERT
  WITH CHECK (true);

-- Commentaires pour documentation
COMMENT ON TABLE game_sessions IS 'Stocke toutes les parties jouées';
COMMENT ON COLUMN game_sessions.score IS 'Nombre de bonnes réponses';
COMMENT ON COLUMN game_sessions.total_questions IS 'Nombre total de questions dans la partie';

-- ========================================
-- Table de cache des paroles (Phase 2)
-- ========================================

-- Table pour mettre en cache les paroles récupérées
CREATE TABLE IF NOT EXISTS lyrics_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id TEXT UNIQUE NOT NULL,
  track_name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  duration INTEGER NOT NULL,
  lyrics_json JSONB,
  has_synced BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_lyrics_cache_track_id ON lyrics_cache(track_id);
CREATE INDEX IF NOT EXISTS idx_lyrics_cache_created_at ON lyrics_cache(created_at DESC);

-- Row Level Security
ALTER TABLE lyrics_cache ENABLE ROW LEVEL SECURITY;

-- Politique : Tout le monde peut lire le cache
DROP POLICY IF EXISTS "Anyone can read lyrics cache" ON lyrics_cache;
CREATE POLICY "Anyone can read lyrics cache"
  ON lyrics_cache
  FOR SELECT
  USING (true);

-- Politique : Tout le monde peut insérer/mettre à jour (les paroles sont publiques)
DROP POLICY IF EXISTS "Anyone can insert lyrics" ON lyrics_cache;
CREATE POLICY "Anyone can insert lyrics"
  ON lyrics_cache
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update lyrics" ON lyrics_cache;
CREATE POLICY "Anyone can update lyrics"
  ON lyrics_cache
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_lyrics_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS trigger_update_lyrics_cache_updated_at ON lyrics_cache;
CREATE TRIGGER trigger_update_lyrics_cache_updated_at
  BEFORE UPDATE ON lyrics_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_lyrics_cache_updated_at();

-- Commentaires
COMMENT ON TABLE lyrics_cache IS 'Cache des paroles récupérées depuis LRCLIB pour éviter les appels répétés';
COMMENT ON COLUMN lyrics_cache.track_id IS 'Identifiant unique de la piste (format: trackName_artistName_duration)';
COMMENT ON COLUMN lyrics_cache.lyrics_json IS 'Données complètes de LyricsData au format JSON (null si instrumental ou non trouvé)';
COMMENT ON COLUMN lyrics_cache.has_synced IS 'Indique si la piste a des paroles synchronisées';

-- ========================================
-- Tables pour le Multijoueur (Phase 3)
-- ========================================

-- Table des files d'attente de matchmaking
CREATE TABLE IF NOT EXISTS matchmaking_queues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_mode TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_matchmaking_queues_created_at ON matchmaking_queues(created_at);

-- Table des salles de jeu
CREATE TABLE IF NOT EXISTS rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  host_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting', -- waiting, playing, finished
  game_mode TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  current_track INTEGER DEFAULT 0,
  is_private BOOLEAN DEFAULT false,
  matchmaking_queue_id UUID REFERENCES matchmaking_queues(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_host_id ON rooms(host_id);

-- Table des joueurs dans les salles
CREATE TABLE IF NOT EXISTS room_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  score INTEGER DEFAULT 0,
  is_ready BOOLEAN DEFAULT false,
  is_host BOOLEAN DEFAULT false,
  is_connected BOOLEAN DEFAULT true,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_room_players_room_id ON room_players(room_id);
CREATE INDEX IF NOT EXISTS idx_room_players_user_id ON room_players(user_id);

-- Table des messages de chat
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Row Level Security
ALTER TABLE matchmaking_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies pour matchmaking_queues
DROP POLICY IF EXISTS "Anyone can read matchmaking queues" ON matchmaking_queues;
CREATE POLICY "Anyone can read matchmaking queues"
  ON matchmaking_queues
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert queues" ON matchmaking_queues;
CREATE POLICY "Authenticated users can insert queues"
  ON matchmaking_queues
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete queues" ON matchmaking_queues;
CREATE POLICY "Authenticated users can delete queues"
  ON matchmaking_queues
  FOR DELETE
  USING (true);

-- Policies pour rooms
DROP POLICY IF EXISTS "Anyone can read rooms" ON rooms;
CREATE POLICY "Anyone can read rooms"
  ON rooms
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert rooms" ON rooms;
CREATE POLICY "Authenticated users can insert rooms"
  ON rooms
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update rooms" ON rooms;
CREATE POLICY "Authenticated users can update rooms"
  ON rooms
  FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete rooms" ON rooms;
CREATE POLICY "Authenticated users can delete rooms"
  ON rooms
  FOR DELETE
  USING (true);

-- Policies pour room_players
DROP POLICY IF EXISTS "Anyone can read room players" ON room_players;
CREATE POLICY "Anyone can read room players"
  ON room_players
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert room players" ON room_players;
CREATE POLICY "Authenticated users can insert room players"
  ON room_players
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update room players" ON room_players;
CREATE POLICY "Authenticated users can update room players"
  ON room_players
  FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete room players" ON room_players;
CREATE POLICY "Authenticated users can delete room players"
  ON room_players
  FOR DELETE
  USING (true);

-- Policies pour chat_messages
DROP POLICY IF EXISTS "Anyone can read chat messages" ON chat_messages;
CREATE POLICY "Anyone can read chat messages"
  ON chat_messages
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert chat messages" ON chat_messages;
CREATE POLICY "Authenticated users can insert chat messages"
  ON chat_messages
  FOR INSERT
  WITH CHECK (true);

-- Fonction pour générer un code de salle unique
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Sans O, I, 0, 1 pour éviter confusion
  result TEXT := '';
  i INTEGER := 0;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour nettoyer les salles inactives
CREATE OR REPLACE FUNCTION cleanup_inactive_rooms()
RETURNS void AS $$
BEGIN
  -- Marquer les joueurs inactifs comme déconnectés
  UPDATE room_players
  SET is_connected = false
  WHERE last_activity < TIMEZONE('utc', NOW()) - INTERVAL '5 minutes';
  
  -- Supprimer les salles vides depuis plus de 10 minutes
  DELETE FROM rooms
  WHERE id NOT IN (
    SELECT DISTINCT room_id FROM room_players WHERE is_connected = true
  )
  AND created_at < TIMEZONE('utc', NOW()) - INTERVAL '10 minutes';
END;
$$ LANGUAGE plpgsql;

-- Commentaires
COMMENT ON TABLE matchmaking_queues IS 'Files d''attente pour le matchmaking automatique';
COMMENT ON TABLE rooms IS 'Salles de jeu multijoueur';
COMMENT ON TABLE room_players IS 'Joueurs dans les salles';
COMMENT ON TABLE chat_messages IS 'Messages de chat dans les lobbies';
COMMENT ON COLUMN rooms.status IS 'État de la salle: waiting, playing, finished';
COMMENT ON COLUMN rooms.code IS 'Code à 6 caractères pour rejoindre la salle';
COMMENT ON COLUMN room_players.is_host IS 'Indique si le joueur est le chef de la partie';
COMMENT ON COLUMN room_players.is_connected IS 'Indique si le joueur est actuellement connecté';
