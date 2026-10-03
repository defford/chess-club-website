import { NextRequest, NextResponse } from 'next/server';
import { requireMetaMuseConnector } from '@/lib/muse/connectorAuth';
import { MuseService } from '@/lib/muse/service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = requireMetaMuseConnector(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const playerId = request.nextUrl.searchParams.get('playerId')?.trim();
  if (!playerId) {
    return NextResponse.json({ error: 'playerId is required.' }, { status: 400 });
  }

  try {
    const summary = await MuseService.getPlayerSummary(playerId);
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load player summary.' },
      { status: 404 }
    );
  }
}
