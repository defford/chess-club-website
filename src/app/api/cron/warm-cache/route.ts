import { NextRequest, NextResponse } from 'next/server';
import { KVCacheService } from '@/lib/kv';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret from Vercel
    const authHeader = request.headers.get('authorization');
    
    // In production, Vercel Cron jobs send a secret
    if (process.env.CRON_SECRET) {
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.error('Cron auth failed');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log('Starting scheduled cache warm-up...');
    
    const startTime = Date.now();
    const results: { 
      success: string[]; 
      failed: string[]; 
      duration: number;
    } = {
      success: [],
      failed: [],
      duration: 0
    };
    
    // Warm all major caches in parallel
    const warmupTasks = [
      {
        name: 'events',
        task: KVCacheService.getEvents()
      },
      {
        name: 'rankings',
        task: KVCacheService.getRankings()
      },
      {
        name: 'members',
        task: KVCacheService.getMembers()
      }
    ];
    
    // Execute all warming tasks
    const taskResults = await Promise.allSettled(
      warmupTasks.map(async ({ name, task }) => {
        try {
          await task;
          return { name, status: 'success' };
        } catch (error) {
          console.error(`Cache warm-up failed for ${name}:`, error);
          return { name, status: 'failed', error };
        }
      })
    );
    
    // Process results
    taskResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        const { name, status } = result.value;
        if (status === 'success') {
          results.success.push(name);
        } else {
          results.failed.push(name);
        }
      }
    });
    
    results.duration = Date.now() - startTime;
    
    console.log(`Cache warm-up completed in ${results.duration}ms`);
    console.log(`Success: ${results.success.join(', ')}`);
    if (results.failed.length > 0) {
      console.log(`Failed: ${results.failed.join(', ')}`);
    }
    
    // Return appropriate status based on results
    const status = results.failed.length === 0 ? 200 : 207; // 207 = Multi-Status
    
    return NextResponse.json({
      success: true,
      warmed: results.success,
      failed: results.failed,
      duration: results.duration,
      timestamp: new Date().toISOString()
    }, { status });
    
  } catch (error) {
    console.error('Cache warm-up error:', error);
    return NextResponse.json(
      { 
        error: 'Cache warm-up failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
