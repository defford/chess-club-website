import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';

// POST /api/setup-games - Setup games sheet and initialize
export async function POST(request: NextRequest) {
  try {
    // Initialize the games sheet
    await googleSheetsService.initializeGamesSheet();
    
    return NextResponse.json(
      { 
        message: 'Games system setup completed successfully',
        features: [
          'Games sheet created in Google Sheets',
          'Game management API endpoints ready',
          'Admin interface available at /admin/games',
          'Legacy game recording still works via /api/rankings/game'
        ]
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Games setup API error:', error);
    return NextResponse.json(
      { error: 'Failed to setup games system' },
      { status: 500 }
    );
  }
}
