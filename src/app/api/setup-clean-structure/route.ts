import { NextRequest, NextResponse } from 'next/server';
import { cleanDataService } from '@/lib/cleanDataService';

// Setup endpoint for the new clean data structure
export async function POST(request: NextRequest) {
  try {
    const { password, action } = await request.json();
    
    // Security check
    if (password !== 'setup-clean-structure-456') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let result: any = {};

    switch (action) {
      case 'initialize':
        // Step 1: Create new sheet structure
        await cleanDataService.initializeCleanStructure();
        result = { 
          message: 'Clean structure initialized',
          next: 'Run with action=populate to populate data'
        };
        break;

      case 'populate':
        // Step 2: Populate from registrations (SAFE - read only)
        await cleanDataService.populateMembersFromRegistrations();
        result = { 
          message: 'Data populated from registrations',
          next: 'Test the new API endpoints before proceeding'
        };
        break;

      case 'test':
        // Step 3: Test the new structure
        const members = await cleanDataService.getCleanMembers();
        const membersWithRankings = await cleanDataService.getMembersWithRankings();
        
        result = {
          message: 'Clean structure test results',
          stats: {
            totalMembers: members.length,
            membersWithRankings: membersWithRankings.filter(m => m.ranking).length,
            sampleMember: members[0] || null,
            sampleMemberWithRanking: membersWithRankings.find(m => m.ranking) || null
          }
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: initialize, populate, or test' },
          { status: 400 }
        );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Setup clean structure error:', error);
    return NextResponse.json(
      { 
        error: 'Setup failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Get current status
export async function GET() {
  try {
    // Check if clean structure exists
    const members = await cleanDataService.getCleanMembers();
    
    return NextResponse.json({
      status: 'Clean structure operational',
      memberCount: members.length,
      lastUpdated: new Date().toISOString()
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      status: 'Clean structure not found or not working',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 200 }); // 200 because this is status info, not an error
  }
}
