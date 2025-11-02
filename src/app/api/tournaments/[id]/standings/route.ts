import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';
import { isAdminAuthenticatedServer } from '@/lib/serverAuth';

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
    const standings = await dataService.getTournamentResults(id);

    // Sort by points (desc), then Buchholz (desc)
    const sortedStandings = standings.sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      return b.buchholzScore - a.buchholzScore;
    });

    // Assign ranks
    sortedStandings.forEach((player, index) => {
      player.rank = index + 1;
    });

    return NextResponse.json({
      tournamentId: id,
      results: sortedStandings,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching tournament standings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tournament standings' },
      { status: 500 }
    );
  }
}
