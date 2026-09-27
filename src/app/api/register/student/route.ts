import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';
import { emailService } from '@/lib/email';
import { enrollStudentForCurrentSeason } from '@/lib/seasonEnrollmentService';

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

    // Add student registration to Supabase/Google Sheets
    const existingStudents = await dataService.getStudentsByParentId(data.parentId);
    const duplicateStudent = existingStudents.find((student) =>
      student.name.trim().toLowerCase() === String(data.playerName).trim().toLowerCase()
    );

    if (duplicateStudent) {
      return NextResponse.json(
        { error: 'This student already exists on the family account.', code: 'STUDENT_EXISTS' },
        { status: 409 }
      );
    }

    const studentId = await dataService.addStudentRegistration(data);
    const parent = await dataService.getParentRegistration(data.parentId);

    await enrollStudentForCurrentSeason({
      parentId: data.parentId,
      studentId,
      participationConsent: Boolean(parent?.consent),
      photoConsent: Boolean(parent?.photoConsent),
      valuesAcknowledgment: Boolean(parent?.valuesAcknowledgment),
      newsletter: Boolean(parent?.newsletter),
    });

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
