import { NextRequest, NextResponse } from 'next/server';
import { KVCacheService } from '@/lib/kv';
import { enhancedGoogleSheetsService } from '@/lib/googleSheetsEnhanced';

// GET /api/ladder - Get ladder data for a specific date or current date
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    // Use provided date or default to today
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // Get all games from the specified date
    const games = await enhancedGoogleSheetsService.getGames({
      dateFrom: targetDate,
      dateTo: targetDate,
      gameType: 'ladder'
    });
    
    console.log(`Ladder API - Target date: ${targetDate}`);
    console.log(`Ladder API - Found ${games.length} games for this date`);
    
    console.log(`Ladder API - Sample game dates:`, games.slice(0, 3).map(g => g.gameDate));
    
    // Get all players to build the ladder
    const allPlayers = await KVCacheService.getRankings();
    
    // Calculate stats for each player based only on games from the target date
    const playerStats = new Map<string, {
      id: string;
      name: string;
      grade: string;
      gamesPlayed: number;
      wins: number;
      losses: number;
      draws: number;
      points: number;
      lastActive: string;
      email?: string;
    }>();
    
    // Initialize all players with zero stats
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
        email: player.email
      });
    });
    
    // Process games from the target date
    games.forEach(game => {
      const player1Id = game.player1Id || game.player1Name;
      const player2Id = game.player2Id || game.player2Name;
      
      // Ensure both players are in the stats map, even if not in initial rankings
      if (!playerStats.has(player1Id)) {
        playerStats.set(player1Id, {
          id: player1Id,
          name: game.player1Name,
          grade: 'Unknown', // Will be updated if found in rankings
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          points: 0,
          lastActive: game.gameDate,
          email: undefined
        });
      }
      
      if (!playerStats.has(player2Id)) {
        playerStats.set(player2Id, {
          id: player2Id,
          name: game.player2Name,
          grade: 'Unknown', // Will be updated if found in rankings
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          points: 0,
          lastActive: game.gameDate,
          email: undefined
        });
      }
      
      // Update player 1 stats
      const player1Stats = playerStats.get(player1Id);
      if (player1Stats) {
        player1Stats.gamesPlayed++;
        if (game.result === 'player1') {
          player1Stats.wins++;
          player1Stats.points += 2; // 1 for playing + 1 for winning
        } else if (game.result === 'player2') {
          player1Stats.losses++;
          player1Stats.points += 1; // 1 for playing
        } else if (game.result === 'draw') {
          player1Stats.draws++;
          player1Stats.points += 1.5; // 1 for playing + 0.5 for drawing
        }
      }
      
      // Update player 2 stats
      const player2Stats = playerStats.get(player2Id);
      if (player2Stats) {
        player2Stats.gamesPlayed++;
        if (game.result === 'player2') {
          player2Stats.wins++;
          player2Stats.points += 2; // 1 for playing + 1 for winning
        } else if (game.result === 'player1') {
          player2Stats.losses++;
          player2Stats.points += 1; // 1 for playing
        } else if (game.result === 'draw') {
          player2Stats.draws++;
          player2Stats.points += 1.5; // 1 for playing + 0.5 for drawing
        }
      }
    });
    
    // Convert to array and sort by points, then win rate, then name
    const ladderPlayers = Array.from(playerStats.values())
      .filter(player => player.gamesPlayed > 0)
      .sort((a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points;
        }
        
        const aWinRate = a.gamesPlayed > 0 ? a.wins / a.gamesPlayed : 0;
        const bWinRate = b.gamesPlayed > 0 ? b.wins / b.gamesPlayed : 0;
        
        if (bWinRate !== aWinRate) {
          return bWinRate - aWinRate;
        }
        
        return a.name.localeCompare(b.name);
      })
      .map((player, index) => ({
        ...player,
        rank: index + 1
      }));

    return NextResponse.json({
      date: targetDate,
      games: games,
      players: ladderPlayers
    }, { status: 200 });
  } catch (error) {
    console.error('Ladder API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ladder data' },
      { status: 500 }
    );
  }
}

