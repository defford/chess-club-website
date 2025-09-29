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
      isSystemPlayer?: boolean;
      // Overall stats from rankings
      overallGamesPlayed: number;
      overallWins: number;
      overallLosses: number;
      overallDraws: number;
      overallPoints: number;
      overallRank: number;
    }>();
    
    // Initialize all players with zero daily stats but include overall stats
    allPlayers.forEach(player => {
      playerStats.set(player.id || player.name, {
        id: player.id || player.name,
        name: player.name,
        grade: player.grade,
        gamesPlayed: 0, // Daily games
        wins: 0, // Daily wins
        losses: 0, // Daily losses
        draws: 0, // Daily draws
        points: 0, // Daily points
        lastActive: player.lastActive,
        email: player.email,
        isSystemPlayer: player.isSystemPlayer,
        // Overall stats from rankings
        overallGamesPlayed: player.gamesPlayed,
        overallWins: player.wins,
        overallLosses: player.losses,
        overallDraws: player.draws,
        overallPoints: player.points,
        overallRank: player.rank || 999
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
          gamesPlayed: 0, // Daily games
          wins: 0, // Daily wins
          losses: 0, // Daily losses
          draws: 0, // Daily draws
          points: 0, // Daily points
          lastActive: game.gameDate,
          email: undefined,
          isSystemPlayer: game.player1Name === 'Unknown Opponent' || game.player1Id === 'unknown_opponent',
          // Overall stats (unknown players have 0 overall stats)
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
          grade: 'Unknown', // Will be updated if found in rankings
          gamesPlayed: 0, // Daily games
          wins: 0, // Daily wins
          losses: 0, // Daily losses
          draws: 0, // Daily draws
          points: 0, // Daily points
          lastActive: game.gameDate,
          email: undefined,
          isSystemPlayer: game.player2Name === 'Unknown Opponent' || game.player2Id === 'unknown_opponent',
          // Overall stats (unknown players have 0 overall stats)
          overallGamesPlayed: 0,
          overallWins: 0,
          overallLosses: 0,
          overallDraws: 0,
          overallPoints: 0,
          overallRank: 999
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
    
    // Convert to array and filter players with overall points > 0 and exclude system players
    // Sort by overall points first, then by daily points for the selected date
    const ladderPlayers = Array.from(playerStats.values())
      .filter(player => player.overallPoints > 0 && !player.isSystemPlayer) // Show all players with overall points > 0, exclude system players
      .sort((a, b) => {
        // Primary sort: by overall points
        if (b.overallPoints !== a.overallPoints) {
          return b.overallPoints - a.overallPoints;
        }
        
        // Secondary sort: by daily points for the selected date
        if (b.points !== a.points) {
          return b.points - a.points;
        }
        
        // Tertiary sort: by overall win rate
        const aOverallWinRate = a.overallGamesPlayed > 0 ? a.overallWins / a.overallGamesPlayed : 0;
        const bOverallWinRate = b.overallGamesPlayed > 0 ? b.overallWins / b.overallGamesPlayed : 0;
        
        if (bOverallWinRate !== aOverallWinRate) {
          return bOverallWinRate - aOverallWinRate;
        }
        
        return a.name.localeCompare(b.name);
      })
      .map((player, index) => ({
        ...player,
        rank: index + 1, // Overall rank based on current sorted order
        overallRank: index + 1, // Recalculate overall rank after filtering out system players
        dailyRank: player.points > 0 ? 
          Array.from(playerStats.values())
            .filter(p => p.points > 0)
            .sort((a, b) => b.points - a.points)
            .findIndex(p => p.id === player.id) + 1 : 
          null // No daily rank if no daily points
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

