import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';
import type { EventData } from '@/lib/googleSheets';

export async function GET() {
  try {
    const events = await googleSheetsService.getEvents();
    return NextResponse.json(events, { status: 200 });
  } catch (error) {
    console.error('Events API GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve events' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const eventData: Omit<EventData, 'id' | 'lastUpdated'> = await request.json();
    
    // Validate required fields
    const requiredFields = ['name', 'date', 'time', 'location', 'maxParticipants', 'description', 'category', 'ageGroups'];
    
    for (const field of requiredFields) {
      if (!eventData[field as keyof typeof eventData]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Set defaults for optional fields
    const eventWithDefaults = {
      ...eventData,
      participants: eventData.participants || 0,
      status: eventData.status || 'active' as const,
    };

    const eventId = await googleSheetsService.addEvent(eventWithDefaults);
    
    return NextResponse.json(
      { message: 'Event created successfully', eventId },
      { status: 201 }
    );
  } catch (error) {
    console.error('Events API POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}
