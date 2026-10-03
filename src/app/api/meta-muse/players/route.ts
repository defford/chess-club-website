import { NextRequest, NextResponse } from 'next/server';
import { requireMetaMuseConnector } from '@/lib/muse/connectorAuth';
import { MuseService } from '@/lib/muse/service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = requireMetaMuseConnector(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const query = request.nextUrl.searchParams.get('q')?.trim();
  if (!query) {
    return NextResponse.json({ error: 'q is required.' }, { status: 400 });
  }

  try {
    const players = await MuseService.searchPlayers(query);
    return NextResponse.json({ query, players });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not search players.' },
      { status: 500 }
    );
  }
}
