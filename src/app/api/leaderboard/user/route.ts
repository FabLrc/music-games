import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * GET /api/leaderboard/user
 * Get current user's stats and rank
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.email || session.user.id || 'anonymous'

    // Get user's game sessions
    const { data, error } = await supabaseServer
      .from('game_sessions')
      .select('score, total_questions, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        totalGames: 0,
        totalScore: 0,
        bestScore: 0,
        averageScore: 0,
        recentGames: [],
      })
    }

    // Calculate stats
    const totalGames = data.length
    const totalScore = data.reduce((sum, game) => sum + game.score, 0)
    const bestScore = Math.max(...data.map(game => game.score))
    const averageScore = totalScore / totalGames

    return NextResponse.json({
      totalGames,
      totalScore,
      bestScore,
      averageScore: Math.round(averageScore * 10) / 10,
      recentGames: data.slice(0, 10),
    })
  } catch (error) {
    console.error('Error fetching user stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
