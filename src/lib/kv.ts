import { Redis } from '@upstash/redis';
import { googleSheetsService } from './googleSheets';
import type { EventData, PlayerData, RegistrationData } from './types';

export interface CacheConfig {
  ttl: number; // seconds
  tags: string[];
}

export class KVCacheService {
  private static redis = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
    ? new Redis({
        url: process.env.KV_REST_API_URL,
        token: process.env.KV_REST_API_TOKEN,
      })
    : null;

  private static readonly CACHE_KEYS = {
    EVENTS: 'events:all',
    RANKINGS: 'rankings:all', 
    MEMBERS: 'members:all',
    EVENT_REGISTRATIONS: (eventId: string) => `event_registrations:${eventId}`,
    PARENT_PLAYERS: (parentId: string) => `parent_players:${parentId}`,
    PARENT_ACCOUNT: (email: string) => `parent_account:${email}`,
    STUDENTS_BY_PARENT: (parentId: string) => `students:parent:${parentId}`,
  } as const;

  private static readonly CACHE_CONFIG: Record<string, CacheConfig> = {
    events: { ttl: 3600, tags: ['events'] }, // 1 hour
    rankings: { ttl: 1800, tags: ['rankings'] }, // 30 minutes  
    members: { ttl: 7200, tags: ['members'] }, // 2 hours
    eventRegistrations: { ttl: 900, tags: ['event-registrations'] }, // 15 minutes
    parentPlayers: { ttl: 1800, tags: ['parent-data'] }, // 30 minutes
    parentAccount: { ttl: 3600, tags: ['parent-data'] }, // 1 hour
    studentsByParent: { ttl: 3600, tags: ['parent-data', 'members'] }, // 1 hour
  };

  // Check if Redis is available (for local development fallback)
  private static isRedisAvailable(): boolean {
    return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  }

  // Generic cache get with fallback to Google Sheets
  static async getCachedData<T>(
    cacheKey: string,
    sheetsFallback: () => Promise<T>,
    config: CacheConfig
  ): Promise<T> {
    try {
      // If Redis is not available (local dev), go straight to Google Sheets
      if (!this.isRedisAvailable()) {
        console.log(`Redis not configured - using Google Sheets directly for ${cacheKey}`);
        return await sheetsFallback();
      }

      // Try cache first
      const cached = await this.redis!.get<T>(cacheKey);
      if (cached !== null && cached !== undefined) {
        console.log(`Cache HIT: ${cacheKey}`);
        return cached;
      }
      
      console.log(`Cache MISS: ${cacheKey} - fetching from Sheets`);
      // Fallback to Google Sheets
      const freshData = await sheetsFallback();
      
      // Cache the fresh data
      await this.setCachedData(cacheKey, freshData, config);
      
      return freshData;
    } catch (error) {
      console.error(`Cache error for ${cacheKey}:`, error);
      // Always fallback to Google Sheets on cache errors
      return await sheetsFallback();
    }
  }

  // Set cached data with TTL and tags
  private static async setCachedData<T>(
    cacheKey: string,
    data: T,
    config: CacheConfig
  ): Promise<void> {
    try {
      if (!this.isRedisAvailable()) return;
      
      await this.redis!.setex(cacheKey, config.ttl, data);
      
      // Track key by tags for invalidation
      await this.trackKeyByTags(cacheKey, config.tags);
      
      console.log(`Cache SET: ${cacheKey} with TTL ${config.ttl}s`);
    } catch (error) {
      console.error(`Cache set error for ${cacheKey}:`, error);
    }
  }

  // Write-through cache update
  static async updateCachedData<T>(
    cacheKey: string,
    data: T,
    config: CacheConfig
  ): Promise<void> {
    await this.setCachedData(cacheKey, data, config);
  }

  // Invalidate cache by key
  static async invalidateKey(cacheKey: string): Promise<void> {
    try {
      if (!this.isRedisAvailable()) return;
      
      await this.redis!.del(cacheKey);
      console.log(`Cache INVALIDATED: ${cacheKey}`);
    } catch (error) {
      console.error(`Cache invalidation error for ${cacheKey}:`, error);
    }
  }

