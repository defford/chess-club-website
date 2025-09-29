import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';

// GET /api/debug-rankings - Debug rankings calculation specifically
export async function GET(request: NextRequest) {
  const results = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    tests: {} as any
  };

  try {
    // Test 1: Get games data
    console.log('[DEBUG-RANKINGS] Getting games data...');
    const games = await googleSheetsService.getGames();
    const ladderGames = games.filter(game => game.gameType === 'ladder');
    
    results.tests.games = {
      totalGames: games.length,
      ladderGames: ladderGames.length,
      sampleGames: ladderGames.slice(0, 5).map(game => ({
        id: game.id,
        player1Id: game.player1Id,
        player1Name: game.player1Name,
        player2Id: game.player2Id,
        player2Name: game.player2Name,
        result: game.result,
        gameDate: game.gameDate
      }))
    };

    // Test 2: Get members data
    console.log('[DEBUG-RANKINGS] Getting members data...');
    const members = await googleSheetsService.getMembersFromParentsAndStudents();
    
    results.tests.members = {
      totalMembers: members.length,
      sampleMembers: members.slice(0, 5).map(member => ({
        id: member.rowIndex ? `reg_row_${member.rowIndex}` : `member_${members.indexOf(member) + 1}`,
        name: member.playerName,
        grade: member.playerGrade,
        parentEmail: member.parentEmail
      }))
    };

    // Test 3: Check ID matching
    console.log('[DEBUG-RANKINGS] Checking ID matching...');
    const gamePlayerIds = new Set();
    ladderGames.forEach(game => {
      gamePlayerIds.add(game.player1Id);
      gamePlayerIds.add(game.player2Id);
    });

    const memberIds = new Set();
    members.forEach(member => {
      const id = member.rowIndex ? `reg_row_${member.rowIndex}` : `member_${members.indexOf(member) + 1}`;
      memberIds.add(id);
    });

    const matchingIds = [...gamePlayerIds].filter(id => memberIds.has(id));
    const gameOnlyIds = [...gamePlayerIds].filter(id => !memberIds.has(id));
    const memberOnlyIds = [...memberIds].filter(id => !gamePlayerIds.has(id));

    results.tests.idMatching = {
      gamePlayerIds: Array.from(gamePlayerIds),
      memberIds: Array.from(memberIds),
      matchingIds: matchingIds,
      gameOnlyIds: gameOnlyIds,
      memberOnlyIds: memberOnlyIds,
      matchCount: matchingIds.length,
      totalGamePlayers: gamePlayerIds.size,
      totalMembers: memberIds.size
    };

    // Test 4: Manual rankings calculation
    console.log('[DEBUG-RANKINGS] Manual rankings calculation...');
    const playerStats = new Map();

    // Initialize all registered players
    members.forEach(member => {
      const id = member.rowIndex ? `reg_row_${member.rowIndex}` : `member_${members.indexOf(member) + 1}`;
      playerStats.set(id, {
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
        isSystemPlayer: false
      });
    });

    // Process each game
    let processedGames = 0;
    ladderGames.forEach(game => {
      processedGames++;
      
      // Get or create player1 stats
      let player1Stats = playerStats.get(game.player1Id);
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
          isSystemPlayer: game.player1Name === 'Unknown Opponent' || game.player1Id === 'unknown_opponent'
        };
        playerStats.set(game.player1Id, player1Stats);
      }

      // Get or create player2 stats
      let player2Stats = playerStats.get(game.player2Id);
      if (!player2Stats) {
        player2Stats = {
          id: game.player2Id,
          name: game.player2Name,
          grade: 'Unknown',
          gamesPlayed: 0,
          draws: 0,
          losses: 0,
          points: 0,
          lastActive: game.gameDate,
          email: '',
          isSystemPlayer: game.player2Name === 'Unknown Opponent' || game.player2Id === 'unknown_opponent'
        };
        playerStats.set(game.player2Id, player2Stats);
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

    const allPlayerStats = Array.from(playerStats.values());
    const playersWithPoints = allPlayerStats.filter(p => p.points > 0);
    const playersWithGames = allPlayerStats.filter(p => p.gamesPlayed > 0);

    results.tests.manualCalculation = {
      processedGames: processedGames,
      totalPlayerStats: allPlayerStats.length,
      playersWithPoints: playersWithPoints.length,
      playersWithGames: playersWithGames.length,
      samplePlayersWithPoints: playersWithPoints.slice(0, 5).map(player => ({
        id: player.id,
        name: player.name,
        grade: player.grade,
        points: player.points,
        gamesPlayed: player.gamesPlayed,
        wins: player.wins,
        losses: player.losses,
        draws: player.draws
      })),
      samplePlayersWithGames: playersWithGames.slice(0, 5).map(player => ({
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

    // Test 5: Compare with actual rankings
    console.log('[DEBUG-RANKINGS] Getting actual rankings...');
    const actualRankings = await googleSheetsService.getPlayers();
    
    results.tests.actualRankings = {
      totalPlayers: actualRankings.length,
      playersWithPoints: actualRankings.filter(p => p.points > 0).length,
      samplePlayers: actualRankings.slice(0, 5).map(player => ({
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

    return NextResponse.json(results, { status: 200 });

  } catch (error: any) {
    console.error('Debug rankings API error:', error);
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      error: error.message,
      stack: error.stack,
      tests: results.tests
    }, { status: 500 });
  }
}
