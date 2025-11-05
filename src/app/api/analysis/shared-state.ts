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

  connections.forEach(controller => {
    try {
      controller.enqueue(`data: ${data}\n\n`);
    } catch {
      // Remove dead connections
      connections.delete(controller);
    }
  });
}

