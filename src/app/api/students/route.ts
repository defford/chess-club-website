import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';

export async function GET(request: NextRequest) {
  try {
    // Get all students from the students sheet
    const students = await googleSheetsService.getAllStudents();

    return NextResponse.json(
      { 
        success: true,
        students: students,
        totalStudents: students.length
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
