import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';

interface GameResult {
  player1Id: string;
  player2Id: string;
  result: 'player1' | 'player2' | 'draw';
}

export async function POST(request: NextRequest) {
  try {
    const gameData: GameResult = await request.json();
    
    // Validate required fields
    if (!gameData.player1Id || !gameData.player2Id || !gameData.result) {
      return NextResponse.json(
        { error: 'Missing required fields: player1Id, player2Id, result' },
        { status: 400 }
      );
    }

    if (gameData.player1Id === gameData.player2Id) {
      return NextResponse.json(
        { error: 'Players must be different' },
        { status: 400 }
      );
    }

    if (!['player1', 'player2', 'draw'].includes(gameData.result)) {
      return NextResponse.json(
        { error: 'Invalid result. Must be player1, player2, or draw' },
        { status: 400 }
      );
    }

    // Get current player data
    const players = await googleSheetsService.getPlayers();
    const player1 = players.find(p => p.id === gameData.player1Id);
    const player2 = players.find(p => p.id === gameData.player2Id);

    if (!player1 || !player2) {
      return NextResponse.json(
        { error: 'One or both players not found' },
        { status: 404 }
      );
    }

    // Calculate new points based on new scoring system:
    // Each player gets 1 point for playing
    // Winner gets +1 additional point (total 2)
    // Draw: each player gets +0.5 additional point (total 1.5 each)
    
    let player1Points = player1.points + 1; // Base point for playing
    let player2Points = player2.points + 1; // Base point for playing
    
    let player1Wins = player1.wins;
    let player1Losses = player1.losses;
    let player2Wins = player2.wins;
    let player2Losses = player2.losses;

    if (gameData.result === 'player1') {
      // Player 1 wins
      player1Points += 1; // Additional point for winning
      player1Wins += 1;
      player2Losses += 1;
    } else if (gameData.result === 'player2') {
      // Player 2 wins
      player2Points += 1; // Additional point for winning
      player2Wins += 1;
      player1Losses += 1;
    } else {
      // Draw - each player gets 0.5 additional points
      player1Points += 0.5;
      player2Points += 0.5;
      // Note: For draws, we don't increment wins/losses
      // You might want to add a 'draws' field to track this separately
    }

    // Update both players
    await googleSheetsService.updatePlayer(gameData.player1Id, {
      wins: player1Wins,
      losses: player1Losses,
      points: player1Points,
      lastActive: new Date().toISOString()
    });

    await googleSheetsService.updatePlayer(gameData.player2Id, {
      wins: player2Wins,
      losses: player2Losses,
      points: player2Points,
      lastActive: new Date().toISOString()
    });

    // Recalculate rankings after updating both players
    await googleSheetsService.recalculateRankings();
    
    return NextResponse.json(
      { 
        message: 'Game result recorded successfully',
        gameResult: {
          player1: { name: player1.name, newPoints: player1Points },
          player2: { name: player2.name, newPoints: player2Points },
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
