import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';
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
    const requiredFields = ['name', 'grade', 'gamesPlayed', 'wins', 'losses', 'points', 'lastActive'];
    
    for (const field of requiredFields) {
      if (playerData[field as keyof typeof playerData] === undefined || playerData[field as keyof typeof playerData] === null) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    const playerId = await dataService.addPlayer(playerData);
    
    // Rankings are now calculated dynamically from games
    // Cache will be invalidated automatically by the enhanced service
    
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
