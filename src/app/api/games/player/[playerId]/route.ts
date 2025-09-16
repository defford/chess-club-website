import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';

// GET /api/games/player/[playerId] - Get all games for a specific player
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    const { playerId } = await params;
    const games = await googleSheetsService.getPlayerGames(playerId);
    
    return NextResponse.json(games);
  } catch (error) {
    console.error('Player games API GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve player games' },
      { status: 500 }
    );
  }
}
