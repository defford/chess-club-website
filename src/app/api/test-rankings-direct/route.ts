import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';

// GET /api/test-rankings-direct - Test rankings calculation directly without cache
export async function GET(request: NextRequest) {
  try {
    console.log('[TEST-RANKINGS-DIRECT] Starting direct rankings test...');
    
    // Test 1: Get games directly
    const games = await dataService.getGames();
    const ladderGames = games.filter(game => game.gameType === 'ladder');
    
    console.log(`[TEST-RANKINGS-DIRECT] Found ${games.length} total games, ${ladderGames.length} ladder games`);
    
    // Test 2: Get members directly
    const members = await dataService.getMembersFromParentsAndStudents();
    console.log(`[TEST-RANKINGS-DIRECT] Found ${members.length} members`);
    
    // Test 3: Call calculateRankingsFromGames directly
    const rankings = await dataService.calculateRankingsFromGames();
    console.log(`[TEST-RANKINGS-DIRECT] Calculated ${rankings.length} rankings`);
    
    const playersWithPoints = rankings.filter(p => p.points > 0);
    console.log(`[TEST-RANKINGS-DIRECT] Found ${playersWithPoints.length} players with points > 0`);
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      results: {
        totalGames: games.length,
        ladderGames: ladderGames.length,
        totalMembers: members.length,
        totalRankings: rankings.length,
        playersWithPoints: playersWithPoints.length,
        samplePlayersWithPoints: playersWithPoints.slice(0, 10).map(player => ({
          id: player.id,
          name: player.name,
          grade: player.grade,
          points: player.points,
          gamesPlayed: player.gamesPlayed,
          wins: player.wins,
          losses: player.losses,
          draws: player.draws
        })),
        sampleGames: ladderGames.slice(0, 5).map(game => ({
          id: game.id,
          player1Id: game.player1Id,
          player1Name: game.player1Name,
          player2Id: game.player2Id,
          player2Name: game.player2Name,
          result: game.result,
          gameDate: game.gameDate
        }))
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('[TEST-RANKINGS-DIRECT] Error:', error);
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
