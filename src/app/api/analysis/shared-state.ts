import { Redis } from '@upstash/redis';
import { GameHistory } from '@/lib/types';

// Global state for analysis board
export interface AnalysisState {
  currentMoveIndex: number;
  gameHistory: GameHistory | null;
  lastUpdated: string;
}

// Store active connections for SSE
export const connections = new Set<ReadableStreamDefaultController>();

const ANALYSIS_STATE_KEY = 'analysis:state';

// Initialize with default state
let globalState: AnalysisState = {
  currentMoveIndex: -1,
  gameHistory: null,
  lastUpdated: new Date().toISOString(),
};

const redis = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  ? new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  : null;

let initialized = false;
let initPromise: Promise<void> | null = null;

async function hydrateFromStore() {
  if (!redis) {
    initialized = true;
    return;
  }

  try {
    const stored = await redis.get<AnalysisState>(ANALYSIS_STATE_KEY);
    if (stored && typeof stored === 'object') {
      globalState = {
        currentMoveIndex: typeof stored.currentMoveIndex === 'number' ? stored.currentMoveIndex : -1,
        gameHistory: stored.gameHistory ?? null,
        lastUpdated: typeof stored.lastUpdated === 'string' ? stored.lastUpdated : new Date().toISOString(),
      };
    }
  } catch (error) {
    console.error('[Shared State] Failed to hydrate from Redis:', error);
  } finally {
    initialized = true;
  }
}

async function ensureInitialized() {
  if (initialized) return;
  if (!initPromise) {
    initPromise = hydrateFromStore();
  }
  await initPromise;
}

async function persistState(state: AnalysisState) {
  if (!redis) return;
  try {
    await redis.set(ANALYSIS_STATE_KEY, state);
  } catch (error) {
    console.error('[Shared State] Failed to persist state to Redis:', error);
  }
}

// Get current state
export async function getCurrentState(): Promise<AnalysisState> {
  await ensureInitialized();
  return globalState;
}

// Update state
export async function updateState(updates: Partial<AnalysisState>): Promise<AnalysisState> {
  await ensureInitialized();
  globalState = {
    ...globalState,
    ...updates,
    lastUpdated: new Date().toISOString(),
  };
  await persistState(globalState);
  return globalState;
}

// Broadcast state changes to all connected clients
export function broadcastStateChange(state: AnalysisState) {
  const data = JSON.stringify({
    type: 'state-change',
    state,
  });

  console.log('[Shared State] Broadcasting to', connections.size, 'connections');
  let successCount = 0;
  let errorCount = 0;

  connections.forEach(controller => {
    try {
      controller.enqueue(`data: ${data}\n\n`);
      successCount++;
    } catch (error) {
      // Remove dead connections
      console.log('[Shared State] Removing dead connection:', error);
      connections.delete(controller);
      errorCount++;
    }
  });
  
  console.log('[Shared State] Broadcast complete - success:', successCount, 'errors:', errorCount);
}

