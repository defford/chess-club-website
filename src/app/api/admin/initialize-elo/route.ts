import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdminAuth } from '@/lib/apiAuth';
import { EloService } from '@/lib/eloService';
import { KVCacheService } from '@/lib/kv';

/**
 * POST /api/admin/initialize-elo
 * Admin-only endpoint to initialize ELO ratings and calculate retroactively
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const authResult = await requireAdminAuth(request);
    if (!authResult.isAdmin) {
      return NextResponse.json(
        { error: authResult.error || 'Admin privileges required' },
        { status: 403 }
      );
    }

    // Initialize all players with 1000 ELO
    await EloService.initializeAllPlayerEloRatings();

    // Calculate ELO for all games retroactively
    const result = await EloService.calculateEloForAllGames();

    // Invalidate rankings cache to ensure fresh ELO ratings are fetched
    try {
      await KVCacheService.invalidateKey('rankings:all');
      await KVCacheService.invalidateByTags(['rankings']);
      console.log('[Initialize ELO] Invalidated rankings cache');
    } catch (cacheError) {
      console.error('[Initialize ELO] Failed to invalidate rankings cache:', cacheError);
      // Don't fail the request if cache invalidation fails - ELO initialization was successful
    }

    // Revalidate cached pages to ensure updated ELO ratings appear immediately
    try {
      revalidatePath('/ladder');
      revalidatePath('/rankings');
      console.log('[Initialize ELO] Revalidated /ladder and /rankings pages');
    } catch (revalidateError) {
      console.error('[Initialize ELO] Failed to revalidate pages:', revalidateError);
      // Don't fail the request if revalidation fails - ELO initialization was successful
    }

    return NextResponse.json({
      success: true,
      message: 'ELO ratings initialized and calculated successfully',
      summary: {
        gamesProcessed: result.processed,
        errors: result.errors,
      },
    });
  } catch (error) {
    console.error('Error initializing ELO ratings:', error);
    return NextResponse.json(
      { 
        error: 'Failed to initialize ELO ratings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}




