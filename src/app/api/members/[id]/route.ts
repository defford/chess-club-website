import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';
import { KVCacheService } from '@/lib/kv';
import { requireAdminAuth } from '@/lib/apiAuth';
import type { StudentRegistrationData } from '@/lib/types';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin authentication
    const authResult = await requireAdminAuth(request);
    if (!authResult.isAdmin) {
      return NextResponse.json(
        { error: authResult.error || 'Admin privileges required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const updates = await request.json();

    // Get the member to verify it exists
    const members = await KVCacheService.getMembers();
    const member = members.find(m => m.studentId === id);
    
    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Use studentId as the primary identifier
    const studentId = member.studentId || id;

    // Prepare student updates
    const studentUpdates: Partial<StudentRegistrationData> = {};

    // Student fields that can be updated
    if (updates.playerName !== undefined) studentUpdates.playerName = updates.playerName;
    if (updates.playerAge !== undefined) studentUpdates.playerAge = updates.playerAge;
    if (updates.playerGrade !== undefined) studentUpdates.playerGrade = updates.playerGrade;
    if (updates.emergencyContact !== undefined) studentUpdates.emergencyContact = updates.emergencyContact;
    if (updates.emergencyPhone !== undefined) studentUpdates.emergencyPhone = updates.emergencyPhone;
    if (updates.medicalInfo !== undefined) studentUpdates.medicalInfo = updates.medicalInfo;

    // Update student if there are student updates
    if (Object.keys(studentUpdates).length > 0) {
      await dataService.updateStudentRegistration(studentId, studentUpdates);
      
      // Invalidate member cache to refresh data
      await KVCacheService.invalidateByTags(['member-data', 'student-data']);
    }

    return NextResponse.json(
      { message: 'Member updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Members API PUT error:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update member' },
      { status: 500 }
    );
  }
}

