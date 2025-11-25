import { NextRequest, NextResponse } from 'next/server';
import { KVCacheService } from '@/lib/kv';
import { dataService } from '@/lib/dataService';
import type { StudentData } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    // Get parent email from query parameters
    const url = new URL(request.url);
    const parentEmailParam = url.searchParams.get('email');
    
    if (!parentEmailParam) {
      return NextResponse.json(
        { error: 'Parent email required in query parameters' },
        { status: 400 }
      );
    }

    // Normalize email (lowercase, trim) for case-insensitive lookup
    const parentEmail = parentEmailParam.toLowerCase().trim();

    // Get parent information first - using cache with fallback
    let parent;
    try {
      parent = await KVCacheService.getParentByEmail(parentEmail);
    } catch (parentError: any) {
      console.error(`[Parent Students API] Error fetching parent:`, {
        error: parentError?.message || parentError,
        stack: parentError?.stack
      });
      // Try direct dataService as fallback
      try {
        parent = await dataService.getParentByEmail(parentEmail);
      } catch (fallbackError: any) {
        console.error(`[Parent Students API] Fallback also failed:`, fallbackError?.message || fallbackError);
        throw new Error(`Failed to fetch parent: ${fallbackError?.message || 'Unknown error'}`);
      }
    }
    
    if (!parent) {
      console.warn(`[Parent Students API] Parent not found for email: ${parentEmail}`);
      return NextResponse.json(
        { error: 'Parent not found' },
        { status: 404 }
      );
    }

    // Get students from the students sheet by parent ID - using cache with fallback
    let students: StudentData[] = [];
    try {
      const cachedStudents = await KVCacheService.getStudentsByParentId(parent.id);
      students = Array.isArray(cachedStudents) ? cachedStudents : [];
    } catch (studentsError: any) {
      console.error(`[Parent Students API] Error fetching students:`, {
        error: studentsError?.message || studentsError,
        stack: studentsError?.stack,
        parentId: parent.id
      });
      // Try direct dataService as fallback
      try {
        const fallbackStudents = await dataService.getStudentsByParentId(parent.id);
        students = Array.isArray(fallbackStudents) ? fallbackStudents : [];
      } catch (fallbackError: any) {
        console.error(`[Parent Students API] Fallback also failed:`, fallbackError?.message || fallbackError);
        throw new Error(`Failed to fetch students: ${fallbackError?.message || 'Unknown error'}`);
      }
    }

    // For each student, get their ranking information if available
    const studentsWithRankings = await Promise.all(
      students.map(async (student) => {
        try {
          // Try to find the student in rankings by name - using cache
          const allPlayers = await KVCacheService.getRankings();
          const studentRanking = allPlayers.find(p => 
            p.name.toLowerCase() === student.name.toLowerCase()
          );

          return {
            id: student.id,
            parentId: student.parentId,
            name: student.name,
            age: student.age,
            grade: student.grade,
            emergencyContact: student.emergencyContact,
            emergencyPhone: student.emergencyPhone,
            medicalInfo: student.medicalInfo,
            timestamp: student.timestamp,
            parentName: parent?.name || '',
            parentPhone: parent?.phone || '',
            ranking: studentRanking ? {
              rank: studentRanking.rank,
              points: studentRanking.points,
              wins: studentRanking.wins,
              losses: studentRanking.losses,
              lastActive: studentRanking.lastActive
            } : null
          };
        } catch (error) {
          console.error(`Error getting ranking for student ${student.name}:`, error);
          return {
            ...student,
            parentName: parent?.name || '',
            parentPhone: parent?.phone || '',
            ranking: null
          };
        }
      })
    );

    return NextResponse.json(
      { 
        success: true,
        students: studentsWithRankings,
        totalStudents: studentsWithRankings.length,
        parentEmail
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[Parent Students API] Error:', {
      error: error?.message || error,
      stack: error?.stack,
      name: error?.name,
      code: error?.code
    });
    
    // Return more detailed error in development, generic in production
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Failed to retrieve students: ${error?.message || 'Unknown error'}`
      : 'Failed to retrieve students';
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { details: error?.stack })
      },
      { status: 500 }
    );
  }
}
