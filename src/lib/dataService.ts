import { googleSheetsService } from './googleSheets';
import { enhancedGoogleSheetsService } from './googleSheetsEnhanced';
import { supabaseService } from './supabaseService';
import { enhancedSupabaseService } from './supabaseServiceEnhanced';

/**
 * DataService - Adapter service that switches between Google Sheets and Supabase
 * Uses USE_SUPABASE environment variable as feature flag
 * Supports dual-write mode for safe migration
 */
class DataService {
  private useSupabase: boolean;
  private dualWrite: boolean;

  constructor() {
    // Feature flag: USE_SUPABASE=true to use Supabase, false for Google Sheets
    // Defaults to true in production, false in development
    const useSupabaseEnv = process.env.USE_SUPABASE;
    if (useSupabaseEnv !== undefined) {
      // Explicitly set - use the value (case-insensitive, trim whitespace)
      const normalized = String(useSupabaseEnv).trim().toLowerCase();
      this.useSupabase = normalized === 'true' || normalized === '1';
    } else {
      // Not set - default to true in production, false in development
      this.useSupabase = process.env.NODE_ENV === 'production';
    }
    
    // Dual-write mode: Write to both backends during migration
    // Set DUAL_WRITE=true to enable dual-write mode
    const dualWriteEnv = process.env.DUAL_WRITE;
    this.dualWrite = dualWriteEnv !== undefined 
      ? (String(dualWriteEnv).trim().toLowerCase() === 'true' || String(dualWriteEnv).trim().toLowerCase() === '1')
      : false;

    console.log(`[DataService] Initialized - useSupabase: ${this.useSupabase}, dualWrite: ${this.dualWrite}, NODE_ENV: ${process.env.NODE_ENV}, USE_SUPABASE env: ${useSupabaseEnv}`);
  }

  /**
   * Get the primary service (Supabase or Google Sheets)
   */
  private getPrimaryService() {
    return this.useSupabase ? enhancedSupabaseService : enhancedGoogleSheetsService;
  }

  /**
   * Get the secondary service (for dual-write)
   */
  private getSecondaryService() {
    return this.useSupabase ? enhancedGoogleSheetsService : enhancedSupabaseService;
  }

  /**
   * Execute a read operation with fallback
   */
  private async executeRead<T>(
    operation: (service: any) => Promise<T>,
    operationName: string
  ): Promise<T> {
    try {
      const primaryService = this.useSupabase ? supabaseService : googleSheetsService;
      return await operation(primaryService);
    } catch (error) {
      console.error(`[DataService] Primary read failed for ${operationName}, attempting fallback:`, error);
      
      // Fallback to secondary service if primary fails (independent of dual-write mode)
      const secondaryService = this.useSupabase ? googleSheetsService : supabaseService;
      return await operation(secondaryService);
    }
  }

  /**
   * Execute a write operation with optional dual-write
   */
  private async executeWrite<T>(
    operation: (service: any) => Promise<T>,
    operationName: string
  ): Promise<T> {
    const primaryService = this.getPrimaryService();
    const result = await operation(primaryService);

    // If dual-write is enabled, also write to secondary service
    if (this.dualWrite) {
      const secondaryService = this.getSecondaryService();
      try {
        await operation(secondaryService);
        console.log(`[DataService] Dual-write successful for ${operationName}`);
      } catch (error) {
        // Log but don't fail if secondary write fails
        console.warn(`[DataService] Dual-write failed for ${operationName} (non-critical):`, error);
      }
    }

    return result;
  }

  // ==================== Registration Methods ====================

  async addRegistration(data: any): Promise<void> {
    return this.executeWrite(
      (service) => service.addRegistration(data),
      'addRegistration'
    );
  }

  async addParentRegistration(data: any): Promise<string> {
    return this.executeWrite(
      (service) => service.addParentRegistration(data),
      'addParentRegistration'
    );
  }

  async addStudentRegistration(data: any): Promise<string> {
    return this.executeWrite(
      (service) => service.addStudentRegistration(data),
      'addStudentRegistration'
    );
  }

  async addSelfRegistration(data: any): Promise<string> {
    return this.executeWrite(
      (service) => service.addSelfRegistration(data),
      'addSelfRegistration'
    );
  }

  async getParentRegistration(parentId: string): Promise<any> {
    return this.executeRead(
      (service) => service.getParentRegistration(parentId),
      'getParentRegistration'
    );
  }

