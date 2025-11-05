import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/apiAuth';
import { dataService } from '@/lib/dataService';

// GET /api/attendance/meets/[meetId] - Get single meet with full attendance list
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
    const meet = await dataService.getClubMeetById(meetId);
    
    if (!meet) {
      return NextResponse.json(
        { error: 'Club meet not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(meet, { status: 200 });
  } catch (error) {
    console.error('Error fetching club meet:', error);
    return NextResponse.json(
      { error: 'Failed to fetch club meet' },
      { status: 500 }
    );
  }
}

// DELETE /api/attendance/meets/[meetId] - Delete meet
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
    const deleteGames = searchParams.get('deleteGames') === 'true';

    // If deleteGames is true, fetch meet first to get the date
    if (deleteGames) {
      const meet = await dataService.getClubMeetById(meetId);
      if (meet) {
        // Delete games with matching date
        await dataService.deleteGamesByDate(meet.meetDate);
      }
    }

    // Delete the meet (attendance records cascade automatically)
    await dataService.deleteClubMeet(meetId);
    
    return NextResponse.json(
      { message: 'Club meet deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting club meet:', error);
    return NextResponse.json(
      { error: 'Failed to delete club meet' },
      { status: 500 }
    );
  }
}

