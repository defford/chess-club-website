import { Redis } from '@upstash/redis';
import { dataService } from './dataService';
import type { EventData, PlayerData, RegistrationData, LadderSession, LadderSessionData, LadderSessionFilters } from './types';

export interface CacheConfig {
  ttl: number; // seconds
  tags: string[];
}

export class KVCacheService {
  private static redis = (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
    ? new Redis({
        url: process.env.KV_REST_API_URL,
        token: process.env.KV_REST_API_TOKEN,
      })
    : null;

  // Circuit breaker for quota exceeded errors
  private static quotaExceededUntil: number = 0;
  private static readonly QUOTA_COOLDOWN = process.env.NODE_ENV === 'development' ? 30 * 1000 : 5 * 60 * 1000; // 30 seconds in dev, 5 minutes in prod

  // Cache Redis availability check to avoid repeated checks
  private static redisAvailableCache: boolean | null = null;
  private static redisAvailabilityCheckTime: number = 0;
  private static readonly REDIS_AVAILABILITY_CACHE_TTL = 60000; // Cache for 1 minute

  private static readonly CACHE_KEYS = {
    EVENTS: 'events:all',
    RANKINGS: 'rankings:all', 
    MEMBERS: 'members:all',
    EVENT_REGISTRATIONS: (eventId: string) => `event_registrations:${eventId}`,
    PARENT_PLAYERS: (parentId: string) => `parent_players:${parentId}`,
    PARENT_ACCOUNT: (email: string) => `parent_account:${email}`,
    STUDENTS_BY_PARENT: (parentId: string) => `students:parent:${parentId}`,
    LADDER_SESSIONS: 'ladder_sessions:all',
    LADDER_SESSION: (sessionId: string) => `ladder_session:${sessionId}`,
    LADDER_SESSION_BY_DATE: (date: string) => `ladder_session:date:${date}`,
    CURRENT_LADDER_SESSION: 'ladder_session:current',
  } as const;

  private static readonly CACHE_CONFIG: Record<string, CacheConfig> = {
    events: { ttl: process.env.NODE_ENV === 'development' ? 60 : 7200, tags: ['events'] }, // 1 minute in dev, 2 hours in prod
    rankings: { ttl: process.env.NODE_ENV === 'development' ? 60 : 3600, tags: ['rankings'] }, // 1 minute in dev, 1 hour in prod
    members: { ttl: process.env.NODE_ENV === 'development' ? 120 : 14400, tags: ['members'] }, // 2 minutes in dev, 4 hours in prod
    eventRegistrations: { ttl: process.env.NODE_ENV === 'development' ? 30 : 1800, tags: ['event-registrations'] }, // 30 seconds in dev, 30 minutes in prod
    parentPlayers: { ttl: process.env.NODE_ENV === 'development' ? 60 : 3600, tags: ['parent-data'] }, // 1 minute in dev, 1 hour in prod
    parentAccount: { ttl: process.env.NODE_ENV === 'development' ? 120 : 7200, tags: ['parent-data'] }, // 2 minutes in dev, 2 hours in prod
    studentsByParent: { ttl: process.env.NODE_ENV === 'development' ? 60 : 7200, tags: ['parent-data', 'members'] }, // 1 minute in dev, 2 hours in prod
    ladderSessions: { ttl: process.env.NODE_ENV === 'development' ? 60 : 7200, tags: ['ladder-sessions'] }, // 1 minute in dev, 2 hours in prod
    ladderSession: { ttl: process.env.NODE_ENV === 'development' ? 60 : 3600, tags: ['ladder-sessions'] }, // 1 minute in dev, 1 hour in prod
    currentLadderSession: { ttl: process.env.NODE_ENV === 'development' ? 30 : 600, tags: ['ladder-sessions'] }, // 30 seconds in dev, 10 minutes in prod
  };

  // Check if Redis is available (for local development fallback)
  // Cached result to avoid repeated checks
  private static isRedisAvailable(): boolean {
    const now = Date.now();
    
    // Return cached result if still valid
    if (this.redisAvailableCache !== null && 
        (now - this.redisAvailabilityCheckTime) < this.REDIS_AVAILABILITY_CACHE_TTL) {
      return this.redisAvailableCache;
    }

    // Check Redis availability
    const isDev = process.env.NODE_ENV === 'development';
    const available = !isDev && !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN && this.redis);
    
    // Cache the result
    this.redisAvailableCache = available;
    this.redisAvailabilityCheckTime = now;
    
    // Only log once when Redis availability changes
    if (!available && !isDev) {
      // Silent in production - Redis might not be configured
    }
    
    return available;
  }

