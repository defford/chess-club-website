import { SupabaseService } from './supabaseService';
import { KVCacheService } from './kv';
import type { EventData, PlayerData, EventRegistrationData, ParentRegistrationData, StudentRegistrationData, SelfRegistrationData, TournamentData } from './types';

/**
 * EnhancedSupabaseService - Extends SupabaseService with cache invalidation
 * Matches the pattern of EnhancedGoogleSheetsService
 */
export class EnhancedSupabaseService extends SupabaseService {
  
  // Override event methods with cache invalidation
  async addEvent(event: Omit<EventData, 'id' | 'lastUpdated'>): Promise<string> {
    const eventId = await super.addEvent(event);
    
    // Invalidate events cache
    await KVCacheService.invalidateKey('events:all');
    await KVCacheService.invalidateByTags(['events']);
    
    console.log(`Event added: ${eventId}, cache invalidated`);
    return eventId;
  }

  async updateEvent(eventId: string, updates: Partial<EventData>): Promise<void> {
    await super.updateEvent(eventId, updates);
    
    // Invalidate events cache
    await KVCacheService.invalidateKey('events:all');
    await KVCacheService.invalidateByTags(['events']);
    
    console.log(`Event updated: ${eventId}, cache invalidated`);
  }

  // Override player/rankings methods with cache invalidation
  async addPlayer(player: Omit<PlayerData, 'id' | 'rank'>): Promise<string> {
    // Players are now derived from games, but keep for compatibility
    const playerId = await super.addPlayer(player);
    
    // Invalidate rankings cache
    await KVCacheService.invalidateKey('rankings:all');
    await KVCacheService.invalidateByTags(['rankings']);
    
    console.log(`Player added: ${playerId}, cache invalidated`);
    return playerId;
  }

  async updatePlayer(playerId: string, updates: Partial<PlayerData>): Promise<void> {
    await super.updatePlayer(playerId, updates);
    
    // Invalidate rankings cache
    await KVCacheService.invalidateKey('rankings:all');
    await KVCacheService.invalidateByTags(['rankings']);
    
    console.log(`Player updated: ${playerId}, cache invalidated`);
  }

  async recalculateRankings(): Promise<void> {
    // Rankings are now calculated dynamically from games
    // Just invalidate cache to force fresh calculation
    await KVCacheService.invalidateKey('rankings:all');
    await KVCacheService.invalidateByTags(['rankings']);
    
    console.log('Rankings cache invalidated - will be recalculated from games on next request');
  }

  // Override game methods with cache invalidation
  async addGame(gameData: any): Promise<string> {
    const gameId = await super.addGame(gameData);
    
    // Invalidate games and rankings cache since rankings are calculated from games
    await KVCacheService.invalidateKey('games:all');
    await KVCacheService.invalidateKey('rankings:all');
    await KVCacheService.invalidateByTags(['games', 'rankings']);
    
    console.log(`Game added: ${gameId}, games and rankings cache invalidated`);
    return gameId;
  }

  async updateGame(gameId: string, updates: any): Promise<void> {
    await super.updateGame(gameId, updates);
    
    // Invalidate games and rankings cache since rankings are calculated from games
    await KVCacheService.invalidateKey('games:all');
    await KVCacheService.invalidateKey('rankings:all');
    await KVCacheService.invalidateByTags(['games', 'rankings']);
    
    console.log(`Game updated: ${gameId}, games and rankings cache invalidated`);
  }

  async deleteGame(gameId: string): Promise<void> {
    await super.deleteGame(gameId);
    
    // Invalidate games and rankings cache since rankings are calculated from games
    await KVCacheService.invalidateKey('games:all');
    await KVCacheService.invalidateKey('rankings:all');
    await KVCacheService.invalidateByTags(['games', 'rankings']);
    
    console.log(`Game deleted: ${gameId}, games and rankings cache invalidated`);
  }

  async deleteGamesByDate(gameDate: string): Promise<void> {
    await super.deleteGamesByDate(gameDate);
    
    // Invalidate games and rankings cache since rankings are calculated from games
    await KVCacheService.invalidateKey('games:all');
    await KVCacheService.invalidateKey('rankings:all');
    await KVCacheService.invalidateByTags(['games', 'rankings']);
    
    console.log(`Games deleted for date: ${gameDate}, games and rankings cache invalidated`);
  }

  // Override registration methods with cache invalidation
  async addParentRegistration(data: ParentRegistrationData): Promise<string> {
    const parentId = await super.addParentRegistration(data);
    
    // Invalidate members and parent caches
    await KVCacheService.invalidateKey('members:all');
    await KVCacheService.invalidateByTags(['members', 'parent-data']);
    
    console.log(`Parent registration added: ${parentId}, cache invalidated`);
    return parentId;
  }

  async addStudentRegistration(data: StudentRegistrationData): Promise<string> {
    const studentId = await super.addStudentRegistration(data);
    
    // Invalidate members and parent-specific caches
    await KVCacheService.invalidateKey('members:all');
    await KVCacheService.invalidateKey(`students:parent:${data.parentId}`);
    await KVCacheService.invalidateByTags(['members', 'parent-data', 'student-data']);
    
    console.log(`Student registration added: ${studentId}, cache invalidated`);
    return studentId;
  }

