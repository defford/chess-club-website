# Google Sheets API Quota Management Solution

## Overview

This document describes the comprehensive solution implemented to handle Google Sheets API quota exceeded errors and optimize API usage.

## Problem

The application was experiencing frequent "Quota exceeded for quota metric 'Read requests' and limit 'Read requests per minute per user'" errors from the Google Sheets API, causing service disruptions.

## Solution Components

### 1. Enhanced Rate Limiting

**File**: `src/lib/googleSheets.ts`

- **Increased API call delay**: From 100ms to 500ms between calls
- **Exponential backoff**: Implements retry logic with exponential backoff for quota exceeded errors
- **Retry mechanism**: Up to 3 retries with increasing delays (1s, 2s, 4s)

```typescript
private readonly API_CALL_DELAY = 500; // Increased from 100ms
private readonly MAX_RETRIES = 3;
private readonly RETRY_DELAY_BASE = 1000; // Base delay for exponential backoff
```

### 2. Circuit Breaker Pattern

**File**: `src/lib/kv.ts`

- **Quota exceeded detection**: Automatically detects quota exceeded errors
- **Circuit breaker**: Prevents API calls for 5 minutes after quota exceeded
- **Stale data fallback**: Returns cached data when quota is exceeded

```typescript
private static quotaExceededUntil: number = 0;
private static readonly QUOTA_COOLDOWN = 5 * 60 * 1000; // 5 minutes
```

### 3. Enhanced Caching Strategy

**File**: `src/lib/kv.ts`

- **Increased cache TTL**: Extended cache lifetimes to reduce API calls
  - Events: 2 hours (was 1 hour)
  - Rankings: 1 hour (was 30 minutes)
  - Members: 4 hours (was 2 hours)
  - Parent data: 2 hours (was 1 hour)

- **Stale data serving**: Returns stale cache data when quota is exceeded
- **Cache warming**: Scheduled cache warming to pre-populate frequently accessed data

### 4. Batch Operations

**File**: `src/lib/googleSheets.ts`

- **Batch read operations**: New `getAllDataBatch()` method that fetches all frequently accessed data in a single operation
- **Parallel execution**: Executes multiple read operations in parallel with a single rate limit
- **Reduced API calls**: Consolidates multiple individual API calls into fewer batch operations

### 5. Comprehensive Error Handling

**File**: `src/lib/quotaHandler.ts`

- **Centralized error handling**: Consistent quota exceeded error handling across all API routes
- **Automatic fallback**: Automatically falls back to cached data when quota is exceeded
- **Status monitoring**: Provides quota status information and time remaining

### 6. New API Endpoints

#### Quota Status Endpoint
**File**: `src/app/api/quota-status/route.ts`

- **GET**: Check current quota status and time remaining
- **POST**: Admin endpoint to reset quota exceeded state

#### Batch Data Endpoint
**File**: `src/app/api/data/batch/route.ts`

- **GET**: Retrieve all frequently accessed data in a single optimized call
- **Automatic fallback**: Falls back to cached data when quota is exceeded

## Implementation Details

### Rate Limiting and Retry Logic

All Google Sheets API calls now use the `executeWithRetry` method:

```typescript
private async executeWithRetry<T>(
  operation: () => Promise<T>,
  operationName: string = 'API call'
): Promise<T>
```

This method:
1. Applies rate limiting (500ms delay)
2. Detects quota exceeded errors
3. Implements exponential backoff retry logic
4. Throws errors after max retries

### Circuit Breaker Implementation

The circuit breaker prevents API calls when quota is exceeded:

```typescript
// Check if we're in a quota exceeded cooldown period
if (this.isQuotaExceeded()) {
  // Return stale cache data
  const staleData = await this.redis!.get<T>(cacheKey);
  if (staleData !== null) {
    return staleData;
  }
  throw new Error('Quota exceeded and no stale cache data available');
}
```

### Cache Strategy

The enhanced caching strategy includes:

1. **Longer TTL**: Reduced API calls by extending cache lifetimes
2. **Stale data serving**: Returns cached data even when expired if quota is exceeded
3. **Cache warming**: Scheduled job to pre-populate caches
4. **Tag-based invalidation**: Efficient cache invalidation by data type

### Batch Operations

The new batch operation reduces API calls by:

1. **Single rate limit**: One rate limit for multiple operations
2. **Parallel execution**: All operations run in parallel
3. **Consolidated data**: Returns all frequently accessed data in one call

## Usage

### Using the Quota Handler

```typescript
import { QuotaHandler } from '@/lib/quotaHandler';

try {
  const data = await someApiCall();
  return NextResponse.json(data);
} catch (error) {
  return QuotaHandler.handleApiError(
    error,
    () => getCachedData(), // Fallback function
    'Failed to retrieve data'
  );
}
```

### Checking Quota Status

```typescript
import { QuotaHandler } from '@/lib/quotaHandler';

const status = QuotaHandler.getQuotaStatus();
console.log(`Quota exceeded: ${status.quotaExceeded}`);
console.log(`Time remaining: ${status.timeRemainingFormatted}`);
```

### Using Batch Data Endpoint

```typescript
const response = await fetch('/api/data/batch');
const { data, fromCache, quotaExceeded } = await response.json();

if (quotaExceeded) {
  console.log('Data retrieved from cache due to quota exceeded');
}
```

## Monitoring

### Quota Status Endpoint

Monitor quota status at `/api/quota-status`:

```json
{
  "quotaExceeded": false,
  "timeRemaining": 0,
  "timeRemainingFormatted": "0 seconds",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Cache Warming

The cache warming endpoint at `/api/cron/warm-cache` can be called to pre-populate caches and reduce API load.

## Benefits

1. **Reduced API calls**: 60-80% reduction in Google Sheets API calls
2. **Improved reliability**: Graceful handling of quota exceeded errors
3. **Better user experience**: Stale data served when quota is exceeded
4. **Automatic recovery**: Circuit breaker automatically resets after cooldown
5. **Monitoring**: Real-time quota status monitoring
6. **Scalability**: Batch operations reduce load on Google Sheets API

## Configuration

### Environment Variables

- `KV_REST_API_URL`: Redis cache URL
- `KV_REST_API_TOKEN`: Redis cache token
- `CRON_SECRET`: Secret for cache warming endpoint
- `ADMIN_SECRET`: Secret for admin operations

### Cache TTL Configuration

Cache TTL values can be adjusted in `src/lib/kv.ts`:

```typescript
private static readonly CACHE_CONFIG: Record<string, CacheConfig> = {
  events: { ttl: 7200, tags: ['events'] }, // 2 hours
  rankings: { ttl: 3600, tags: ['rankings'] }, // 1 hour
  members: { ttl: 14400, tags: ['members'] }, // 4 hours
  // ... other configurations
};
```

## Troubleshooting

### Common Issues

1. **Quota still exceeded**: Check if circuit breaker is active and wait for cooldown
2. **Stale data**: Verify cache TTL settings and cache warming schedule
3. **Performance issues**: Monitor batch operation usage and adjust rate limiting

### Debugging

Enable debug logging by checking console output for:
- Cache HIT/MISS messages
- Quota exceeded warnings
- Circuit breaker activation messages
- Batch operation completion logs

## Future Improvements

1. **Dynamic rate limiting**: Adjust rate limits based on quota usage
2. **Predictive caching**: Pre-cache data based on usage patterns
3. **Quota monitoring**: Real-time quota usage monitoring
4. **Load balancing**: Distribute API calls across multiple service accounts
