import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';
import { GameData, GameFormData, AchievementNotification } from '@/lib/types';
import { requireAdminAuth } from '@/lib/apiAuth';
import { KVCacheService } from '@/lib/kv';
import { QuotaHandler } from '@/lib/quotaHandler';
import { AchievementService } from '@/lib/achievements';
// import { broadcastAchievement } from '@/app/api/achievements/notifications/route';

// GET /api/games - List all games with optional filters
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Parse query parameters for filtering
  const filters = {
    playerId: searchParams.get('playerId') || undefined,
    gameType: searchParams.get('gameType') || undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
    result: searchParams.get('result') || undefined,
    eventId: searchParams.get('eventId') || undefined,
    isVerified: searchParams.get('isVerified') ? searchParams.get('isVerified') === 'true' : undefined,
  };

  // Remove undefined values
  const cleanFilters = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined)
  );

  try {
    const games = await KVCacheService.getGames(cleanFilters);
    
    return NextResponse.json(games);
  } catch (error: unknown) {
    console.error('Games API GET error:', error);
    
    // Use quota handler for consistent error handling
    return QuotaHandler.handleApiError(
      error,
      async () => {
        // Cache fallback logic - get all games from cache and apply filters
        const allGames = await KVCacheService.getGames();
        
        // Apply filters to cached data
        let filteredGames = allGames;
        
        if (cleanFilters.playerId) {
          filteredGames = filteredGames.filter(game => 
            game.player1Id === cleanFilters.playerId || game.player2Id === cleanFilters.playerId
          );
        }
        if (cleanFilters.gameType) {
          filteredGames = filteredGames.filter(game => game.gameType === cleanFilters.gameType);
        }
        if (cleanFilters.dateFrom) {
          filteredGames = filteredGames.filter(game => game.gameDate >= cleanFilters.dateFrom!);
        }
        if (cleanFilters.dateTo) {
          filteredGames = filteredGames.filter(game => game.gameDate <= cleanFilters.dateTo!);
        }
        if (cleanFilters.result) {
          filteredGames = filteredGames.filter(game => game.result === cleanFilters.result);
        }
        if (cleanFilters.eventId) {
          filteredGames = filteredGames.filter(game => game.eventId === cleanFilters.eventId);
        }
        if (cleanFilters.isVerified !== undefined) {
          filteredGames = filteredGames.filter(game => game.isVerified === cleanFilters.isVerified);
        }
        
        return filteredGames;
      },
      'Failed to retrieve games'
    );
  }
}

