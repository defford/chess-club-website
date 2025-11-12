import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';
import { KVCacheService } from '@/lib/kv';
import type { RegistrationData } from '@/lib/googleSheets';

// Interface for Member data that combines registration info with member-specific fields
export interface MemberData extends RegistrationData {
  id?: string;
  joinDate?: string;
  isActive?: boolean;
  notes?: string;
  isSystemPlayer?: boolean; // Flag to identify system players (like Unknown Opponent)
}

export async function GET(request: NextRequest) {
  try {
    // Check if cache should be bypassed (e.g., after adding a new member)
    const searchParams = request.nextUrl.searchParams;
    const bypassCache = searchParams.has('nocache');
    
    // Use the cached version for better performance, unless bypass is requested
    const registrations = bypassCache 
      ? await dataService.getMembersFromParentsAndStudents()
      : await KVCacheService.getMembers();
    
    // Convert registrations to member format
    const members: MemberData[] = registrations.map((registration, index) => {
      // Generate consistent ID based on registration data
      const memberId = registration.studentId || 
        (registration.rowIndex ? `reg_row_${registration.rowIndex}` : `member_${index + 1}`);
      
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

    // Add system players for incomplete games
    const systemPlayers: MemberData[] = [
      {
        id: 'unknown_opponent',
        parentName: 'System',
        parentEmail: 'system@chessclub.local',
        parentPhone: 'N/A',
        playerName: 'Unknown Opponent',
        playerAge: 'N/A',
        playerGrade: 'Unknown',
        emergencyContact: 'N/A',
        emergencyPhone: 'N/A',
        medicalInfo: 'N/A',
        hearAboutUs: 'System Player',
        provincialInterest: '',
        volunteerInterest: '',
        consent: true,
        photoConsent: false,
        valuesAcknowledgment: true,
        newsletter: false,
        timestamp: new Date().toISOString(),
        joinDate: new Date().toISOString().split('T')[0],
        isActive: true,
        notes: 'System player for incomplete games',
        isSystemPlayer: true // Flag to identify system players
      }
    ];

    // Combine regular members with system players
    const allMembers = [...members, ...systemPlayers];
    
    // Debug logging
    console.log('Total members:', allMembers.length);
    console.log('Unknown opponent found:', allMembers.find(m => m.id === 'unknown_opponent'));
    
    return NextResponse.json(allMembers, { 
      status: 200,
      headers: {
        'Cache-Control': bypassCache 
          ? 'no-store, no-cache, must-revalidate, max-age=0'
          : 'public, s-maxage=600, stale-while-revalidate=7200'
      }
    });
  } catch (error) {
    console.error('Members API GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve members' },
      { status: 500 }
    );
  }
}
