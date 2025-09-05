import { NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';

export async function POST() {
  try {
    await googleSheetsService.initializeEventRegistrationsSheet();
    return NextResponse.json(
      { message: 'Event registrations sheet initialized successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Initialize event registrations sheet error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize event registrations sheet' },
      { status: 500 }
    );
  }
}
