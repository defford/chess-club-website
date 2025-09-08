import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';

// This endpoint initializes the new separate sheets structure
export async function POST(request: NextRequest) {
  try {
    // Basic security check - this should be protected in production
    const { password } = await request.json();
    
    if (password !== 'initialize-sheets-123') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Initialize the new sheets
    try {
      await googleSheetsService.initializeParentsSheet();
      console.log('Parents sheet initialized');
    } catch (error) {
      console.log('Parents sheet initialization skipped (may already exist):', error);
    }

    try {
      await googleSheetsService.initializeStudentsSheet();
      console.log('Students sheet initialized');
    } catch (error) {
      console.log('Students sheet initialization skipped (may already exist):', error);
    }

    try {
      await googleSheetsService.initializeParentAccountsSheet();
      console.log('Parent accounts sheet initialized');
    } catch (error) {
      console.log('Parent accounts sheet initialization skipped (may already exist):', error);
    }

    try {
      await googleSheetsService.initializePlayerOwnershipSheet();
      console.log('Player ownership sheet initialized');
    } catch (error) {
      console.log('Player ownership sheet initialization skipped (may already exist):', error);
    }

    return NextResponse.json(
      { 
        message: 'New sheets structure initialized successfully',
        details: 'Parents, Students, Parent Accounts, and Player Ownership sheets are ready'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Sheet initialization error:', error);
    return NextResponse.json(
      { error: 'Sheet initialization failed: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}
