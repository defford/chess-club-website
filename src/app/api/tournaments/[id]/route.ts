import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';
import { isAdminAuthenticatedServer } from '@/lib/serverAuth';
import type { TournamentData } from '@/lib/types';

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
    const tournament = await googleSheetsService.getTournamentById(id);

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    return NextResponse.json(tournament);
  } catch (error) {
    console.error('Error fetching tournament:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tournament' },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const updates: Partial<TournamentData> = body;

    // Validate that tournament exists
    const existingTournament = await googleSheetsService.getTournamentById(id);
    if (!existingTournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Prevent certain updates if tournament is completed
    if (existingTournament.status === 'completed') {
      if (updates.playerIds || updates.totalRounds) {
        return NextResponse.json(
          { error: 'Cannot modify players or rounds for completed tournaments' },
          { status: 400 }
        );
      }
    }

    await googleSheetsService.updateTournament(id, updates);

    return NextResponse.json({ message: 'Tournament updated successfully' });
  } catch (error) {
    console.error('Error updating tournament:', error);
    return NextResponse.json(
      { error: 'Failed to update tournament' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    // Validate that tournament exists
    const existingTournament = await googleSheetsService.getTournamentById(id);
    if (!existingTournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Prevent deletion of active tournaments
    if (existingTournament.status === 'active') {
      return NextResponse.json(
        { error: 'Cannot delete active tournaments. Please complete or cancel first.' },
        { status: 400 }
      );
    }

    await googleSheetsService.deleteTournament(id);

    return NextResponse.json({ message: 'Tournament deleted successfully' });
  } catch (error) {
    console.error('Error deleting tournament:', error);
    return NextResponse.json(
      { error: 'Failed to delete tournament' },
      { status: 500 }
    );
  }
}
