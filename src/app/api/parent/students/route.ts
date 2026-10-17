import { NextRequest, NextResponse } from 'next/server';
import { KVCacheService } from '@/lib/kv';
import { dataService } from '@/lib/dataService';
import type { StudentData } from '@/lib/types';
import { requireLinkedFamily } from '@/lib/serverAuth';

export async function GET(request: NextRequest) {
  try {
    const family = await requireLinkedFamily(request);
    const parent = await dataService.getParentRegistration(family.primaryParentId);

    if (!parent) {
      return NextResponse.json(
        { error: 'Parent not found' },
        { status: 404 }
      );
    }

    // Get students from the students sheet by parent ID - using cache with fallback
    let students: StudentData[] = [];
    try {
      const cachedStudents = await KVCacheService.getStudentsByParentId(family.primaryParentId);
      students = Array.isArray(cachedStudents) ? cachedStudents : [];
    } catch (studentsError: any) {
      console.error(`[Parent Students API] Error fetching students:`, {
        error: studentsError?.message || studentsError,
        stack: studentsError?.stack,
        parentId: family.primaryParentId
      });
      // Try direct dataService as fallback
      try {
        const fallbackStudents = await dataService.getStudentsByParentId(family.primaryParentId);
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
        parentEmail: family.email
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Sign in is required' }, { status: 401 });
    }
    if (error?.message === 'EMAIL_NOT_VERIFIED') {
      return NextResponse.json({ success: false, error: 'Please verify your email address first' }, { status: 403 });
    }
    if (error?.message === 'FAMILY_NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Family not found' }, { status: 404 });
    }

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
