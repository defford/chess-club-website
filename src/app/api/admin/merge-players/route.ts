import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/apiAuth'
import { getSupabaseClient } from '@/lib/supabaseClient'

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const authResult = await requireAdminAuth(request)
    if (!authResult.isAdmin) {
      return NextResponse.json(
        { error: authResult.error || 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    const supabase = getSupabaseClient(true) // Use admin client

    if (action === 'list') {
      // Get all unique players from games table
      const { data: games, error: gamesError } = await supabase
        .from('games')
        .select('player1_id, player1_name, player2_id, player2_name')

      if (gamesError) {
        throw gamesError
      }

      // Get all student IDs from students table
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, name')

      if (studentsError) {
        throw studentsError
      }

      const studentIds = new Set(students?.map(s => s.id) || [])
      const playerMap = new Map<string, { name: string; gameCount: number }>()

      // Count games for each player
      games?.forEach((game) => {
        // Player 1
        const p1Id = game.player1_id
        const p1Name = game.player1_name
        if (p1Id && p1Name && p1Id !== 'unknown_opponent') {
          const existing = playerMap.get(p1Id)
          if (existing) {
            existing.gameCount++
            // Update name if we have a more recent/better one
            if (p1Name && p1Name !== 'Unknown Opponent') {
              existing.name = p1Name
            }
          } else {
            playerMap.set(p1Id, { name: p1Name, gameCount: 1 })
          }
        }

        // Player 2
        const p2Id = game.player2_id
        const p2Name = game.player2_name
        if (p2Id && p2Name && p2Id !== 'unknown_opponent') {
          const existing = playerMap.get(p2Id)
          if (existing) {
            existing.gameCount++
            // Update name if we have a more recent/better one
            if (p2Name && p2Name !== 'Unknown Opponent') {
              existing.name = p2Name
            }
          } else {
            playerMap.set(p2Id, { name: p2Name, gameCount: 1 })
          }
        }
      })

      // Convert to array format
      const players = Array.from(playerMap.entries()).map(([id, data]) => ({
        id,
        name: data.name,
        gameCount: data.gameCount,
        isInStudents: studentIds.has(id),
      }))

      // Sort: orphaned players first, then by game count descending
      players.sort((a, b) => {
        if (a.isInStudents !== b.isInStudents) {
          return a.isInStudents ? 1 : -1
        }
        return b.gameCount - a.gameCount
      })

      return NextResponse.json({ players })
    }

    if (action === 'preview') {
      const sourceId = searchParams.get('sourceId')
      const targetId = searchParams.get('targetId')

      if (!sourceId || !targetId) {
        return NextResponse.json(
          { error: 'sourceId and targetId are required' },
          { status: 400 }
        )
      }

      // Count games that would be affected
      const { data: games, error: gamesError } = await supabase
        .from('games')
        .select('id')
        .or(`player1_id.eq.${sourceId},player2_id.eq.${sourceId}`)

      if (gamesError) {
        throw gamesError
      }

      return NextResponse.json({
        gamesToUpdate: games?.length || 0,
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in merge-players GET:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const authResult = await requireAdminAuth(request)
    if (!authResult.isAdmin) {
      return NextResponse.json(
        { error: authResult.error || 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { sourcePlayerId, targetPlayerId } = body

    if (!sourcePlayerId || !targetPlayerId) {
      return NextResponse.json(
        { error: 'sourcePlayerId and targetPlayerId are required' },
        { status: 400 }
      )
    }

    if (sourcePlayerId === targetPlayerId) {
      return NextResponse.json(
        { error: 'Cannot merge a player with itself' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient(true) // Use admin client

    // Get target player name to use in updates
    const { data: targetStudent, error: targetError } = await supabase
      .from('students')
      .select('id, name')
      .eq('id', targetPlayerId)
      .single()

    if (targetError || !targetStudent) {
      // Try to get name from games if not in students
      const { data: gamesWithTarget, error: gamesError } = await supabase
        .from('games')
        .select('player1_id, player1_name, player2_id, player2_name')
        .or(`player1_id.eq.${targetPlayerId},player2_id.eq.${targetPlayerId}`)
        .limit(1)

      if (gamesError || !gamesWithTarget || gamesWithTarget.length === 0) {
        return NextResponse.json(
          { error: 'Target player not found' },
          { status: 404 }
        )
      }

      // Use name from games
      const game = gamesWithTarget[0]
      const targetName = game.player1_id === targetPlayerId 
        ? game.player1_name 
        : game.player2_name

      // Update all games where source player appears as player1
      const { error: updateP1Error } = await supabase
        .from('games')
        .update({
          player1_id: targetPlayerId,
          player1_name: targetName,
        })
        .eq('player1_id', sourcePlayerId)

      if (updateP1Error) {
        throw updateP1Error
      }

      // Update all games where source player appears as player2
      const { error: updateP2Error } = await supabase
        .from('games')
        .update({
          player2_id: targetPlayerId,
          player2_name: targetName,
        })
        .eq('player2_id', sourcePlayerId)

      if (updateP2Error) {
        throw updateP2Error
      }

      // Update tournament_results if applicable
      const { error: tournamentError } = await supabase
        .from('tournament_results')
        .update({
          player_id: targetPlayerId,
          player_name: targetName,
        })
        .eq('player_id', sourcePlayerId)

      // Don't fail if tournament_results update fails (might not exist)
      if (tournamentError) {
        console.warn('Warning: Could not update tournament_results:', tournamentError)
      }

      // Update attendance if applicable
      const { error: attendanceError } = await supabase
        .from('attendance')
        .update({
          player_id: targetPlayerId,
          player_name: targetName,
        })
        .eq('player_id', sourcePlayerId)

      // Don't fail if attendance update fails (might not exist)
      if (attendanceError) {
        console.warn('Warning: Could not update attendance:', attendanceError)
      }

      return NextResponse.json({
        success: true,
        message: `Successfully merged player ${sourcePlayerId} into ${targetPlayerId}`,
      })
    }

    // Target player exists in students table - use that name
    const targetName = targetStudent.name

    // Update all games where source player appears as player1
    const { error: updateP1Error } = await supabase
      .from('games')
      .update({
        player1_id: targetPlayerId,
        player1_name: targetName,
      })
      .eq('player1_id', sourcePlayerId)

    if (updateP1Error) {
      throw updateP1Error
    }

    // Update all games where source player appears as player2
    const { error: updateP2Error } = await supabase
      .from('games')
      .update({
        player2_id: targetPlayerId,
        player2_name: targetName,
      })
      .eq('player2_id', sourcePlayerId)

    if (updateP2Error) {
      throw updateP2Error
    }

    // Update tournament_results if applicable
    const { error: tournamentError } = await supabase
      .from('tournament_results')
      .update({
        player_id: targetPlayerId,
        player_name: targetName,
      })
      .eq('player_id', sourcePlayerId)

    // Don't fail if tournament_results update fails (might not exist)
    if (tournamentError) {
      console.warn('Warning: Could not update tournament_results:', tournamentError)
    }

    // Update attendance if applicable
    const { error: attendanceError } = await supabase
      .from('attendance')
      .update({
        player_id: targetPlayerId,
        player_name: targetName,
      })
      .eq('player_id', sourcePlayerId)

    // Don't fail if attendance update fails (might not exist)
    if (attendanceError) {
      console.warn('Warning: Could not update attendance:', attendanceError)
    }

    return NextResponse.json({
      success: true,
      message: `Successfully merged player ${sourcePlayerId} into ${targetPlayerId}`,
    })
  } catch (error) {
    console.error('Error in merge-players POST:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to merge players' },
      { status: 500 }
    )
  }
}

