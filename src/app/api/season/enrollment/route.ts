import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';
import { CURRENT_SEASON } from '@/lib/config';
import { requireLinkedFamily } from '@/lib/serverAuth';
import {
  enrollStudentForCurrentSeason,
  getSeasonEnrollmentsForParent,
  withdrawStudentFromCurrentSeason,
} from '@/lib/seasonEnrollmentService';

export async function GET(request: NextRequest) {
  try {
    const family = await requireLinkedFamily(request);
    const parent = await dataService.getParentRegistration(family.primaryParentId);
    if (!parent) {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 });
    }

    const [students, enrollments] = await Promise.all([
      dataService.getStudentsByParentId(family.primaryParentId),
      getSeasonEnrollmentsForParent(family.primaryParentId),
    ]);

    const enrollmentByStudent = new Map(enrollments.map((e) => [e.studentId, e]));

    return NextResponse.json({
      season: CURRENT_SEASON,
      parent: {
        id: family.primaryParentId,
        name: parent.name,
        email: parent.email,
        phone: parent.phone,
        photoConsent: parent.photoConsent,
        newsletter: parent.newsletter,
      },
      students: students.map((student) => ({
        ...student,
        enrollment: enrollmentByStudent.get(student.id) || null,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Sign in is required' }, { status: 401 });
    }
    if (message === 'EMAIL_NOT_VERIFIED') {
      return NextResponse.json({ error: 'Please verify your email address first' }, { status: 403 });
    }
    if (message === 'FAMILY_NOT_FOUND') {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 });
    }
    console.error('Season enrollment GET error:', error);
    return NextResponse.json({ error: 'Failed to load season registration' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const family = await requireLinkedFamily(request);

    const studentIds = Array.isArray(body.studentIds) ? body.studentIds.map(String) : [];
    const studentUpdates = Array.isArray(body.students) ? body.students : [];
    const parentPhone = String(body.parentPhone || '').trim();

    if (studentIds.length === 0) {
      return NextResponse.json(
        { error: 'Choose at least one student to register' },
        { status: 400 }
      );
    }

    if (!body.participationConsent || !body.valuesAcknowledgment) {
      return NextResponse.json(
        { error: 'Participation consent and club values acknowledgment are required' },
        { status: 400 }
      );
    }

    const parent = await dataService.getParentRegistration(family.primaryParentId);
    if (!parent) {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 });
    }

    const students = await dataService.getStudentsByParentId(family.primaryParentId);
    const validIds = new Set(students.map((student) => student.id));

    if (studentIds.some((id: string) => !validIds.has(id))) {
      return NextResponse.json({ error: 'Invalid student selection' }, { status: 400 });
    }

    if (!parentPhone) {
      return NextResponse.json({ error: 'Parent/guardian phone number is required' }, { status: 400 });
    }

    const updatesById = new Map(studentUpdates.map((student: any) => [String(student.id), student]));

    for (const studentId of studentIds) {
      const update: any = updatesById.get(studentId);
      if (!update) {
        return NextResponse.json({ error: 'Updated player information is required for each returning player' }, { status: 400 });
      }

      const playerName = String(update.name || '').trim();
      const playerAge = String(update.age || '').trim();
      const playerGrade = String(update.grade || '').trim();
      const emergencyContact = String(update.emergencyContact || '').trim();
      const emergencyPhone = String(update.emergencyPhone || '').trim();

      if (!playerName || !playerAge || !playerGrade || !emergencyContact || !emergencyPhone) {
        return NextResponse.json({ error: 'Please complete all required player and emergency contact fields' }, { status: 400 });
      }

      await dataService.updateStudentRegistration(studentId, {
        parentId: family.primaryParentId,
        playerName,
        playerAge,
        playerGrade,
        emergencyContact,
        emergencyPhone,
        medicalInfo: String(update.medicalInfo || '').trim(),
      });
    }

    await dataService.updateParentRegistration(family.primaryParentId, {
      parentPhone,
      consent: true,
      photoConsent: Boolean(body.photoConsent),
      valuesAcknowledgment: true,
      newsletter: Boolean(body.newsletter),
    });

    const currentlyEnrolled = await getSeasonEnrollmentsForParent(family.primaryParentId);
    const selected = new Set(studentIds);

    await Promise.all(studentIds.map((studentId: string) =>
      enrollStudentForCurrentSeason({
        parentId: family.primaryParentId,
        studentId,
        participationConsent: true,
        photoConsent: Boolean(body.photoConsent),
        valuesAcknowledgment: true,
        newsletter: Boolean(body.newsletter),
      })
    ));

    await Promise.all(
      currentlyEnrolled
        .filter((enrollment) => enrollment.status === 'registered' && !selected.has(enrollment.studentId))
        .map((enrollment) => withdrawStudentFromCurrentSeason(enrollment.studentId))
    );

    return NextResponse.json({
      success: true,
      season: CURRENT_SEASON,
      registeredStudentIds: studentIds,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Sign in is required' }, { status: 401 });
    }
    if (message === 'EMAIL_NOT_VERIFIED') {
      return NextResponse.json({ error: 'Please verify your email address first' }, { status: 403 });
    }
    if (message === 'FAMILY_NOT_FOUND') {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 });
    }
    console.error('Season enrollment POST error:', error);
    return NextResponse.json({ error: 'Failed to save season registration' }, { status: 500 });
  }
}
