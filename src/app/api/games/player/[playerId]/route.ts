import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';
import { KVCacheService } from '@/lib/kv';
import { QuotaHandler } from '@/lib/quotaHandler';

// GET /api/games/player/[playerId] - Get all games for a specific player
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    const { playerId } = await params;
    const { searchParams } = new URL(request.url);
    
    // Parse date filtering parameters
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    
    // First try to get games by playerId
    let games = await dataService.getPlayerGames(playerId);
    
    // If no games found by ID, try to get all games and filter by name
    if (games.length === 0) {
      const allGames = await dataService.getGames();
      
      // Filter games where the playerId matches either player1Name or player2Name
      games = allGames.filter(game => 
        game.player1Name === playerId || game.player2Name === playerId
      );
    }
    
    // Apply date filtering if date parameters are provided
    if (dateFrom || dateTo) {
      games = games.filter(game => {
        // Convert game date to YYYY-MM-DD format for comparison
        const gameDateStr = game.gameDate.split('T')[0]; // Remove time part if present
        
        if (dateFrom) {
          if (gameDateStr < dateFrom) return false;
        }
        
        if (dateTo) {
          if (gameDateStr > dateTo) return false;
        }
        
        return true;
      });
    }
    
    return NextResponse.json(games);
  } catch (error: any) {
    console.error('Player games API GET error:', error);
    
    // Use quota handler for consistent error handling
    return QuotaHandler.handleApiError(
      error,
      async () => {
        // Cache fallback logic - get all games from cache
        const allGames = await KVCacheService.getGames();
        const { playerId } = await params;
        const { searchParams } = new URL(request.url);
        
        // Parse date filtering parameters
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');
        
        // Filter games where the playerId matches either player1Name or player2Name
        let games = allGames.filter((game: any) => 
          game.player1Name === playerId || game.player2Name === playerId
        );
        
        // Apply date filtering if date parameters are provided
        if (dateFrom || dateTo) {
          games = games.filter((game: any) => {
            // Convert game date to YYYY-MM-DD format for comparison
            const gameDateStr = game.gameDate.split('T')[0]; // Remove time part if present
            
            if (dateFrom) {
              if (gameDateStr < dateFrom) return false;
            }
            
            if (dateTo) {
              if (gameDateStr > dateTo) return false;
            }
            
            return true;
          });
        }
        
        return games;
      },
      'Failed to retrieve player games'
    );
  }
}
