import { NextRequest, NextResponse } from 'next/server';
import { requireLinkedFamily } from '@/lib/serverAuth';
import { dataService } from '@/lib/dataService';

export async function GET(request: NextRequest) {
  try {
    const family = await requireLinkedFamily(request);
    const parent = await dataService.getParentRegistration(family.primaryParentId);

    if (!parent) {
      return NextResponse.json({ error: 'Family account not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      family: {
        primaryParentId: family.primaryParentId,
        parentIds: family.parentIds,
        email: family.email,
        isSelfRegistered: parent.registrationType === 'self',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed';

    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Please sign in' }, { status: 401 });
    }
    if (message === 'EMAIL_NOT_VERIFIED') {
      return NextResponse.json({ error: 'Please verify your email address first' }, { status: 403 });
    }
    if (message === 'FAMILY_NOT_FOUND') {
      return NextResponse.json(
        { error: 'No existing family registration was found for this account', code: 'FAMILY_NOT_FOUND' },
        { status: 404 }
      );
    }

    console.error('Family auth error:', error);
    return NextResponse.json({ error: 'Unable to link family account' }, { status: 500 });
  }
}
