import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/apiAuth';
import { dataService } from '@/lib/dataService';

// GET /api/attendance/meets/[meetId]/attendance - Get attendance list for meet
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
    const attendance = await dataService.getAttendanceByMeet(meetId);
    
    return NextResponse.json(attendance, { status: 200 });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance' },
      { status: 500 }
    );
  }
}

// POST /api/attendance/meets/[meetId]/attendance - Add player(s) to attendance
export async function POST(
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
    const body = await request.json();
    const { playerIds, playerId } = body;

    // Support both single playerId and array of playerIds
    const idsToAdd = playerIds || (playerId ? [playerId] : []);
    
    if (idsToAdd.length === 0) {
      return NextResponse.json(
        { error: 'playerId or playerIds is required' },
        { status: 400 }
      );
    }

    await dataService.addAttendance(meetId, idsToAdd);
    
    return NextResponse.json(
      { message: 'Attendance added successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding attendance:', error);
    return NextResponse.json(
      { error: 'Failed to add attendance' },
      { status: 500 }
    );
  }
}

// DELETE /api/attendance/meets/[meetId]/attendance - Remove player from attendance
export async function DELETE(
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
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');

    if (!playerId) {
      return NextResponse.json(
        { error: 'playerId query parameter is required' },
        { status: 400 }
      );
    }

    await dataService.removeAttendance(meetId, playerId);
    
    return NextResponse.json(
      { message: 'Attendance removed successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error removing attendance:', error);
    return NextResponse.json(
      { error: 'Failed to remove attendance' },
      { status: 500 }
    );
  }
}