  async updateStudentRegistration(studentId: string, updates: Partial<StudentRegistrationData>): Promise<void> {
    await super.updateStudentRegistration(studentId, updates);
    
    // Invalidate members and student caches
    await KVCacheService.invalidateKey('members:all');
    if (updates.parentId) {
      await KVCacheService.invalidateKey(`students:parent:${updates.parentId}`);
    }
    await KVCacheService.invalidateByTags(['members', 'parent-data', 'student-data']);
    
    console.log(`Student registration updated: ${studentId}, cache invalidated`);
  }

  async addSelfRegistration(data: SelfRegistrationData): Promise<string> {
    const playerId = await super.addSelfRegistration(data);
    
    // Invalidate members cache
    await KVCacheService.invalidateKey('members:all');
    await KVCacheService.invalidateByTags(['members']);
    
    console.log(`Self registration added: ${playerId}, cache invalidated`);
    return playerId;
  }

  // Override event registration methods with cache invalidation
  async addEventRegistration(data: EventRegistrationData): Promise<void> {
    await super.addEventRegistration(data);
    
    // Invalidate event-specific and player-specific caches
    await KVCacheService.invalidateKey(`event_registrations:${data.eventId}`);
    await KVCacheService.invalidateKey(`event_registrations:player:${data.playerName}`);
    await KVCacheService.invalidateByTags(['event-registrations']);
    
    console.log(`Event registration added for ${data.playerName}, cache invalidated`);
  }

  async incrementEventParticipants(eventId: string): Promise<void> {
    await super.incrementEventParticipants(eventId);
    
    // Invalidate events cache
    await KVCacheService.invalidateKey('events:all');
    await KVCacheService.invalidateByTags(['events']);
    
    console.log(`Event participants incremented: ${eventId}, cache invalidated`);
  }

  // Override parent account methods with cache invalidation
  async addParentAccount(account: any): Promise<void> {
    await super.addParentAccount(account);
    
    // Invalidate parent account cache
    await KVCacheService.invalidateKey(`parent_account:${account.email}`);
    await KVCacheService.invalidateKey(`parent:email:${account.email}`);
    await KVCacheService.invalidateByTags(['parent-data']);
    
    console.log(`Parent account added: ${account.email}, cache invalidated`);
  }

  async updateParentAccount(parentId: string, updates: any): Promise<void> {
    // Get current parent data to find email
    const currentParent = await this.getParentByEmail(updates.email || '');
    
    await super.updateParentAccount(parentId, updates);
    
    // Invalidate parent account caches
    if (currentParent?.email) {
      await KVCacheService.invalidateKey(`parent_account:${currentParent.email}`);
      await KVCacheService.invalidateKey(`parent:email:${currentParent.email}`);
    }
    if (updates.email && updates.email !== currentParent?.email) {
      await KVCacheService.invalidateKey(`parent_account:${updates.email}`);
      await KVCacheService.invalidateKey(`parent:email:${updates.email}`);
    }
    await KVCacheService.invalidateByTags(['parent-data']);
    
    console.log(`Parent account updated: ${parentId}, cache invalidated`);
  }

  // Batch method to get all data efficiently
  async getAllDataBatch() {
    return await super.getAllDataBatch();
  }

  // Override tournament methods to sync with events
  async updateTournament(tournamentId: string, updates: Partial<TournamentData>): Promise<void> {
    // 1. Get the tournament before update to know its name (if name not in updates)
    let tournamentName = updates.name;
    
    if (!tournamentName && updates.status) {
      try {
        const currentTournament = await this.getTournamentById(tournamentId);
        if (currentTournament) {
          tournamentName = currentTournament.name;
        }
      } catch (error) {
        console.error('Error fetching tournament for sync:', error);
      }
    }

    // 2. Perform the update
    await super.updateTournament(tournamentId, updates);
    
    // 3. Sync status with Event if status changed
    if (updates.status && tournamentName) {
      console.log(`Syncing tournament status '${updates.status}' for '${tournamentName}' to events...`);
      
      try {
        // Find matching event by name
        const events = await this.getEvents();
        const matchingEvent = events.find(e => e.name === tournamentName);
        
        if (matchingEvent && matchingEvent.id && matchingEvent.status !== updates.status) {
          console.log(`Found matching event ${matchingEvent.id} (${matchingEvent.name}). Updating status to ${updates.status}`);
          
          // Map tournament status to event status
          // Tournament: 'upcoming' | 'active' | 'completed' | 'cancelled'
          // Event: 'active' | 'cancelled' | 'completed'
          let eventStatus: 'active' | 'cancelled' | 'completed' | undefined;
          
          switch (updates.status) {
            case 'completed':
              eventStatus = 'completed';
              break;
            case 'cancelled':
              eventStatus = 'cancelled';
              break;
            case 'active':
            case 'upcoming':
              eventStatus = 'active';
              break;
          }
          
          if (eventStatus && matchingEvent.status !== eventStatus) {
            await this.updateEvent(matchingEvent.id, { status: eventStatus });
          }
        } else {
          console.log(`No matching event found for tournament '${tournamentName}' or status already synced.`);
        }
      } catch (error) {
        console.error('Error syncing tournament status to event:', error);
      }
    }
  }
}

// Export enhanced instance
export const enhancedSupabaseService = new EnhancedSupabaseService();