// POST /api/games - Create a new game
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

    const gameFormData: GameFormData = await request.json();
    
    // Validate required fields
    if (!gameFormData.player1Id || !gameFormData.player2Id || !gameFormData.result) {
      return NextResponse.json(
        { error: 'Missing required fields: player1Id, player2Id, result' },
        { status: 400 }
      );
    }

    if (gameFormData.player1Id === gameFormData.player2Id) {
      return NextResponse.json(
        { error: 'Players must be different' },
        { status: 400 }
      );
    }

    if (!['player1', 'player2', 'draw'].includes(gameFormData.result)) {
      return NextResponse.json(
        { error: 'Invalid result. Must be player1, player2, or draw' },
        { status: 400 }
      );
    }

    // Get player names from members data (source of truth for the frontend)
    console.log('Getting players from members data...');
    let player1 = null;
    let player2 = null;
    
    try {
      // Get all members using the same method as the frontend
      const registrations = await dataService.getMembersFromParentsAndStudents();
      
      // Add IDs to members data (same logic as /api/members endpoint)
      const members = registrations.map((registration, index) => ({
        ...registration,
        id: registration.studentId || (registration.rowIndex ? `reg_row_${registration.rowIndex}` : `member_${index + 1}`),
        joinDate: new Date().toISOString().split('T')[0], // Default to today
        isActive: true, // Default to active
        notes: '',
      }));
      
      console.log(`Found ${members.length} members, looking for players: ${gameFormData.player1Id}, ${gameFormData.player2Id}`);
      
      // Add system players for incomplete games (same as /api/members endpoint)
      const systemPlayers = [
        {
          id: 'unknown_opponent',
          parentName: 'System',
          parentEmail: 'system@chessclub.local',
          parentPhone: 'N/A',
          playerName: 'Unknown Opponent',
          playerAge: 'N/A',
          playerGrade: 'Unknown',
          emergencyContact: 'N/A',
          emergencyPhone: 'N/A',
          medicalInfo: 'N/A',
          hearAboutUs: 'System Player',
          provincialInterest: '',
          volunteerInterest: '',
          consent: true,
          photoConsent: false,
          valuesAcknowledgment: true,
          newsletter: false,
          timestamp: new Date().toISOString(),
          joinDate: new Date().toISOString().split('T')[0],
          isActive: true,
          notes: 'System player for incomplete games',
          isSystemPlayer: true
        }
      ];

      // Combine regular members with system players
      const allMembers = [...members, ...systemPlayers];
      
      const member1 = allMembers.find(m => m.id === gameFormData.player1Id);
      const member2 = allMembers.find(m => m.id === gameFormData.player2Id);
      
      if (member1) {
        player1 = {
          id: gameFormData.player1Id,
          name: member1.playerName,
          grade: member1.playerGrade,
          wins: 0,
          losses: 0,
          points: 0,
          rank: 999,
          lastActive: member1.timestamp || new Date().toISOString(),
          email: member1.parentEmail || ''
        };
      }
      
      if (member2) {
        player2 = {
          id: gameFormData.player2Id,
          name: member2.playerName,
          grade: member2.playerGrade,
          wins: 0,
          losses: 0,
          points: 0,
          rank: 999,
          lastActive: member2.timestamp || new Date().toISOString(),
          email: member2.parentEmail || ''
        };
      }
    } catch (error) {
      console.error('Error getting players from members data:', error);
    }

    if (!player1 || !player2) {
      console.error('Player lookup failed:', {
        player1Id: gameFormData.player1Id,
        player2Id: gameFormData.player2Id,
        player1Found: !!player1,
        player2Found: !!player2,
        totalMembers: allMembers.length,
        memberIds: allMembers.slice(0, 10).map(m => m.id), // Log first 10 IDs for debugging
      });
      return NextResponse.json(
        { error: `One or both players not found. Player1: ${gameFormData.player1Id}, Player2: ${gameFormData.player2Id}` },
        { status: 404 }
      );
    }

    // Create game data object
    const gameData: GameData = {
      id: '', // Will be generated by addGame
      player1Id: gameFormData.player1Id,
      player1Name: player1.name,
      player2Id: gameFormData.player2Id,
      player2Name: player2.name,
      result: gameFormData.result,
      gameDate: gameFormData.gameDate || new Date().toISOString().split('T')[0],
      gameTime: gameFormData.gameTime || 0,
      gameType: gameFormData.gameType || 'ladder',
      eventId: gameFormData.eventId,
      notes: gameFormData.notes,
      recordedBy: 'admin', // TODO: Get from auth context
      recordedAt: new Date().toISOString(),
      opening: gameFormData.opening,
      endgame: gameFormData.endgame,
      isVerified: false,
    };

    // Add game to Supabase/Google Sheets (rankings will be calculated dynamically)
    const gameId = await dataService.addGame(gameData);
    
    // Update game data with the generated ID
    const finalGameData = { ...gameData, id: gameId };

    // Check for achievements after game is added
    try {
      // Get all games and players for achievement checking
      const allGames = await KVCacheService.getGames();
      const allPlayers = await dataService.calculateRankingsFromGames();
      
      // Check for new achievements
      const newAchievements = await AchievementService.checkAchievements(
        finalGameData,
        allGames,
        allPlayers
      );

      // Broadcast achievement notifications
      for (const achievement of newAchievements) {
        const notification: AchievementNotification = {
          id: `notif_${achievement.id}`,
          playerName: achievement.playerName,
          achievement,
          timestamp: new Date().toISOString()
        };
        
        // Broadcast to all connected clients
        // broadcastAchievement(notification);
        
        // TODO: Store achievement in Google Sheets or database
        console.log(`Achievement earned: ${achievement.title} by ${achievement.playerName}`);
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
      // Don't fail the game creation if achievement checking fails
    }

    return NextResponse.json(
      { 
        message: 'Game created successfully',
        gameId,
        game: finalGameData
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Games API POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create game' },
      { status: 500 }
    );
  }
}

