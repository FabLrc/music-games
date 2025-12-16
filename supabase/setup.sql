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
