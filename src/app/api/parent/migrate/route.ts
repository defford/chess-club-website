import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';

// This is a one-time migration endpoint to generate player IDs for existing registrations
// Should be run once to set up the parent system
export async function POST(request: NextRequest) {
  try {
    // Basic security check - this should be protected in production
    const { password } = await request.json();
    
    if (password !== 'migrate-playerren-123') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Initialize the parent accounts and player ownership sheets if they don't exist
    try {
      await googleSheetsService.initializeParentAccountsSheet();
    } catch (error) {
      // Sheet might already exist, continue
      console.log('Parent accounts sheet initialization skipped:', error);
    }

    try {
      await googleSheetsService.initializePlayerOwnershipSheet();
    } catch (error) {
      // Sheet might already exist, continue
      console.log('Player ownership sheet initialization skipped:', error);
    }

    // Generate player IDs for all existing registrations
    await googleSheetsService.generatePlayerIdsForExistingRegistrations();

    return NextResponse.json(
      { 
        message: 'Migration completed successfully',
        details: 'Player IDs generated for all existing registrations and parent system initialized'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}