  // Invalidate cache by tags
  static async invalidateByTags(tags: string[]): Promise<void> {
    try {
      if (!this.isRedisAvailable()) return;
      
      // Get all keys for each tag
      const keysToInvalidate = new Set<string>();
      
      for (const tag of tags) {
        const tagKey = `tag:${tag}`;
        const keys = await this.redis!.smembers(tagKey);
        
        if (keys && Array.isArray(keys)) {
          keys.forEach(key => keysToInvalidate.add(key as string));
        }
      }
      
      if (keysToInvalidate.size > 0) {
        // Delete all keys
        await this.redis!.del(...Array.from(keysToInvalidate));
        
        // Clean up tag sets
        for (const tag of tags) {
          await this.redis!.del(`tag:${tag}`);
        }
        
        console.log(`Invalidated ${keysToInvalidate.size} keys for tags: ${tags.join(', ')}`);
      }
    } catch (error) {
      console.error(`Tag invalidation error:`, error);
    }
  }

  // Track keys by tags for invalidation
  private static async trackKeyByTags(key: string, tags: string[]): Promise<void> {
    try {
      if (!this.isRedisAvailable()) return;
      
      for (const tag of tags) {
        await this.redis!.sadd(`tag:${tag}`, key);
        // Set expiry on tag set to clean up old entries
        await this.redis!.expire(`tag:${tag}`, 86400); // 24 hours
      }
    } catch (error) {
      console.error(`Tag tracking error:`, error);
    }
  }

  // Specific cache methods for different data types
  static async getEvents(): Promise<EventData[]> {
    return this.getCachedData(
      this.CACHE_KEYS.EVENTS,
      () => googleSheetsService.getEvents(),
      this.CACHE_CONFIG.events
    );
  }

  static async getRankings(): Promise<PlayerData[]> {
    return this.getCachedData(
      this.CACHE_KEYS.RANKINGS,
      () => googleSheetsService.getPlayers(),
      this.CACHE_CONFIG.rankings
    );
  }

  static async getMembers(): Promise<RegistrationData[]> {
    return this.getCachedData(
      this.CACHE_KEYS.MEMBERS,
      () => googleSheetsService.getMembersFromParentsAndStudents(),
      this.CACHE_CONFIG.members
    );
  }

  static async getEventRegistrationsByPlayer(playerName: string) {
    // For specific player queries, we might not want to cache or use shorter TTL
    const cacheKey = `event_registrations:player:${playerName}`;
    return this.getCachedData(
      cacheKey,
      () => googleSheetsService.getEventRegistrationsByPlayer(playerName),
      { ttl: 300, tags: ['event-registrations'] } // 5 minutes
    );
  }

  static async getParentAccount(email: string) {
    return this.getCachedData(
      this.CACHE_KEYS.PARENT_ACCOUNT(email),
      () => googleSheetsService.getParentAccount(email),
      this.CACHE_CONFIG.parentAccount
    );
  }

  static async getParentPlayers(parentAccountId: string) {
    return this.getCachedData(
      this.CACHE_KEYS.PARENT_PLAYERS(parentAccountId),
      () => googleSheetsService.getParentPlayers(parentAccountId),
      this.CACHE_CONFIG.parentPlayers
    );
  }

  static async getStudentsByParentId(parentId: string) {
    return this.getCachedData(
      this.CACHE_KEYS.STUDENTS_BY_PARENT(parentId),
      () => googleSheetsService.getStudentsByParentId(parentId),
      this.CACHE_CONFIG.studentsByParent
    );
  }

  static async getParentByEmail(email: string) {
    const cacheKey = `parent:email:${email}`;
    return this.getCachedData(
      cacheKey,
      () => googleSheetsService.getParentByEmail(email),
      { ttl: 3600, tags: ['parent-data'] }
    );
  }

  // Pre-warm all major caches
  static async warmCache(): Promise<{ duration: number; warmed: string[] }> {
    const startTime = Date.now();
    const warmed: string[] = [];

    try {
      // Warm all major caches in parallel
      const results = await Promise.allSettled([
        this.getEvents().then(() => warmed.push('events')),
        this.getRankings().then(() => warmed.push('rankings')),
        this.getMembers().then(() => warmed.push('members'))
      ]);

      // Log any failures
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Cache warm failed for index ${index}:`, result.reason);
        }
      });

      const duration = Date.now() - startTime;
      console.log(`Cache warmed in ${duration}ms: ${warmed.join(', ')}`);
      
      return { duration, warmed };
    } catch (error) {
      console.error('Cache warming error:', error);
      const duration = Date.now() - startTime;
      return { duration, warmed };
    }
  }
}
