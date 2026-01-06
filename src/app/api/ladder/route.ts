import { NextRequest, NextResponse } from 'next/server';
import { KVCacheService } from '@/lib/kv';
import { dataService } from '@/lib/dataService';
import { supabaseService } from '@/lib/supabaseService';
import { LADDER_CONFIG } from '@/lib/config';

// Force dynamic behavior
export const dynamic = 'force-dynamic';

// GET /api/ladder - Get ladder data for a specific date or current date
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    // Use provided date or default to today
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // Get all games from the specified date
    const games = await dataService.getGames({
      dateFrom: targetDate,
      dateTo: targetDate,
      gameType: 'ladder'
    });
    console.log(`[Ladder API] Retrieved ${games.length} ladder games for date ${targetDate}`);
    
    // Get all players to build the ladder
    // Force fresh calculation by bypassing cache temporarily
    const allPlayers = await dataService.calculateRankingsFromGames();
    console.log(`[Ladder API] Retrieved ${allPlayers.length} players from fresh rankings calculation`);
    
    // Debug: Check ELO ratings in returned players
    const playersWithElo = allPlayers.filter(p => p.eloRating !== undefined && p.eloRating !== 1000);
    console.log(`[Ladder API] Players with non-default ELO ratings: ${playersWithElo.length}`);
    if (playersWithElo.length > 0) {
      console.log(`[Ladder API] Sample players with ELO:`, playersWithElo.slice(0, 3).map(p => ({
        id: p.id,
        name: p.name,
        eloRating: p.eloRating
      })));
    } else {
      console.warn(`[Ladder API] No players have non-default ELO ratings - all showing 1000`);
    }
    
    // Debug: Check if any players have points
    const playersWithPoints = allPlayers.filter(p => p.points > 0);
    console.log(`[Ladder API] Players with points > 0: ${playersWithPoints.length}`);
    if (playersWithPoints.length > 0) {
      console.log(`[Ladder API] Sample players with points:`, playersWithPoints.slice(0, 3).map(p => ({
        id: p.id,
        name: p.name,
        points: p.points,
        gamesPlayed: p.gamesPlayed
      })));
    }
    
    // If no players have points, try to get members directly and calculate from games
    if (playersWithPoints.length === 0) {
      console.log(`[Ladder API] No players with points found, trying alternative calculation...`);
      const members = await dataService.getMembersFromParentsAndStudents();
      console.log(`[Ladder API] Retrieved ${members.length} members directly`);
      
      // Create a simple player stats map from members
      const memberStats = new Map();
      members.forEach(member => {
        const id = member.studentId || (member.rowIndex ? `reg_row_${member.rowIndex}` : `member_${members.indexOf(member) + 1}`);
        memberStats.set(id, {
          id: id,
          name: member.playerName,
          grade: member.playerGrade,
          gamesPlayed: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          points: 0,
          lastActive: member.timestamp || new Date().toISOString(),
          email: member.parentEmail || '',
          isSystemPlayer: false,
          eloRating: 1000 // Default ELO rating
        });
      });
      
      // Fetch ELO ratings for members who have student IDs
      try {
        const studentIds = members.map(m => m.studentId).filter((id): id is string => !!id);
        if (studentIds.length > 0) {
          // Fetch ELO ratings for all students
          for (const studentId of studentIds) {
            try {
              const eloRating = await supabaseService.getPlayerEloRating(studentId);
              const member = members.find(m => m.studentId === studentId);
              if (member) {
                const id = member.studentId || (member.rowIndex ? `reg_row_${member.rowIndex}` : `member_${members.indexOf(member) + 1}`);
                const stats = memberStats.get(id);
                if (stats) {
                  stats.eloRating = eloRating;
                }
              }
            } catch (error) {
              // Continue if individual player fetch fails
            }
          }
        }
      } catch (error) {
        console.warn('[Ladder API] Failed to fetch ELO ratings in fallback calculation:', error);
      }
      
      // Process all games to calculate stats (filtered by season start date)
      const allGames = await dataService.getGames({
        dateFrom: LADDER_CONFIG.CURRENT_SEASON_START_DATE,
        gameType: 'ladder'
      });
      const allLadderGames = allGames;
      console.log(`[Ladder API] Processing ${allLadderGames.length} ladder games from season ${LADDER_CONFIG.CURRENT_SEASON_START_DATE} for stats calculation`);
      
      allLadderGames.forEach(game => {
        // Get or create player1 stats
        let player1Stats = memberStats.get(game.player1Id);
        if (!player1Stats) {
          player1Stats = {
            id: game.player1Id,
            name: game.player1Name,
            grade: 'Unknown',
            gamesPlayed: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            points: 0,
            lastActive: game.gameDate,
            email: '',
            isSystemPlayer: game.player1Name === 'Unknown Opponent' || game.player1Id === 'unknown_opponent',
            eloRating: 1000 // Default ELO rating
          };
          memberStats.set(game.player1Id, player1Stats);
        }
        
        // Get or create player2 stats
        let player2Stats = memberStats.get(game.player2Id);
        if (!player2Stats) {
          player2Stats = {
            id: game.player2Id,
            name: game.player2Name,
            grade: 'Unknown',
            gamesPlayed: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            points: 0,
            lastActive: game.gameDate,
            email: '',
            isSystemPlayer: game.player2Name === 'Unknown Opponent' || game.player2Id === 'unknown_opponent',
            eloRating: 1000 // Default ELO rating
          };
          memberStats.set(game.player2Id, player2Stats);
        }
        
        // Update stats
        player1Stats.gamesPlayed += 1;
        player2Stats.gamesPlayed += 1;
        
        if (game.result === 'player1') {
          player1Stats.points += 2;
          player2Stats.points += 1;
          player1Stats.wins += 1;
          player2Stats.losses += 1;
        } else if (game.result === 'player2') {
          player2Stats.points += 2;
          player1Stats.points += 1;
          player2Stats.wins += 1;
          player1Stats.losses += 1;
        } else if (game.result === 'draw') {
          player1Stats.points += 1.5;
          player2Stats.points += 1.5;
          player1Stats.draws += 1;
          player2Stats.draws += 1;
        }
      });
      
      // Convert to array and sort by points
      const calculatedPlayers = Array.from(memberStats.values())
        .sort((a, b) => b.points - a.points)
        .map((player, index) => ({
          ...player,
          rank: index + 1
        }));
      
      const calculatedPlayersWithPoints = calculatedPlayers.filter(p => p.points > 0);
      console.log(`[Ladder API] Alternative calculation: ${calculatedPlayers.length} total players, ${calculatedPlayersWithPoints.length} with points > 0`);
      
      if (calculatedPlayersWithPoints.length > 0) {
        console.log(`[Ladder API] Alternative calculation sample:`, calculatedPlayersWithPoints.slice(0, 3).map(p => ({
          id: p.id,
          name: p.name,
          points: p.points,
          gamesPlayed: p.gamesPlayed
        })));
        // Use the alternative calculation
        allPlayers.length = 0;
        allPlayers.push(...calculatedPlayers);
      }
    }
    
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
      eloRating?: number;
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
        eloRating: player.eloRating, // Include ELO rating from rankings
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
        // Try to find player in allPlayers to get their ELO rating
        const existingPlayer = allPlayers.find(p => (p.id || p.name) === player1Id);
        playerStats.set(player1Id, {
          id: player1Id,
          name: game.player1Name,
          grade: existingPlayer?.grade || 'Unknown', // Will be updated if found in rankings
          gamesPlayed: 0, // Daily games
          wins: 0, // Daily wins
          losses: 0, // Daily losses
          draws: 0, // Daily draws
          points: 0, // Daily points
          lastActive: game.gameDate,
          email: existingPlayer?.email,
          isSystemPlayer: game.player1Name === 'Unknown Opponent' || game.player1Id === 'unknown_opponent',
          eloRating: existingPlayer?.eloRating || 1000, // Default to 1000 if not found
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
        // Try to find player in allPlayers to get their ELO rating
        const existingPlayer = allPlayers.find(p => (p.id || p.name) === player2Id);
        playerStats.set(player2Id, {
          id: player2Id,
          name: game.player2Name,
          grade: existingPlayer?.grade || 'Unknown', // Will be updated if found in rankings
          gamesPlayed: 0, // Daily games
          wins: 0, // Daily wins
          losses: 0, // Daily losses
          draws: 0, // Daily draws
          points: 0, // Daily points
          lastActive: game.gameDate,
          email: existingPlayer?.email,
          isSystemPlayer: game.player2Name === 'Unknown Opponent' || game.player2Id === 'unknown_opponent',
          eloRating: existingPlayer?.eloRating || 1000, // Default to 1000 if not found
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
    
    // Convert to array and filter players with ladder games, exclude system players
    const allPlayerStats = Array.from(playerStats.values());
    console.log(`[Ladder API] Total player stats calculated: ${allPlayerStats.length}`);
    
    const ladderPlayers = allPlayerStats
      .filter(player => (player.overallPoints > 0 || player.overallGamesPlayed > 0) && !player.isSystemPlayer) // Show players with ladder games, exclude system players
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

    console.log(`[Ladder API] Final ladder players: ${ladderPlayers.length} (filtered from ${allPlayerStats.length} total)`);

    // Invalidate rankings cache to ensure fresh data for future requests
    try {
      await KVCacheService.invalidateKey('rankings:all');
      await KVCacheService.invalidateByTags(['rankings']);
      console.log('[Ladder API] Rankings cache invalidated');
    } catch (cacheError) {
      console.warn('[Ladder API] Failed to invalidate rankings cache:', cacheError);
    }

    // Return with no-store headers to prevent browser caching
    return NextResponse.json({
      date: targetDate,
      games: games,
      players: ladderPlayers
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (error) {
    console.error('Ladder API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ladder data' },
      { status: 500 }
    );
  }
}
