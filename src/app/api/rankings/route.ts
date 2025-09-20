import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';
import { KVCacheService } from '@/lib/kv';
import type { PlayerData } from '@/lib/googleSheets';

export async function GET() {
  try {
    const players = await KVCacheService.getRankings();
    return NextResponse.json(players, { 
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800'
      }
    });
  } catch (error) {
    console.error('Rankings API GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve rankings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const playerData: Omit<PlayerData, 'id' | 'rank'> = await request.json();
    
    // Validate required fields
    const requiredFields = ['name', 'grade', 'wins', 'losses', 'points', 'lastActive'];
    
    for (const field of requiredFields) {
      if (playerData[field as keyof typeof playerData] === undefined || playerData[field as keyof typeof playerData] === null) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    const playerId = await googleSheetsService.addPlayer(playerData);
    
    // Recalculate rankings after adding new player
    await googleSheetsService.recalculateRankings();
    
    return NextResponse.json(
      { message: 'Player added successfully', playerId },
      { status: 201 }
    );
  } catch (error) {
    console.error('Rankings API POST error:', error);
    return NextResponse.json(
      { error: 'Failed to add player' },
      { status: 500 }
    );
  }
}
