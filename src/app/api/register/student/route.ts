import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';
import { emailService } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields for student registration
    const requiredFields = [
      'parentId', 'playerName', 'playerAge', 'playerGrade',
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

    // Add student registration to Google Sheets
    const studentId = await googleSheetsService.addStudentRegistration(data);

    // Send confirmation email (optional - could be batched)
    try {
      await emailService.sendStudentRegistrationConfirmation(data);
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the entire registration if email fails
    }

    return NextResponse.json(
      { 
        message: 'Student registration submitted successfully',
        studentId: studentId
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Student registration API error:', error);
    return NextResponse.json(
      { error: 'Failed to submit student registration. Please try again.' },
      { status: 500 }
    );
  }
}
