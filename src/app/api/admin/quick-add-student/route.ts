import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';
import { requireAdminAuth } from '@/lib/apiAuth';

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const authResult = await requireAdminAuth(request);
    if (!authResult.isAdmin) {
      return NextResponse.json(
        { error: `Admin authentication required: ${authResult.error}` },
        { status: 401 }
      );
    }

    const data = await request.json();
    
    // Validate required fields for quick add (only essential fields)
    const requiredFields = [
      'playerName', 'playerAge', 'playerGrade'
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

    // Create a minimal parent record for the quick add with default values
    // These will be updated when the parent properly registers
    const parentData = {
      parentName: 'TBD - Parent Registration Required',
      parentEmail: 'pending@chessclub.local',
      parentPhone: 'TBD',
      hearAboutUs: 'Admin Quick Add',
      provincialInterest: '',
      volunteerInterest: '',
      consent: true, // Assume consent for quick add
      photoConsent: false,
      valuesAcknowledgment: true, // Assume acknowledgment for quick add
      newsletter: false,
      createAccount: false,
      registrationType: 'parent' as const
    };

    // Add parent registration first
    const parentId = await dataService.addParentRegistration(parentData);

    // Add student registration with default values for required fields
    // These will be updated when the parent properly registers
    const studentData = {
      parentId: parentId,
      playerName: data.playerName,
      playerAge: data.playerAge,
      playerGrade: data.playerGrade,
      emergencyContact: 'TBD - Parent Registration Required',
      emergencyPhone: 'TBD',
      medicalInfo: ''
    };

    const studentId = await dataService.addStudentRegistration(studentData);

    return NextResponse.json(
      { 
        message: 'Student added successfully via quick add. Parent registration is required to complete the profile.',
        parentId: parentId,
        studentId: studentId
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Quick add student API error:', error);
    return NextResponse.json(
      { error: 'Failed to add student. Please try again.' },
      { status: 500 }
    );
  }
}
