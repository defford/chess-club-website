import { getSupabaseClient } from './supabaseClient';
import { EloService } from './eloService';
import type {
  RegistrationData,
  EventData,
  EventRegistrationData,
  PlayerData,
  ParentAccount,
  PlayerOwnership,
  PlayerOwnershipData,
  ParentRegistrationData,
  StudentRegistrationData,
  SelfRegistrationData,
  ParentData,
  StudentData,
  TournamentData,
  TournamentResultData,
  TournamentFormData,
  GameData,
  GameFilters,
  ClubMeetData,
  AttendanceData,
  MeetWithAttendance,
} from './types';

/**
 * SupabaseService - Replaces GoogleSheetsService with Supabase backend
 * Implements the same interface as GoogleSheetsService for seamless migration
 */
export class SupabaseService {
  private supabase = getSupabaseClient(true); // Use admin client for server-side operations
  private readonly PERFORMANCE_THRESHOLD_MS = 3000; // 3 seconds

  /**
   * Wraps a Supabase query with performance logging
   * Logs when queries exceed the performance threshold
   */
  private async logPerformance<T>(
    operation: () => Promise<T>,
    context: {
      methodName: string;
      table?: string;
      operation?: string;
      additionalInfo?: string;
    }
  ): Promise<T> {
    const startTime = Date.now();
    const methodName = context.methodName;
    const table = context.table || 'unknown';
    const operationType = context.operation || 'query';
    const additionalInfo = context.additionalInfo || '';

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      if (duration >= this.PERFORMANCE_THRESHOLD_MS) {
        console.warn(
          `[PERFORMANCE WARNING] Supabase query exceeded ${this.PERFORMANCE_THRESHOLD_MS}ms threshold`,
          {
            method: methodName,
            table,
            operation: operationType,
            duration: `${duration}ms`,
            additionalInfo: additionalInfo || undefined,
            timestamp: new Date().toISOString(),
          }
        );
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log performance even on errors if it exceeded threshold
      if (duration >= this.PERFORMANCE_THRESHOLD_MS) {
        console.warn(
          `[PERFORMANCE WARNING] Supabase query exceeded ${this.PERFORMANCE_THRESHOLD_MS}ms threshold before error`,
          {
            method: methodName,
            table,
            operation: operationType,
            duration: `${duration}ms`,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          }
        );
      }
      
      throw error;
    }
  }

  // ==================== Registration Methods ====================

  async addRegistration(data: RegistrationData): Promise<void> {
    // Legacy method - deprecated but kept for compatibility
    const timestamp = new Date().toISOString();
    
    await this.logPerformance(
      async () => {
        const { error } = await this.supabase.from('registrations').insert({
      timestamp,
      parent_name: data.parentName,
      parent_email: data.parentEmail,
      parent_phone: data.parentPhone,
      player_name: data.playerName,
      player_age: data.playerAge,
      player_grade: data.playerGrade,
      emergency_contact: data.emergencyContact,
      emergency_phone: data.emergencyPhone,
      medical_info: data.medicalInfo,
      hear_about_us: data.hearAboutUs,
      provincial_interest: data.provincialInterest,
      volunteer_interest: data.volunteerInterest,
      consent: data.consent ? 'Yes' : 'No',
      photo_consent: data.photoConsent ? 'Yes' : 'No',
      values_acknowledgment: data.valuesAcknowledgment ? 'Yes' : 'No',
      newsletter: data.newsletter ? 'Yes' : 'No',
        });

        if (error) {
          console.error('Error writing registration to Supabase:', error);
          throw new Error('Failed to save registration to Supabase');
        }
      },
      {
        methodName: 'addRegistration',
        table: 'registrations',
        operation: 'insert',
      }
    );
  }

  async addParentRegistration(data: ParentRegistrationData): Promise<string> {
    const parentId = `parent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    await this.logPerformance(
      async () => {
        const { error } = await this.supabase.from('parents').insert({
      id: parentId,
      name: data.parentName,
      email: data.parentEmail,
      phone: data.parentPhone,
      hear_about_us: data.hearAboutUs,
      provincial_interest: data.provincialInterest,
      volunteer_interest: data.volunteerInterest,
      consent: data.consent,
      photo_consent: data.photoConsent,
      values_acknowledgment: data.valuesAcknowledgment,
      newsletter: data.newsletter,
      create_account: data.createAccount || false,
      timestamp,
      registration_type: data.registrationType || 'parent',
        });

        if (error) {
          console.error('Error writing parent registration to Supabase:', error);
          throw new Error('Failed to save parent registration to Supabase');
        }
      },
      {
        methodName: 'addParentRegistration',
        table: 'parents',
        operation: 'insert',
      }
    );

    return parentId;
  }

  async addStudentRegistration(data: StudentRegistrationData): Promise<string> {
    const studentId = `student_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    await this.logPerformance(
      async () => {
        const { error } = await this.supabase.from('students').insert({
      id: studentId,
      parent_id: data.parentId,
      name: data.playerName,
      age: data.playerAge,
      grade: data.playerGrade,
      emergency_contact: data.emergencyContact,
      emergency_phone: data.emergencyPhone,
      medical_info: data.medicalInfo,
      timestamp,
        });

        if (error) {
          console.error('Error writing student registration to Supabase:', error);
          throw new Error('Failed to save student registration to Supabase');
        }
      },
      {
        methodName: 'addStudentRegistration',
        table: 'students',
        operation: 'insert',
      }
    );

    return studentId;
  }

  async addSelfRegistration(data: SelfRegistrationData): Promise<string> {
    // Self-registration creates both a parent and student record
    const parentId = await this.addParentRegistration({
      parentName: data.playerName,
      parentEmail: data.playerEmail,
      parentPhone: data.playerPhone,
      hearAboutUs: data.hearAboutUs,
      provincialInterest: data.provincialInterest,
      volunteerInterest: data.volunteerInterest,
      consent: data.consent,
      photoConsent: data.photoConsent,
      valuesAcknowledgment: data.valuesAcknowledgment,
      newsletter: data.newsletter,
      createAccount: data.createAccount || false,
      registrationType: 'self',
    });

    const studentId = await this.addStudentRegistration({
      parentId,
      playerName: data.playerName,
      playerAge: data.playerAge,
      playerGrade: data.playerGrade,
      emergencyContact: data.emergencyContact,
      emergencyPhone: data.emergencyPhone,
      medicalInfo: data.medicalInfo,
    });

    return studentId;
  }

