import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';

// GET /api/games/stats - Get overall game statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    
    let stats;
    if (playerId) {
      // Get player-specific stats
      stats = await googleSheetsService.getPlayerGameStats(playerId);
    } else {
      // Get overall game stats
      stats = await googleSheetsService.getGameStats();
    }
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Game stats API GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve game statistics' },
      { status: 500 }
    );
  }
}
