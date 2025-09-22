import { NextResponse } from 'next/server';
import { KVCacheService } from './kv';

export interface QuotaErrorResponse {
  error: string;
  quotaExceeded: boolean;
  fromCache?: boolean;
  data?: any;
  message?: string;
}

export class QuotaHandler {
  /**
   * Check if an error is a quota exceeded error
   */
  static isQuotaError(error: any): boolean {
    return error?.code === 429 || 
           error?.message?.includes('Quota exceeded') ||
           error?.message?.includes('quota metric') ||
           error?.message?.includes('Read requests per minute');
  }

  /**
   * Handle quota exceeded errors with fallback to cache
   */
  static async handleQuotaError(
    error: any,
    cacheFallback: () => Promise<any>,
    errorMessage: string = 'Service temporarily unavailable due to quota exceeded'
  ): Promise<NextResponse> {
    console.error('Quota exceeded error:', error);
    
    // Set circuit breaker
    (KVCacheService as any).setQuotaExceeded?.();
    
    try {
      // Try to get cached data
      const cachedData = await cacheFallback();
      
      return NextResponse.json({
        data: cachedData,
        fromCache: true,
        quotaExceeded: true,
        message: 'Data retrieved from cache due to quota exceeded'
      });
    } catch (cacheError) {
      console.error('Failed to get cached data:', cacheError);
      
      return NextResponse.json(
        { 
          error: errorMessage,
          quotaExceeded: true
        },
        { status: 503 }
      );
    }
  }

  /**
   * Handle API errors with quota exceeded detection
   */
  static async handleApiError(
    error: any,
    cacheFallback: () => Promise<any>,
    defaultErrorMessage: string = 'Internal server error'
  ): Promise<NextResponse> {
    if (this.isQuotaError(error)) {
      return this.handleQuotaError(error, cacheFallback, 'Service temporarily unavailable due to quota exceeded');
    }
    
    console.error('API error:', error);
    return NextResponse.json(
      { 
        error: defaultErrorMessage,
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }

  /**
   * Check if we're currently in a quota exceeded state
   */
  static isQuotaExceeded(): boolean {
    return (KVCacheService as any).isQuotaExceeded?.() || false;
  }

  /**
   * Get quota status information
   */
  static getQuotaStatus(): {
    quotaExceeded: boolean;
    timeRemaining: number;
    timeRemainingFormatted: string;
  } {
    const isQuotaExceeded = this.isQuotaExceeded();
    const quotaExceededUntil = (KVCacheService as any).quotaExceededUntil || 0;
    
    const now = Date.now();
    const timeRemaining = quotaExceededUntil > now ? quotaExceededUntil - now : 0;
    
    return {
      quotaExceeded: isQuotaExceeded,
      timeRemaining,
      timeRemainingFormatted: timeRemaining > 0 ? `${Math.ceil(timeRemaining / 1000)} seconds` : '0 seconds'
    };
  }
}
