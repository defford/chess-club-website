import { NextRequest, NextResponse } from 'next/server';
import { requireMetaMuseConnector } from '@/lib/muse/connectorAuth';
import { MuseService } from '@/lib/muse/service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = requireMetaMuseConnector(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const rawLimit = request.nextUrl.searchParams.get('limit');
  const limit = rawLimit ? Number.parseInt(rawLimit, 10) : 10;

  try {
    const standings = await MuseService.getLadderStandings(limit);
    return NextResponse.json(standings);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load ladder standings.' },
      { status: 500 }
    );
  }
}
