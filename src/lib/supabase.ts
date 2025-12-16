import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for database tables
export interface GameSession {
  id?: string
  user_id: string
  username: string
  spotify_id: string
  avatar_url?: string
  score: number
  total_questions: number
  game_mode: string
  source_type: string
  created_at?: string
}

export interface LeaderboardEntry {
  user_id: string
  username: string
  avatar_url?: string
  total_score: number
  total_games: number
  best_score: number
  rank?: number
}
