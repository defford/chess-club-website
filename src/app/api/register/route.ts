import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';
import { emailService } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    const requiredFields = [
      'parentName', 'parentEmail', 'parentPhone',
      'childName', 'childAge', 'childGrade',
      'emergencyContact', 'emergencyPhone'
    ];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Check consent checkbox
    if (!data.consent) {
      return NextResponse.json(
        { error: 'Participation consent is required' },
        { status: 400 }
      );
    }

    // Add registration to Google Sheets
    await googleSheetsService.addRegistration(data);

    // Send confirmation email
    try {
      await emailService.sendRegistrationConfirmation(data);
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the entire registration if email fails
      // Just log the error and continue
    }

    return NextResponse.json(
      { message: 'Registration submitted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Registration API error:', error);
    return NextResponse.json(
      { error: 'Failed to submit registration. Please try again.' },
      { status: 500 }
    );
  }
}
