import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';

// POST /api/games/initialize - Initialize the games sheet
export async function POST(request: NextRequest) {
  try {
    await googleSheetsService.initializeGamesSheet();
    
    return NextResponse.json(
      { message: 'Games sheet initialized successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Games initialization API error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize games sheet' },
      { status: 500 }
    );
  }
}
