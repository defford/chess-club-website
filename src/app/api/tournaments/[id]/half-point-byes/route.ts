import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';
import { isAdminAuthenticatedServer } from '@/lib/serverAuth';

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
    const { playerIds, roundNumber } = body;

    if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
      return NextResponse.json(
        { error: 'Player IDs are required' },
        { status: 400 }
      );
    }

    if (!roundNumber || roundNumber < 1) {
      return NextResponse.json(
        { error: 'Valid round number is required' },
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
        { error: 'Can only assign half-point byes to active tournaments' },
        { status: 400 }
      );
    }

    // Validate that the round number is the current round
    if (roundNumber !== tournament.currentRound) {
      return NextResponse.json(
        { error: 'Can only assign half-point byes for the current round' },
        { status: 400 }
      );
    }

    // Get current tournament results
    const currentResults = await dataService.getTournamentResults(id);
    
    // Validate that all player IDs exist in the tournament
    const tournamentPlayerIds = tournament.playerIds;
    const invalidPlayerIds = playerIds.filter(playerId => !tournamentPlayerIds.includes(playerId));
    
    if (invalidPlayerIds.length > 0) {
      return NextResponse.json(
        { error: `Invalid player IDs: ${invalidPlayerIds.join(', ')}` },
        { status: 400 }
      );
    }

    // Update tournament results to assign half-point byes
    const updatedResults = currentResults.map(result => {
      if (playerIds.includes(result.playerId)) {
        return {
          ...result,
          points: result.points + 0.5,
          byeRounds: [...result.byeRounds, roundNumber],
          lastUpdated: new Date().toISOString()
        };
      }
      return result;
    });

    // Update the tournament results
    try {
      await dataService.updateTournamentResults(id, updatedResults);
    } catch (error) {
      console.error('Failed to update tournament results for half-point byes:', error);
    }

    // Update the tournament's currentHalfPointByes field
    await dataService.updateTournament(id, {
      currentHalfPointByes: JSON.stringify(playerIds)
    });

    return NextResponse.json({
      message: 'Half-point byes assigned successfully',
      affectedPlayers: playerIds.length,
      roundNumber
    });

  } catch (error) {
    console.error('Error assigning half-point byes:', error);
    return NextResponse.json(
      { error: 'Failed to assign half-point byes' },
      { status: 500 }
    );
  }
}

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
    const url = new URL(request.url);
    const roundNumber = url.searchParams.get('roundNumber');

    if (!roundNumber) {
      return NextResponse.json(
        { error: 'Round number is required' },
        { status: 400 }
      );
    }

    // Get tournament results for the specified round
    const results = await dataService.getTournamentResults(id);
    
    // Filter players who have half-point byes in the specified round
    const playersWithHalfPointByes = results
      .filter(result => result.byeRounds.includes(parseInt(roundNumber)))
      .map(result => ({
        playerId: result.playerId,
        playerName: result.playerName,
        points: result.points,
        byeRounds: result.byeRounds
      }));

    return NextResponse.json({
      tournamentId: id,
      roundNumber: parseInt(roundNumber),
      playersWithHalfPointByes
    });

  } catch (error) {
    console.error('Error fetching half-point byes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch half-point byes' },
      { status: 500 }
    );
  }
}
