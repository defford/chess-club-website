import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';
import { emailService } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields for parent registration
    const requiredFields = [
      'parentName', 'parentEmail', 'parentPhone'
    ];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Check required consent checkboxes
    if (!data.consent) {
      return NextResponse.json(
        { error: 'Participation consent is required' },
        { status: 400 }
      );
    }

    if (!data.valuesAcknowledgment) {
      return NextResponse.json(
        { error: 'Acknowledgment of club values is required' },
        { status: 400 }
      );
    }

    // Add parent registration to Google Sheets
    const parentId = await googleSheetsService.addParentRegistration(data);

    // Send confirmation email
    try {
      await emailService.sendParentRegistrationConfirmation(data);
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the entire registration if email fails
    }

    return NextResponse.json(
      { 
        message: 'Parent registration submitted successfully',
        parentId: parentId
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Parent registration API error:', error);
    return NextResponse.json(
      { error: 'Failed to submit parent registration. Please try again.' },
      { status: 500 }
    );
  }
}
