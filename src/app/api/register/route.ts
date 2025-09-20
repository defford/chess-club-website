import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';
import { emailService } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    const requiredFields = [
      'parentName', 'parentEmail', 'parentPhone',
      'playerName', 'playerAge', 'playerGrade',
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

    // Add parent registration to parents sheet
    const parentData = {
      parentName: data.parentName,
      parentEmail: data.parentEmail,
      parentPhone: data.parentPhone,
      hearAboutUs: data.hearAboutUs || '',
      provincialInterest: data.provincialInterest || '',
      volunteerInterest: data.volunteerInterest || '',
      consent: data.consent,
      photoConsent: data.photoConsent || false,
      valuesAcknowledgment: data.valuesAcknowledgment,
      newsletter: data.newsletter || false,
      createAccount: data.createAccount || false
    };

    const parentId = await googleSheetsService.addParentRegistration(parentData);

    // Add student registration to students sheet
    const studentData = {
      parentId: parentId,
      playerName: data.playerName,
      playerAge: data.playerAge,
      playerGrade: data.playerGrade,
      emergencyContact: data.emergencyContact,
      emergencyPhone: data.emergencyPhone,
      medicalInfo: data.medicalInfo || ''
    };

    await googleSheetsService.addStudentRegistration(studentData);

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
