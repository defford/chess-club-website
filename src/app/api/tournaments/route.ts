import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';
import { isAdminAuthenticatedServer } from '@/lib/serverAuth';
import type { TournamentFormData } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const isAdmin = await isAdminAuthenticatedServer(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const tournaments = await googleSheetsService.getTournaments(status || undefined);

    return NextResponse.json(tournaments);
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tournaments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const isAdmin = await isAdminAuthenticatedServer(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const tournamentData: TournamentFormData = body;

    // Validate required fields
    if (!tournamentData.name || !tournamentData.startDate || !tournamentData.playerIds || tournamentData.playerIds.length < 4) {
      return NextResponse.json(
        { error: 'Invalid tournament data. Name, start date, and at least 4 players are required.' },
        { status: 400 }
      );
    }

    // Get the admin user's email for createdBy field
    const adminEmail = request.headers.get('x-admin-email') || 'admin@chessclub.com';

    const tournamentId = await googleSheetsService.addTournament(tournamentData, adminEmail);

    return NextResponse.json(
      { 
        message: 'Tournament created successfully',
        tournamentId 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating tournament:', error);
    return NextResponse.json(
      { error: 'Failed to create tournament' },
      { status: 500 }
    );
  }
}
