import { NextRequest, NextResponse } from 'next/server';
import { KVCacheService } from '@/lib/kv';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playerName: string }> }
) {
  try {
    const { playerName: rawPlayerName } = await params;
    const playerName = decodeURIComponent(rawPlayerName);
    
    if (!playerName) {
      return NextResponse.json(
        { error: 'Player name is required' },
        { status: 400 }
      );
    }

    const registrations = await KVCacheService.getEventRegistrationsByPlayer(playerName);
    
    return NextResponse.json(registrations, { status: 200 });
  } catch (error) {
    console.error('Event registrations API error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve event registrations' },
      { status: 500 }
    );
  }
}
