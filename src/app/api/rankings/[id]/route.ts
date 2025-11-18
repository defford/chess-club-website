import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';
import type { PlayerData } from '@/lib/types';

export async function PUT(
  request: NextRequest, 
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id } = params;
    const updates: Partial<PlayerData> = await request.json();
    
    await dataService.updatePlayer(id, updates);
    
    // If points changed, recalculate rankings
    if (updates.points !== undefined || updates.wins !== undefined || updates.losses !== undefined) {
      await dataService.recalculateRankings();
    }
    
    return NextResponse.json(
      { message: 'Player updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Rankings API PUT error:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update player' },
      { status: 500 }
    );
  }
}
