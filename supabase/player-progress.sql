-- ========================================
-- Table de progression des joueurs (Phase 5)
-- Système d'XP et de niveaux
-- ========================================

-- Table pour stocker la progression de chaque joueur
CREATE TABLE IF NOT EXISTS player_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  level INTEGER DEFAULT 1,
  current_xp INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_player_progress_user_id ON player_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_player_progress_level ON player_progress(level DESC);
CREATE INDEX IF NOT EXISTS idx_player_progress_total_xp ON player_progress(total_xp DESC);

-- Row Level Security
ALTER TABLE player_progress ENABLE ROW LEVEL SECURITY;

-- Politique : Tout le monde peut lire la progression
DROP POLICY IF EXISTS "Anyone can read player progress" ON player_progress;
CREATE POLICY "Anyone can read player progress"
  ON player_progress
  FOR SELECT
  USING (true);

-- Politique : Tout le monde peut insérer/mettre à jour leur progression
DROP POLICY IF EXISTS "Anyone can insert player progress" ON player_progress;
CREATE POLICY "Anyone can insert player progress"
  ON player_progress
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update player progress" ON player_progress;
CREATE POLICY "Anyone can update player progress"
  ON player_progress
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_player_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS trigger_update_player_progress_updated_at ON player_progress;
CREATE TRIGGER trigger_update_player_progress_updated_at
  BEFORE UPDATE ON player_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_player_progress_updated_at();

-- Commentaires pour documentation
COMMENT ON TABLE player_progress IS 'Stocke la progression (XP et niveau) de chaque joueur';
COMMENT ON COLUMN player_progress.level IS 'Niveau actuel du joueur';
COMMENT ON COLUMN player_progress.current_xp IS 'XP accumulé pour le niveau actuel';
COMMENT ON COLUMN player_progress.total_xp IS 'XP total accumulé depuis le début';
