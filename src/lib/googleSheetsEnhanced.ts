import { GoogleSheetsService } from './googleSheets';
import { KVCacheService } from './kv';
import type { EventData, PlayerData, EventRegistrationData, ParentRegistrationData, StudentRegistrationData, SelfRegistrationData } from './types';

// Enhanced Google Sheets Service with write-through caching
export class EnhancedGoogleSheetsService extends GoogleSheetsService {
  
  // Override event methods with cache invalidation
  async addEvent(event: Omit<EventData, 'id' | 'lastUpdated'>): Promise<string> {
    // Write to Google Sheets
    const eventId = await super.addEvent(event);
    
    // Invalidate events cache
    await KVCacheService.invalidateKey('events:all');
    await KVCacheService.invalidateByTags(['events']);
    
    console.log(`Event added: ${eventId}, cache invalidated`);
    return eventId;
  }

  async updateEvent(eventId: string, updates: Partial<EventData>): Promise<void> {
    // Write to Google Sheets
    await super.updateEvent(eventId, updates);
    
    // Invalidate events cache
    await KVCacheService.invalidateKey('events:all');
    await KVCacheService.invalidateByTags(['events']);
    
    console.log(`Event updated: ${eventId}, cache invalidated`);
  }

  // Override player/rankings methods with cache invalidation
  async addPlayer(player: Omit<PlayerData, 'id' | 'rank'>): Promise<string> {
    // Write to Google Sheets
    const playerId = await super.addPlayer(player);
    
    // Invalidate rankings cache
    await KVCacheService.invalidateKey('rankings:all');
    await KVCacheService.invalidateByTags(['rankings']);
    
    console.log(`Player added: ${playerId}, cache invalidated`);
    return playerId;
  }

  async updatePlayer(playerId: string, updates: Partial<PlayerData>): Promise<void> {
    // Write to Google Sheets
    await super.updatePlayer(playerId, updates);
    
    // Invalidate rankings cache
    await KVCacheService.invalidateKey('rankings:all');
    await KVCacheService.invalidateByTags(['rankings']);
    
    console.log(`Player updated: ${playerId}, cache invalidated`);
  }

  async recalculateRankings(): Promise<void> {
    // Recalculate rankings
    await super.recalculateRankings();
    
    // Invalidate rankings cache
    await KVCacheService.invalidateKey('rankings:all');
    await KVCacheService.invalidateByTags(['rankings']);
    
    console.log('Rankings recalculated, cache invalidated');
  }

  // Override registration methods with cache invalidation
  async addParentRegistration(data: ParentRegistrationData): Promise<string> {
    // Write to Google Sheets
    const parentId = await super.addParentRegistration(data);
    
    // Invalidate members and parent caches
    await KVCacheService.invalidateKey('members:all');
    await KVCacheService.invalidateByTags(['members', 'parent-data']);
    
    console.log(`Parent registration added: ${parentId}, cache invalidated`);
    return parentId;
  }

  async addStudentRegistration(data: StudentRegistrationData): Promise<string> {
    // Write to Google Sheets
    const studentId = await super.addStudentRegistration(data);
    
    // Invalidate members and parent-specific caches
    await KVCacheService.invalidateKey('members:all');
    await KVCacheService.invalidateKey(`students:parent:${data.parentId}`);
    await KVCacheService.invalidateByTags(['members', 'parent-data']);
    
    console.log(`Student registration added: ${studentId}, cache invalidated`);
    return studentId;
  }

  async addSelfRegistration(data: SelfRegistrationData): Promise<string> {
    // Write to Google Sheets
    const playerId = await super.addSelfRegistration(data);
    
    // Invalidate members cache
    await KVCacheService.invalidateKey('members:all');
    await KVCacheService.invalidateByTags(['members']);
    
    console.log(`Self registration added: ${playerId}, cache invalidated`);
    return playerId;
  }

  // Override event registration methods with cache invalidation
  async addEventRegistration(data: EventRegistrationData): Promise<void> {
    // Write to Google Sheets
    await super.addEventRegistration(data);
    
    // Invalidate event-specific and player-specific caches
    await KVCacheService.invalidateKey(`event_registrations:${data.eventId}`);
    await KVCacheService.invalidateKey(`event_registrations:player:${data.playerName}`);
    await KVCacheService.invalidateByTags(['event-registrations']);
    
    console.log(`Event registration added for ${data.playerName}, cache invalidated`);
  }

  async incrementEventParticipants(eventId: string): Promise<void> {
    // Update Google Sheets
    await super.incrementEventParticipants(eventId);
    
    // Invalidate events cache
    await KVCacheService.invalidateKey('events:all');
    await KVCacheService.invalidateByTags(['events']);
    
    console.log(`Event participants incremented: ${eventId}, cache invalidated`);
  }

  // Override parent account methods with cache invalidation
  async addParentAccount(account: any): Promise<void> {
    // Write to Google Sheets
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
    
    // Write to Google Sheets
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

  // Override player ownership methods with cache invalidation
  async addPlayerOwnership(ownership: any): Promise<void> {
    // Write to Google Sheets
    await super.addPlayerOwnership(ownership);
    
    // Invalidate parent players cache
    await KVCacheService.invalidateKey(`parent_players:${ownership.ownerParentId}`);
    if (ownership.pendingParentId) {
      await KVCacheService.invalidateKey(`parent_players:${ownership.pendingParentId}`);
    }
    await KVCacheService.invalidateByTags(['parent-data']);
    
    console.log(`Player ownership added: ${ownership.playerId}, cache invalidated`);
  }

  async updatePlayerOwnership(playerId: string, updates: any): Promise<void> {
    // Get current ownership to invalidate old parent cache
    const currentOwnership = await this.getPlayerOwnership(playerId);
    
    // Write to Google Sheets
    await super.updatePlayerOwnership(playerId, updates);
    
    // Invalidate relevant parent players caches
    if (currentOwnership?.ownerParentId) {
      await KVCacheService.invalidateKey(`parent_players:${currentOwnership.ownerParentId}`);
    }
    if (updates.ownerParentId) {
      await KVCacheService.invalidateKey(`parent_players:${updates.ownerParentId}`);
    }
    if (updates.pendingParentId) {
      await KVCacheService.invalidateKey(`parent_players:${updates.pendingParentId}`);
    }
    await KVCacheService.invalidateByTags(['parent-data']);
    
    console.log(`Player ownership updated: ${playerId}, cache invalidated`);
  }

  async autoLinkExistingStudentsToParent(parentAccountId: string, parentEmail: string): Promise<void> {
    // Perform auto-linking
    await super.autoLinkExistingStudentsToParent(parentAccountId, parentEmail);
    
    // Invalidate parent-specific caches
    await KVCacheService.invalidateKey(`parent_players:${parentAccountId}`);
    await KVCacheService.invalidateKey(`parent_account:${parentEmail}`);
    await KVCacheService.invalidateKey(`parent:email:${parentEmail}`);
    await KVCacheService.invalidateByTags(['parent-data']);
    
    console.log(`Students auto-linked to parent: ${parentEmail}, cache invalidated`);
  }
}

// Export enhanced instance
export const enhancedGoogleSheetsService = new EnhancedGoogleSheetsService();
