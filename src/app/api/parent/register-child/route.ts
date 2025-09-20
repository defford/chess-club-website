import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';
import { emailService } from '@/lib/email';

interface ChildRegistrationData {
  playerName: string;
  playerAge: string;
  playerGrade: string;
  emergencyContact: string;
  emergencyPhone: string;
  medicalInfo?: string;
  parentEmail: string; // From session
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    const requiredFields = [
      'playerName', 'playerAge', 'playerGrade',
      'emergencyContact', 'emergencyPhone', 'parentEmail'
    ];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate age is a number
    const age = parseInt(data.playerAge);
    if (isNaN(age) || age < 4 || age > 18) {
      return NextResponse.json(
        { error: 'Player age must be between 4 and 18' },
        { status: 400 }
      );
    }

    // Get parent information from parents sheet
    const parent = await googleSheetsService.getParentByEmail(data.parentEmail);
    if (!parent) {
      return NextResponse.json(
        { error: 'Parent account not found. Please contact support.' },
        { status: 404 }
      );
    }

    // Add student registration to students sheet
    const studentData = {
      parentId: parent.id,
      playerName: data.playerName,
      playerAge: data.playerAge,
      playerGrade: data.playerGrade,
      emergencyContact: data.emergencyContact,
      emergencyPhone: data.emergencyPhone,
      medicalInfo: data.medicalInfo || ''
    };

    const studentId = await googleSheetsService.addStudentRegistration(studentData);

    // Prepare email data 
    const emailRegistrationData = {
      parentName: parent.name,
      parentEmail: parent.email,
      parentPhone: parent.phone,
      playerName: data.playerName,
      playerAge: data.playerAge,
      playerGrade: data.playerGrade,
      emergencyContact: data.emergencyContact,
      emergencyPhone: data.emergencyPhone,
      medicalInfo: data.medicalInfo || '',
      hearAboutUs: 'Parent Dashboard Registration',
      provincialInterest: '',
      volunteerInterest: '',
      consent: true,
      photoConsent: parent.photoConsent,
      valuesAcknowledgment: true,
      newsletter: parent.newsletter
    };

    // Send confirmation email
    try {
      await emailService.sendRegistrationConfirmation(emailRegistrationData);
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the entire registration if email fails
    }

    return NextResponse.json(
      { 
        message: 'Child registration submitted successfully',
        playerName: data.playerName,
        studentId: studentId
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Child registration API error:', error);
    return NextResponse.json(
      { error: 'Failed to register child. Please try again.' },
      { status: 500 }
    );
  }
}
