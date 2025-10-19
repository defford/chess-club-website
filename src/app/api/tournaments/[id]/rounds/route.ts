import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';
import { generateSwissPairings } from '@/lib/swissPairing';
import { isAdminAuthenticatedServer } from '@/lib/serverAuth';

// Simple in-memory cache for tournament data
const tournamentCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

export async function GET(
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
    
    // Get the tournament data to retrieve stored pairings
    const tournament = await googleSheetsService.getTournamentById(id);
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Check cache first to reduce API calls
    const cacheKey = `tournament-results-${id}`;
    const cached = tournamentCache.get(cacheKey);
    const now = Date.now();
    
    let currentResults;
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      currentResults = cached.data;
    } else {
      // Get current tournament results for player name conversion
      // Add a longer delay to avoid hitting quota limits
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        currentResults = await googleSheetsService.getTournamentResults(id);
        // Cache the results
        tournamentCache.set(cacheKey, { data: currentResults, timestamp: now });
      } catch (error: any) {
        console.error('Failed to get tournament results, quota may be exceeded:', error);
        // Return tournament data without player name conversion if quota is exceeded
        return NextResponse.json({
          pairings: [],
          forcedByes: [],
          halfPointByes: [],
          roundNumber: tournament.currentRound,
          error: 'Unable to fetch current results due to API quota limits. Please try again in a few minutes.'
        });
      }
    }

    // Parse stored pairings if they exist
    let pairings = [];
    let forcedByes = [];
    let halfPointByes = [];

    if ((tournament as any).currentPairings) {
      try {
        pairings = JSON.parse((tournament as any).currentPairings);
      } catch (error) {
        console.error('Error parsing current pairings:', error);
      }
    }

    if ((tournament as any).currentForcedByes) {
      try {
        const forcedByePlayerIds = JSON.parse((tournament as any).currentForcedByes);
        
        // Convert player IDs to names for display
        forcedByes = forcedByePlayerIds.map((playerId: string) => {
          const player = currentResults.find((p: any) => p.playerId === playerId);
          return player ? player.playerName : 'Unknown Player';
        });
      } catch (error) {
        console.error('Error parsing current forced byes:', error);
      }
    }

    if ((tournament as any).currentHalfPointByes) {
      try {
        const halfPointByePlayerIds = JSON.parse((tournament as any).currentHalfPointByes);
        
        // Convert player IDs to names for display
        halfPointByes = halfPointByePlayerIds.map((playerId: string) => {
          const player = currentResults.find((p: any) => p.playerId === playerId);
          return player ? player.playerName : 'Unknown Player';
        });
      } catch (error) {
        console.error('Error parsing current half-point byes:', error);
      }
    }

    const responseData = {
      pairings,
      forcedByes,
      halfPointByes,
      roundNumber: tournament.currentRound
    };
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error fetching tournament rounds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tournament rounds' },
      { status: 500 }
    );
  }
}

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
    const { roundNumber } = body;

    if (!roundNumber || roundNumber < 1) {
      return NextResponse.json(
        { error: 'Invalid round number' },
        { status: 400 }
      );
    }

    // Validate tournament exists and is active
    const tournament = await googleSheetsService.getTournamentById(id);
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    if (tournament.status !== 'active' && tournament.status !== 'upcoming') {
      return NextResponse.json(
        { error: 'Cannot generate pairings for completed or cancelled tournaments' },
        { status: 400 }
      );
    }

    // Get current standings and all players
    const currentResults = await googleSheetsService.getTournamentResults(id);
    const allPlayers = await googleSheetsService.getMembersFromParentsAndStudents();
    
    // Map players for pairing
    const playersForPairing = tournament.playerIds
      .map(playerId => allPlayers.find(p => p.studentId === playerId))
      .filter(Boolean);

    // Generate Swiss pairings for the round
    const pairingResult = await generateSwissPairings(id, roundNumber, currentResults, playersForPairing);

    // Get player names for forced byes (for display purposes)
    const forcedByeNames = pairingResult.forcedByes.map(playerId => {
      const player = currentResults.find(p => p.playerId === playerId);
      return player ? player.playerName : 'Unknown Player';
    });

    // Get player names for half-point byes (for display purposes)
    const halfPointByeNames = pairingResult.halfPointByes.map(playerId => {
      const player = currentResults.find(p => p.playerId === playerId);
      return player ? player.playerName : 'Unknown Player';
    });

    // Process forced byes immediately - award 1 point to forced bye players
    if (pairingResult.forcedByes.length > 0) {
      const updatedResults = currentResults.map(result => {
        if (pairingResult.forcedByes.includes(result.playerId)) {
          return {
            ...result,
            points: result.points + 1,
            gamesPlayed: result.gamesPlayed + 1, // Count as a game played
            lastUpdated: new Date().toISOString()
          };
        }
        return result;
      });
      
      // Update the tournament results in Google Sheets immediately
      try {
        await googleSheetsService.updateTournamentResults(id, updatedResults);
      } catch (error) {
        console.error('Failed to update tournament results for forced byes:', error);
      }
    }

    // Update tournament to active status if it was upcoming and store pairings
    const updateData: any = {
      status: tournament.status === 'upcoming' ? 'active' : tournament.status,
      currentRound: roundNumber
    };
    
    // Store the pairings in the tournament data (this also clears previous round's data)
    updateData.currentPairings = JSON.stringify(pairingResult.pairings);
    updateData.currentForcedByes = JSON.stringify(pairingResult.forcedByes); // Store player IDs, not names
    updateData.currentHalfPointByes = JSON.stringify(pairingResult.halfPointByes); // Store player IDs, not names
    
    await googleSheetsService.updateTournament(id, updateData);

    return NextResponse.json({
      message: 'Round pairings generated successfully',
      roundNumber,
      pairings: pairingResult.pairings,
      forcedByes: forcedByeNames,
      halfPointByes: halfPointByeNames
    });
  } catch (error) {
    console.error('Error generating round pairings:', error);
    return NextResponse.json(
      { error: 'Failed to generate round pairings' },
      { status: 500 }
    );
  }
}
