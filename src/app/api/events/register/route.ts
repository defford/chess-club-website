import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';

interface EventRegistrationData {
  eventId: string;
  eventName: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  childName: string;
  childAge: string;
  childGrade: string;
  emergencyContact: string;
  emergencyPhone: string;
  medicalInfo: string;
  timestamp?: string;
}

export async function POST(request: NextRequest) {
  try {
    const registrationData: EventRegistrationData = await request.json();
    
    // Validate required fields
    const requiredFields = [
      'eventId',
      'eventName', 
      'parentName',
      'parentEmail',
      'parentPhone',
      'childName',
      'childAge',
      'childGrade',
      'emergencyContact',
      'emergencyPhone'
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
    await googleSheetsService.addEventRegistration(registrationData);
    
    // Update the event participant count
    await googleSheetsService.incrementEventParticipants(registrationData.eventId);
    
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
