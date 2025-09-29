import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';

// GET /api/test-rankings-simple - Simple test of rankings calculation
export async function GET(request: NextRequest) {
  try {
    console.log('[TEST-RANKINGS-SIMPLE] Starting simple rankings test...');
    
    // Test 1: Get games
    const games = await googleSheetsService.getGames();
    console.log(`[TEST-RANKINGS-SIMPLE] Retrieved ${games.length} total games`);
    
    // Test 2: Get members
    const members = await googleSheetsService.getMembersFromParentsAndStudents();
    console.log(`[TEST-RANKINGS-SIMPLE] Retrieved ${members.length} members`);
    
    // Test 3: Call calculateRankingsFromGames
    const rankings = await googleSheetsService.calculateRankingsFromGames();
    console.log(`[TEST-RANKINGS-SIMPLE] Retrieved ${rankings.length} rankings`);
    
    const playersWithPoints = rankings.filter(p => p.points > 0);
    console.log(`[TEST-RANKINGS-SIMPLE] Found ${playersWithPoints.length} players with points > 0`);
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      results: {
        totalGames: games.length,
        ladderGames: games.filter(g => g.gameType === 'ladder').length,
        totalMembers: members.length,
        totalRankings: rankings.length,
        playersWithPoints: playersWithPoints.length,
        sampleRankings: rankings.slice(0, 5).map(p => ({
          id: p.id,
          name: p.name,
          points: p.points,
          gamesPlayed: p.gamesPlayed,
          wins: p.wins,
          losses: p.losses,
          draws: p.draws
        })),
        sampleGames: games.filter(g => g.gameType === 'ladder').slice(0, 3).map(g => ({
          id: g.id,
          player1Id: g.player1Id,
          player1Name: g.player1Name,
          player2Id: g.player2Id,
          player2Name: g.player2Name,
          result: g.result
        }))
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('[TEST-RANKINGS-SIMPLE] Error:', error);
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
