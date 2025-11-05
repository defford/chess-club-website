import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';

// GET /api/debug-games - Simple games diagnostic endpoint
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const gameType = searchParams.get('gameType') || 'ladder';
  
  const results = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    targetDate: date,
    gameType: gameType,
    tests: {} as any
  };

  try {
    // Test 1: Data Service
    console.log(`[DEBUG-GAMES] Testing data service for ${gameType} games on ${date}`);
    try {
      const directGames = await dataService.getGames({
        dateFrom: date,
        dateTo: date,
        gameType: gameType as any
      });
      
      results.tests.directService = {
        success: true,
        count: directGames.length,
        games: directGames.map(game => ({
          id: game.id,
          player1Name: game.player1Name,
          player2Name: game.player2Name,
          result: game.result,
          gameDate: game.gameDate,
          gameType: game.gameType,
          gameTime: game.gameTime
        }))
      };
    } catch (error: any) {
      results.tests.directService = {
        success: false,
        error: error.message
      };
    }

    // Test 2: Enhanced Service (same as directService now via dataService)
    results.tests.enhancedService = results.tests.directService;

    // Test 3: All Games (no filters)
    console.log('[DEBUG-GAMES] Testing all games retrieval');
    try {
      const allGames = await dataService.getGames();
      const filteredGames = allGames.filter(game => 
        game.gameType === gameType && game.gameDate === date
      );
      
      results.tests.allGames = {
        success: true,
        totalCount: allGames.length,
        filteredCount: filteredGames.length,
        ladderGamesCount: allGames.filter(g => g.gameType === 'ladder').length,
        recentGames: allGames
          .filter(g => g.gameType === 'ladder')
          .sort((a, b) => new Date(b.gameDate).getTime() - new Date(a.gameDate).getTime())
          .slice(0, 5)
          .map(game => ({
            id: game.id,
            player1Name: game.player1Name,
            player2Name: game.player2Name,
            result: game.result,
            gameDate: game.gameDate,
            gameType: game.gameType
          }))
      };
    } catch (error: any) {
      results.tests.allGames = {
        success: false,
        error: error.message
      };
    }

    // Test 4: Date Range Test
    console.log('[DEBUG-GAMES] Testing date range retrieval');
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const today = new Date().toISOString().split('T')[0];
      
      const rangeGames = await dataService.getGames({
        dateFrom: thirtyDaysAgo.toISOString().split('T')[0],
        dateTo: today,
        gameType: gameType as any
      });
      
      const gamesByDate = rangeGames.reduce((acc, game) => {
        if (!acc[game.gameDate]) {
          acc[game.gameDate] = [];
        }
        acc[game.gameDate].push({
          id: game.id,
          player1Name: game.player1Name,
          player2Name: game.player2Name,
          result: game.result
        });
        return acc;
      }, {} as Record<string, Array<{id: string, player1Name: string, player2Name: string, result: string}>>);
      
      results.tests.dateRange = {
        success: true,
        totalCount: rangeGames.length,
        gamesByDate: Object.entries(gamesByDate)
          .sort(([a], [b]) => b.localeCompare(a))
          .slice(0, 10)
          .map(([date, games]) => ({
            date,
            count: (games as Array<{id: string, player1Name: string, player2Name: string, result: string}>).length,
            games: (games as Array<{id: string, player1Name: string, player2Name: string, result: string}>).slice(0, 3) // Show first 3 games per date
          }))
      };
    } catch (error: any) {
      results.tests.dateRange = {
        success: false,
        error: error.message
      };
    }

    // Test 5: Environment Check
    results.tests.environment = {
      NODE_ENV: process.env.NODE_ENV,
      GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID ? 'SET' : 'NOT_SET',
      GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL ? 'SET' : 'NOT_SET',
      GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY ? 'SET' : 'NOT_SET'
    };

    return NextResponse.json(results, { status: 200 });

  } catch (error: any) {
    console.error('Debug games API error:', error);
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      error: error.message,
      stack: error.stack,
      tests: results.tests
    }, { status: 500 });
  }
}
