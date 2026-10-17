import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !publishableKey) {
    return NextResponse.json({ error: 'Authentication is not configured' }, { status: 500 });
  }

  return NextResponse.json({ url, publishableKey });
}
