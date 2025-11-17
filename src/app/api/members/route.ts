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
    
    let registrations: RegistrationData[] = [];
    
    try {
      // Use the cached version for better performance, unless bypass is requested
      registrations = bypassCache 
        ? await dataService.getMembersFromParentsAndStudents()
        : await KVCacheService.getMembers();
      
      // Validate that we got an array
      if (!Array.isArray(registrations)) {
        console.error('[Members API] Invalid data format received:', typeof registrations);
        throw new Error('Invalid data format: expected array');
      }
      
      console.log(`[Members API] Successfully fetched ${registrations.length} registrations (bypassCache: ${bypassCache})`);
    } catch (fetchError: any) {
      console.error('[Members API] Error fetching members:', {
        error: fetchError?.message || fetchError,
        stack: fetchError?.stack,
        bypassCache
      });
      
      // If cache failed and we weren't bypassing, try direct fetch as fallback
      if (!bypassCache) {
        try {
          console.log('[Members API] Attempting fallback to direct dataService fetch...');
          registrations = await dataService.getMembersFromParentsAndStudents();
          console.log(`[Members API] Fallback successful: ${registrations.length} registrations`);
        } catch (fallbackError: any) {
          console.error('[Members API] Fallback also failed:', {
            error: fallbackError?.message || fallbackError,
            stack: fallbackError?.stack
          });
          throw new Error(`Failed to fetch members: ${fallbackError?.message || 'Unknown error'}`);
        }
      } else {
        throw fetchError;
      }
    }
    
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
  } catch (error: any) {
    console.error('[Members API] GET error:', {
      error: error?.message || error,
      stack: error?.stack,
      name: error?.name,
      code: error?.code
    });
    
    // Return more detailed error in development, generic in production
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Failed to retrieve members: ${error?.message || 'Unknown error'}`
      : 'Failed to retrieve members';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { details: error?.stack })
      },
      { status: 500 }
    );
  }
}
