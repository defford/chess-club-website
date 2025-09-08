import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';

// This endpoint migrates existing registration data to the new separate sheets structure
export async function POST(request: NextRequest) {
  try {
    // Basic security check - this should be protected in production
    const { password } = await request.json();
    
    if (password !== 'migrate-registrations-123') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting migration of existing registrations...');

    // Get all existing registrations
    const existingRegistrations = await googleSheetsService.getRegistrations();
    console.log(`Found ${existingRegistrations.length} existing registrations`);

    if (existingRegistrations.length === 0) {
      return NextResponse.json(
        { 
          message: 'No existing registrations found to migrate',
          migratedParents: 0,
          migratedStudents: 0
        },
        { status: 200 }
      );
    }

    // Group registrations by parent email to identify unique parents
    const parentGroups = new Map<string, any[]>();
    
    for (const registration of existingRegistrations) {
      const email = registration.parentEmail.toLowerCase();
      if (!parentGroups.has(email)) {
        parentGroups.set(email, []);
      }
      parentGroups.get(email)!.push(registration);
    }

    console.log(`Found ${parentGroups.size} unique parent emails`);

    let migratedParents = 0;
    let migratedStudents = 0;
    const errors: string[] = [];

    // Process each parent group
    for (const [parentEmail, registrations] of parentGroups) {
      try {
        // Use the first registration for parent data (they should all be the same for parent info)
        const firstRegistration = registrations[0];
        
        // Create parent data
        const parentData = {
          parentName: firstRegistration.parentName,
          parentEmail: firstRegistration.parentEmail,
          parentPhone: firstRegistration.parentPhone,
          hearAboutUs: firstRegistration.hearAboutUs,
          provincialInterest: firstRegistration.provincialInterest,
          volunteerInterest: firstRegistration.volunteerInterest,
          consent: firstRegistration.consent,
          photoConsent: firstRegistration.photoConsent,
          valuesAcknowledgment: firstRegistration.valuesAcknowledgment,
          newsletter: firstRegistration.newsletter,
          createAccount: false // Default to false for migrated data
        };

        // Add parent to parents sheet
        const parentId = await googleSheetsService.addParentRegistration(parentData);
        migratedParents++;
        console.log(`Migrated parent: ${parentData.parentName} (${parentData.parentEmail})`);

        // Add each player as a separate student record
        for (const registration of registrations) {
          const studentData = {
            parentId: parentId,
            playerName: registration.playerName,
            playerAge: registration.playerAge,
            playerGrade: registration.playerGrade,
            emergencyContact: registration.emergencyContact,
            emergencyPhone: registration.emergencyPhone,
            medicalInfo: registration.medicalInfo
          };

          const studentId = await googleSheetsService.addStudentRegistration(studentData);
          migratedStudents++;
          console.log(`Migrated student: ${studentData.playerName} for parent ${parentData.parentName}`);
        }

      } catch (error) {
        const errorMsg = `Failed to migrate parent ${parentEmail}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    const result = {
      message: 'Migration completed',
      totalExistingRegistrations: existingRegistrations.length,
      uniqueParents: parentGroups.size,
      migratedParents,
      migratedStudents,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log('Migration completed:', result);

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { 
        error: 'Migration failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
        details: 'Check server logs for more information'
      },
      { status: 500 }
    );
  }
}
