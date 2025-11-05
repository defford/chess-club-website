import { GameHistory } from '@/lib/types';

// Global state for analysis board
export interface AnalysisState {
  currentMoveIndex: number;
  gameHistory: GameHistory | null;
  lastUpdated: string;
}

// Store active connections for SSE
export const connections = new Set<ReadableStreamDefaultController>();

// Initialize with default state
let globalState: AnalysisState = {
  currentMoveIndex: -1,
  gameHistory: null,
  lastUpdated: new Date().toISOString(),
};

// Get current state
export function getCurrentState(): AnalysisState {
  return globalState;
}

// Update state
export function updateState(updates: Partial<AnalysisState>): AnalysisState {
  globalState = {
    ...globalState,
    ...updates,
    lastUpdated: new Date().toISOString(),
  };
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