  async getParentRegistration(parentId: string): Promise<ParentRegistrationData | null> {
    return this.logPerformance(
      async () => {
        const { data, error } = await this.supabase
          .from('parents')
          .select('*')
          .eq('id', parentId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            return null; // Not found
          }
          console.error('Error reading parent registration from Supabase:', error);
          throw new Error('Failed to retrieve parent registration from Supabase');
        }

        if (!data) return null;

        return {
          parentName: data.name,
          parentEmail: data.email,
          parentPhone: data.phone || '',
          hearAboutUs: data.hear_about_us || '',
          provincialInterest: data.provincial_interest || '',
          volunteerInterest: data.volunteer_interest || '',
          consent: data.consent || false,
          photoConsent: data.photo_consent || false,
          valuesAcknowledgment: data.values_acknowledgment || false,
          newsletter: data.newsletter || false,
          createAccount: data.create_account || false,
          registrationType: data.registration_type as 'parent' | 'self' | undefined,
        };
      },
      {
        methodName: 'getParentRegistration',
        table: 'parents',
        operation: 'select',
        additionalInfo: `parentId: ${parentId}`,
      }
    );
  }

  async getRegistrations(): Promise<RegistrationData[]> {
    return this.logPerformance(
      async () => {
        const { data, error } = await this.supabase
          .from('registrations')
          .select('*')
          .order('timestamp', { ascending: false });

        if (error) {
          console.error('Error reading registrations from Supabase:', error);
          throw new Error('Failed to retrieve registrations from Supabase');
        }

        return (data || []).map((row) => ({
          parentName: row.parent_name || '',
          parentEmail: row.parent_email || '',
          parentPhone: row.parent_phone || '',
          playerName: row.player_name || '',
          playerAge: row.player_age || '',
          playerGrade: row.player_grade || '',
          emergencyContact: row.emergency_contact || '',
          emergencyPhone: row.emergency_phone || '',
          medicalInfo: row.medical_info || '',
          hearAboutUs: row.hear_about_us || '',
          provincialInterest: row.provincial_interest || '',
          volunteerInterest: row.volunteer_interest || '',
          consent: row.consent === 'Yes',
          photoConsent: row.photo_consent === 'Yes',
          valuesAcknowledgment: row.values_acknowledgment === 'Yes',
          newsletter: row.newsletter === 'Yes',
          timestamp: row.timestamp,
        }));
      },
      {
        methodName: 'getRegistrations',
        table: 'registrations',
        operation: 'select',
      }
    );
  }

  // ==================== Event Methods ====================

  async getEvents(): Promise<EventData[]> {
    return this.logPerformance(
      async () => {
        const { data, error } = await this.supabase
          .from('events')
          .select('*')
          .order('date', { ascending: true });

        if (error) {
          console.error('Error reading events from Supabase:', error);
          throw new Error('Failed to retrieve events from Supabase');
        }

        return (data || []).map((row) => ({
          id: row.id,
          name: row.name,
          date: row.date,
          time: row.time || '',
          location: row.location || '',
          participants: row.participants || 0,
          maxParticipants: row.max_participants || 0,
          description: row.description || '',
          category: row.category as 'tournament' | 'workshop' | 'training' | 'social',
          ageGroups: row.age_groups || '',
          status: row.status as 'active' | 'cancelled' | 'completed' | undefined,
          lastUpdated: row.last_updated 
            ? (typeof row.last_updated === 'string' ? row.last_updated : row.last_updated.toISOString())
            : (row.updated_at 
              ? (typeof row.updated_at === 'string' ? row.updated_at : row.updated_at.toISOString())
              : undefined),
        }));
      },
      {
        methodName: 'getEvents',
        table: 'events',
        operation: 'select',
      }
    );
  }

  async addEvent(event: Omit<EventData, 'id' | 'lastUpdated'>): Promise<string> {
    const eventId = `evt_${Date.now()}`;

    const { error } = await this.supabase.from('events').insert({
      id: eventId,
      name: event.name,
      date: event.date,
      time: event.time,
      location: event.location,
      participants: event.participants || 0,
      max_participants: event.maxParticipants || 0,
      description: event.description,
      category: event.category,
      age_groups: event.ageGroups,
      status: event.status || 'active',
    });

    if (error) {
      console.error('Error adding event to Supabase:', error);
      throw new Error('Failed to add event to Supabase');
    }

    return eventId;
  }

  async updateEvent(eventId: string, updates: Partial<EventData>): Promise<void> {
    const updateData: any = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.time !== undefined) updateData.time = updates.time;
    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.participants !== undefined) updateData.participants = updates.participants;
    if (updates.maxParticipants !== undefined) updateData.max_participants = updates.maxParticipants;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.ageGroups !== undefined) updateData.age_groups = updates.ageGroups;
    if (updates.status !== undefined) updateData.status = updates.status;
    
    updateData.last_updated = new Date().toISOString();

    const { error } = await this.supabase
      .from('events')
      .update(updateData)
      .eq('id', eventId);

    if (error) {
      console.error('Error updating event in Supabase:', error);
      throw new Error('Failed to update event in Supabase');
    }
  }

  async addEventRegistration(data: EventRegistrationData): Promise<void> {
    const { error } = await this.supabase.from('event_registrations').insert({
      event_id: data.eventId,
      player_name: data.playerName,
      player_grade: data.playerGrade,
      additional_notes: data.additionalNotes,
      timestamp: data.timestamp || new Date().toISOString(),
    });

    if (error) {
      console.error('Error writing event registration to Supabase:', error);
      throw new Error('Failed to save event registration to Supabase');
    }

    // Increment participants count
    await this.incrementEventParticipants(data.eventId);
  }

  async incrementEventParticipants(eventId: string): Promise<void> {
    // Get current participants count
    const { data: event } = await this.supabase
      .from('events')
      .select('participants')
      .eq('id', eventId)
      .single();

    if (event) {
      await this.supabase
        .from('events')
        .update({ participants: (event.participants || 0) + 1 })
        .eq('id', eventId);
    }
  }

  async getEventRegistrationsByPlayer(playerName: string): Promise<Array<{
    eventId: string;
    playerName: string;
    playerGrade: string;
    additionalNotes: string;
    eventDetails?: EventData;
  }>> {
    const { data, error } = await this.supabase
      .from('event_registrations')
      .select('*, events(*)')
      .eq('player_name', playerName);

    if (error) {
      console.error('Error reading event registrations from Supabase:', error);
      throw new Error('Failed to retrieve event registrations from Supabase');
    }

    return (data || []).map((row) => ({
      eventId: row.event_id,
      playerName: row.player_name,
      playerGrade: row.player_grade || '',
      additionalNotes: row.additional_notes || '',
      eventDetails: row.events ? {
        id: row.events.id,
        name: row.events.name,
        date: row.events.date,
        time: row.events.time || '',
        location: row.events.location || '',
        participants: row.events.participants || 0,
        maxParticipants: row.events.max_participants || 0,
        description: row.events.description || '',
        category: row.events.category,
        ageGroups: row.events.age_groups || '',
        status: row.events.status,
        lastUpdated: row.events.last_updated 
          ? (typeof row.events.last_updated === 'string' ? row.events.last_updated : row.events.last_updated.toISOString())
          : (row.events.updated_at 
            ? (typeof row.events.updated_at === 'string' ? row.events.updated_at : row.events.updated_at.toISOString())
            : undefined),
      } : undefined,
    }));
  }

  // ==================== Player/Ranking Methods ====================

  async getPlayers(): Promise<PlayerData[]> {
    // Rankings are calculated dynamically from games
    return await this.calculateRankingsFromGames();
  }

  async calculateRankingsFromGames(): Promise<PlayerData[]> {
    try {
      // Get all games and members data in parallel
      const [gamesResult, membersResult] = await Promise.all([
        this.logPerformance(
          async () => this.supabase.from('games').select('*').eq('game_type', 'ladder').eq('is_verified', true),
          {
            methodName: 'calculateRankingsFromGames',
            table: 'games',
            operation: 'select',
            additionalInfo: 'filter: game_type=ladder, is_verified=true',
          }
        ),
        this.getMembersFromParentsAndStudents(),
      ]);

      if (gamesResult.error) {
        throw gamesResult.error;
      }

      const games = gamesResult.data || [];
      const registrations = membersResult;

      // Map members to player stats
      const members = registrations.map((registration, index) => ({
        ...registration,
        id: registration.studentId || `member_${index + 1}`,
      }));

      // Initialize player stats
      const playerStats = new Map<string, {
        id: string;
        name: string;
        grade: string;
        gamesPlayed: number;
        wins: number;
        draws: number;
        losses: number;
        points: number;
        rank?: number;
        lastActive: string;
        email: string;
        isSystemPlayer?: boolean;
        eloRating?: number;
      }>();

      // Initialize all registered players
      members.forEach((member) => {
        playerStats.set(member.id, {
          id: member.id,
          name: member.playerName,
          grade: member.playerGrade,
          gamesPlayed: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          points: 0,
          lastActive: member.timestamp || new Date().toISOString(),
          email: member.parentEmail || '',
          isSystemPlayer: false,
          eloRating: 1000, // Default, will be updated from database
        });
      });

      // Process each game to calculate stats
      games.forEach((game) => {
        // Get or create player1 stats
        let player1Stats = playerStats.get(game.player1_id);
        if (!player1Stats) {
          player1Stats = {
            id: game.player1_id,
            name: game.player1_name,
            grade: 'Unknown',
            gamesPlayed: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            points: 0,
            lastActive: game.game_date,
            email: '',
            isSystemPlayer: game.player1_name === 'Unknown Opponent' || game.player1_id === 'unknown_opponent',
            eloRating: 1000, // Default, will be updated from database
          };
          playerStats.set(game.player1_id, player1Stats);
        }

        // Get or create player2 stats
        let player2Stats = playerStats.get(game.player2_id);
        if (!player2Stats) {
          player2Stats = {
            id: game.player2_id,
            name: game.player2_name,
            grade: 'Unknown',
            gamesPlayed: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            points: 0,
            lastActive: game.game_date,
            email: '',
            isSystemPlayer: game.player2_name === 'Unknown Opponent' || game.player2_id === 'unknown_opponent',
            eloRating: 1000, // Default, will be updated from database
          };
          playerStats.set(game.player2_id, player2Stats);
        }

        // Both players played a game
        player1Stats.gamesPlayed += 1;
        player2Stats.gamesPlayed += 1;

        // Update last active
        const gameDate = new Date(game.game_date);
        const player1LastActive = new Date(player1Stats.lastActive);
        const player2LastActive = new Date(player2Stats.lastActive);

        if (gameDate > player1LastActive) {
          player1Stats.lastActive = game.game_date;
        }
        if (gameDate > player2LastActive) {
          player2Stats.lastActive = game.game_date;
        }

        // Calculate points and stats based on result
        if (game.result === 'player1') {
          player1Stats.points += 2;
          player2Stats.points += 1;
          player1Stats.wins += 1;
          player2Stats.losses += 1;
        } else if (game.result === 'player2') {
          player2Stats.points += 2;
          player1Stats.points += 1;
          player2Stats.wins += 1;
          player1Stats.losses += 1;
        } else if (game.result === 'draw') {
          player1Stats.points += 1.5;
          player2Stats.points += 1.5;
          player1Stats.draws += 1;
          player2Stats.draws += 1;
        }
      });

      // Convert to array and sort by points (descending), then wins (descending)
      const players = Array.from(playerStats.values()).sort((a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points;
        }
        return b.wins - a.wins;
      });

      // Assign ranks
      players.forEach((player, index) => {
        player.rank = index + 1;
      });

      // Fetch ELO ratings for all players from students table
      // Collect ALL unique player IDs from both members and games
      const allPlayerIds = new Set<string>();
      players.forEach(p => {
        if (p.id) allPlayerIds.add(p.id);
      });
      // Also collect player IDs directly from games (in case they differ from member IDs)
      games.forEach(game => {
        if (game.player1_id) allPlayerIds.add(game.player1_id);
        if (game.player2_id) allPlayerIds.add(game.player2_id);
      });
      
      const playerIds = Array.from(allPlayerIds);
      console.log(`[calculateRankingsFromGames] Fetching ELO ratings for ${playerIds.length} unique player IDs (${players.length} players)`);
      console.log(`[calculateRankingsFromGames] Sample player IDs:`, playerIds.slice(0, 5));
      
      if (playerIds.length > 0) {
        // Split into chunks of 100 to avoid query size limits
        const chunkSize = 100;
        const eloMap = new Map<string, number>();
        
        for (let i = 0; i < playerIds.length; i += chunkSize) {
          const chunk = playerIds.slice(i, i + chunkSize);
          const { data: studentsData, error: eloError } = await this.supabase
            .from('students')
            .select('id, elo_rating')
            .in('id', chunk);

          if (eloError) {
            console.error(`[calculateRankingsFromGames] Error fetching ELO ratings for chunk ${i}-${i + chunk.length}:`, eloError);
          } else if (studentsData) {
            studentsData.forEach(student => {
              if (student.elo_rating !== null && student.elo_rating !== undefined) {
                eloMap.set(student.id, student.elo_rating);
              }
            });
          }
        }

        console.log(`[calculateRankingsFromGames] Retrieved ELO ratings for ${eloMap.size} students from database`);

        // Update players with ELO ratings
        let foundCount = 0;
        players.forEach(player => {
          if (player.id && eloMap.has(player.id)) {
            player.eloRating = eloMap.get(player.id)!;
            foundCount++;
          } else {
            player.eloRating = 1000; // Default rating
          }
        });
        console.log(`[calculateRankingsFromGames] Matched ELO ratings for ${foundCount} out of ${players.length} players`);
        
        if (foundCount === 0) {
          console.error(`[calculateRankingsFromGames] WARNING: No ELO ratings matched! Player IDs in games:`, 
            Array.from(new Set(games.flatMap(g => [g.player1_id, g.player2_id]).filter(Boolean))).slice(0, 10));
        }
      } else {
        // No valid player IDs, set default ELO
        console.warn('[calculateRankingsFromGames] No valid player IDs found for ELO lookup');
        players.forEach(player => {
          player.eloRating = 1000;
        });
      }

      return players;
    } catch (error) {
      console.error('Error calculating rankings from games:', error);
      throw new Error('Failed to calculate rankings from games');
    }
  }

  async addPlayer(player: Omit<PlayerData, 'id' | 'rank'>): Promise<string> {
    // Players are now derived from games, but we keep this for compatibility
    // In Supabase, players come from students/parents registration
    throw new Error('addPlayer is deprecated - players are created through registration');
  }

  async updatePlayer(playerId: string, updates: Partial<PlayerData>): Promise<void> {
    // Players are now derived from games, but we keep this for compatibility
    // In Supabase, update the underlying student record instead
    throw new Error('updatePlayer is deprecated - update student record instead');
  }

  async recalculateRankings(): Promise<void> {
    // Rankings are calculated dynamically - this is a no-op
    console.log('recalculateRankings() called - rankings are now calculated dynamically from games');
  }

  async batchUpdatePlayerRanks(rankUpdates: Array<{ id: string; rank: number }>): Promise<void> {
    // Rankings are calculated dynamically - this is a no-op
    console.log('batchUpdatePlayerRanks() called - rankings are now calculated dynamically from games');
  }

  // ==================== Parent Account Methods ====================

  async getParentAccount(email: string): Promise<ParentAccount | null> {
    // Normalize email for consistent lookup
    const normalizedEmail = email.toLowerCase().trim();
    console.log(`[SupabaseService.getParentAccount] Looking up email: "${email}" (normalized: "${normalizedEmail}")`);

    // Try to get all matching accounts (handles duplicates)
    // Prefer admin accounts, then most recent
    let { data: accounts, error } = await this.supabase
      .from('parents')
      .select('*')
      .eq('email', normalizedEmail)
      .order('is_admin', { ascending: false }) // Admin accounts first
      .order('created_at', { ascending: false }); // Most recent first

    // If no exact match, try case-insensitive search
    if ((!accounts || accounts.length === 0) && (error?.code === 'PGRST116' || !error)) {
      console.log(`[SupabaseService.getParentAccount] Exact match not found, trying case-insensitive search`);
      const { data: caseInsensitiveAccounts, error: caseInsensitiveError } = await this.supabase
        .from('parents')
        .select('*')
        .filter('email', 'ilike', normalizedEmail)
        .order('is_admin', { ascending: false }) // Admin accounts first
        .order('created_at', { ascending: false }); // Most recent first
      
      if (caseInsensitiveAccounts && caseInsensitiveAccounts.length > 0) {
        accounts = caseInsensitiveAccounts;
        error = null;
        console.log(`[SupabaseService.getParentAccount] Found ${accounts.length} account(s) with case-insensitive search`);
      } else {
        error = caseInsensitiveError;
      }
    }

    if (error && error.code !== 'PGRST116') {
      console.error('[SupabaseService.getParentAccount] Error reading parent account from Supabase:', error);
      throw new Error('Failed to retrieve parent account from Supabase');
    }

    if (!accounts || accounts.length === 0) {
      console.log(`[SupabaseService.getParentAccount] No account found for email: "${email}"`);
      return null;
    }

    // If multiple accounts found, prefer admin account, then most recent
    if (accounts.length > 1) {
      console.warn(`[SupabaseService.getParentAccount] Found ${accounts.length} duplicate accounts for email: "${email}"`);
      console.warn(`   Using account: ${accounts[0].id} (is_admin: ${accounts[0].is_admin})`);
      // Log all duplicates for debugging
      accounts.forEach((acc, idx) => {
        console.warn(`   Duplicate ${idx + 1}: ${acc.id} (is_admin: ${acc.is_admin}, created: ${acc.created_at})`);
      });
    }

    const data = accounts[0]; // Use first account (admin preferred due to ordering)
    console.log(`[SupabaseService.getParentAccount] Found account: id=${data.id}, email=${data.email}, is_admin=${data.is_admin}`);

    return {
      id: data.id,
      email: data.email,
      createdDate: data.created_at || data.timestamp,
      lastLogin: data.updated_at || data.created_at || data.timestamp,
      isActive: true, // Assume active if exists
      isSelfRegistered: data.registration_type === 'self',
      registrationType: data.registration_type as 'parent' | 'self' | undefined,
      isAdmin: data.is_admin || false,
    };
  }

  async addParentAccount(account: ParentAccount): Promise<void> {
    // Check if parent already exists
    const existing = await this.getParentAccount(account.email);
    if (existing) {
      throw new Error('Parent account already exists');
    }

    const { error } = await this.supabase.from('parents').insert({
      id: account.id,
      email: account.email,
      created_at: account.createdDate,
      updated_at: account.lastLogin,
      is_admin: account.isAdmin || false,
      registration_type: account.registrationType || 'parent',
    });

    if (error) {
      console.error('Error adding parent account to Supabase:', error);
      throw new Error('Failed to add parent account to Supabase');
    }
  }

  async updateParentAccount(parentId: string, updates: Partial<ParentAccount>): Promise<void> {
    const updateData: any = {};

    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.lastLogin !== undefined) updateData.updated_at = updates.lastLogin;
    if (updates.isActive !== undefined) {
      // In Supabase, we don't have isActive field, but we can track via updated_at
      // For now, we'll just update the timestamp
    }
    if (updates.isAdmin !== undefined) updateData.is_admin = updates.isAdmin;
    if (updates.registrationType !== undefined) updateData.registration_type = updates.registrationType;

    const { error } = await this.supabase
      .from('parents')
      .update(updateData)
      .eq('id', parentId);

    if (error) {
      console.error('Error updating parent account in Supabase:', error);
      throw new Error('Failed to update parent account in Supabase');
    }
  }

  async updateStudentRegistration(studentId: string, updates: Partial<StudentRegistrationData>): Promise<void> {
    const updateData: any = {};

    if (updates.parentId !== undefined) updateData.parent_id = updates.parentId;
    if (updates.playerName !== undefined) updateData.name = updates.playerName;
    if (updates.playerAge !== undefined) updateData.age = updates.playerAge;
    if (updates.playerGrade !== undefined) updateData.grade = updates.playerGrade;
    if (updates.emergencyContact !== undefined) updateData.emergency_contact = updates.emergencyContact;
    if (updates.emergencyPhone !== undefined) updateData.emergency_phone = updates.emergencyPhone;
    if (updates.medicalInfo !== undefined) updateData.medical_info = updates.medicalInfo;

    // Always update the updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    const { error } = await this.supabase
      .from('students')
      .update(updateData)
      .eq('id', studentId);

    if (error) {
      console.error('Error updating student registration in Supabase:', error);
      throw new Error('Failed to update student registration in Supabase');
    }
  }

  async getAllParents(): Promise<ParentAccount[]> {
    const { data, error } = await this.supabase
      .from('parents')
      .select('*')
      .order('email', { ascending: true });

    if (error) {
      console.error('Error fetching all parents from Supabase:', error);
      throw new Error('Failed to fetch all parents from Supabase');
    }

    if (!data) return [];

    return data.map((row) => ({
      id: row.id,
      email: row.email,
      createdDate: row.created_at || row.timestamp,
      lastLogin: row.updated_at || row.created_at || row.timestamp,
      isActive: true,
      isSelfRegistered: row.registration_type === 'self',
      registrationType: row.registration_type as 'parent' | 'self' | undefined,
      isAdmin: row.is_admin || false,
    }));
  }

  async getStudentsByParentId(parentId: string): Promise<StudentData[]> {
    const { data, error } = await this.supabase
      .from('students')
      .select('*')
      .eq('parent_id', parentId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error getting students by parent ID from Supabase:', error);
      throw new Error('Failed to get students by parent ID from Supabase');
    }

    return (data || []).map((row) => ({
      id: row.id,
      parentId: row.parent_id,
      name: row.name,
      age: row.age || '',
      grade: row.grade || '',
      emergencyContact: row.emergency_contact || '',
      emergencyPhone: row.emergency_phone || '',
      medicalInfo: row.medical_info || '',
      timestamp: row.timestamp || row.created_at,
    }));
  }

  async getAllStudents(): Promise<StudentData[]> {
    const { data, error } = await this.supabase
      .from('students')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error getting all students from Supabase:', error);
      throw new Error('Failed to get all students from Supabase');
    }

    return (data || []).map((row) => ({
      id: row.id,
      parentId: row.parent_id,
      name: row.name,
      age: row.age || '',
      grade: row.grade || '',
      emergencyContact: row.emergency_contact || '',
      emergencyPhone: row.emergency_phone || '',
      medicalInfo: row.medical_info || '',
      timestamp: row.timestamp || row.created_at,
    }));
  }

  async getStudentsByParentEmail(parentEmail: string): Promise<StudentData[]> {
    // First get parent by email
    const parent = await this.getParentByEmail(parentEmail);
    if (!parent) {
      return [];
    }

    return await this.getStudentsByParentId(parent.id);
  }

  async getParentByEmail(email: string): Promise<ParentData | null> {
    const { data, error } = await this.supabase
      .from('parents')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error getting parent by email from Supabase:', error);
      throw new Error('Failed to get parent by email from Supabase');
    }

    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone || '',
      hearAboutUs: data.hear_about_us || '',
      provincialInterest: data.provincial_interest || '',
      volunteerInterest: data.volunteer_interest || '',
      consent: data.consent || false,
      photoConsent: data.photo_consent || false,
      valuesAcknowledgment: data.values_acknowledgment || false,
      newsletter: data.newsletter || false,
      createAccount: data.create_account || false,
      timestamp: data.timestamp || data.created_at,
      registrationType: data.registration_type as 'parent' | 'self' | undefined,
    };
  }

  async getMembersFromParentsAndStudents(): Promise<RegistrationData[]> {
    // Combine parents and students into member records
    // Fetch students separately (without join) to ensure we get ALL students,
    // even if parent relationships are missing or broken
    const [parentsResult, studentsResult] = await Promise.all([
      this.logPerformance(
        async () => this.supabase.from('parents').select('*'),
        {
          methodName: 'getMembersFromParentsAndStudents',
          table: 'parents',
          operation: 'select',
        }
      ),
      this.logPerformance(
        async () => this.supabase.from('students').select('*'),
        {
          methodName: 'getMembersFromParentsAndStudents',
          table: 'students',
          operation: 'select',
          additionalInfo: 'all students without join',
        }
      ),
    ]);

    if (parentsResult.error || studentsResult.error) {
      console.error('Error getting members from Supabase:', parentsResult.error || studentsResult.error);
      throw new Error('Failed to get members from Supabase');
    }

    const parents = parentsResult.data || [];
    const students = studentsResult.data || [];

    // Create a parent lookup map for efficient lookups
    const parentMap = new Map(parents.map(p => [p.id, p]));

    // Map students to RegistrationData format, manually joining with parents
    return students.map((student) => {
      const parent = student.parent_id ? parentMap.get(student.parent_id) : null;
      return {
        parentName: parent?.name || '',
        parentEmail: parent?.email || '',
        parentPhone: parent?.phone || '',
        playerName: student.name,
        playerAge: student.age || '',
        playerGrade: student.grade || '',
        emergencyContact: student.emergency_contact || '',
        emergencyPhone: student.emergency_phone || '',
        medicalInfo: student.medical_info || '',
        hearAboutUs: parent?.hear_about_us || '',
        provincialInterest: parent?.provincial_interest || '',
        volunteerInterest: parent?.volunteer_interest || '',
        consent: parent?.consent || false,
        photoConsent: parent?.photo_consent || false,
        valuesAcknowledgment: parent?.values_acknowledgment || false,
        newsletter: parent?.newsletter || false,
        timestamp: student.timestamp || student.created_at,
        studentId: student.id,
      };
    });
  }

  // ==================== Player Ownership Methods ====================

  async getPlayerOwnership(playerId: string): Promise<PlayerOwnership | null> {
    const { data, error } = await this.supabase
      .from('player_ownership')
      .select('*')
      .eq('player_id', playerId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error getting player ownership from Supabase:', error);
      throw new Error('Failed to get player ownership from Supabase');
    }

    if (!data) return null;

    return {
      playerId: data.player_id,
      playerName: data.player_name,
      playerEmail: data.player_email || '',
      ownerParentId: data.owner_parent_id,
      pendingParentId: data.pending_parent_id || undefined,
      approvalStatus: data.approval_status as 'none' | 'pending' | 'approved' | 'denied',
      claimDate: data.claim_date || data.created_at,
    };
  }

  async addPlayerOwnership(ownership: PlayerOwnership): Promise<void> {
    const { error } = await this.supabase.from('player_ownership').insert({
      player_id: ownership.playerId,
      player_name: ownership.playerName,
      player_email: ownership.playerEmail,
      owner_parent_id: ownership.ownerParentId,
      pending_parent_id: ownership.pendingParentId,
      approval_status: ownership.approvalStatus,
      claim_date: ownership.claimDate,
    });

    if (error) {
      console.error('Error adding player ownership to Supabase:', error);
      throw new Error('Failed to add player ownership to Supabase');
    }
  }

  async updatePlayerOwnership(playerId: string, updates: Partial<PlayerOwnership>): Promise<void> {
    const updateData: any = {};

    if (updates.ownerParentId !== undefined) updateData.owner_parent_id = updates.ownerParentId;
    if (updates.pendingParentId !== undefined) updateData.pending_parent_id = updates.pendingParentId;
    if (updates.approvalStatus !== undefined) updateData.approval_status = updates.approvalStatus;
    if (updates.claimDate !== undefined) updateData.claim_date = updates.claimDate;

    const { error } = await this.supabase
      .from('player_ownership')
      .update(updateData)
      .eq('player_id', playerId);

    if (error) {
      console.error('Error updating player ownership in Supabase:', error);
      throw new Error('Failed to update player ownership in Supabase');
    }
  }

  async getParentPlayers(parentAccountId: string): Promise<PlayerOwnershipData[]> {
    // Get all students for this parent
    const students = await this.getStudentsByParentId(parentAccountId);
    const parent = await this.getParentByEmail((await this.getParentAccount(''))?.email || '');

    // Get ownership records
    const { data: ownerships, error } = await this.supabase
      .from('player_ownership')
      .select('*')
      .eq('owner_parent_id', parentAccountId);

    if (error) {
      console.error('Error getting parent players from Supabase:', error);
      throw new Error('Failed to get parent players from Supabase');
    }

    // Combine students and ownership data
    return students.map((student) => {
      const ownership = ownerships?.find((o) => o.player_id === student.id);
      return {
        playerId: student.id,
        parentAccountId: parentAccountId,
        parentName: parent?.name || '',
        parentEmail: parent?.email || '',
        parentPhone: parent?.phone || '',
        playerName: student.name,
        playerAge: student.age,
        playerGrade: student.grade,
        emergencyContact: student.emergencyContact,
        emergencyPhone: student.emergencyPhone,
        medicalInfo: student.medicalInfo,
        hearAboutUs: parent?.hearAboutUs || '',
        provincialInterest: parent?.provincialInterest || '',
        volunteerInterest: parent?.volunteerInterest || '',
        consent: parent?.consent || false,
        photoConsent: parent?.photoConsent || false,
        valuesAcknowledgment: parent?.valuesAcknowledgment || false,
        newsletter: parent?.newsletter || false,
        timestamp: student.timestamp,
        studentId: student.id,
      };
    });
  }

  async autoLinkExistingStudentsToParent(parentAccountId: string, parentEmail: string): Promise<void> {
    // Find students that might be linked to a parent with this email
    // First, get the parent by email to find their old ID if any
    const parent = await this.getParentByEmail(parentEmail);
    
    // Update all students with matching parent email to link to this parent account
    // If parent was found, update students linked to old parent ID
    if (parent && parent.id !== parentAccountId) {
      const { error } = await this.supabase
        .from('students')
        .update({ parent_id: parentAccountId })
        .eq('parent_id', parent.id);

      if (error) {
        console.error('Error auto-linking students to parent in Supabase:', error);
        throw new Error('Failed to auto-link students to parent in Supabase');
      }
    }
  }

  async generatePlayerIdsForExistingRegistrations(): Promise<void> {
    // This is a migration helper - no-op in Supabase as IDs are already generated
    console.log('generatePlayerIdsForExistingRegistrations() called - not needed in Supabase');
  }

  // ==================== ELO Rating Methods ====================

  async getPlayerEloRating(playerId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('students')
        .select('elo_rating')
        .eq('id', playerId)
        .single();

      if (error || !data) {
        // Player not found in students table, return initial rating
        return 1000;
      }

      return data.elo_rating ?? 1000;
    } catch (error) {
      console.error(`Error getting ELO rating for player ${playerId}:`, error);
      return 1000;
    }
  }

  async updatePlayerEloRating(playerId: string, newRating: number): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('students')
        .update({ elo_rating: newRating })
        .eq('id', playerId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error(`Error updating ELO rating for player ${playerId}:`, error);
      throw error;
    }
  }

  async initializeAllPlayerEloRatings(): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('students')
        .update({ elo_rating: 1000 })
        .is('elo_rating', null);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error initializing ELO ratings:', error);
      throw error;
    }
  }

  // ==================== Game Methods ====================

  async addGame(gameData: any): Promise<string> {
    const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Validate eventId: if provided, check if it exists in events table
    // Meet IDs (starting with 'meet_') are not valid event IDs and should be set to null
    let validEventId: string | null = null;
    if (gameData.eventId) {
      // If it's a meet ID, don't use it as event_id
      if (gameData.eventId.startsWith('meet_')) {
        validEventId = null;
      } else {
        // Check if the event exists in the events table
        const { data: eventData, error: eventError } = await this.supabase
          .from('events')
          .select('id')
          .eq('id', gameData.eventId)
          .single();
        
        if (eventError || !eventData) {
          // Event doesn't exist, set to null to avoid foreign key violation
          validEventId = null;
        } else {
          validEventId = gameData.eventId;
        }
      }
    }

    // Calculate ELO rating changes for both players
    let ratingChange = gameData.ratingChange;
    if (!ratingChange) {
      try {
        // Get current ELO ratings for both players
        const player1Rating = await this.getPlayerEloRating(gameData.player1Id);
        const player2Rating = await this.getPlayerEloRating(gameData.player2Id);

        // Calculate rating changes
        const changes = EloService.calculateRatingChange(
          player1Rating,
          player2Rating,
          gameData.result as 'player1' | 'player2' | 'draw'
        );

        // Update player ELO ratings in database
        const newPlayer1Rating = player1Rating + changes.player1Change;
        const newPlayer2Rating = player2Rating + changes.player2Change;

        try {
          await this.updatePlayerEloRating(gameData.player1Id, newPlayer1Rating);
        } catch (error) {
          // Player might not exist in students table (e.g., "Unknown Opponent")
          // Continue with game creation
          console.warn(`Could not update ELO for player ${gameData.player1Id}:`, error);
        }

        try {
          await this.updatePlayerEloRating(gameData.player2Id, newPlayer2Rating);
        } catch (error) {
          // Player might not exist in students table
          // Continue with game creation
          console.warn(`Could not update ELO for player ${gameData.player2Id}:`, error);
        }

        // Store rating changes in game data
        ratingChange = {
          player1: changes.player1Change,
          player2: changes.player2Change,
        };
      } catch (error) {
        console.error('Error calculating ELO ratings:', error);
        // Continue with game creation even if ELO calculation fails
      }
    }

    const { error } = await this.supabase.from('games').insert({
      id: gameId,
      player1_id: gameData.player1Id,
      player1_name: gameData.player1Name,
      player2_id: gameData.player2Id,
      player2_name: gameData.player2Name,
      result: gameData.result,
      game_date: gameData.gameDate,
      game_time: gameData.gameTime || 0,
      game_type: gameData.gameType,
      event_id: validEventId,
      notes: gameData.notes || null,
      recorded_by: gameData.recordedBy,
      recorded_at: gameData.recordedAt || new Date().toISOString(),
      opening: gameData.opening || null,
      endgame: gameData.endgame || null,
      rating_change: ratingChange ? JSON.stringify(ratingChange) : null,
      is_verified: gameData.isVerified || false,
      verified_by: gameData.verifiedBy || null,
      verified_at: gameData.verifiedAt || null,
    });

    if (error) {
      console.error('Error adding game to Supabase:', error);
      throw new Error('Failed to add game to Supabase');
    }

    return gameId;
  }

  async getGames(filters?: GameFilters): Promise<GameData[]> {
    return this.logPerformance(
      async () => {
        let query = this.supabase.from('games').select('*');

        if (filters) {
          if (filters.playerId) {
            query = query.or(`player1_id.eq.${filters.playerId},player2_id.eq.${filters.playerId}`);
          }
          if (filters.gameType) {
            query = query.eq('game_type', filters.gameType);
          }
          if (filters.dateFrom) {
            query = query.gte('game_date', filters.dateFrom);
          }
          if (filters.dateTo) {
            query = query.lte('game_date', filters.dateTo);
          }
          if (filters.result) {
            query = query.eq('result', filters.result);
          }
          if (filters.eventId) {
            query = query.eq('event_id', filters.eventId);
          }
          if (filters.isVerified !== undefined) {
            query = query.eq('is_verified', filters.isVerified);
          }
        }

        query = query.order('game_date', { ascending: false });

        const { data, error } = await query;

        if (error) {
          console.error('Error reading games from Supabase:', error);
          throw new Error('Failed to retrieve games from Supabase');
        }

        return (data || []).map((row) => ({
          id: row.id,
          player1Id: row.player1_id,
          player1Name: row.player1_name,
          player2Id: row.player2_id,
          player2Name: row.player2_name,
          result: row.result as 'player1' | 'player2' | 'draw',
          gameDate: row.game_date,
          gameTime: row.game_time || 0,
          gameType: row.game_type as 'ladder' | 'tournament' | 'friendly' | 'practice',
          eventId: row.event_id || undefined,
          notes: row.notes || undefined,
          recordedBy: row.recorded_by,
          recordedAt: row.recorded_at,
          opening: row.opening || undefined,
          endgame: row.endgame || undefined,
          ratingChange: row.rating_change 
            ? (typeof row.rating_change === 'string' 
                ? JSON.parse(row.rating_change) 
                : row.rating_change)
            : undefined,
          isVerified: row.is_verified || false,
          verifiedBy: row.verified_by || undefined,
          verifiedAt: row.verified_at || undefined,
        }));
      },
      {
        methodName: 'getGames',
        table: 'games',
        operation: 'select',
        additionalInfo: filters ? `filters: ${JSON.stringify(filters)}` : 'no filters',
      }
    );
  }

  async getPlayerGames(playerId: string): Promise<GameData[]> {
    return this.getGames({ playerId });
  }

  async updateGame(gameId: string, updates: any): Promise<void> {
    const updateData: any = {};

    if (updates.player1Id !== undefined) updateData.player1_id = updates.player1Id;
    if (updates.player1Name !== undefined) updateData.player1_name = updates.player1Name;
    if (updates.player2Id !== undefined) updateData.player2_id = updates.player2Id;
    if (updates.player2Name !== undefined) updateData.player2_name = updates.player2Name;
    if (updates.result !== undefined) updateData.result = updates.result;
    if (updates.gameDate !== undefined) updateData.game_date = updates.gameDate;
    if (updates.gameTime !== undefined) updateData.game_time = updates.gameTime;
    if (updates.gameType !== undefined) updateData.game_type = updates.gameType;
    
    // Validate eventId: if provided, check if it exists in events table
    // Meet IDs (starting with 'meet_') are not valid event IDs and should be set to null
    if (updates.eventId !== undefined) {
      if (!updates.eventId) {
        updateData.event_id = null;
      } else if (updates.eventId.startsWith('meet_')) {
        updateData.event_id = null;
      } else {
        // Check if the event exists in the events table
        const { data: eventData, error: eventError } = await this.supabase
          .from('events')
          .select('id')
          .eq('id', updates.eventId)
          .single();
        
        if (eventError || !eventData) {
          // Event doesn't exist, set to null to avoid foreign key violation
          updateData.event_id = null;
        } else {
          updateData.event_id = updates.eventId;
        }
      }
    }
    
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.opening !== undefined) updateData.opening = updates.opening;
    if (updates.endgame !== undefined) updateData.endgame = updates.endgame;
    if (updates.ratingChange !== undefined) updateData.rating_change = JSON.stringify(updates.ratingChange);
    if (updates.isVerified !== undefined) updateData.is_verified = updates.isVerified;
    if (updates.verifiedBy !== undefined) updateData.verified_by = updates.verifiedBy;
    if (updates.verifiedAt !== undefined) updateData.verified_at = updates.verifiedAt;

    const { error } = await this.supabase
      .from('games')
      .update(updateData)
      .eq('id', gameId);

    if (error) {
      console.error('Error updating game in Supabase:', error);
      throw new Error('Failed to update game in Supabase');
    }
  }

  async deleteGame(gameId: string): Promise<void> {
    const { error } = await this.supabase.from('games').delete().eq('id', gameId);

    if (error) {
      console.error('Error deleting game from Supabase:', error);
      throw new Error('Failed to delete game from Supabase');
    }
  }

  async deleteGamesByDate(gameDate: string): Promise<void> {
    const { error } = await this.supabase
      .from('games')
      .delete()
      .eq('game_date', gameDate);

    if (error) {
      console.error('Error deleting games by date from Supabase:', error);
      throw new Error('Failed to delete games by date from Supabase');
    }
  }

  async getGameStats(): Promise<any> {
    // Calculate stats from games
    const games = await this.getGames();
    const members = await this.getMembersFromParentsAndStudents();

    const totalGames = games.length;
    const wins = games.filter((g) => g.result === 'player1' || g.result === 'player2').length;
    const draws = games.filter((g) => g.result === 'draw').length;
    const losses = games.length - wins - draws;

    // Calculate monthly stats
    const monthlyStats = new Map<string, { month: string; games: number; wins: number; losses: number }>();
    games.forEach((game) => {
      const month = game.gameDate.substring(0, 7); // YYYY-MM
      const stats = monthlyStats.get(month) || { month, games: 0, wins: 0, losses: 0 };
      stats.games += 1;
      if (game.result === 'player1' || game.result === 'player2') {
        stats.wins += 1;
      } else {
        stats.losses += 1;
      }
      monthlyStats.set(month, stats);
    });

    return {
      totalGames,
      wins,
      losses,
      draws,
      winRate: totalGames > 0 ? wins / totalGames : 0,
      favoriteOpponents: [], // Would need additional calculation
      recentGames: games.slice(0, 10),
      monthlyStats: Array.from(monthlyStats.values()),
    };
  }

  async getPlayerGameStats(playerId: string): Promise<any> {
    const games = await this.getPlayerGames(playerId);
    const totalGames = games.length;
    const wins = games.filter((g) => {
      return (g.result === 'player1' && g.player1Id === playerId) || (g.result === 'player2' && g.player2Id === playerId);
    }).length;
    const losses = games.filter((g) => {
      return (g.result === 'player2' && g.player1Id === playerId) || (g.result === 'player1' && g.player2Id === playerId);
    }).length;
    const draws = games.filter((g) => g.result === 'draw').length;

    return {
      playerId,
      playerName: games[0]?.player1Id === playerId ? games[0].player1Name : games[0]?.player2Name || '',
      totalGames,
      wins,
      losses,
      draws,
      winRate: totalGames > 0 ? wins / totalGames : 0,
      currentStreak: { type: 'none' as const, count: 0 },
      bestStreak: { type: 'win' as const, count: 0 },
      recentGames: games.slice(0, 10),
      monthlyStats: [],
    };
  }

  async getAllDataBatch(): Promise<{
    events: EventData[];
    games: GameData[];
    parents: ParentData[];
    students: StudentData[];
    members: RegistrationData[];
  }> {
    const [events, games, parentsResult, students, members] = await Promise.all([
      this.getEvents(),
      this.getGames(),
      this.supabase.from('parents').select('*').limit(1000),
      this.getAllStudents(),
      this.getMembersFromParentsAndStudents(),
    ]);

    const parents: ParentData[] = (parentsResult.data || []).map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone || '',
      hearAboutUs: p.hear_about_us || '',
      provincialInterest: p.provincial_interest || '',
      volunteerInterest: p.volunteer_interest || '',
      consent: p.consent || false,
      photoConsent: p.photo_consent || false,
      valuesAcknowledgment: p.values_acknowledgment || false,
      newsletter: p.newsletter || false,
      createAccount: p.create_account || false,
      timestamp: p.timestamp || p.created_at,
      registrationType: p.registration_type as 'parent' | 'self' | undefined,
    }));

    return {
      events,
      games,
      parents,
      students,
      members,
    };
  }

  // ==================== Tournament Methods ====================

  async initializeTournamentSheets(): Promise<void> {
    // No-op in Supabase - tables are created via migrations
    console.log('initializeTournamentSheets() called - not needed in Supabase');
  }

  async addTournament(tournament: TournamentFormData, createdBy: string): Promise<string> {
    const tournamentId = `tournament_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    const { error } = await this.supabase.from('tournaments').insert({
      id: tournamentId,
      name: tournament.name,
      description: tournament.description,
      start_date: tournament.startDate,
      status: 'upcoming',
      current_round: 1,
      total_rounds: tournament.totalRounds,
      player_ids: tournament.playerIds,
      created_by: createdBy,
      created_at: timestamp,
      updated_at: timestamp,
    });

    if (error) {
      console.error('Error adding tournament to Supabase:', error);
      throw new Error('Failed to add tournament to Supabase');
    }

    // Initialize tournament results
    await this.initializeTournamentResults(tournamentId, tournament.playerIds);

    return tournamentId;
  }

  async initializeTournamentResults(tournamentId: string, playerIds: string[]): Promise<void> {
    // Get member names for player IDs
    const members = await this.getMembersFromParentsAndStudents();
    const memberMap = new Map(members.map((m) => [m.studentId || '', m]));

    // Create result records for each player
    const results = playerIds.map((playerId) => {
      const member = memberMap.get(playerId);
      return {
        tournament_id: tournamentId,
        player_id: playerId,
        player_name: member?.playerName || 'Unknown',
        games_played: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
        buchholz_score: 0,
        opponents_faced: [],
        bye_rounds: [],
        rank: 0,
      };
    });

    const { error } = await this.supabase.from('tournament_results').insert(results);

    if (error) {
      console.error('Error initializing tournament results in Supabase:', error);
      throw new Error('Failed to initialize tournament results in Supabase');
    }
  }

  async getTournaments(status?: string): Promise<TournamentData[]> {
    let query = this.supabase.from('tournaments').select('*');

    if (status) {
      query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error reading tournaments from Supabase:', error);
      throw new Error('Failed to retrieve tournaments from Supabase');
    }

    return (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      startDate: row.start_date,
      status: row.status as 'upcoming' | 'active' | 'completed' | 'cancelled',
      currentRound: row.current_round || 1,
      totalRounds: row.total_rounds,
      playerIds: row.player_ids || [],
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      currentPairings: row.current_pairings ? JSON.stringify(row.current_pairings) : undefined,
      currentForcedByes: row.current_forced_byes ? JSON.stringify(row.current_forced_byes) : undefined,
      currentHalfPointByes: row.current_half_point_byes ? JSON.stringify(row.current_half_point_byes) : undefined,
    }));
  }

  async getTournamentById(tournamentId: string): Promise<TournamentData | null> {
    const { data, error } = await this.supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error reading tournament from Supabase:', error);
      throw new Error('Failed to retrieve tournament from Supabase');
    }

    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      startDate: data.start_date,
      status: data.status as 'upcoming' | 'active' | 'completed' | 'cancelled',
      currentRound: data.current_round || 1,
      totalRounds: data.total_rounds,
      playerIds: data.player_ids || [],
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      currentPairings: data.current_pairings ? JSON.stringify(data.current_pairings) : undefined,
      currentForcedByes: data.current_forced_byes ? JSON.stringify(data.current_forced_byes) : undefined,
      currentHalfPointByes: data.current_half_point_byes ? JSON.stringify(data.current_half_point_byes) : undefined,
    };
  }

  async updateTournament(tournamentId: string, updates: Partial<TournamentData>): Promise<void> {
    const updateData: any = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.currentRound !== undefined) updateData.current_round = updates.currentRound;
    if (updates.totalRounds !== undefined) updateData.total_rounds = updates.totalRounds;
    if (updates.playerIds !== undefined) updateData.player_ids = updates.playerIds;
    if (updates.currentPairings !== undefined) {
      updateData.current_pairings = typeof updates.currentPairings === 'string' 
        ? JSON.parse(updates.currentPairings) 
        : updates.currentPairings;
    }
    if (updates.currentForcedByes !== undefined) {
      updateData.current_forced_byes = typeof updates.currentForcedByes === 'string'
        ? JSON.parse(updates.currentForcedByes)
        : updates.currentForcedByes;
    }
    if (updates.currentHalfPointByes !== undefined) {
      updateData.current_half_point_byes = typeof updates.currentHalfPointByes === 'string'
        ? JSON.parse(updates.currentHalfPointByes)
        : updates.currentHalfPointByes;
    }

    const { error } = await this.supabase
      .from('tournaments')
      .update(updateData)
      .eq('id', tournamentId);

    if (error) {
      console.error('Error updating tournament in Supabase:', error);
      throw new Error('Failed to update tournament in Supabase');
    }
  }

  async deleteTournament(tournamentId: string): Promise<void> {
    // Delete tournament results first (foreign key constraint)
    await this.deleteTournamentResults(tournamentId);

    const { error } = await this.supabase.from('tournaments').delete().eq('id', tournamentId);

    if (error) {
      console.error('Error deleting tournament from Supabase:', error);
      throw new Error('Failed to delete tournament from Supabase');
    }
  }

  async deleteTournamentResults(tournamentId: string): Promise<void> {
    const { error } = await this.supabase
      .from('tournament_results')
      .delete()
      .eq('tournament_id', tournamentId);

    if (error) {
      console.error('Error deleting tournament results from Supabase:', error);
      throw new Error('Failed to delete tournament results from Supabase');
    }
  }

  async getTournamentResults(tournamentId: string, includeWithdrawn: boolean = false): Promise<TournamentResultData[]> {
    let query = this.supabase
      .from('tournament_results')
      .select('*')
      .eq('tournament_id', tournamentId);

    if (!includeWithdrawn) {
      query = query.eq('withdrawn', false);
    }

    query = query.order('rank', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Error reading tournament results from Supabase:', error);
      throw new Error('Failed to retrieve tournament results from Supabase');
    }

    return (data || []).map((row) => ({
      tournamentId: row.tournament_id,
      playerId: row.player_id,
      playerName: row.player_name,
      gamesPlayed: row.games_played || 0,
      wins: row.wins || 0,
      losses: row.losses || 0,
      draws: row.draws || 0,
      points: parseFloat(row.points) || 0,
      buchholzScore: parseFloat(row.buchholz_score) || 0,
      opponentsFaced: row.opponents_faced || [],
      byeRounds: row.bye_rounds || [],
      rank: row.rank || 0,
      lastUpdated: row.last_updated || row.updated_at,
      withdrawn: row.withdrawn || false,
      withdrawnAt: row.withdrawn_at || undefined,
    }));
  }

  async updateTournamentResults(tournamentId: string, results: TournamentResultData[]): Promise<void> {
    // Update each result
    for (const result of results) {
      const { error } = await this.supabase
        .from('tournament_results')
        .update({
          games_played: result.gamesPlayed,
          wins: result.wins,
          losses: result.losses,
          draws: result.draws,
          points: result.points,
          buchholz_score: result.buchholzScore,
          opponents_faced: result.opponentsFaced,
          bye_rounds: result.byeRounds,
          rank: result.rank,
          last_updated: result.lastUpdated,
          withdrawn: result.withdrawn || false,
          withdrawn_at: result.withdrawnAt || null,
        })
        .eq('tournament_id', tournamentId)
        .eq('player_id', result.playerId);

      if (error) {
        console.error('Error updating tournament result in Supabase:', error);
        throw new Error('Failed to update tournament results in Supabase');
      }
    }
  }

  async addPlayersToTournament(tournamentId: string, playerIds: string[], byeRounds: number[] = []): Promise<void> {
    // Get tournament to update player_ids
    const tournament = await this.getTournamentById(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    // Update tournament player_ids
    const updatedPlayerIds = [...new Set([...tournament.playerIds, ...playerIds])];
    await this.updateTournament(tournamentId, { playerIds: updatedPlayerIds });

    // Get member names
    const members = await this.getMembersFromParentsAndStudents();
    const memberMap = new Map(members.map((m) => [m.studentId || '', m]));

    // Add result records for new players
    const existingResults = await this.getTournamentResults(tournamentId, true);
    const existingPlayerIds = new Set(existingResults.map((r) => r.playerId));
    const newPlayerIds = playerIds.filter((id) => !existingPlayerIds.has(id));

    if (newPlayerIds.length > 0) {
      const newResults = newPlayerIds.map((playerId) => {
        const member = memberMap.get(playerId);
        return {
          tournament_id: tournamentId,
          player_id: playerId,
          player_name: member?.playerName || 'Unknown',
          games_played: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          points: 0,
          buchholz_score: 0,
          opponents_faced: [],
          bye_rounds: byeRounds,
          rank: 0,
        };
      });

      const { error } = await this.supabase.from('tournament_results').insert(newResults);
      if (error) {
        console.error('Error adding players to tournament in Supabase:', error);
        throw new Error('Failed to add players to tournament in Supabase');
      }
    }
  }

  async removePlayersFromTournament(tournamentId: string, playerIds: string[], removeCompletely: boolean = false): Promise<void> {
    // Update tournament player_ids
    const tournament = await this.getTournamentById(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    const updatedPlayerIds = tournament.playerIds.filter((id) => !playerIds.includes(id));
    await this.updateTournament(tournamentId, { playerIds: updatedPlayerIds });

    if (removeCompletely) {
      // Delete result records
      const { error } = await this.supabase
        .from('tournament_results')
        .delete()
        .eq('tournament_id', tournamentId)
        .in('player_id', playerIds);

      if (error) {
        console.error('Error removing players from tournament in Supabase:', error);
        throw new Error('Failed to remove players from tournament in Supabase');
      }
    } else {
      // Mark as withdrawn
      const { error } = await this.supabase
        .from('tournament_results')
        .update({ withdrawn: true, withdrawn_at: new Date().toISOString() })
        .eq('tournament_id', tournamentId)
        .in('player_id', playerIds);

      if (error) {
        console.error('Error marking players as withdrawn in Supabase:', error);
        throw new Error('Failed to mark players as withdrawn in Supabase');
      }
    }
  }

  async cleanupInvalidByeRounds(tournamentId: string, currentRound: number): Promise<void> {
    // Get all tournament results
    const results = await this.getTournamentResults(tournamentId, true);

    // Clean up bye rounds that exceed current round
    for (const result of results) {
      const validByeRounds = result.byeRounds.filter((round) => round <= currentRound);
      if (validByeRounds.length !== result.byeRounds.length) {
        await this.supabase
          .from('tournament_results')
          .update({ bye_rounds: validByeRounds })
          .eq('tournament_id', tournamentId)
          .eq('player_id', result.playerId);
      }
    }
  }

  async ensureTournamentResultsColumns(): Promise<void> {
    // No-op in Supabase - columns are defined in migrations
    console.log('ensureTournamentResultsColumns() called - not needed in Supabase');
  }

  async setupParentsAdminColumn(): Promise<{ message: string; headers: string[]; rowsUpdated: number }> {
    // No-op in Supabase - is_admin column already exists
    return {
      message: 'Admin column already exists in Supabase',
      headers: ['is_admin'],
      rowsUpdated: 0,
    };
  }

  async initializeGamesSheet(): Promise<void> {
    // No-op in Supabase - tables are created via migrations
    console.log('initializeGamesSheet() called - not needed in Supabase');
  }

  // ==================== Club Meet Attendance Methods ====================

  async createClubMeet(meetData: Omit<ClubMeetData, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const meetId = `meet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const { error } = await this.supabase.from('club_meets').insert({
      id: meetId,
      meet_date: meetData.meetDate,
      meet_name: meetData.meetName || null,
      notes: meetData.notes || null,
      created_by: meetData.createdBy,
    });

    if (error) {
      console.error('Error creating club meet in Supabase:', error);
      throw new Error('Failed to create club meet in Supabase');
    }

    return meetId;
  }

  async getClubMeets(): Promise<ClubMeetData[]> {
    const { data, error } = await this.supabase
      .from('club_meets')
      .select('*')
      .order('meet_date', { ascending: false });

    if (error) {
      console.error('Error reading club meets from Supabase:', error);
      throw new Error('Failed to retrieve club meets from Supabase');
    }

    return (data || []).map((row) => ({
      id: row.id,
      meetDate: row.meet_date,
      meetName: row.meet_name || undefined,
      notes: row.notes || undefined,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getClubMeetById(meetId: string): Promise<MeetWithAttendance | null> {
    const { data: meetData, error: meetError } = await this.supabase
      .from('club_meets')
      .select('*')
      .eq('id', meetId)
      .single();

    if (meetError || !meetData) {
      return null;
    }

    const { data: attendanceData, error: attendanceError } = await this.supabase
      .from('attendance')
      .select('*')
      .eq('meet_id', meetId)
      .order('checked_in_at', { ascending: true });

    if (attendanceError) {
      console.error('Error reading attendance from Supabase:', attendanceError);
      throw new Error('Failed to retrieve attendance from Supabase');
    }

    const meet: MeetWithAttendance = {
      id: meetData.id,
      meetDate: meetData.meet_date,
      meetName: meetData.meet_name || undefined,
      notes: meetData.notes || undefined,
      createdBy: meetData.created_by,
      createdAt: meetData.created_at,
      updatedAt: meetData.updated_at,
      attendanceCount: attendanceData?.length || 0,
      players: (attendanceData || []).map((row) => ({
        id: row.id,
        meetId: row.meet_id,
        playerId: row.player_id,
        playerName: row.player_name,
        checkedInAt: row.checked_in_at,
        notes: row.notes || undefined,
      })),
    };

    return meet;
  }

  async deleteClubMeet(meetId: string): Promise<void> {
    const { error } = await this.supabase.from('club_meets').delete().eq('id', meetId);

    if (error) {
      console.error('Error deleting club meet from Supabase:', error);
      throw new Error('Failed to delete club meet from Supabase');
    }
  }

  async addAttendance(meetId: string, playerIds: string[]): Promise<void> {
    // Get player names for each playerId
    const members = await this.getMembersFromParentsAndStudents();
    
    const attendanceRecords = playerIds
      .map((playerId) => {
        const member = members.find((m) => {
          const memberId = m.studentId || (m.rowIndex ? `reg_row_${m.rowIndex}` : null);
          return memberId === playerId;
        });

        if (!member) {
          console.warn(`Player with ID ${playerId} not found`);
          return null;
        }

        return {
          meet_id: meetId,
          player_id: playerId,
          player_name: member.playerName,
        };
      })
      .filter((record): record is { meet_id: string; player_id: string; player_name: string } => record !== null);

    if (attendanceRecords.length === 0) {
      throw new Error('No valid players found to add to attendance');
    }

    const { error } = await this.supabase.from('attendance').insert(attendanceRecords);

    if (error) {
      // If it's a unique constraint error, ignore it (player already in attendance)
      if (error.code === '23505') {
        console.log('Some players already in attendance, skipping duplicates');
        return;
      }
      console.error('Error adding attendance to Supabase:', error);
      throw new Error('Failed to add attendance to Supabase');
    }
  }

  async removeAttendance(meetId: string, playerId: string): Promise<void> {
    const { error } = await this.supabase
      .from('attendance')
      .delete()
      .eq('meet_id', meetId)
      .eq('player_id', playerId);

    if (error) {
      console.error('Error removing attendance from Supabase:', error);
      throw new Error('Failed to remove attendance from Supabase');
    }
  }

  async getAttendanceByMeet(meetId: string): Promise<AttendanceData[]> {
    const { data, error } = await this.supabase
      .from('attendance')
      .select('*')
      .eq('meet_id', meetId)
      .order('checked_in_at', { ascending: true });

    if (error) {
      console.error('Error reading attendance from Supabase:', error);
      throw new Error('Failed to retrieve attendance from Supabase');
    }

    return (data || []).map((row) => ({
      id: row.id,
      meetId: row.meet_id,
      playerId: row.player_id,
      playerName: row.player_name,
      checkedInAt: row.checked_in_at,
      notes: row.notes || undefined,
    }));
  }

  async getPlayersByMeet(meetId: string): Promise<PlayerData[]> {
    const attendance = await this.getAttendanceByMeet(meetId);
    const members = await this.getMembersFromParentsAndStudents();

    // Convert attendance to PlayerData format
    return attendance.map((att) => {
      const member = members.find((m) => {
        const memberId = m.studentId || (m.rowIndex ? `reg_row_${m.rowIndex}` : null);
        return memberId === att.playerId;
      });

      return {
        id: att.playerId,
        name: att.playerName,
        grade: member?.playerGrade || 'Unknown',
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
        rank: 0,
        lastActive: att.checkedInAt,
        email: member?.parentEmail || '',
        isSystemPlayer: false,
      };
    });
  }
}

// Export singleton instance
export const supabaseService = new SupabaseService();


