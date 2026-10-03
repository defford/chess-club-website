import { NextRequest, NextResponse } from 'next/server';
import { requireMetaMuseConnector } from '@/lib/muse/connectorAuth';
import { MuseService } from '@/lib/muse/service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = requireMetaMuseConnector(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const actionId =
      typeof body?.actionId === 'string' && body.actionId.trim()
        ? body.actionId.trim()
        : undefined;

    const result = await MuseService.undo(auth.actor, actionId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not undo connector action.' },
      { status: 400 }
    );
  }
}
