import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';
import { emailService } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields for self-registration
    const requiredFields = [
      'playerName', 'playerAge', 'playerGrade', 'playerEmail', 'playerPhone',
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

    // Validate age for self-registration
    const age = parseInt(data.playerAge);
    if (age <= 12) {
      return NextResponse.json(
        { error: 'You must be 13 or older to register yourself. Please have a parent or guardian register for you.' },
        { status: 400 }
      );
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

    // For self-registration, save to both parent and student sheets
    // 1. First, save as parent (since they're registering themselves)
    const parentData = {
      parentName: data.playerName, // Self-registering student is their own parent
      parentEmail: data.playerEmail,
      parentPhone: data.playerPhone,
      hearAboutUs: data.hearAboutUs || '',
      provincialInterest: data.provincialInterest || '',
      volunteerInterest: data.volunteerInterest || '',
      consent: data.consent,
      photoConsent: data.photoConsent || false,
      valuesAcknowledgment: data.valuesAcknowledgment,
      newsletter: data.newsletter || false,
      createAccount: data.createAccount || false,
      registrationType: 'self' as const
    };

    const parentId = await dataService.addParentRegistration(parentData);

    // 2. Then, save as student linked to the parent
    const studentData = {
      parentId: parentId,
      playerName: data.playerName,
      playerAge: data.playerAge,
      playerGrade: data.playerGrade,
      emergencyContact: data.emergencyContact,
      emergencyPhone: data.emergencyPhone,
      medicalInfo: data.medicalInfo || ''
    };

    const studentId = await dataService.addStudentRegistration(studentData);

    // Send confirmation email
    try {
      await emailService.sendSelfRegistrationConfirmation(data);
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the entire registration if email fails
    }

    return NextResponse.json(
      { 
        message: 'Self-registration submitted successfully',
        parentId: parentId,
        studentId: studentId
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Self-registration API error:', error);
    return NextResponse.json(
      { error: 'Failed to submit self-registration. Please try again.' },
      { status: 500 }
    );
  }
}
