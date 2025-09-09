import { NextRequest, NextResponse } from 'next/server';
import { cleanDataService } from '@/lib/cleanDataService';

// NEW CLEAN API - Single endpoint for all member data
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const parentEmail = url.searchParams.get('parent_email');
    
    if (parentEmail) {
      // Get members for specific parent
      const members = await cleanDataService.getMembersByParentEmail(parentEmail);
      
      return NextResponse.json({
        success: true,
        data: {
          members,
          totalMembers: members.length,
          parentEmail
        }
      }, { status: 200 });
    } else {
      // Get all members (admin use)
      const members = await cleanDataService.getMembersWithRankings();
      
      return NextResponse.json({
        success: true,
        data: {
          members,
          totalMembers: members.length
        }
      }, { status: 200 });
    }
  } catch (error) {
    console.error('Clean members API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve member data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
