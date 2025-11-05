import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';

// POST /api/games/initialize - Initialize the games sheet
export async function POST(request: NextRequest) {
  try {
    await dataService.initializeGamesSheet();
    
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
