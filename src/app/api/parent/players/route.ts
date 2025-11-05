import { NextRequest, NextResponse } from 'next/server';
import { parentAuthService } from '@/lib/parentAuth';
import { KVCacheService } from '@/lib/kv';

export async function GET(request: NextRequest) {
  try {
    // Get parent from session (this would normally be from a middleware or session check)
    const authHeader = request.headers.get('authorization');
    const parentEmail = request.headers.get('x-parent-email');
    
    if (!parentEmail) {
      return NextResponse.json(
        { error: 'Parent email required in headers' },
        { status: 401 }
      );
    }

    // Get parent account - using cache
    const parentAccount = await KVCacheService.getParentAccount(parentEmail);
    if (!parentAccount) {
      return NextResponse.json(
        { error: 'Parent account not found' },
        { status: 404 }
      );
    }

    // Get parent's players - using cache
    const players = await KVCacheService.getParentPlayers(parentAccount.id);

    // For each player, get their ranking information if available
    const playersWithRankings = await Promise.all(
      players.map(async (player) => {
        try {
          // Try to find the player in rankings by name - using cache
          const allPlayers = await KVCacheService.getRankings();
          const playerRanking = allPlayers.find(p => 
            p.name.toLowerCase() === player.playerName.toLowerCase()
          );

          return {
            ...player,
            ranking: playerRanking ? {
              rank: playerRanking.rank,
              points: playerRanking.points,
              wins: playerRanking.wins,
              losses: playerRanking.losses,
              lastActive: playerRanking.lastActive
            } : null
          };
        } catch (error) {
          console.error(`Error getting ranking for player ${player.playerName}:`, error);
          return {
            ...player,
            ranking: null
          };
        }
      })
    );

    return NextResponse.json(
      { 
        players: playersWithRankings,
        totalPlayers: playersWithRankings.length
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get parent players API error:', error);
    return NextResponse.json(
      { error: 'Failed to get players' },
      { status: 500 }
    );
  }
}