  async getRegistrations(): Promise<any[]> {
    return this.executeRead(
      (service) => service.getRegistrations(),
      'getRegistrations'
    );
  }

  // ==================== Event Methods ====================

  async getEvents(): Promise<any[]> {
    return this.executeRead(
      (service) => service.getEvents(),
      'getEvents'
    );
  }

  async addEvent(event: any): Promise<string> {
    return this.executeWrite(
      (service) => service.addEvent(event),
      'addEvent'
    );
  }

  async updateEvent(eventId: string, updates: any): Promise<void> {
    return this.executeWrite(
      (service) => service.updateEvent(eventId, updates),
      'updateEvent'
    );
  }

  async addEventRegistration(data: any): Promise<void> {
    return this.executeWrite(
      (service) => service.addEventRegistration(data),
      'addEventRegistration'
    );
  }

  async incrementEventParticipants(eventId: string): Promise<void> {
    return this.executeWrite(
      (service) => service.incrementEventParticipants(eventId),
      'incrementEventParticipants'
    );
  }

  async getEventRegistrationsByPlayer(playerName: string): Promise<any[]> {
    return this.executeRead(
      (service) => service.getEventRegistrationsByPlayer(playerName),
      'getEventRegistrationsByPlayer'
    );
  }

  // ==================== Player/Ranking Methods ====================

  async getPlayers(): Promise<any[]> {
    return this.executeRead(
      (service) => service.getPlayers(),
      'getPlayers'
    );
  }

  async calculateRankingsFromGames(): Promise<any[]> {
    return this.executeRead(
      (service) => service.calculateRankingsFromGames(),
      'calculateRankingsFromGames'
    );
  }

  async addPlayer(player: any): Promise<string> {
    return this.executeWrite(
      (service) => service.addPlayer(player),
      'addPlayer'
    );
  }

  async updatePlayer(playerId: string, updates: any): Promise<void> {
    return this.executeWrite(
      (service) => service.updatePlayer(playerId, updates),
      'updatePlayer'
    );
  }

  async recalculateRankings(): Promise<void> {
    return this.executeWrite(
      (service) => service.recalculateRankings(),
      'recalculateRankings'
    );
  }

  async batchUpdatePlayerRanks(rankUpdates: any[]): Promise<void> {
    return this.executeWrite(
      (service) => service.batchUpdatePlayerRanks(rankUpdates),
      'batchUpdatePlayerRanks'
    );
  }

  // ==================== Parent Account Methods ====================

  async getParentAccount(email: string): Promise<any> {
    return this.executeRead(
      (service) => service.getParentAccount(email),
      'getParentAccount'
    );
  }

  async getAllParents(): Promise<any[]> {
    return this.executeRead(
      (service) => service.getAllParents(),
      'getAllParents'
    );
  }

  async addParentAccount(account: any): Promise<void> {
    return this.executeWrite(
      (service) => service.addParentAccount(account),
      'addParentAccount'
    );
  }

  async updateParentAccount(parentId: string, updates: any): Promise<void> {
    return this.executeWrite(
      (service) => service.updateParentAccount(parentId, updates),
      'updateParentAccount'
    );
  }

  async updateStudentRegistration(studentId: string, updates: any): Promise<void> {
    return this.executeWrite(
      (service) => service.updateStudentRegistration(studentId, updates),
      'updateStudentRegistration'
    );
  }

  async getStudentsByParentId(parentId: string): Promise<any[]> {
    return this.executeRead(
      (service) => service.getStudentsByParentId(parentId),
      'getStudentsByParentId'
    );
  }

  async getAllStudents(): Promise<any[]> {
    return this.executeRead(
      (service) => service.getAllStudents(),
      'getAllStudents'
    );
  }

  async getStudentsByParentEmail(parentEmail: string): Promise<any[]> {
    return this.executeRead(
      (service) => service.getStudentsByParentEmail(parentEmail),
      'getStudentsByParentEmail'
    );
  }

  async getParentByEmail(email: string): Promise<any> {
    return this.executeRead(
      (service) => service.getParentByEmail(email),
      'getParentByEmail'
    );
  }

  async getParentPlayers(parentAccountId: string): Promise<any[]> {
    return this.executeRead(
      (service) => service.getParentPlayers(parentAccountId),
      'getParentPlayers'
    );
  }

