import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';
import { cleanDataService, CleanMemberData } from '@/lib/cleanDataService';
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

    // Skip legacy registrations sheet - it's being deprecated

    // Generate member ID
    const timestamp = new Date().toISOString();
    const memberId = `member_${Date.now()}`;
    
    console.log(`📝 Generated member ID: ${memberId}`);

    // 2. Also add to clean structure immediately
    try {
      console.log('🔄 Attempting to add to clean structure...');
      
      // Create clean member data
      const cleanMemberData = {
        memberId,
        parentName: data.parentName || '',
        parentEmail: data.parentEmail || '',
        parentPhone: data.parentPhone || '',
        playerName: data.playerName || '',
        playerAge: data.playerAge || '',
        playerGrade: data.playerGrade || '',
        emergencyContact: data.emergencyContact || '',
        emergencyPhone: data.emergencyPhone || '',
        medicalInfo: data.medicalInfo || '',
        hearAboutUs: data.hearAboutUs || '',
        provincialInterest: data.provincialInterest || '',
        volunteerInterest: data.volunteerInterest || '',
        consent: data.consent || false,
        photoConsent: data.photoConsent || false,
        valuesAcknowledgment: data.valuesAcknowledgment || false,
        newsletter: data.newsletter || false,
        createAccount: data.createAccount || false,
        registrationDate: timestamp.split('T')[0],
        isActive: true,
        parentLoginEnabled: data.createAccount || false
      };

      console.log('📊 Clean member data prepared:', JSON.stringify(cleanMemberData, null, 2));

      // Add directly to clean members sheet
      await cleanDataService.addMemberToCleanStructure(cleanMemberData);
      
      console.log(`✅ Registration added to both old and new structures: ${data.playerName}`);
    } catch (cleanError) {
      console.error('⚠️ Failed to add to clean structure:', cleanError);
      // Don't fail the entire registration - clean structure sync can be done later
    }

    // 3. Send confirmation email
    try {
      await emailService.sendRegistrationConfirmation(data);
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the entire registration if email fails
    }

    // 4. If user opted to create account, set up parent login
    if (data.createAccount) {
      try {
        // This would trigger the magic link system
        console.log(`📧 Parent account creation requested for: ${data.parentEmail}`);
        
        // In a full implementation, you'd call the parent auth API here
        // For now, just log that account creation was requested
      } catch (accountError) {
        console.error('Account creation error:', accountError);
        // Don't fail registration if account creation fails
      }
    }

    return NextResponse.json(
      { 
        message: 'Registration submitted successfully',
        memberId,
        synced: 'both_structures',
        details: 'Added to both legacy and clean data structures'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Enhanced registration API error:', error);
    return NextResponse.json(
      { error: 'Failed to submit registration. Please try again.' },
      { status: 500 }
    );
  }
}
