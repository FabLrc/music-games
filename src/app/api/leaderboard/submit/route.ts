import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { supabase } from '@/lib/supabase'
import type { GameSession } from '@/lib/supabase'

/**
 * POST /api/leaderboard/submit
 * Submit a game score
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { score, totalQuestions, gameMode, sourceType } = body

    // Validate input
    if (typeof score !== 'number' || typeof totalQuestions !== 'number') {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    // Prepare game session data
    const gameSession: GameSession = {
      user_id: session.user.email || session.user.id || 'anonymous',
      username: session.user.name || 'Anonymous',
      spotify_id: (session.user as { id?: string }).id || session.user.email || 'anonymous',
      avatar_url: session.user.image || undefined,
      score,
      total_questions: totalQuestions,
      game_mode: gameMode || 'lyrics-quiz',
      source_type: sourceType || 'random',
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from('game_sessions')
      .insert([gameSession])
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error submitting score:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