  async autoLinkExistingStudentsToParent(parentAccountId: string, parentEmail: string): Promise<void> {
    return this.executeWrite(
      (service) => service.autoLinkExistingStudentsToParent(parentAccountId, parentEmail),
      'autoLinkExistingStudentsToParent'
    );
  }

  async generatePlayerIdsForExistingRegistrations(): Promise<void> {
    return this.executeWrite(
      (service) => service.generatePlayerIdsForExistingRegistrations(),
      'generatePlayerIdsForExistingRegistrations'
    );
  }

  // ==================== Player Ownership Methods ====================

  async getPlayerOwnership(playerId: string): Promise<any> {
    return this.executeRead(
      (service) => service.getPlayerOwnership(playerId),
      'getPlayerOwnership'
    );
  }

  async addPlayerOwnership(ownership: any): Promise<void> {
    return this.executeWrite(
      (service) => service.addPlayerOwnership(ownership),
      'addPlayerOwnership'
    );
  }

  async updatePlayerOwnership(playerId: string, updates: any): Promise<void> {
    return this.executeWrite(
      (service) => service.updatePlayerOwnership(playerId, updates),
      'updatePlayerOwnership'
    );
  }

  // ==================== Game Methods ====================

  async addGame(gameData: any): Promise<string> {
    return this.executeWrite(
      (service) => service.addGame(gameData),
      'addGame'
    );
  }

  // ==================== ELO Rating Methods ====================

  async getPlayerEloRating(playerId: string): Promise<number> {
    return this.executeRead(
      (service) => service.getPlayerEloRating(playerId),
      'getPlayerEloRating'
    );
  }

  async updatePlayerEloRating(playerId: string, newRating: number): Promise<void> {
    return this.executeWrite(
      (service) => service.updatePlayerEloRating(playerId, newRating),
      'updatePlayerEloRating'
    );
  }

  async initializeAllPlayerEloRatings(): Promise<void> {
    return this.executeWrite(
      (service) => service.initializeAllPlayerEloRatings(),
      'initializeAllPlayerEloRatings'
    );
  }

  async getGames(filters?: any): Promise<any[]> {
    return this.executeRead(
      (service) => service.getGames(filters),
      'getGames'
    );
  }

  async getPlayerGames(playerId: string): Promise<any[]> {
    return this.executeRead(
      (service) => service.getPlayerGames(playerId),
      'getPlayerGames'
    );
  }

  async updateGame(gameId: string, updates: any): Promise<void> {
    return this.executeWrite(
      (service) => service.updateGame(gameId, updates),
      'updateGame'
    );
  }

  async deleteGame(gameId: string): Promise<void> {
    return this.executeWrite(
      (service) => service.deleteGame(gameId),
      'deleteGame'
    );
  }

  async deleteGamesByDate(gameDate: string): Promise<void> {
    return this.executeWrite(
      (service) => service.deleteGamesByDate(gameDate),
      'deleteGamesByDate'
    );
  }

  async getGameStats(): Promise<any> {
    return this.executeRead(
      (service) => service.getGameStats(),
      'getGameStats'
    );
  }

  async getPlayerGameStats(playerId: string): Promise<any> {
    return this.executeRead(
      (service) => service.getPlayerGameStats(playerId),
      'getPlayerGameStats'
    );
  }

  async getAllDataBatch(): Promise<any> {
    return this.executeRead(
      (service) => service.getAllDataBatch(),
      'getAllDataBatch'
    );
  }

  async getMembersFromParentsAndStudents(): Promise<any[]> {
    return this.executeRead(
      (service) => service.getMembersFromParentsAndStudents(),
      'getMembersFromParentsAndStudents'
    );
  }

  // ==================== Tournament Methods ====================

  async initializeTournamentSheets(): Promise<void> {
    return this.executeWrite(
      (service) => service.initializeTournamentSheets(),
      'initializeTournamentSheets'
    );
  }

  async addTournament(tournament: any, createdBy: string): Promise<string> {
    return this.executeWrite(
      (service) => service.addTournament(tournament, createdBy),
      'addTournament'
    );
  }

  async initializeTournamentResults(tournamentId: string, playerIds: string[]): Promise<void> {
    return this.executeWrite(
      (service) => service.initializeTournamentResults(tournamentId, playerIds),
      'initializeTournamentResults'
    );
  }

