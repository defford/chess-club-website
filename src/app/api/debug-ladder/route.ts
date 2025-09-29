import { NextRequest, NextResponse } from 'next/server';
import { KVCacheService } from '@/lib/kv';
import { enhancedGoogleSheetsService } from '@/lib/googleSheetsEnhanced';
import { googleSheetsService } from '@/lib/googleSheets';

// GET /api/debug-ladder - Comprehensive diagnostic endpoint for ladder issues
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
  
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    targetDate: date,
    tests: {} as any
  };

  try {
    // Test 1: Environment Variables
    diagnostics.tests.environmentVariables = {
      NODE_ENV: process.env.NODE_ENV,
      GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID ? 'SET' : 'NOT_SET',
      GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL ? 'SET' : 'NOT_SET',
      GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY ? 'SET' : 'NOT_SET',
      KV_REST_API_URL: process.env.KV_REST_API_URL ? 'SET' : 'NOT_SET',
      KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN ? 'SET' : 'NOT_SET',
    };

    // Test 2: Google Sheets Direct Access
    try {
      console.log('[DEBUG] Testing direct Google Sheets access...');
      const directGames = await googleSheetsService.getGames({
        dateFrom: date,
        dateTo: date,
        gameType: 'ladder'
      });
      
      diagnostics.tests.directGoogleSheets = {
        success: true,
        gamesCount: directGames.length,
        sampleGames: directGames.slice(0, 3).map(game => ({
          id: game.id,
          player1Name: game.player1Name,
          player2Name: game.player2Name,
          result: game.result,
          gameDate: game.gameDate,
          gameType: game.gameType
        }))
      };
    } catch (error: any) {
      diagnostics.tests.directGoogleSheets = {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }

    // Test 3: Enhanced Google Sheets Service
    try {
      console.log('[DEBUG] Testing enhanced Google Sheets service...');
      const enhancedGames = await enhancedGoogleSheetsService.getGames({
        dateFrom: date,
        dateTo: date,
        gameType: 'ladder'
      });
      
      diagnostics.tests.enhancedGoogleSheets = {
        success: true,
        gamesCount: enhancedGames.length,
        sampleGames: enhancedGames.slice(0, 3).map(game => ({
          id: game.id,
          player1Name: game.player1Name,
          player2Name: game.player2Name,
          result: game.result,
          gameDate: game.gameDate,
          gameType: game.gameType
        }))
      };
    } catch (error: any) {
      diagnostics.tests.enhancedGoogleSheets = {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }

    // Test 4: All Games (no date filter)
    try {
      console.log('[DEBUG] Testing all games retrieval...');
      const allGames = await enhancedGoogleSheetsService.getGames();
      const ladderGames = allGames.filter(game => game.gameType === 'ladder');
      const recentGames = allGames
        .filter(game => game.gameType === 'ladder')
        .sort((a, b) => new Date(b.gameDate).getTime() - new Date(a.gameDate).getTime())
        .slice(0, 10);
      
      diagnostics.tests.allGames = {
        success: true,
        totalGames: allGames.length,
        ladderGames: ladderGames.length,
        recentLadderGames: recentGames.map(game => ({
          id: game.id,
          player1Name: game.player1Name,
          player2Name: game.player2Name,
          result: game.result,
          gameDate: game.gameDate,
          gameType: game.gameType
        }))
      };
    } catch (error: any) {
      diagnostics.tests.allGames = {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }

    // Test 5: Rankings/Cache Service
    try {
      console.log('[DEBUG] Testing rankings/cache service...');
      const rankings = await KVCacheService.getRankings();
      
      diagnostics.tests.rankings = {
        success: true,
        playersCount: rankings.length,
        samplePlayers: rankings.slice(0, 5).map(player => ({
          id: player.id,
          name: player.name,
          grade: player.grade,
          points: player.points,
          gamesPlayed: player.gamesPlayed,
          wins: player.wins,
          losses: player.losses,
          draws: player.draws
        }))
      };
    } catch (error: any) {
      diagnostics.tests.rankings = {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }

    // Test 6: Cache Availability
    try {
      console.log('[DEBUG] Testing cache availability...');
      const isRedisAvailable = (KVCacheService as any).isRedisAvailable?.() || 'method not accessible';
      
      diagnostics.tests.cacheAvailability = {
        isRedisAvailable,
        cacheKeys: {
          events: 'events:all',
          rankings: 'rankings:all',
          members: 'members:all'
        }
      };
    } catch (error: any) {
      diagnostics.tests.cacheAvailability = {
        success: false,
        error: error.message
      };
    }

    // Test 7: Date Range Games
    try {
      console.log('[DEBUG] Testing date range games...');
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const today = new Date().toISOString().split('T')[0];
      
      const rangeGames = await enhancedGoogleSheetsService.getGames({
        dateFrom: thirtyDaysAgo.toISOString().split('T')[0],
        dateTo: today,
        gameType: 'ladder'
      });
      
      const gamesByDate = rangeGames.reduce((acc, game) => {
        acc[game.gameDate] = (acc[game.gameDate] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      diagnostics.tests.dateRangeGames = {
        success: true,
        totalGames: rangeGames.length,
        gamesByDate: Object.entries(gamesByDate)
          .sort(([a], [b]) => b.localeCompare(a))
          .slice(0, 10)
      };
    } catch (error: any) {
      diagnostics.tests.dateRangeGames = {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }

    // Test 8: Ladder API Simulation
    try {
      console.log('[DEBUG] Simulating ladder API logic...');
      const games = await enhancedGoogleSheetsService.getGames({
        dateFrom: date,
        dateTo: date,
        gameType: 'ladder'
      });
      
      const allPlayers = await KVCacheService.getRankings();
      
      // Simulate the ladder API logic
      const playerStats = new Map();
      
      // Initialize all players
      allPlayers.forEach(player => {
        playerStats.set(player.id || player.name, {
          id: player.id || player.name,
          name: player.name,
          grade: player.grade,
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          points: 0,
          lastActive: player.lastActive,
          email: player.email,
          isSystemPlayer: player.isSystemPlayer,
          overallGamesPlayed: player.gamesPlayed,
          overallWins: player.wins,
          overallLosses: player.losses,
          overallDraws: player.draws,
          overallPoints: player.points,
          overallRank: player.rank || 999
        });
      });
      
      // Process games
      games.forEach(game => {
        const player1Id = game.player1Id || game.player1Name;
        const player2Id = game.player2Id || game.player2Name;
        
        if (!playerStats.has(player1Id)) {
          playerStats.set(player1Id, {
            id: player1Id,
            name: game.player1Name,
            grade: 'Unknown',
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            points: 0,
            lastActive: game.gameDate,
            email: undefined,
            isSystemPlayer: game.player1Name === 'Unknown Opponent' || game.player1Id === 'unknown_opponent',
            overallGamesPlayed: 0,
            overallWins: 0,
            overallLosses: 0,
            overallDraws: 0,
            overallPoints: 0,
            overallRank: 999
          });
        }
        
        if (!playerStats.has(player2Id)) {
          playerStats.set(player2Id, {
            id: player2Id,
            name: game.player2Name,
            grade: 'Unknown',
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            points: 0,
            lastActive: game.gameDate,
            email: undefined,
            isSystemPlayer: game.player2Name === 'Unknown Opponent' || game.player2Id === 'unknown_opponent',
            overallGamesPlayed: 0,
            overallWins: 0,
            overallLosses: 0,
            overallDraws: 0,
            overallPoints: 0,
            overallRank: 999
          });
        }
        
        // Update stats
        const player1Stats = playerStats.get(player1Id);
        const player2Stats = playerStats.get(player2Id);
        
        if (player1Stats) {
          player1Stats.gamesPlayed++;
          if (game.result === 'player1') {
            player1Stats.wins++;
            player1Stats.points += 2;
          } else if (game.result === 'player2') {
            player1Stats.losses++;
            player1Stats.points += 1;
          } else if (game.result === 'draw') {
            player1Stats.draws++;
            player1Stats.points += 1.5;
          }
        }
        
        if (player2Stats) {
          player2Stats.gamesPlayed++;
          if (game.result === 'player2') {
            player2Stats.wins++;
            player2Stats.points += 2;
          } else if (game.result === 'player1') {
            player2Stats.losses++;
            player2Stats.points += 1;
          } else if (game.result === 'draw') {
            player2Stats.draws++;
            player2Stats.points += 1.5;
          }
        }
      });
      
      const allPlayerStats = Array.from(playerStats.values());
      const ladderPlayers = allPlayerStats.filter(player => player.overallPoints > 0 && !player.isSystemPlayer);
      
      diagnostics.tests.ladderSimulation = {
        success: true,
        totalPlayerStats: allPlayerStats.length,
        ladderPlayersCount: ladderPlayers.length,
        playersWithOverallPoints: allPlayerStats.filter(p => p.overallPoints > 0).length,
        systemPlayers: allPlayerStats.filter(p => p.isSystemPlayer).length,
        sampleLadderPlayers: ladderPlayers.slice(0, 5).map(player => ({
          id: player.id,
          name: player.name,
          grade: player.grade,
          overallPoints: player.overallPoints,
          dailyPoints: player.points,
          dailyGames: player.gamesPlayed,
          isSystemPlayer: player.isSystemPlayer
        }))
      };
    } catch (error: any) {
      diagnostics.tests.ladderSimulation = {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }

    return NextResponse.json(diagnostics, { status: 200 });

  } catch (error: any) {
    console.error('Debug ladder API error:', error);
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      error: error.message,
      stack: error.stack,
      tests: diagnostics.tests
    }, { status: 500 });
  }
}
