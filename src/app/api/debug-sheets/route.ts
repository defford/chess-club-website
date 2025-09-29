import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';

// GET /api/debug-sheets - Google Sheets connection and structure diagnostic
export async function GET(request: NextRequest) {
  const results = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    tests: {} as any
  };

  try {
    // Test 1: Environment Variables
    results.tests.environment = {
      NODE_ENV: process.env.NODE_ENV,
      GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID ? 'SET' : 'NOT_SET',
      GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL ? 'SET' : 'NOT_SET',
      GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY ? 'SET' : 'NOT_SET',
      GOOGLE_CLOUD_PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT_ID ? 'SET' : 'NOT_SET',
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT_SET',
      GOOGLE_PRIVATE_KEY_ID: process.env.GOOGLE_PRIVATE_KEY_ID ? 'SET' : 'NOT_SET'
    };

    // Test 2: Raw Google Sheets Access
    console.log('[DEBUG-SHEETS] Testing raw Google Sheets access...');
    try {
      // Access the private sheets property to test raw connection
      const sheets = (googleSheetsService as any).sheets;
      if (!sheets) {
        throw new Error('Google Sheets service not properly initialized');
      }

      const spreadsheetId = (googleSheetsService as any).getSpreadsheetId('rankings');
      console.log(`[DEBUG-SHEETS] Using spreadsheet ID: ${spreadsheetId}`);

      // Test reading the games sheet directly
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'games!A:S',
      });

      const rows = response.data.values;
      console.log(`[DEBUG-SHEETS] Raw games sheet has ${rows ? rows.length : 0} rows`);

      if (rows && rows.length > 1) {
        const headers = rows[0];
        const sampleRows = rows.slice(1, 6); // First 5 data rows
        
        results.tests.rawSheetsAccess = {
          success: true,
          totalRows: rows.length,
          headers: headers,
          sampleRows: sampleRows,
          ladderGames: rows.slice(1).filter((row: any[]) => 
            row[8] === 'ladder' // gameType column
          ).length
        };
      } else {
        results.tests.rawSheetsAccess = {
          success: true,
          totalRows: 0,
          message: 'No data found in games sheet'
        };
      }
    } catch (error: any) {
      results.tests.rawSheetsAccess = {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }

    // Test 3: Games Sheet Structure
    console.log('[DEBUG-SHEETS] Testing games sheet structure...');
    try {
      const games = await googleSheetsService.getGames();
      
      results.tests.gamesStructure = {
        success: true,
        totalGames: games.length,
        gameTypes: games.reduce((acc: any, game) => {
          acc[game.gameType] = (acc[game.gameType] || 0) + 1;
          return acc;
        }, {}),
        dateRange: games.length > 0 ? {
          earliest: games.reduce((earliest, game) => 
            game.gameDate < earliest ? game.gameDate : earliest, games[0].gameDate),
          latest: games.reduce((latest, game) => 
            game.gameDate > latest ? game.gameDate : latest, games[0].gameDate)
        } : null,
        sampleGames: games.slice(0, 3).map(game => ({
          id: game.id,
          player1Name: game.player1Name,
          player2Name: game.player2Name,
          result: game.result,
          gameDate: game.gameDate,
          gameType: game.gameType
        }))
      };
    } catch (error: any) {
      results.tests.gamesStructure = {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }

    // Test 4: Rankings Sheet Structure
    console.log('[DEBUG-SHEETS] Testing rankings calculation...');
    try {
      const rankings = await googleSheetsService.getPlayers();
      
      results.tests.rankingsStructure = {
        success: true,
        totalPlayers: rankings.length,
        playersWithPoints: rankings.filter(p => p.points > 0).length,
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
      results.tests.rankingsStructure = {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }

    // Test 5: Date Filtering Test
    console.log('[DEBUG-SHEETS] Testing date filtering...');
    try {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const todayGames = await googleSheetsService.getGames({
        dateFrom: today,
        dateTo: today,
        gameType: 'ladder'
      });
      
      const yesterdayGames = await googleSheetsService.getGames({
        dateFrom: yesterdayStr,
        dateTo: yesterdayStr,
        gameType: 'ladder'
      });
      
      results.tests.dateFiltering = {
        success: true,
        today: {
          date: today,
          ladderGames: todayGames.length,
          games: todayGames.map(g => ({
            id: g.id,
            player1Name: g.player1Name,
            player2Name: g.player2Name,
            result: g.result
          }))
        },
        yesterday: {
          date: yesterdayStr,
          ladderGames: yesterdayGames.length,
          games: yesterdayGames.map(g => ({
            id: g.id,
            player1Name: g.player1Name,
            player2Name: g.player2Name,
            result: g.result
          }))
        }
      };
    } catch (error: any) {
      results.tests.dateFiltering = {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }

    return NextResponse.json(results, { status: 200 });

  } catch (error: any) {
    console.error('Debug sheets API error:', error);
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      error: error.message,
      stack: error.stack,
      tests: results.tests
    }, { status: 500 });
  }
}