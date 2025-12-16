import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/leaderboard/top
 * Get top players by total score
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Query leaderboard with aggregated stats
    const { data, error } = await supabase
      .from('game_sessions')
      .select('user_id, username, avatar_url, score')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Aggregate scores by user
    const userScores = new Map<string, {
      user_id: string
      username: string
      avatar_url?: string
      total_score: number
      total_games: number
      best_score: number
    }>()

    data?.forEach((session) => {
      const existing = userScores.get(session.user_id)
      
      if (existing) {
        existing.total_score += session.score
        existing.total_games += 1
        existing.best_score = Math.max(existing.best_score, session.score)
      } else {
        userScores.set(session.user_id, {
          user_id: session.user_id,
          username: session.username,
          avatar_url: session.avatar_url,
          total_score: session.score,
          total_games: 1,
          best_score: session.score,
        })
      }
    })

    // Convert to array and sort by total score
    const leaderboard = Array.from(userScores.values())
      .sort((a, b) => b.total_score - a.total_score)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }))
      .slice(offset, offset + limit)

    return NextResponse.json({
      leaderboard,
      total: userScores.size,
    })
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
