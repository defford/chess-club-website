import { GameData } from './types';
import { supabaseService } from './supabaseService';

/**
 * ELO Rating Service
 * Calculates ELO ratings using the standard chess rating system with K=32
 */
export class EloService {
  private static readonly K_FACTOR = 32;
  private static readonly INITIAL_RATING = 1000;

  /**
   * Calculate expected score for a player
   * Formula: E_A = 1 / (1 + 10^((R_B - R_A) / 400))
   */
  private static calculateExpectedScore(playerRating: number, opponentRating: number): number {
    const ratingDiff = opponentRating - playerRating;
    return 1 / (1 + Math.pow(10, ratingDiff / 400));
  }

  /**
   * Calculate rating change for both players based on game result
   * @param player1Rating Current ELO rating of player 1
   * @param player2Rating Current ELO rating of player 2
   * @param result Game result: 'player1' wins, 'player2' wins, or 'draw'
   * @returns Object with rating changes for both players
   */
  static calculateRatingChange(
    player1Rating: number,
    player2Rating: number,
    result: 'player1' | 'player2' | 'draw'
  ): { player1Change: number; player2Change: number } {
    // Calculate expected scores
    const expectedScore1 = this.calculateExpectedScore(player1Rating, player2Rating);
    const expectedScore2 = this.calculateExpectedScore(player2Rating, player1Rating);

    // Determine actual scores based on result
    let actualScore1: number;
    let actualScore2: number;

    if (result === 'player1') {
      actualScore1 = 1;
      actualScore2 = 0;
    } else if (result === 'player2') {
      actualScore1 = 0;
      actualScore2 = 1;
    } else {
      // Draw
      actualScore1 = 0.5;
      actualScore2 = 0.5;
    }

    // Calculate rating changes: R_new = R_old + K * (S - E)
    const player1Change = Math.round(this.K_FACTOR * (actualScore1 - expectedScore1));
    const player2Change = Math.round(this.K_FACTOR * (actualScore2 - expectedScore2));

    return { player1Change, player2Change };
  }

  /**
   * Get current ELO rating for a player
   * Returns INITIAL_RATING if player doesn't exist or has no rating
   */
  static async getPlayerEloRating(playerId: string): Promise<number> {
    return await supabaseService.getPlayerEloRating(playerId);
  }

  /**
   * Update ELO rating for a player
   */
  static async updatePlayerEloRating(playerId: string, newRating: number): Promise<void> {
    return await supabaseService.updatePlayerEloRating(playerId, newRating);
  }

  /**
   * Initialize all players with initial ELO rating of 1000
   */
  static async initializeAllPlayerEloRatings(): Promise<void> {
    return await supabaseService.initializeAllPlayerEloRatings();
  }

  /**
   * Calculate ELO for all games retroactively
   * Processes games in chronological order to maintain rating accuracy
   */
  static async calculateEloForAllGames(): Promise<{ processed: number; errors: number }> {
    try {
      // Get all games ordered chronologically
      const games = await supabaseService.getGames();
      
      // Sort games chronologically
      const sortedGames = games.sort((a, b) => {
        const dateA = new Date(a.gameDate).getTime();
        const dateB = new Date(b.gameDate).getTime();
        if (dateA !== dateB) {
          return dateA - dateB;
        }
        // Secondary sort by created_at if available
        const createdA = new Date(a.recordedAt || 0).getTime();
        const createdB = new Date(b.recordedAt || 0).getTime();
        return createdA - createdB;
      });

      if (sortedGames.length === 0) {
        return { processed: 0, errors: 0 };
      }

      // Maintain a map of current ratings as we process games chronologically
      const playerRatings = new Map<string, number>();

      let processed = 0;
      let errors = 0;

      // Initialize all players we encounter with initial rating
      for (const game of sortedGames) {
        if (!playerRatings.has(game.player1Id)) {
          // Try to get from database first, otherwise use initial rating
          const rating = await this.getPlayerEloRating(game.player1Id);
          playerRatings.set(game.player1Id, rating);
        }
        if (!playerRatings.has(game.player2Id)) {
          const rating = await this.getPlayerEloRating(game.player2Id);
          playerRatings.set(game.player2Id, rating);
        }
      }

      // Process each game chronologically
      for (const game of sortedGames) {
        try {
          const player1Id = game.player1Id;
          const player2Id = game.player2Id;

          // Get current ratings
          const player1Rating = playerRatings.get(player1Id) ?? this.INITIAL_RATING;
          const player2Rating = playerRatings.get(player2Id) ?? this.INITIAL_RATING;

          // Calculate rating changes
          const { player1Change, player2Change } = this.calculateRatingChange(
            player1Rating,
            player2Rating,
            game.result
          );

          // Update ratings in memory
          const newPlayer1Rating = player1Rating + player1Change;
          const newPlayer2Rating = player2Rating + player2Change;
          playerRatings.set(player1Id, newPlayer1Rating);
          playerRatings.set(player2Id, newPlayer2Rating);

          // Update ratings in database (only if player exists in students table)
          try {
            await this.updatePlayerEloRating(player1Id, newPlayer1Rating);
          } catch (error) {
            // Player might not exist in students table (e.g., "Unknown Opponent")
            // Continue processing
          }

          try {
            await this.updatePlayerEloRating(player2Id, newPlayer2Rating);
          } catch (error) {
            // Player might not exist in students table
            // Continue processing
          }

          // Update game's rating_change field
          const ratingChange = {
            player1: player1Change,
            player2: player2Change,
          };

          await supabaseService.updateGame(game.id, { ratingChange });

          processed++;
        } catch (error) {
          console.error(`Error processing game ${game.id}:`, error);
          errors++;
        }
      }

      return { processed, errors };
    } catch (error) {
      console.error('Error calculating ELO for all games:', error);
      throw error;
    }
  }
}

