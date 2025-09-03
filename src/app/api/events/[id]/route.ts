import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';
import type { EventData } from '@/lib/googleSheets';

export async function PUT(
  request: NextRequest, 
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id } = params;
    const updates: Partial<EventData> = await request.json();
    
    await googleSheetsService.updateEvent(id, updates);
    
    return NextResponse.json(
      { message: 'Event updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Events API PUT error:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
}
