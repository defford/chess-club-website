import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/apiAuth';
import { dataService } from '@/lib/dataService';

// GET /api/attendance/meets/[meetId]/players - Get PlayerData array for players who attended
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ meetId: string }> }
) {
  try {
    const authResult = await requireAdminAuth(request);
    if (!authResult.isAdmin) {
      return NextResponse.json(
        { error: authResult.error || 'Admin privileges required' },
        { status: 403 }
      );
    }

    const { meetId } = await params;
    const players = await dataService.getPlayersByMeet(meetId);
    
    return NextResponse.json(players, { status: 200 });
  } catch (error) {
    console.error('Error fetching players for meet:', error);
    return NextResponse.json(
      { error: 'Failed to fetch players for meet' },
      { status: 500 }
    );
  }
}

