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

-- Politique : Seuls les utilisateurs authentifiés peuvent insérer/mettre à jour
DROP POLICY IF EXISTS "Authenticated users can insert lyrics" ON lyrics_cache;
CREATE POLICY "Authenticated users can insert lyrics"
  ON lyrics_cache
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update lyrics" ON lyrics_cache;
CREATE POLICY "Authenticated users can update lyrics"
  ON lyrics_cache
  FOR UPDATE
  USING (true);

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
