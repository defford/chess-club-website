import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';
import type { EventRegistrationData } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const registrationData: EventRegistrationData = await request.json();
    
    // Validate required fields
    const requiredFields = [
      'eventId',
      'playerName',
      'playerGrade',
      'playerSchool'
    ];
    
    for (const field of requiredFields) {
      if (!registrationData[field as keyof EventRegistrationData]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Add the registration to the "event registrations" sheet
    await dataService.addEventRegistration(registrationData);
    
    // Update the event participant count
    await dataService.incrementEventParticipants(registrationData.eventId);
    
    return NextResponse.json(
      { message: 'Event registration successful' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Event registration API error:', error);
    return NextResponse.json(
      { error: 'Failed to register for event' },
      { status: 500 }
    );
  }
}
