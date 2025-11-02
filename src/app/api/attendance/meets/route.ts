import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/apiAuth';
import { dataService } from '@/lib/dataService';
import type { ClubMeetData } from '@/lib/types';

// GET /api/attendance/meets - List all meets with attendance counts
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminAuth(request);
    if (!authResult.isAdmin) {
      return NextResponse.json(
        { error: authResult.error || 'Admin privileges required' },
        { status: 403 }
      );
    }

    const meets = await dataService.getClubMeets();
    return NextResponse.json(meets, { status: 200 });
  } catch (error) {
    console.error('Error fetching club meets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch club meets' },
      { status: 500 }
    );
  }
}

// POST /api/attendance/meets - Create a new meet
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdminAuth(request);
    if (!authResult.isAdmin) {
      return NextResponse.json(
        { error: authResult.error || 'Admin privileges required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { meetDate, meetName, notes } = body;

    if (!meetDate) {
      return NextResponse.json(
        { error: 'meetDate is required' },
        { status: 400 }
      );
    }

    // Get admin email from request
    const email = request.headers.get('x-user-email') || request.nextUrl.searchParams.get('email') || 'dev@example.com';

    const meetData: Omit<ClubMeetData, 'id' | 'createdAt' | 'updatedAt'> = {
      meetDate,
      meetName: meetName || undefined,
      notes: notes || undefined,
      createdBy: email,
    };

    const meetId = await dataService.createClubMeet(meetData);
    
    return NextResponse.json(
      { 
        message: 'Club meet created successfully',
        meetId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating club meet:', error);
    return NextResponse.json(
      { error: 'Failed to create club meet' },
      { status: 500 }
    );
  }
}

