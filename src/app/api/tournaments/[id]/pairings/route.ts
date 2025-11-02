import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';
import { isAdminAuthenticatedServer } from '@/lib/serverAuth';

// Simple in-memory cache for tournament data
const tournamentCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin authentication
    const isAdmin = await isAdminAuthenticatedServer(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { roundResults } = body;

    if (!roundResults || !Array.isArray(roundResults)) {
      return NextResponse.json(
        { error: 'Invalid round results data' },
        { status: 400 }
      );
    }

    // Validate tournament exists and is active
    const tournament = await dataService.getTournamentById(id);
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }
    

    if (tournament.status !== 'active') {
      return NextResponse.json(
        { error: 'Cannot submit results for non-active tournaments' },
        { status: 400 }
      );
    }

    // Validate all results have required fields
    for (const result of roundResults) {
      if (!result.pairingId || !result.result) {
        return NextResponse.json(
          { error: 'Each result must have pairingId and result' },
          { status: 400 }
        );
      }

      const validResults = ['player1', 'player2', 'draw', 'half-bye-p1', 'half-bye-p2'];
      if (!validResults.includes(result.result)) {
        return NextResponse.json(
          { error: `Invalid result: ${result.result}. Must be one of: ${validResults.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Check cache first to reduce API calls
    const cacheKey = `tournament-results-${id}`;
    const cached = tournamentCache.get(cacheKey);
    const now = Date.now();
    
    let currentResults;
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      currentResults = cached.data;
    } else {
      // Get current tournament results with delay to avoid quota issues
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        currentResults = await dataService.getTournamentResults(id);
        // Cache the results
        tournamentCache.set(cacheKey, { data: currentResults, timestamp: now });
      } catch (error: any) {
        console.error('Failed to get tournament results, quota may be exceeded:', error);
        return NextResponse.json({
          error: 'Unable to process results due to API quota limits. Please try again in a few minutes.',
          quotaExceeded: true
        }, { status: 429 });
      }
    }
    
    const updatedResults = [...currentResults];
    
    // Get current pairings from tournament data to extract player IDs
    let currentPairings: any[] = [];
    try {
      if (tournament.currentPairings) {
        currentPairings = JSON.parse(tournament.currentPairings);
      }
    } catch (error) {
      console.error('Error parsing current pairings:', error);
    }

    // Process each result and update standings
    for (const result of roundResults) {
      const { pairingId, result: gameResult } = result;
      
      // Find the pairing in current pairings to get player IDs
      const pairing = currentPairings.find(p => p.id === pairingId);
      
      if (!pairing) {
        continue;
      }
      
      const player1Id = pairing.player1Id;
      const player2Id = pairing.player2Id;
      
      // Find the players in the results
      const player1Result = updatedResults.find(r => r.playerId === player1Id);
      const player2Result = updatedResults.find(r => r.playerId === player2Id);
      
      if (player1Result && player2Result) {
        
        // Update games played for both players
        player1Result.gamesPlayed++;
        player2Result.gamesPlayed++;
        
        // Add opponents to faced list
        if (!player1Result.opponentsFaced.includes(player2Id)) {
          player1Result.opponentsFaced.push(player2Id);
        }
        if (!player2Result.opponentsFaced.includes(player1Id)) {
          player2Result.opponentsFaced.push(player1Id);
        }
        
        // Update results based on game outcome
        if (gameResult === 'player1') {
          player1Result.wins++;
          player1Result.points += 1; // Winner gets 1 point
          player2Result.losses++;
          player2Result.points += 0; // Loser gets 0 points
        } else if (gameResult === 'player2') {
          player2Result.wins++;
          player2Result.points += 1; // Winner gets 1 point
          player1Result.losses++;
          player1Result.points += 0; // Loser gets 0 points
        } else if (gameResult === 'draw') {
          player1Result.draws++;
          player1Result.points += 0.5; // Draw gives 0.5 points each
          player2Result.draws++;
          player2Result.points += 0.5; // Draw gives 0.5 points each
        } else if (gameResult === 'half-bye-p1') {
          player1Result.points += 0.5; // Half-bye gives 0.5 points
          player1Result.byeRounds.push(tournament.currentRound);
        } else if (gameResult === 'half-bye-p2') {
          player2Result.points += 0.5; // Half-bye gives 0.5 points
          player2Result.byeRounds.push(tournament.currentRound);
        }
        
        // Update last updated timestamp
        player1Result.lastUpdated = new Date().toISOString();
        player2Result.lastUpdated = new Date().toISOString();
      }
    }
    
    // Note: Forced byes are now processed immediately when the round is created
    // in the /api/tournaments/[id]/rounds endpoint, so we don't need to process them here
    
    try {
      await dataService.updateTournamentResults(id, updatedResults);
    } catch (error) {
      console.error('❌ Tournament results update failed:', error);
    }

    // Create game records for actual games (not byes)
    const gamePromises = roundResults
      .filter(result => result.result !== 'half-bye-p1' && result.result !== 'half-bye-p2')
      .map(async (result) => {
        try {
          // Extract player IDs from pairingId
          const pairingParts = result.pairingId.split('_');
          if (pairingParts.length >= 11) {
            const player1Id = `${pairingParts[5]}_${pairingParts[6]}_${pairingParts[7]}`;
            const player2Id = `${pairingParts[8]}_${pairingParts[9]}_${pairingParts[10]}`;
            
            // Find player names from the updated results
            const player1Result = updatedResults.find(r => r.playerId === player1Id);
            const player2Result = updatedResults.find(r => r.playerId === player2Id);
            
            if (player1Result && player2Result) {
              // Create game data object
              const gameData = {
                id: '', // Will be generated by addGame
                player1Id: player1Id,
                player1Name: player1Result.playerName,
                player2Id: player2Id,
                player2Name: player2Result.playerName,
                result: result.result,
                gameDate: new Date().toISOString().split('T')[0],
                gameTime: 0,
                gameType: 'tournament',
                eventId: id, // Tournament ID as event ID
                notes: `Tournament game - Round ${tournament.currentRound}`,
                recordedBy: 'admin',
                recordedAt: new Date().toISOString(),
                opening: '',
                endgame: '',
                isVerified: false,
              };

              // Add game using dataService (handles cache invalidation)
              const gameId = await dataService.addGame(gameData);
              return gameId;
            }
          }
        } catch (error) {
          console.error(`❌ Failed to create game for pairing ${result.pairingId}:`, error);
        }
        return null;
      });

    const createdGames = await Promise.all(gamePromises);
    const successfulGames = createdGames.filter(gameId => gameId !== null);

    // Check if tournament is complete
    const currentRound = tournament.currentRound;
    const totalRounds = tournament.totalRounds;

    if (currentRound >= totalRounds) {
      // Tournament is complete - clear all round data
      await dataService.updateTournament(id, {
        status: 'completed',
        currentPairings: undefined,
        currentForcedByes: undefined,
        currentHalfPointByes: undefined
      });
    } else {
      // Move to next round and clear current round data
      await dataService.updateTournament(id, {
        currentRound: currentRound + 1,
        currentPairings: undefined,
        currentForcedByes: undefined,
        currentHalfPointByes: undefined
      });
    }

    return NextResponse.json({
      message: 'Round results submitted successfully',
      tournamentStatus: currentRound >= totalRounds ? 'completed' : 'active',
      nextRound: currentRound >= totalRounds ? null : currentRound + 1
    });
  } catch (error) {
    console.error('Error submitting round results:', error);
    return NextResponse.json(
      { error: 'Failed to submit round results' },
      { status: 500 }
    );
  }
}
