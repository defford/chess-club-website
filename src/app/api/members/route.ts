import { NextResponse } from 'next/server';
import { googleSheetsService, type RegistrationData } from '@/lib/googleSheets';

// Interface for Member data that combines registration info with member-specific fields
export interface MemberData extends RegistrationData {
  id?: string;
  joinDate?: string;
  isActive?: boolean;
  notes?: string;
}

export async function GET() {
  try {
    const registrations = await googleSheetsService.getRegistrations();
    
    // Convert registrations to member format
    const members: MemberData[] = registrations.map((registration, index) => {
      // Generate consistent ID based on registration data
      const memberId = registration.rowIndex 
        ? `reg_row_${registration.rowIndex}` 
        : `member_${index + 1}`;
      
      // Parse registration date from timestamp
      let joinDate = new Date().toISOString().split('T')[0]; // Default to today
      if (registration.timestamp) {
        try {
          const parsedDate = new Date(registration.timestamp);
          if (!isNaN(parsedDate.getTime())) {
            joinDate = parsedDate.toISOString().split('T')[0];
          }
        } catch (e) {
          console.warn('Could not parse timestamp:', registration.timestamp);
        }
      }

      return {
        ...registration,
        id: memberId,
        joinDate,
        isActive: true, // Default to active
        notes: '',
      };
    });
    
    return NextResponse.json(members, { status: 200 });
  } catch (error) {
    console.error('Members API GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve members' },
      { status: 500 }
    );
  }
}
