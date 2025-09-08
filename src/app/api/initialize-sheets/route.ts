import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';

export async function POST() {
  try {
    // Initialize all sheets
    await Promise.all([
      googleSheetsService.initializeSheet(), // Registration sheet
      googleSheetsService.initializeEventsSheet(),
      googleSheetsService.initializeRankingsSheet(),
      googleSheetsService.initializeParentAccountsSheet(),
      googleSheetsService.initializePlayerOwnershipSheet(),
    ]);
    
    return NextResponse.json(
      { message: 'All sheets initialized successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Initialize sheets API error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize sheets' },
      { status: 500 }
    );
  }
}
