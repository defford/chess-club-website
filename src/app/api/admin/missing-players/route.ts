import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { requireAdminAuth } from '@/lib/apiAuth';

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const authResult = await requireAdminAuth(request);
    if (!authResult.isAdmin) {
      return NextResponse.json(
        { error: `Admin authentication required: ${authResult.error}` },
        { status: 401 }
      );
    }

    const supabase = getSupabaseClient(true);

    // Get all unique player IDs and names from games table
    const { data: games, error: gamesError } = await supabase
      .from('games')
      .select('player1_id, player1_name, player2_id, player2_name');

    if (gamesError) {
      throw gamesError;
    }

    // Collect all unique players from games
    const playersFromGames = new Map<string, { id: string; name: string }>();
    
    games?.forEach((game) => {
      if (game.player1_id && game.player1_name) {
        playersFromGames.set(game.player1_id, {
          id: game.player1_id,
          name: game.player1_name,
        });
      }
      if (game.player2_id && game.player2_name) {
        playersFromGames.set(game.player2_id, {
          id: game.player2_id,
          name: game.player2_name,
        });
      }
    });

    // Get all student IDs from students table
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id');

    if (studentsError) {
      throw studentsError;
    }

    const studentIds = new Set(students?.map((s) => s.id) || []);

    // Find players in games that are not in students
    const missingPlayers = Array.from(playersFromGames.values()).filter(
      (player) => !studentIds.has(player.id)
    );

    return NextResponse.json({
      success: true,
      missingPlayers,
      total: missingPlayers.length,
    });
  } catch (error: any) {
    console.error('Missing players API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch missing players' },
      { status: 500 }
    );
  }
}

