import { Achievement, AchievementType, GameData, PlayerData } from './types';

export class AchievementService {
  private static achievementDefinitions: Record<AchievementType, {
    title: string;
    description: string;
    check: (player: PlayerData, game: GameData, allGames: GameData[], allPlayers: PlayerData[]) => boolean;
  }> = {
    first_win: {
      title: "First Victory! 🎉",
      description: "Won your first game",
      check: (player, game, allGames) => {
        if (!player.id) return false;
        
        // Count all wins for this player across all games
        // If they have won at least one game, they qualify for this achievement
        const totalWins = allGames.filter(g => 
          (g.player1Id === player.id && g.result === 'player1') ||
          (g.player2Id === player.id && g.result === 'player2')
        );
        return totalWins.length > 0;
      }
    },
    win_streak_3: {
      title: "On Fire! 🔥",
      description: "Won 3 games in a row",
      check: (player, game, allGames) => {
        if (!player.id) return false;
        const recentGames = this.getRecentGamesForPlayer(player.id, allGames, 3);
        return recentGames.length === 3 && recentGames.every(g => this.playerWon(g, player.id!));
      }
    },
    win_streak_5: {
      title: "Unstoppable! ⚡",
      description: "Won 5 games in a row",
      check: (player, game, allGames) => {
        if (!player.id) return false;
        const recentGames = this.getRecentGamesForPlayer(player.id, allGames, 5);
        return recentGames.length === 5 && recentGames.every(g => this.playerWon(g, player.id!));
      }
    },
    win_streak_10: {
      title: "Legendary! 👑",
      description: "Won 10 games in a row",
      check: (player, game, allGames) => {
        if (!player.id) return false;
        const recentGames = this.getRecentGamesForPlayer(player.id, allGames, 10);
        return recentGames.length === 10 && recentGames.every(g => this.playerWon(g, player.id!));
      }
    },
    games_played_10: {
      title: "Getting Started! 🎯",
      description: "Played 10 games",
      check: (player, game, allGames) => {
        if (!player.id) return false;
        const playerGames = allGames.filter(g => 
          g.player1Id === player.id || g.player2Id === player.id
        );
        return playerGames.length >= 10;
      }
    },
    games_played_25: {
      title: "Dedicated Player! 🏆",
      description: "Played 25 games",
      check: (player, game, allGames) => {
        if (!player.id) return false;
        const playerGames = allGames.filter(g => 
          g.player1Id === player.id || g.player2Id === player.id
        );
        return playerGames.length >= 25;
      }
    },
    games_played_50: {
      title: "Chess Veteran! 🎖️",
      description: "Played 50 games",
      check: (player, game, allGames) => {
        if (!player.id) return false;
        const playerGames = allGames.filter(g => 
          g.player1Id === player.id || g.player2Id === player.id
        );
        return playerGames.length >= 50;
      }
    },
    perfect_week: {
      title: "Perfect Week! ✨",
      description: "Won all games this week",
      check: (player, game, allGames) => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        if (!player.id) return false;
        const weekGames = allGames.filter(g => 
          (g.player1Id === player.id || g.player2Id === player.id) &&
          new Date(g.gameDate) >= weekAgo
        );
        return weekGames.length >= 3 && weekGames.every(g => this.playerWon(g, player.id!));
      }
    },
    comeback_king: {
      title: "Comeback King! 💪",
      description: "Won after losing 3 games in a row",
      check: (player, game, allGames) => {
        if (!player.id) return false;
        if (!this.playerWon(game, player.id)) return false;
        const recentGames = this.getRecentGamesForPlayer(player.id, allGames, 4);
        if (recentGames.length < 4) return false;
        const previous3 = recentGames.slice(1, 4);
        return previous3.every(g => !this.playerWon(g, player.id!));
      }
    },
    giant_slayer: {
      title: "Giant Slayer! ⚔️",
      description: "Beat a player ranked 3+ positions higher",
      check: (player, game, allGames, allPlayers) => {
        if (!player.id) return false;
        if (!this.playerWon(game, player.id)) return false;
        const opponentId = game.player1Id === player.id ? game.player2Id : game.player1Id;
        const opponent = allPlayers.find(p => p.id === opponentId);
        const playerData = allPlayers.find(p => p.id === player.id);
        if (!opponent || !playerData?.rank || !opponent.rank) return false;
        return opponent.rank <= playerData.rank - 3;
      }
    },
    draw_master: {
      title: "Draw Master! 🤝",
      description: "Had 5 draws in a row",
      check: (player, game, allGames) => {
        if (!player.id) return false;
        if (game.result !== 'draw') return false;
        const recentGames = this.getRecentGamesForPlayer(player.id, allGames, 5);
        return recentGames.length === 5 && recentGames.every(g => g.result === 'draw');
      }
    },
    first_draw: {
      title: "First Draw! 🤝",
      description: "Had your first draw",
      check: (player, game, allGames) => {
        if (!player.id) return false;
        // The current game must be a draw involving this player
        const currentGameIsDraw = game.result === 'draw' && 
                                  (game.player1Id === player.id || game.player2Id === player.id);
        if (!currentGameIsDraw) return false;
        
        // Count draws up to (but not including) this game
        // If they have 0 draws before this game, this is their first draw
        const drawsBeforeThisGame = allGames.filter(g => 
          g.id !== game.id && // Exclude current game
          (g.player1Id === player.id || g.player2Id === player.id) && 
          g.result === 'draw'
        );
        return drawsBeforeThisGame.length === 0;
      }
    },
    undefeated_month: {
      title: "Undefeated Month! 🛡️",
      description: "No losses this month",
      check: (player, game, allGames) => {
        if (!player.id) return false;
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        const monthGames = allGames.filter(g => 
          (g.player1Id === player.id || g.player2Id === player.id) &&
          new Date(g.gameDate) >= monthAgo
        );
        return monthGames.length >= 5 && monthGames.every(g => 
          this.playerWon(g, player.id!) || g.result === 'draw'
        );
      }
    }
  };

  static async checkAchievements(
    game: GameData, 
    allGames: GameData[], 
    allPlayers: PlayerData[],
    existingAchievements?: Map<string, Set<AchievementType>>
  ): Promise<Achievement[]> {
    const achievements: Achievement[] = [];
    const gameDate = new Date(game.gameDate);
    
    // Check achievements for both players
    for (const playerId of [game.player1Id, game.player2Id]) {
      const player = allPlayers.find(p => p.id === playerId);
      if (!player) continue;

      // Get player's existing achievement types from passed-in map
      const existingTypes = existingAchievements?.get(playerId) || new Set<AchievementType>();

      for (const [type, definition] of Object.entries(this.achievementDefinitions)) {
        // Skip if player already has this achievement
        if (existingTypes.has(type as AchievementType)) continue;

        try {
          if (definition.check(player, game, allGames, allPlayers)) {
            const achievement: Achievement = {
              id: `${playerId}_${type}_${Date.now()}`,
              playerId,
              playerName: player.name,
              type: type as AchievementType,
              title: definition.title,
              description: definition.description,
              earnedAt: gameDate.toISOString(),
              gameId: game.id,
              metadata: {
                gameDate: game.gameDate,
                opponentId: game.player1Id === playerId ? game.player2Id : game.player1Id,
                opponentName: game.player1Id === playerId ? game.player2Name : game.player1Name
              }
            };
            achievements.push(achievement);
          }
        } catch (error) {
          console.error(`Error checking achievement ${type} for player ${playerId}:`, error);
        }
      }
    }

    return achievements;
  }

  private static playerWon(game: GameData, playerId: string): boolean {
    return (game.player1Id === playerId && game.result === 'player1') ||
           (game.player2Id === playerId && game.result === 'player2');
  }

  private static getRecentGamesForPlayer(
    playerId: string, 
    allGames: GameData[], 
    count: number
  ): GameData[] {
    return allGames
      .filter(g => g.player1Id === playerId || g.player2Id === playerId)
      .sort((a, b) => new Date(b.gameDate).getTime() - new Date(a.gameDate).getTime())
      .slice(0, count);
  }

  /**
   * Calculate all achievements a player has earned based on their game history
   * @param playerId - The player's ID
   * @param allGames - All games in the system
   * @param allPlayers - All players in the system (for ranking-based achievements)
   * @returns Array of achievements the player has earned
   */
  static async getPlayerAchievements(
    playerId: string,
    allGames: GameData[],
    allPlayers: PlayerData[]
  ): Promise<Achievement[]> {
    // Find player in allPlayers list
    const player = allPlayers.find(p => p.id === playerId);
    
    // If player not found in rankings, create a minimal player object from games
    // This handles cases where a player has games but isn't in the rankings yet
    if (!player) {
      // Try to find the player's name from their games
      const playerGame = allGames.find(g => g.player1Id === playerId || g.player2Id === playerId);
      if (!playerGame) return []; // No games found for this player
      
      // Create a minimal player object
      const playerName = playerGame.player1Id === playerId ? playerGame.player1Name : playerGame.player2Name;
      const minimalPlayer: PlayerData = {
        id: playerId,
        name: playerName,
        grade: 'Unknown',
        gamesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        points: 0,
        lastActive: new Date().toISOString()
      };
      
      // Use the minimal player for achievement checking
      const playerGames = allGames
        .filter(g => g.player1Id === playerId || g.player2Id === playerId)
        .sort((a, b) => new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime());
      
      if (playerGames.length === 0) return [];
      
      return this.calculateAchievementsForPlayer(minimalPlayer, playerId, playerGames, allGames, allPlayers);
    }

    // Get all games for this player, sorted chronologically
    const playerGames = allGames
      .filter(g => g.player1Id === playerId || g.player2Id === playerId)
      .sort((a, b) => new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime());

    if (playerGames.length === 0) return [];
    
    return this.calculateAchievementsForPlayer(player, playerId, playerGames, allGames, allPlayers);
  }

  /**
   * Internal method to calculate achievements for a player
   */
  private static calculateAchievementsForPlayer(
    player: PlayerData,
    playerId: string,
    playerGames: GameData[],
    allGames: GameData[],
    allPlayers: PlayerData[]
  ): Achievement[] {

    const achievements: Achievement[] = [];
    const earnedTypes = new Set<AchievementType>();

    // Iterate through games chronologically to find when achievements were earned
    for (let i = 0; i < playerGames.length; i++) {
      const game = playerGames[i];
      // Get all games up to this point (including other players' games for ranking-based achievements)
      const gamesUpToThisPoint = allGames.filter(g => 
        new Date(g.gameDate).getTime() <= new Date(game.gameDate).getTime()
      );

      // Check each achievement type
      for (const [type, definition] of Object.entries(this.achievementDefinitions)) {
        const achievementType = type as AchievementType;
        
        // Skip if already earned
        if (earnedTypes.has(achievementType)) continue;

        try {
          // Check if this achievement was earned at this point in the game history
          // Use all games up to this point so ranking-based achievements work correctly
          if (definition.check(player, game, gamesUpToThisPoint, allPlayers)) {
            const achievement: Achievement = {
              id: `${playerId}_${achievementType}_${Date.now()}_${i}`,
              playerId,
              playerName: player.name,
              type: achievementType,
              title: definition.title,
              description: definition.description,
              earnedAt: game.gameDate,
              gameId: game.id,
              metadata: {
                gameDate: game.gameDate,
                opponentId: game.player1Id === playerId ? game.player2Id : game.player1Id,
                opponentName: game.player1Id === playerId ? game.player2Name : game.player1Name
              }
            };
            achievements.push(achievement);
            earnedTypes.add(achievementType);
          }
        } catch (error) {
          console.error(`Error checking achievement ${type} for player ${playerId}:`, error);
        }
      }
    }

    // Sort achievements by earned date
    return achievements.sort((a, b) => 
      new Date(a.earnedAt).getTime() - new Date(b.earnedAt).getTime()
    );
  }

  static getAchievementDefinition(type: AchievementType) {
    return this.achievementDefinitions[type];
  }
}