  // Check if we're in a quota exceeded cooldown period
  private static isQuotaExceeded(): boolean {
    return Date.now() < this.quotaExceededUntil;
  }

  // Set quota exceeded state
  private static setQuotaExceeded(): void {
    this.quotaExceededUntil = Date.now() + this.QUOTA_COOLDOWN;
    console.warn(`Quota exceeded - circuit breaker activated for ${this.QUOTA_COOLDOWN / 1000} seconds`);
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
        return await sheetsFallback();
      }

      // Try cache first
      try {
        const cached = await this.redis!.get<T>(cacheKey);
        if (cached !== null && cached !== undefined) {
          return cached;
        }
      } catch (cacheError) {
        // Silently continue to fallback - cache errors shouldn't fail the request
      }
      
      // Check if we're in a quota exceeded cooldown period
      if (this.isQuotaExceeded()) {
        // Try to get stale data from cache if available
        try {
          const staleData = await this.redis!.get<T>(cacheKey);
          if (staleData !== null && staleData !== undefined) {
            return staleData;
          }
        } catch (staleError) {
          // Silently continue
        }
        
        // If no stale data available, throw error
        throw new Error('Quota exceeded and no stale cache data available');
      }
      
      // Fallback to Google Sheets
      const freshData = await sheetsFallback();
      
      // Cache the fresh data (fire and forget - don't wait)
      this.setCachedData(cacheKey, freshData, config).catch(() => {
        // Silently fail - caching errors shouldn't fail the request
      });
      
