import { NextRequest, NextResponse } from 'next/server';
import { enhancedGoogleSheetsService } from '@/lib/googleSheetsEnhanced';
import { KVCacheService } from '@/lib/kv';

export async function GET(request: NextRequest) {
  try {
    // Check if we're in a quota exceeded state
    const isQuotaExceeded = (KVCacheService as any).isQuotaExceeded?.() || false;
    
    if (isQuotaExceeded) {
      console.warn('Quota exceeded - returning cached data only');
      
      // Try to get cached data
      try {
        const [events, rankings, members] = await Promise.allSettled([
          KVCacheService.getEvents(),
          KVCacheService.getRankings(),
          KVCacheService.getMembers()
        ]);

        return NextResponse.json({
          success: true,
          data: {
            events: events.status === 'fulfilled' ? events.value : [],
            rankings: rankings.status === 'fulfilled' ? rankings.value : [],
            members: members.status === 'fulfilled' ? members.value : []
          },
          fromCache: true,
          quotaExceeded: true,
          timestamp: new Date().toISOString()
        });
      } catch (cacheError) {
        console.error('Failed to get cached data:', cacheError);
        return NextResponse.json(
          { 
            error: 'Quota exceeded and no cached data available',
            quotaExceeded: true
          },
          { status: 503 }
        );
      }
    }

    // Use batch method to get all data efficiently
    const batchData = await enhancedGoogleSheetsService.getAllDataBatch();
    
    // Cache the batch data
    await Promise.allSettled([
      KVCacheService.updateCachedData('events:all', batchData.events, { ttl: 7200, tags: ['events'] }),
      KVCacheService.updateCachedData('rankings:all', batchData.members, { ttl: 3600, tags: ['rankings'] }),
      KVCacheService.updateCachedData('members:all', batchData.members, { ttl: 14400, tags: ['members'] })
    ]);

    return NextResponse.json({
      success: true,
      data: batchData,
      fromCache: false,
      quotaExceeded: false,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Batch data API error:', error);
    
    // Check if it's a quota exceeded error
    const isQuotaError = error?.code === 429 || 
                       error?.message?.includes('Quota exceeded') ||
                       error?.message?.includes('quota metric') ||
                       error?.message?.includes('Read requests per minute');
    
    if (isQuotaError) {
      // Set circuit breaker
      (KVCacheService as any).setQuotaExceeded?.();
      
      // Try to return cached data
      try {
        const [events, rankings, members] = await Promise.allSettled([
          KVCacheService.getEvents(),
          KVCacheService.getRankings(),
          KVCacheService.getMembers()
        ]);

        return NextResponse.json({
          success: true,
          data: {
            events: events.status === 'fulfilled' ? events.value : [],
            rankings: rankings.status === 'fulfilled' ? rankings.value : [],
            members: members.status === 'fulfilled' ? members.value : []
          },
          fromCache: true,
          quotaExceeded: true,
          timestamp: new Date().toISOString()
        });
      } catch (cacheError) {
        console.error('Failed to get cached data after quota error:', cacheError);
        return NextResponse.json(
          { 
            error: 'Quota exceeded and no cached data available',
            quotaExceeded: true
          },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve batch data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