  async getTournaments(status?: string): Promise<any[]> {
    return this.executeRead(
      (service) => service.getTournaments(status),
      'getTournaments'
    );
  }

  async getTournamentById(tournamentId: string): Promise<any> {
    return this.executeRead(
      (service) => service.getTournamentById(tournamentId),
      'getTournamentById'
    );
  }

  async updateTournament(tournamentId: string, updates: any): Promise<void> {
    return this.executeWrite(
      (service) => service.updateTournament(tournamentId, updates),
      'updateTournament'
    );
  }

  async deleteTournament(tournamentId: string): Promise<void> {
    return this.executeWrite(
      (service) => service.deleteTournament(tournamentId),
      'deleteTournament'
    );
  }

  async deleteTournamentResults(tournamentId: string): Promise<void> {
    return this.executeWrite(
      (service) => service.deleteTournamentResults(tournamentId),
      'deleteTournamentResults'
    );
  }

  async getTournamentResults(tournamentId: string, includeWithdrawn: boolean = false): Promise<any[]> {
    return this.executeRead(
      (service) => service.getTournamentResults(tournamentId, includeWithdrawn),
      'getTournamentResults'
    );
  }

  async updateTournamentResults(tournamentId: string, results: any[]): Promise<void> {
    return this.executeWrite(
      (service) => service.updateTournamentResults(tournamentId, results),
      'updateTournamentResults'
    );
  }

  async addPlayersToTournament(tournamentId: string, playerIds: string[], byeRounds: number[] = []): Promise<void> {
    return this.executeWrite(
      (service) => service.addPlayersToTournament(tournamentId, playerIds, byeRounds),
      'addPlayersToTournament'
    );
  }

  async removePlayersFromTournament(tournamentId: string, playerIds: string[], removeCompletely: boolean = false): Promise<void> {
    return this.executeWrite(
      (service) => service.removePlayersFromTournament(tournamentId, playerIds, removeCompletely),
      'removePlayersFromTournament'
    );
  }

  async cleanupInvalidByeRounds(tournamentId: string, currentRound: number): Promise<void> {
    return this.executeWrite(
      (service) => service.cleanupInvalidByeRounds(tournamentId, currentRound),
      'cleanupInvalidByeRounds'
    );
  }

  async ensureTournamentResultsColumns(): Promise<void> {
    return this.executeWrite(
      (service) => service.ensureTournamentResultsColumns(),
      'ensureTournamentResultsColumns'
    );
  }

  async setupParentsAdminColumn(): Promise<any> {
    return this.executeWrite(
      (service) => service.setupParentsAdminColumn(),
      'setupParentsAdminColumn'
    );
  }

  async initializeGamesSheet(): Promise<void> {
    return this.executeWrite(
      (service) => service.initializeGamesSheet(),
      'initializeGamesSheet'
    );
  }

  // ==================== Club Meet Attendance Methods ====================

  async createClubMeet(meetData: any): Promise<string> {
    return this.executeWrite(
      (service) => service.createClubMeet(meetData),
      'createClubMeet'
    );
  }

  async getClubMeets(): Promise<any[]> {
    return this.executeRead(
      (service) => service.getClubMeets(),
      'getClubMeets'
    );
  }

  async getClubMeetById(meetId: string): Promise<any> {
    return this.executeRead(
      (service) => service.getClubMeetById(meetId),
      'getClubMeetById'
    );
  }

  async deleteClubMeet(meetId: string): Promise<void> {
    return this.executeWrite(
      (service) => service.deleteClubMeet(meetId),
      'deleteClubMeet'
    );
  }

  async addAttendance(meetId: string, playerIds: string[]): Promise<void> {
    return this.executeWrite(
      (service) => service.addAttendance(meetId, playerIds),
      'addAttendance'
    );
  }

  async removeAttendance(meetId: string, playerId: string): Promise<void> {
    return this.executeWrite(
      (service) => service.removeAttendance(meetId, playerId),
      'removeAttendance'
    );
  }

  async getAttendanceByMeet(meetId: string): Promise<any[]> {
    return this.executeRead(
      (service) => service.getAttendanceByMeet(meetId),
      'getAttendanceByMeet'
    );
  }

  async getPlayersByMeet(meetId: string): Promise<any[]> {
    return this.executeRead(
      (service) => service.getPlayersByMeet(meetId),
      'getPlayersByMeet'
    );
  }
}

// Export singleton instance
export const dataService = new DataService();

