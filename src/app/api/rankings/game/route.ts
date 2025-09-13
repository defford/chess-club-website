import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';
import { GameFormData } from '@/lib/types';

interface GameResult {
  player1Id: string;
  player2Id: string;
  result: 'player1' | 'player2' | 'draw';
}

export async function POST(request: NextRequest) {
  try {
    const gameData: GameResult = await request.json();
    
    // Convert to new game format and use the new games API
    const gameFormData: GameFormData = {
      player1Id: gameData.player1Id,
      player2Id: gameData.player2Id,
      result: gameData.result,
      gameDate: new Date().toISOString().split('T')[0],
      gameTime: 0, // Default to 0 for legacy compatibility
      gameType: 'ladder',
      recordedBy: 'admin'
    };

    // Forward to the new games API
    const response = await fetch(`${request.nextUrl.origin}/api/games`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(gameFormData)
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error || 'Failed to record game result' },
        { status: response.status }
      );
    }

    const result = await response.json();
    
    return NextResponse.json(
      { 
        message: 'Game result recorded successfully',
        gameResult: {
          player1: { name: result.game.player1Name, newPoints: 0 }, // Points will be calculated by the new system
          player2: { name: result.game.player2Name, newPoints: 0 },
          result: gameData.result
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Game result API error:', error);
    return NextResponse.json(
      { error: 'Failed to record game result' },
      { status: 500 }
    );
  }
}
