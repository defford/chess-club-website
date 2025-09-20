import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';
import { KVCacheService } from '@/lib/kv';

export async function GET(request: NextRequest) {
  try {
    // Get parent email from query parameters
    const url = new URL(request.url);
    const parentEmail = url.searchParams.get('email');
    
    if (!parentEmail) {
      return NextResponse.json(
        { error: 'Parent email required in query parameters' },
        { status: 400 }
      );
    }

    // Get parent information first - using cache
    const parent = await KVCacheService.getParentByEmail(parentEmail);
    
    if (!parent) {
      return NextResponse.json(
        { error: 'Parent not found' },
        { status: 404 }
      );
    }

    // Get students from the students sheet by parent ID - using cache
    const students = await KVCacheService.getStudentsByParentId(parent.id);

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
  } catch (error) {
    console.error('Students API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to retrieve students',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