      return freshData;
    } catch (error: any) {
      // Check if it's a quota exceeded error
      const isQuotaError = error?.code === 429 || 
                         error?.message?.includes('Quota exceeded') ||
                         error?.message?.includes('quota metric') ||
                         error?.message?.includes('Read requests per minute');
      
      if (isQuotaError) {
        // Set circuit breaker
        this.setQuotaExceeded();
        
        // Try to get stale data from cache if available
        if (this.isRedisAvailable()) {
          try {
            const staleData = await this.redis!.get<T>(cacheKey);
            if (staleData !== null && staleData !== undefined) {
              return staleData;
            }
          } catch (staleError) {
            // Silently continue
          }
        }
      }
      
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
    } catch (error) {
      // Silently fail - caching errors shouldn't fail the request
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
    } catch (error) {
      // Silently fail - invalidation errors shouldn't fail the request
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
      }
    } catch (error) {
      // Silently fail - invalidation errors shouldn't fail the request
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
      // Silently fail - tracking errors shouldn't fail the request
    }
  }

  // Specific cache methods for different data types
  static async getEvents(): Promise<EventData[]> {
    return this.getCachedData(
      this.CACHE_KEYS.EVENTS,
      () => dataService.getEvents(),
      this.CACHE_CONFIG.events
    );
  }

  static async getRankings(): Promise<PlayerData[]> {
    return this.getCachedData(
      this.CACHE_KEYS.RANKINGS,
      () => dataService.calculateRankingsFromGames(),
      this.CACHE_CONFIG.rankings
    );
  }

  static async getMembers(): Promise<RegistrationData[]> {
    return this.getCachedData(
      this.CACHE_KEYS.MEMBERS,
      () => dataService.getMembersFromParentsAndStudents(),
      this.CACHE_CONFIG.members
    );
  }

  static async getGames(filters?: any): Promise<any[]> {
    const cacheKey = filters ? `games:filtered:${JSON.stringify(filters)}` : 'games:all';
    return this.getCachedData(
      cacheKey,
      () => dataService.getGames(filters),
      { ttl: 1800, tags: ['games'] } // 30 minutes
    );
  }

  static async getEventRegistrationsByPlayer(playerName: string) {
    // For specific player queries, we might not want to cache or use shorter TTL
    const cacheKey = `event_registrations:player:${playerName}`;
    return this.getCachedData(
      cacheKey,
      () => dataService.getEventRegistrationsByPlayer(playerName),
      { ttl: 300, tags: ['event-registrations'] } // 5 minutes
    );
  }

  static async getParentAccount(email: string) {
    return this.getCachedData(
      this.CACHE_KEYS.PARENT_ACCOUNT(email),
      () => dataService.getParentAccount(email),
      this.CACHE_CONFIG.parentAccount
    );
  }

  static async getParentPlayers(parentAccountId: string) {
    return this.getCachedData(
      this.CACHE_KEYS.PARENT_PLAYERS(parentAccountId),
      () => dataService.getParentPlayers(parentAccountId),
      this.CACHE_CONFIG.parentPlayers
    );
  }

  static async getStudentsByParentId(parentId: string) {
    return this.getCachedData(
      this.CACHE_KEYS.STUDENTS_BY_PARENT(parentId),
      () => dataService.getStudentsByParentId(parentId),
      this.CACHE_CONFIG.studentsByParent
    );
  }

  // Ladder Session Management Methods
  static async getLadderSessions(filters?: LadderSessionFilters): Promise<LadderSession[]> {
    const cacheKey = filters ? `ladder_sessions:filtered:${JSON.stringify(filters)}` : this.CACHE_KEYS.LADDER_SESSIONS;
    return this.getCachedData(
      cacheKey,
      () => this.getLadderSessionsFromStorage(filters),
      this.CACHE_CONFIG.ladderSessions
    );
  }

  static async getLadderSession(sessionId: string): Promise<LadderSessionData | null> {
    return this.getCachedData(
      this.CACHE_KEYS.LADDER_SESSION(sessionId),
      () => this.getLadderSessionFromStorage(sessionId),
      this.CACHE_CONFIG.ladderSession
    );
  }

  static async getLadderSessionByDate(date: string): Promise<LadderSessionData | null> {
    return this.getCachedData(
      this.CACHE_KEYS.LADDER_SESSION_BY_DATE(date),
      () => this.getLadderSessionByDateFromStorage(date),
      this.CACHE_CONFIG.ladderSession
    );
  }

  static async getCurrentLadderSession(): Promise<LadderSessionData | null> {
    return this.getCachedData(
      this.CACHE_KEYS.CURRENT_LADDER_SESSION,
      () => this.getCurrentLadderSessionFromStorage(),
      this.CACHE_CONFIG.currentLadderSession
    );
  }

  static async createLadderSession(date: string): Promise<LadderSessionData> {
    const sessionId = `session_${date}_${Date.now()}`;
    const sessionData: LadderSessionData = {
      sessionId,
      date,
      players: [],
      games: [],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    // Store in cache
    await this.setCachedData(
      this.CACHE_KEYS.LADDER_SESSION(sessionId),
      sessionData,
      this.CACHE_CONFIG.ladderSession
    );

    await this.setCachedData(
      this.CACHE_KEYS.LADDER_SESSION_BY_DATE(date),
      sessionData,
      this.CACHE_CONFIG.ladderSession
    );

    // Update current session
    await this.setCachedData(
      this.CACHE_KEYS.CURRENT_LADDER_SESSION,
      sessionData,
      this.CACHE_CONFIG.currentLadderSession
    );

    // Invalidate sessions list cache
    await this.invalidateByTags(['ladder-sessions']);

    return sessionData;
  }

  static async updateLadderSession(sessionId: string, sessionData: LadderSessionData): Promise<void> {
    sessionData.lastUpdated = new Date().toISOString();

    // Update all relevant cache keys
    await this.setCachedData(
      this.CACHE_KEYS.LADDER_SESSION(sessionId),
      sessionData,
      this.CACHE_CONFIG.ladderSession
    );

    await this.setCachedData(
      this.CACHE_KEYS.LADDER_SESSION_BY_DATE(sessionData.date),
      sessionData,
      this.CACHE_CONFIG.ladderSession
    );

    // If this is the current session, update it too
    const currentSession = await this.getCurrentLadderSession();
    if (currentSession && currentSession.sessionId === sessionId) {
      await this.setCachedData(
        this.CACHE_KEYS.CURRENT_LADDER_SESSION,
        sessionData,
        this.CACHE_CONFIG.currentLadderSession
      );
    }

    // Invalidate sessions list cache
    await this.invalidateByTags(['ladder-sessions']);
  }

  // Private helper methods for fallback when cache is not available
  private static async getLadderSessionsFromStorage(filters?: LadderSessionFilters): Promise<LadderSession[]> {
    // For now, return empty array - this would be implemented to read from persistent storage
    // In a real implementation, this might read from a database or file system
    return [];
  }

  private static async getLadderSessionFromStorage(sessionId: string): Promise<LadderSessionData | null> {
    // For now, return null - this would be implemented to read from persistent storage
    return null;
  }

  private static async getLadderSessionByDateFromStorage(date: string): Promise<LadderSessionData | null> {
    // For now, return null - this would be implemented to read from persistent storage
    return null;
  }

  private static async getCurrentLadderSessionFromStorage(): Promise<LadderSessionData | null> {
    // For now, return null - this would be implemented to read from persistent storage
    return null;
  }

  static async getParentByEmail(email: string) {
    const cacheKey = `parent:email:${email}`;
    return this.getCachedData(
      cacheKey,
      () => dataService.getParentByEmail(email),
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
