import type { TournamentData, TournamentResultData, TournamentPairing, TournamentRound } from './types';
import { googleSheetsService } from './googleSheets';

export interface SwissPairingResult {
  pairings: TournamentPairing[];
  forcedByes: string[];
  halfPointByes: string[];
}

export class SwissPairingService {
  /**
   * Generate Swiss pairings for a tournament round
   * @param tournamentId - The tournament ID
   * @param roundNumber - The round number to generate pairings for
   * @param currentResults - Current tournament results (optional, will fetch if not provided)
   * @returns SwissPairingResult with pairings and byes
   */
  async generateSwissPairings(tournamentId: string, roundNumber: number, currentResults?: TournamentResultData[]): Promise<SwissPairingResult> {
    try {
      // Get tournament data and current standings
      const tournament = await googleSheetsService.getTournamentById(tournamentId);
      const standings = currentResults || await googleSheetsService.getTournamentResults(tournamentId);

      if (!tournament) {
        throw new Error(`Tournament ${tournamentId} not found`);
      }

      if (standings.length === 0) {
        throw new Error('No players found for tournament');
      }

      // Sort players by points (desc), then Buchholz (desc)
      const sortedPlayers = standings.sort((a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points;
        }
        return b.buchholzScore - a.buchholzScore;
      });

      const pairings: TournamentPairing[] = [];
      const forcedByes: string[] = [];
      const halfPointByes: string[] = [];
      const usedPlayers = new Set<string>();

      // Note: Half-point byes should only be assigned manually by admin
      // The algorithm should not automatically assign them based on existing byeRounds data

      // Filter out players who have half-point byes for the current round
      // These players should not be included in pairings
      const playersWithHalfPointByes = standings.filter(player => 
        player.byeRounds.includes(roundNumber)
      );
      
      // Add players with half-point byes to the halfPointByes array
      playersWithHalfPointByes.forEach(player => {
        halfPointByes.push(player.playerId);
        usedPlayers.add(player.playerId);
      });

      // Group remaining players by score (excluding those with half-point byes)
      const remainingPlayers = standings.filter(player => 
        !usedPlayers.has(player.playerId) && !player.byeRounds.includes(roundNumber)
      );
      
      if (remainingPlayers.length === 0) {
        return {
          pairings,
          forcedByes,
          halfPointByes
        };
      }
      
      // If odd number of players, assign forced bye to lowest-ranked player who hasn't had bye
      if (remainingPlayers.length % 2 === 1) {
        const playerForBye = this.selectPlayerForForcedBye(remainingPlayers, roundNumber);
        if (playerForBye) {
          forcedByes.push(playerForBye.playerId);
          usedPlayers.add(playerForBye.playerId);
        }
      }

      // Pair remaining players
      const playersToPair = remainingPlayers.filter(player => !usedPlayers.has(player.playerId));
      
      for (let i = 0; i < playersToPair.length - 1; i += 2) {
        const player1 = playersToPair[i];
        const player2 = playersToPair[i + 1];
        
        const pairing = this.createPairing(
          tournamentId,
          roundNumber,
          player1,
          player2
        );
        
        pairings.push(pairing);
        usedPlayers.add(player1.playerId);
        usedPlayers.add(player2.playerId);
      }

      return {
        pairings,
        forcedByes,
        halfPointByes
      };
    } catch (error) {
      console.error('Error generating Swiss pairings:', error);
      throw new Error('Failed to generate Swiss pairings');
    }
  }

  /**
   * Group players by their current score
   */
  private groupPlayersByScore(players: TournamentResultData[]): TournamentResultData[][] {
    const groups: { [score: number]: TournamentResultData[] } = {};
    
    players.forEach(player => {
      const score = player.points;
      if (!groups[score]) {
        groups[score] = [];
      }
      groups[score].push(player);
    });

    // Return groups sorted by score (highest first)
    const result = Object.keys(groups)
      .map(score => parseFloat(score)) // Use parseFloat to preserve decimal points
      .sort((a, b) => b - a)
      .map(score => {
        const group = groups[score];
        return group;
      })
      .filter(group => Array.isArray(group) && group.length > 0);
      
    return result;
  }

  /**
   * Pair players within the same score group
   */
  private pairPlayersInGroup(
    players: TournamentResultData[],
    usedPlayers: Set<string>,
    tournamentId: string,
    roundNumber: number
  ): { pairings: TournamentPairing[]; forcedByes: string[]; halfPointByes: string[] } {
    const pairings: TournamentPairing[] = [];
    const forcedByes: string[] = [];
    const halfPointByes: string[] = [];

    // Filter out already used players
    const availablePlayers = players.filter(player => !usedPlayers.has(player.playerId));
    
    if (availablePlayers.length === 0) {
      return { pairings, forcedByes, halfPointByes };
    }

    // If odd number of players, try to pair with next group or assign bye
    if (availablePlayers.length % 2 === 1) {
      const playerForBye = this.selectPlayerForForcedBye(availablePlayers, roundNumber);
      if (playerForBye) {
        forcedByes.push(playerForBye.playerId);
        usedPlayers.add(playerForBye.playerId);
      }
    }

    // Get remaining players after bye assignment
    const remainingPlayers = availablePlayers.filter(player => !usedPlayers.has(player.playerId));
    
    
    for (let i = 0; i < remainingPlayers.length - 1; i += 2) {
      const player1 = remainingPlayers[i];
      const player2 = remainingPlayers[i + 1];
      

      // Check if they've already played each other
      if (this.havePlayedBefore(player1, player2)) {
        // Try to find a different opponent for player1
        const alternativeOpponent = this.findAlternativeOpponent(
          player1,
          remainingPlayers.slice(i + 2),
          usedPlayers
        );

        if (alternativeOpponent) {
          // Create pairing with alternative opponent
          const pairing = this.createPairing(
            tournamentId,
            roundNumber,
            player1,
            alternativeOpponent
          );
          pairings.push(pairing);
          usedPlayers.add(player1.playerId);
          usedPlayers.add(alternativeOpponent.playerId);

          // Pair the remaining player with someone else or assign bye
          const remainingPlayer = player2;
          const nextAvailable = remainingPlayers.find(p => 
            !usedPlayers.has(p.playerId) && p.playerId !== player1.playerId
          );

          if (nextAvailable && !this.havePlayedBefore(remainingPlayer, nextAvailable)) {
            const remainingPairing = this.createPairing(
              tournamentId,
              roundNumber,
              remainingPlayer,
              nextAvailable
            );
            pairings.push(remainingPairing);
            usedPlayers.add(remainingPlayer.playerId);
            usedPlayers.add(nextAvailable.playerId);
          } else {
            // Assign bye to remaining player
            forcedByes.push(remainingPlayer.playerId);
            usedPlayers.add(remainingPlayer.playerId);
          }
        } else {
          // No alternative found, create pairing anyway (rematch)
          const pairing = this.createPairing(
            tournamentId,
            roundNumber,
            player1,
            player2
          );
          pairings.push(pairing);
          usedPlayers.add(player1.playerId);
          usedPlayers.add(player2.playerId);
        }
      } else {
        // No rematch, create normal pairing
        const pairing = this.createPairing(
          tournamentId,
          roundNumber,
          player1,
          player2
        );
        pairings.push(pairing);
        usedPlayers.add(player1.playerId);
        usedPlayers.add(player2.playerId);
      }
    }

    return { pairings, forcedByes, halfPointByes };
  }

  /**
   * Check if two players have played before
   */
  private havePlayedBefore(player1: TournamentResultData, player2: TournamentResultData): boolean {
    return player1.opponentsFaced.includes(player2.playerId) || 
           player2.opponentsFaced.includes(player1.playerId);
  }

  /**
   * Find an alternative opponent for a player
   */
  private findAlternativeOpponent(
    player: TournamentResultData,
    availablePlayers: TournamentResultData[],
    usedPlayers: Set<string>
  ): TournamentResultData | null {
    return availablePlayers.find(opponent => 
      !usedPlayers.has(opponent.playerId) && 
      !this.havePlayedBefore(player, opponent)
    ) || null;
  }

  /**
   * Create a pairing between two players
   */
  private createPairing(
    tournamentId: string,
    roundNumber: number,
    player1: TournamentResultData,
    player2: TournamentResultData
  ): TournamentPairing {
    const pairingId = `pairing_${tournamentId}_${roundNumber}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: pairingId,
      tournamentId,
      round: roundNumber,
      player1Id: player1.playerId,
      player1Name: player1.playerName,
      player2Id: player2.playerId,
      player2Name: player2.playerName,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Select a player for forced bye (lowest ranked who hasn't had bye)
   */
  private selectPlayerForForcedBye(players: TournamentResultData[], roundNumber: number): TournamentResultData | null {
    // Find players who haven't had a bye in any previous round
    const playersWithoutBye = players.filter(player => 
      player.byeRounds.length === 0 // No byes in any previous rounds
    );

    if (playersWithoutBye.length === 0) {
      // All players have had byes, select the lowest ranked
      return players[players.length - 1];
    }

    // Return the lowest ranked player without a bye
    return playersWithoutBye[playersWithoutBye.length - 1];
  }

  /**
   * Pair remaining players who couldn't be paired in their score group
   */
  private pairRemainingPlayers(
    players: TournamentResultData[],
    tournamentId: string,
    roundNumber: number
  ): TournamentPairing[] {
    const pairings: TournamentPairing[] = [];

    for (let i = 0; i < players.length - 1; i += 2) {
      const pairing = this.createPairing(
        tournamentId,
        roundNumber,
        players[i],
        players[i + 1]
      );
      pairings.push(pairing);
    }

    return pairings;
  }


  /**
   * Calculate Buchholz score for a player
   * @param playerId - The player ID
   * @param standings - Current tournament standings
   * @returns The Buchholz score
   */
  calculateBuchholzScore(playerId: string, standings: TournamentResultData[]): number {
    const player = standings.find(p => p.playerId === playerId);
    
    if (!player) {
      return 0;
    }

    // Sum of all opponents' final scores
    let buchholzScore = 0;
    for (const opponentId of player.opponentsFaced) {
      const opponent = standings.find(p => p.playerId === opponentId);
      if (opponent) {
        buchholzScore += opponent.points;
      }
    }

    return buchholzScore;
  }

  /**
   * Update player standings after a round
   * @param tournamentId - The tournament ID
   * @param currentStandings - Current tournament standings
   * @param roundResults - Array of pairing results
   */
  async updateStandingsAfterRound(
    tournamentId: string,
    currentStandings: TournamentResultData[],
    roundResults: Array<{
      pairingId: string;
      result: 'player1' | 'player2' | 'draw' | 'half-bye-p1' | 'half-bye-p2';
      gameId?: string;
    }>
  ): Promise<void> {
    try {
      const updatedStandings = [...currentStandings];

      // Process each result
      for (const result of roundResults) {
        const pairing = await this.getPairingById(result.pairingId);
        if (!pairing) continue;

        const player1 = updatedStandings.find(p => p.playerId === pairing.player1Id);
        const player2 = updatedStandings.find(p => p.playerId === pairing.player2Id);

        if (!player1 || !player2) continue;

        // Update player stats based on result
        switch (result.result) {
          case 'player1':
            player1.wins += 1;
            player1.points += 1; // Winner gets 1 point
            player2.losses += 1;
            player2.points += 0; // Loser gets 0 points
            break;
          case 'player2':
            player2.wins += 1;
            player2.points += 1; // Winner gets 1 point
            player1.losses += 1;
            player1.points += 0; // Loser gets 0 points
            break;
          case 'draw':
            player1.draws += 1;
            player1.points += 0.5; // Draw gives 0.5 points each
            player2.draws += 1;
            player2.points += 0.5; // Draw gives 0.5 points each
            break;
          case 'half-bye-p1':
            player1.points += 0.5; // Half-bye gives 0.5 points
            player1.byeRounds.push(pairing.round);
            break;
          case 'half-bye-p2':
            player2.points += 0.5; // Half-bye gives 0.5 points
            player2.byeRounds.push(pairing.round);
            break;
        }

        // Update games played and opponents faced
        if (result.result !== 'half-bye-p1' && result.result !== 'half-bye-p2') {
          player1.gamesPlayed += 1;
          player2.gamesPlayed += 1;
          player1.opponentsFaced.push(pairing.player2Id);
          player2.opponentsFaced.push(pairing.player1Id);
        }
      }

      // Recalculate Buchholz scores
      for (const player of updatedStandings) {
        player.buchholzScore = this.calculateBuchholzScore(player.playerId, updatedStandings);
      }

      // Sort by points, then Buchholz
      updatedStandings.sort((a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points;
        }
        return b.buchholzScore - a.buchholzScore;
      });

      // Assign ranks
      updatedStandings.forEach((player, index) => {
        player.rank = index + 1;
        player.lastUpdated = new Date().toISOString();
      });

      // Update standings in Google Sheets
      await googleSheetsService.updateTournamentResults(tournamentId, updatedStandings);
    } catch (error) {
      console.error('Error updating standings after round:', error);
      throw new Error('Failed to update standings after round');
    }
  }

  /**
   * Get pairing by ID (placeholder - would need to be implemented based on storage)
   */
  private async getPairingById(pairingId: string): Promise<TournamentPairing | null> {
    // This would need to be implemented based on how pairings are stored
    // For now, return null as this is a placeholder
    return null;
  }
}

export const swissPairingService = new SwissPairingService();

// Standalone function for easy importing
export async function generateSwissPairings(
  tournamentId: string,
  roundNumber: number,
  currentResults: TournamentResultData[],
  allPlayersData: any[]
): Promise<SwissPairingResult> {
  return await swissPairingService.generateSwissPairings(tournamentId, roundNumber, currentResults);
}
