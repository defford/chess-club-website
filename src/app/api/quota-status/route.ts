import { NextRequest, NextResponse } from 'next/server';
import { KVCacheService } from '@/lib/kv';

export async function GET(request: NextRequest) {
  try {
    // Check if we're in a quota exceeded state
    const isQuotaExceeded = (KVCacheService as any).isQuotaExceeded?.() || false;
    const quotaExceededUntil = (KVCacheService as any).quotaExceededUntil || 0;
    
    const now = Date.now();
    const timeRemaining = quotaExceededUntil > now ? quotaExceededUntil - now : 0;
    
    return NextResponse.json({
      quotaExceeded: isQuotaExceeded,
      timeRemaining: timeRemaining,
      timeRemainingFormatted: timeRemaining > 0 ? `${Math.ceil(timeRemaining / 1000)} seconds` : '0 seconds',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Quota status check error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check quota status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'reset') {
      // Reset quota exceeded state
      (KVCacheService as any).quotaExceededUntil = 0;
      console.log('Quota exceeded state reset by admin');
      
      return NextResponse.json({
        success: true,
        message: 'Quota exceeded state reset',
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Quota status management error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to manage quota status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
