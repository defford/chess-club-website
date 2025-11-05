import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';
import { requireAdminAuth } from '@/lib/apiAuth';

interface AddMissingStudentData {
  playerId: string;
  playerName: string;
  playerAge: string;
  playerGrade: string;
  emergencyContact: string;
  emergencyPhone: string;
  medicalInfo?: string;
  parentId?: string; // Optional: if selecting existing parent
  createNewParent?: boolean; // If true, create new parent
  parentName?: string; // Required if creating new parent
  parentEmail?: string; // Required if creating new parent
  parentPhone?: string; // Required if creating new parent
}

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

    const data: AddMissingStudentData = await request.json();

    // Validate required fields
    const requiredFields = [
      'playerId',
      'playerName',
      'playerAge',
      'playerGrade',
      'emergencyContact',
      'emergencyPhone',
    ];

    for (const field of requiredFields) {
      if (!data[field as keyof AddMissingStudentData]) {
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

    let parentId: string;

    // Handle parent creation/selection
    if (data.parentId) {
      // Use existing parent
      parentId = data.parentId;
    } else if (data.createNewParent) {
      // Create new parent
      if (!data.parentName || !data.parentEmail || !data.parentPhone) {
        return NextResponse.json(
          {
            error:
              'Parent name, email, and phone are required when creating a new parent',
          },
          { status: 400 }
        );
      }

      const parentData = {
        parentName: data.parentName,
        parentEmail: data.parentEmail,
        parentPhone: data.parentPhone,
        hearAboutUs: 'Admin - Missing Player Addition',
        provincialInterest: '',
        volunteerInterest: '',
        consent: true, // Assume consent for admin-added students
        photoConsent: false,
        valuesAcknowledgment: true, // Assume acknowledgment for admin-added students
        newsletter: false,
        createAccount: false,
        registrationType: 'parent' as const,
      };

      parentId = await dataService.addParentRegistration(parentData);
    } else {
      // Default: create a placeholder parent (similar to quick-add-student)
      const parentData = {
        parentName: 'TBD - Parent Registration Required',
        parentEmail: 'pending@chessclub.local',
        parentPhone: 'TBD',
        hearAboutUs: 'Admin - Missing Player Addition',
        provincialInterest: '',
        volunteerInterest: '',
        consent: true,
        photoConsent: false,
        valuesAcknowledgment: true,
        newsletter: false,
        createAccount: false,
        registrationType: 'parent' as const,
      };

      parentId = await dataService.addParentRegistration(parentData);
    }

    // Add student registration
    const studentData = {
      parentId: parentId,
      playerName: data.playerName,
      playerAge: data.playerAge,
      playerGrade: data.playerGrade,
      emergencyContact: data.emergencyContact,
      emergencyPhone: data.emergencyPhone,
      medicalInfo: data.medicalInfo || '',
    };

    // Add student registration
    const studentId = await dataService.addStudentRegistration(studentData);
    
    // Note: The student ID will be auto-generated. If we need to match it with the playerId
    // from games table, we would need to update the games table separately to use the new student ID.
    // For now, we'll create the student and the system can match by name/ID later if needed.

    return NextResponse.json({
      success: true,
      studentId,
      parentId,
      message: 'Student added successfully',
    });
  } catch (error: any) {
    console.error('Add missing student API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add missing student' },
      { status: 500 }
    );
  }
}

