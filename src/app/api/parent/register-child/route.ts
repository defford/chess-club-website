import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';
import { emailService } from '@/lib/email';
import { cleanDataService, CleanMemberData } from '@/lib/cleanDataService';

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

    // Get parent information from existing clean data
    const existingMembers = await cleanDataService.getMembersByParentEmail(data.parentEmail);
    if (!existingMembers || existingMembers.length === 0) {
      return NextResponse.json(
        { error: 'Parent account not found. Please contact support.' },
        { status: 404 }
      );
    }
    
    // Use parent info from first existing member
    const parentInfo = existingMembers[0];

    // Generate unique member ID for the child
    const studentId = `mbr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Add child directly to clean structure (no legacy sheets)
    const cleanData: CleanMemberData = {
      memberId: studentId,
      parentName: parentInfo.parentName,
      parentEmail: parentInfo.parentEmail,
      parentPhone: parentInfo.parentPhone,
      playerName: data.playerName,
      playerAge: data.playerAge,
      playerGrade: data.playerGrade,
      emergencyContact: data.emergencyContact,
      emergencyPhone: data.emergencyPhone,
      medicalInfo: data.medicalInfo || '',
      hearAboutUs: 'Parent Dashboard Registration',
      provincialInterest: '',
      volunteerInterest: '',
      consent: true, // Implied consent through parent account
      photoConsent: parentInfo.photoConsent,
      valuesAcknowledgment: true, // Implied acknowledgment through parent account
      newsletter: parentInfo.newsletter,
      createAccount: false,
      registrationDate: new Date().toISOString().split('T')[0],
      isActive: true,
      parentLoginEnabled: true
    };
    
    await cleanDataService.addMemberToCleanStructure(cleanData);

    // Prepare email data 
    const emailRegistrationData = {
      parentName: parentInfo.parentName,
      parentEmail: parentInfo.parentEmail,
      parentPhone: parentInfo.parentPhone,
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
      photoConsent: parentInfo.photoConsent,
      valuesAcknowledgment: true,
      newsletter: parentInfo.newsletter
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
