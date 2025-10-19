import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';
import { isAdminAuthenticatedServer } from '@/lib/serverAuth';
import type { TournamentResultData } from '@/lib/types';

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
    const { action, playerIds, removeCompletely = false, byeRounds = [] } = body;

    if (!action || !playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. Action and playerIds are required.' },
        { status: 400 }
      );
    }

    // Validate tournament exists
    const tournament = await googleSheetsService.getTournamentById(id);
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Prevent modifications to completed tournaments
    if (tournament.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot modify players in completed tournaments' },
        { status: 400 }
      );
    }

    if (action === 'add') {
      // Validate that players aren't already in tournament
      const existingPlayerIds = tournament.playerIds;
      const duplicatePlayers = playerIds.filter(playerId => existingPlayerIds.includes(playerId));
      
      if (duplicatePlayers.length > 0) {
        return NextResponse.json(
          { error: `Players already in tournament: ${duplicatePlayers.join(', ')}` },
          { status: 400 }
        );
      }

      // Add players to tournament
      await googleSheetsService.addPlayersToTournament(id, playerIds, byeRounds);
      
      // Update tournament playerIds
      const updatedPlayerIds = [...tournament.playerIds, ...playerIds];
      await googleSheetsService.updateTournament(id, { playerIds: updatedPlayerIds });

      // Clear current round pairings if tournament is active
      if (tournament.status === 'active') {
        await googleSheetsService.updateTournament(id, {
          currentPairings: undefined,
          currentForcedByes: undefined,
          currentHalfPointByes: undefined
        });
      }

      return NextResponse.json({
        message: `Successfully added ${playerIds.length} players to tournament`,
        addedPlayers: playerIds
      });

    } else if (action === 'remove') {
      // Validate that players exist in tournament
      const existingPlayerIds = tournament.playerIds;
      const invalidPlayers = playerIds.filter(playerId => !existingPlayerIds.includes(playerId));
      
      if (invalidPlayers.length > 0) {
        return NextResponse.json(
          { error: `Players not in tournament: ${invalidPlayers.join(', ')}` },
          { status: 400 }
        );
      }

      // Remove players from tournament
      await googleSheetsService.removePlayersFromTournament(id, playerIds, removeCompletely);
      
      // Update tournament playerIds
      const updatedPlayerIds = tournament.playerIds.filter(playerId => !playerIds.includes(playerId));
      await googleSheetsService.updateTournament(id, { playerIds: updatedPlayerIds });

      // Clear current round pairings if tournament is active
      if (tournament.status === 'active') {
        await googleSheetsService.updateTournament(id, {
          currentPairings: undefined,
          currentForcedByes: undefined,
          currentHalfPointByes: undefined
        });
      }

      return NextResponse.json({
        message: `Successfully ${removeCompletely ? 'removed' : 'withdrew'} ${playerIds.length} players from tournament`,
        removedPlayers: playerIds
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "add" or "remove"' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error managing tournament players:', error);
    return NextResponse.json(
      { error: 'Failed to manage tournament players' },
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
    
    // Get tournament data
    const tournament = await googleSheetsService.getTournamentById(id);
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Get all available members for adding
    const allMembers = await googleSheetsService.getMembersFromParentsAndStudents();
    
    // Get current tournament results (including withdrawn players)
    const tournamentResults = await googleSheetsService.getTournamentResults(id);
    
    // Filter available players (not in tournament)
    const availablePlayers = allMembers.filter(member => 
      member.studentId && !tournament.playerIds.includes(member.studentId)
    );

    // Get current players with their status
    const currentPlayers = tournamentResults.map(result => ({
      playerId: result.playerId,
      playerName: result.playerName,
      withdrawn: false, // For now, assume no withdrawn players
      withdrawnAt: undefined
    }));

    return NextResponse.json({
      tournament: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        currentRound: tournament.currentRound,
        totalRounds: tournament.totalRounds
      },
      availablePlayers: availablePlayers.map(member => ({
        playerId: member.studentId,
        playerName: member.playerName
      })),
      currentPlayers
    });

  } catch (error) {
    console.error('Error fetching tournament player data:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: `Failed to fetch tournament player data: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
