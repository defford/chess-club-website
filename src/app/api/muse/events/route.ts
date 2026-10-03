import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/apiAuth';
import { interpretMuseTranscript } from '@/lib/muse/interpreter';
import { MuseService } from '@/lib/muse/service';
import type { MuseIntent } from '@/lib/muse/types';

export const dynamic = 'force-dynamic';

async function authorize(request: NextRequest) {
  const configuredMuseKey = process.env.MUSE_API_KEY;
  const suppliedMuseKey = request.headers.get('x-muse-api-key');

  if (configuredMuseKey && suppliedMuseKey && suppliedMuseKey === configuredMuseKey) {
    return { authorized: true, actor: 'muse-agent' };
  }

  const admin = await requireAdminAuth(request);
  if (!admin.isAdmin) {
    return { authorized: false, actor: '', error: admin.error || 'Admin privileges required' };
  }

  const actor =
    request.headers.get('x-user-email') ||
    request.nextUrl.searchParams.get('email') ||
    'admin';

  return { authorized: true, actor };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorize(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 403 });
    }

    const body = await request.json();
    const action = body.action || 'preview';

    if (action === 'undo') {
      const result = await MuseService.undo(auth.actor, body.actionId);
      return NextResponse.json(result);
    }

    const transcript = typeof body.transcript === 'string' ? body.transcript.trim() : undefined;
    const intent: MuseIntent | undefined = body.intent;

    if (!intent && !transcript) {
      return NextResponse.json(
        { error: 'Provide a transcript or a structured Muse intent.' },
        { status: 400 }
      );
    }

    const normalizedIntent = intent || interpretMuseTranscript(transcript!);
    const preview = await MuseService.preview(normalizedIntent);

    if (action === 'preview') {
      return NextResponse.json(preview);
    }

    if (action !== 'apply') {
      return NextResponse.json({ error: 'Unknown Muse action.' }, { status: 400 });
    }

    if (!preview.canApply) {
      return NextResponse.json(
        {
          error: 'Muse needs clarification before applying this.',
          preview,
        },
        { status: 409 }
      );
    }

    const result = await MuseService.apply(normalizedIntent, auth.actor, transcript);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('[Muse API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Muse could not process that request.' },
      { status: 400 }
    );
  }
}
