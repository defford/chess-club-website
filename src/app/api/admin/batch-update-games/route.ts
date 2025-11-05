import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/apiAuth'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { getFirstName } from '@/lib/utils'

interface GameUpdatePreview {
  gameId: string
  player1Current: { id: string; name: string }
  player1New: { id: string; name: string } | null
  player2Current: { id: string; name: string }
  player2New: { id: string; name: string } | null
  gameDate: string
}

interface BatchUpdateResult {
  gamesUpdated: number
  player1Updates: number
  player2Updates: number
  gamesNotChanged: number
}

// GET /api/admin/batch-update-games?action=preview
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

    if (action !== 'preview') {
      return NextResponse.json(
        { error: 'Invalid action. Use action=preview' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient(true) // Use admin client

    // Fetch all games
    const { data: games, error: gamesError } = await supabase
      .from('games')
      .select('id, player1_id, player1_name, player2_id, player2_name, game_date')
      .order('game_date', { ascending: false })

    if (gamesError) {
      throw gamesError
    }

    // Fetch all students
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, name')
      .order('name', { ascending: true })

    if (studentsError) {
      throw studentsError
    }

    // Create a map of first name -> student for quick lookup
    // Handle multiple students with same first name by keeping the first one found
    const firstNameToStudent = new Map<string, { id: string; name: string }>()
    
    students?.forEach((student) => {
      const firstName = getFirstName(student.name)
      if (firstName && !firstNameToStudent.has(firstName)) {
        firstNameToStudent.set(firstName, { id: student.id, name: student.name })
      }
    })

    // Build preview of updates
    const preview: GameUpdatePreview[] = []
    let gamesToUpdate = 0

    games?.forEach((game) => {
      const player1FirstName = getFirstName(game.player1_name)
      const player2FirstName = getFirstName(game.player2_name)

      const player1Match = player1FirstName ? firstNameToStudent.get(player1FirstName) : null
      const player2Match = player2FirstName ? firstNameToStudent.get(player2FirstName) : null

      // Check if either player needs updating
      const player1NeedsUpdate = player1Match && (
        game.player1_id !== player1Match.id || 
        game.player1_name !== player1Match.name
      )
      const player2NeedsUpdate = player2Match && (
        game.player2_id !== player2Match.id || 
        game.player2_name !== player2Match.name
      )

      if (player1NeedsUpdate || player2NeedsUpdate) {
        gamesToUpdate++
        preview.push({
          gameId: game.id,
          player1Current: {
            id: game.player1_id,
            name: game.player1_name,
          },
          player1New: player1NeedsUpdate ? player1Match : null,
          player2Current: {
            id: game.player2_id,
            name: game.player2_name,
          },
          player2New: player2NeedsUpdate ? player2Match : null,
          gameDate: game.game_date,
        })
      }
    })

    return NextResponse.json({
      totalGames: games?.length || 0,
      gamesToUpdate,
      preview: preview.slice(0, 100), // Limit preview to first 100 for performance
      totalPreviewCount: preview.length,
    })
  } catch (error) {
    console.error('Error in batch-update-games GET:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate preview' },
      { status: 500 }
    )
  }
}

// POST /api/admin/batch-update-games
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

    const body = await request.json().catch(() => ({}))
    const selectedGameIds: string[] | undefined = body.gameIds

    const supabase = getSupabaseClient(true) // Use admin client

    // Fetch all games (or filtered by selected IDs if provided)
    let gamesQuery = supabase
      .from('games')
      .select('id, player1_id, player1_name, player2_id, player2_name')
    
    if (selectedGameIds && selectedGameIds.length > 0) {
      gamesQuery = gamesQuery.in('id', selectedGameIds)
    }

    const { data: games, error: gamesError } = await gamesQuery

    if (gamesError) {
      throw gamesError
    }

    // Fetch all students
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, name')

    if (studentsError) {
      throw studentsError
    }

    // Create a map of first name -> student for quick lookup
    const firstNameToStudent = new Map<string, { id: string; name: string }>()
    
    students?.forEach((student) => {
      const firstName = getFirstName(student.name)
      if (firstName && !firstNameToStudent.has(firstName)) {
        firstNameToStudent.set(firstName, { id: student.id, name: student.name })
      }
    })

    // Process updates
    const result: BatchUpdateResult = {
      gamesUpdated: 0,
      player1Updates: 0,
      player2Updates: 0,
      gamesNotChanged: 0,
    }

    // Batch updates by grouping games that need the same updates
    const updatesByGame: Array<{
      gameId: string
      player1Id?: string
      player1Name?: string
      player2Id?: string
      player2Name?: string
    }> = []

    games?.forEach((game) => {
      const player1FirstName = getFirstName(game.player1_name)
      const player2FirstName = getFirstName(game.player2_name)

      const player1Match = player1FirstName ? firstNameToStudent.get(player1FirstName) : null
      const player2Match = player2FirstName ? firstNameToStudent.get(player2FirstName) : null

      const player1NeedsUpdate = player1Match && (
        game.player1_id !== player1Match.id || 
        game.player1_name !== player1Match.name
      )
      const player2NeedsUpdate = player2Match && (
        game.player2_id !== player2Match.id || 
        game.player2_name !== player2Match.name
      )

      if (player1NeedsUpdate || player2NeedsUpdate) {
        const update: {
          gameId: string
          player1Id?: string
          player1Name?: string
          player2Id?: string
          player2Name?: string
        } = { gameId: game.id }

        if (player1NeedsUpdate && player1Match) {
          update.player1Id = player1Match.id
          update.player1Name = player1Match.name
          result.player1Updates++
        }

        if (player2NeedsUpdate && player2Match) {
          update.player2Id = player2Match.id
          update.player2Name = player2Match.name
          result.player2Updates++
        }

        updatesByGame.push(update)
        result.gamesUpdated++
      } else {
        result.gamesNotChanged++
      }
    })

    // Perform batch updates
    // Update games one by one (Supabase doesn't support bulk updates with different values easily)
    for (const update of updatesByGame) {
      const updateData: {
        player1_id?: string
        player1_name?: string
        player2_id?: string
        player2_name?: string
      } = {}

      if (update.player1Id !== undefined) {
        updateData.player1_id = update.player1Id
      }
      if (update.player1Name !== undefined) {
        updateData.player1_name = update.player1Name
      }
      if (update.player2Id !== undefined) {
        updateData.player2_id = update.player2Id
      }
      if (update.player2Name !== undefined) {
        updateData.player2_name = update.player2Name
      }

      const { error: updateError } = await supabase
        .from('games')
        .update(updateData)
        .eq('id', update.gameId)

      if (updateError) {
        console.error(`Error updating game ${update.gameId}:`, updateError)
        // Continue with other updates even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      result,
      message: `Batch update completed. ${result.gamesUpdated} game(s) updated.`,
    })
  } catch (error) {
    console.error('Error in batch-update-games POST:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to perform batch update' },
      { status: 500 }
    )
  }
}

