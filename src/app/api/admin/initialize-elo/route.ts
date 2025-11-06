import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/apiAuth';
import { EloService } from '@/lib/eloService';

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




