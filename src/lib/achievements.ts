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
        const playerGames = allGames.filter(g => 
          (g.player1Id === player.id && g.result === 'player1') ||
          (g.player2Id === player.id && g.result === 'player2')
        );
        return playerGames.length === 1;
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
        return playerGames.length === 10;
      }
    },
    games_played_25: {
      title: "Dedicated Player! 🏆",
      description: "Played 25 games",
      check: (player, game, allGames) => {
        const playerGames = allGames.filter(g => 
          g.player1Id === player.id || g.player2Id === player.id
        );
        return playerGames.length === 25;
      }
    },
    games_played_50: {
      title: "Chess Veteran! 🎖️",
      description: "Played 50 games",
      check: (player, game, allGames) => {
        const playerGames = allGames.filter(g => 
          g.player1Id === player.id || g.player2Id === player.id
        );
        return playerGames.length === 50;
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
        if (game.result !== 'draw') return false;
        const playerDraws = allGames.filter(g => 
          (g.player1Id === player.id || g.player2Id === player.id) && g.result === 'draw'
        );
        return playerDraws.length === 1;
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
    allPlayers: PlayerData[]
  ): Promise<Achievement[]> {
    const achievements: Achievement[] = [];
    const gameDate = new Date(game.gameDate);
    
    // Check achievements for both players
    for (const playerId of [game.player1Id, game.player2Id]) {
      const player = allPlayers.find(p => p.id === playerId);
      if (!player) continue;

      // Get player's existing achievements to avoid duplicates
      const existingAchievements = await this.getPlayerAchievements(playerId);
      const existingTypes = new Set(existingAchievements.map(a => a.type));

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

  private static async getPlayerAchievements(_playerId: string): Promise<Achievement[]> {
    // This would typically fetch from a database or Google Sheets
    // For now, return empty array - we'll implement storage later
    // _playerId is intentionally unused as this is a placeholder implementation
    return [];
  }

  static getAchievementDefinition(type: AchievementType) {
    return this.achievementDefinitions[type];
  }
}
