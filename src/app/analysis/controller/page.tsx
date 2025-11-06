"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { GameHistory } from '@/lib/types';

interface AnalysisState {
  currentMoveIndex: number;
  gameHistory: GameHistory | null;
  lastUpdated: string;
}

export default function AnalysisControllerPage() {
  const [state, setState] = useState<AnalysisState | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Log state changes
  useEffect(() => {
    console.log('[Controller] State changed:', {
      hasState: !!state,
      currentMoveIndex: state?.currentMoveIndex,
      lastUpdated: state?.lastUpdated,
      hasGameHistory: !!state?.gameHistory,
      movesCount: state?.gameHistory?.moves?.length,
    });
  }, [state]);

  // Fetch initial state
  useEffect(() => {
    console.log('[Controller] Fetching initial state');
    const fetchInitialState = async () => {
      try {
        console.log('[Controller] Calling /api/analysis/state/current');
        const response = await fetch('/api/analysis/state/current');
        console.log('[Controller] Initial state response:', response.status, response.statusText);
        
        if (response.ok) {
          const data = await response.json();
          console.log('[Controller] Initial state data:', {
            success: data.success,
            currentMoveIndex: data.state?.currentMoveIndex,
            lastUpdated: data.state?.lastUpdated,
            hasGameHistory: !!data.state?.gameHistory,
            movesCount: data.state?.gameHistory?.moves?.length,
          });
          setState(data.state);
          console.log('[Controller] Initial state set');
        } else {
          console.warn('[Controller] Initial state fetch failed:', response.status);
        }
      } catch (error) {
        console.error('[Controller] Failed to fetch initial state:', error);
      }
    };

    fetchInitialState();
  }, []);

  // Subscribe to SSE stream
  useEffect(() => {
    console.log('[Controller] Setting up SSE connection');
    const eventSource = new EventSource('/api/analysis/state');

    eventSource.onopen = () => {
      console.log('[Controller] SSE connection opened');
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[Controller] SSE message received:', {
          type: data.type,
          currentMoveIndex: data.state?.currentMoveIndex,
          lastUpdated: data.state?.lastUpdated,
          hasGameHistory: !!data.state?.gameHistory,
          movesCount: data.state?.gameHistory?.moves?.length,
        });
        
        if (data.type === 'connected' || data.type === 'state-change') {
          console.log('[Controller] Updating state from SSE');
          setState(data.state);
          console.log('[Controller] State updated, new currentMoveIndex:', data.state?.currentMoveIndex);
        } else {
          console.log('[Controller] SSE message type not handled:', data.type);
        }
      } catch (error) {
        console.error('[Controller] Failed to parse SSE message:', error, 'Raw data:', event.data);
      }
    };

    eventSource.onerror = (error) => {
      console.error('[Controller] SSE connection error:', error);
      console.log('[Controller] SSE readyState:', eventSource.readyState);
      setIsConnected(false);
      if (eventSource.readyState === EventSource.CLOSED) {
        console.log('[Controller] SSE connection closed');
      }
    };

    return () => {
      console.log('[Controller] Cleaning up SSE connection');
      eventSource.close();
    };
  }, []);

  // Navigate to first move
  const goToFirst = async () => {
    console.log('[Controller] goToFirst called, current state:', {
      hasState: !!state,
      currentMoveIndex: state?.currentMoveIndex,
    });
    
    if (!state) {
      console.warn('[Controller] goToFirst: No state available, aborting');
      return;
    }
    
    try {
      const targetIndex = -1;
      console.log('[Controller] Sending POST to navigate to first move (index:', targetIndex, ')');
      console.log('[Controller] Current move index before POST:', state.currentMoveIndex);
      
      const response = await fetch('/api/analysis/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentMoveIndex: targetIndex,
        }),
      });
      
      console.log('[Controller] POST response status:', response.status, response.statusText);
      const result = await response.json();
      console.log('[Controller] POST response data:', {
        success: result.success,
        newMoveIndex: result.state?.currentMoveIndex,
        lastUpdated: result.state?.lastUpdated,
      });
      
      if (result.success) {
        console.log('[Controller] Successfully updated to first move');
      } else {
        console.warn('[Controller] POST returned success=false:', result);
      }
    } catch (error) {
      console.error('[Controller] Failed to navigate to first:', error);
    }
  };

  // Navigate to previous move
  const goToPrevious = async () => {
    console.log('[Controller] goToPrevious called, current state:', {
      hasState: !!state,
      currentMoveIndex: state?.currentMoveIndex,
    });
    
    if (!state) {
      console.warn('[Controller] goToPrevious: No state available, aborting');
      return;
    }
    
    const newIndex = state.currentMoveIndex - 1;
    const minIndex = -1;
    
    console.log('[Controller] goToPrevious: Calculating new index:', {
      currentIndex: state.currentMoveIndex,
      newIndex,
      minIndex,
    });
    
    if (newIndex < minIndex) {
      console.log('[Controller] goToPrevious: Already at first, aborting');
      return; // Already at first
    }
    
    try {
      console.log('[Controller] Sending POST to navigate to previous move (index:', newIndex, ')');
      console.log('[Controller] Current move index before POST:', state.currentMoveIndex);
      
      const response = await fetch('/api/analysis/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentMoveIndex: newIndex,
        }),
      });
      
      console.log('[Controller] POST response status:', response.status, response.statusText);
      const result = await response.json();
      console.log('[Controller] POST response data:', {
        success: result.success,
        newMoveIndex: result.state?.currentMoveIndex,
        lastUpdated: result.state?.lastUpdated,
      });
      
      if (result.success) {
        console.log('[Controller] Successfully updated to previous move');
      } else {
        console.warn('[Controller] POST returned success=false:', result);
      }
    } catch (error) {
      console.error('[Controller] Failed to navigate to previous:', error);
    }
  };

  // Navigate to next move
  const goToNext = async () => {
    console.log('[Controller] goToNext called, current state:', {
      hasState: !!state,
      hasGameHistory: !!state?.gameHistory,
      currentMoveIndex: state?.currentMoveIndex,
      movesLength: state?.gameHistory?.moves?.length,
    });
    
    if (!state || !state.gameHistory) {
      console.warn('[Controller] goToNext: No state or game history available, aborting');
      return;
    }
    
    const maxIndex = state.gameHistory.moves.length - 1;
    const newIndex = state.currentMoveIndex + 1;
    
    console.log('[Controller] goToNext: Calculating new index:', {
      currentIndex: state.currentMoveIndex,
      newIndex,
      maxIndex,
      movesLength: state.gameHistory.moves.length,
    });
    
    if (newIndex > maxIndex) {
      console.log('[Controller] goToNext: Already at last move, aborting');
      return; // Already at last
    }
    
    try {
      console.log('[Controller] Sending POST to navigate to next move (index:', newIndex, ')');
      console.log('[Controller] Current move index before POST:', state.currentMoveIndex);
      
      const response = await fetch('/api/analysis/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentMoveIndex: newIndex,
        }),
      });
      
      console.log('[Controller] POST response status:', response.status, response.statusText);
      const result = await response.json();
      console.log('[Controller] POST response data:', {
        success: result.success,
        newMoveIndex: result.state?.currentMoveIndex,
        lastUpdated: result.state?.lastUpdated,
      });
      
      if (result.success) {
        console.log('[Controller] Successfully updated to next move');
      } else {
        console.warn('[Controller] POST returned success=false:', result);
      }
    } catch (error) {
      console.error('[Controller] Failed to navigate to next:', error);
    }
  };

  // Determine button states
  const canGoPrevious = state ? state.currentMoveIndex > -1 : false;
  const canGoNext = state && state.gameHistory 
    ? state.currentMoveIndex < state.gameHistory.moves.length - 1 
    : false;
  const isAtFirst = state ? state.currentMoveIndex === -1 : true;

  // Get current move info
  const currentMoveInfo = state && state.gameHistory && state.currentMoveIndex >= 0
    ? state.gameHistory.moves[state.currentMoveIndex]
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Analysis Board Controller</CardTitle>
          <div className="text-center text-sm text-gray-500 mt-2">
            {isConnected ? (
              <span className="text-green-600">● Connected</span>
            ) : (
              <span className="text-red-600">● Disconnected</span>
            )}
            {state && state.gameHistory && (
              <span className="ml-4">
                Move {state.currentMoveIndex + 1} of {state.gameHistory.moves.length + 1}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* First Move Button */}
            <Button
              onClick={goToFirst}
              disabled={isAtFirst}
              className="h-32 text-xl font-bold py-8"
              variant="outline"
            >
              <RotateCcw className="mr-2 h-6 w-6" />
              First Move
            </Button>

            {/* Previous Move Button */}
            <Button
              onClick={goToPrevious}
              disabled={!canGoPrevious}
              className="h-32 text-xl font-bold py-8"
              variant="outline"
            >
              <ChevronLeft className="mr-2 h-6 w-6" />
              Previous
            </Button>

            {/* Next Move Button */}
            <Button
              onClick={goToNext}
              disabled={!canGoNext}
              className="h-32 text-xl font-bold py-8"
              variant="outline"
            >
              Next
              <ChevronRight className="ml-2 h-6 w-6" />
            </Button>
          </div>

          {/* Current Position Info */}
          {currentMoveInfo && (
            <div className="mt-6 text-center text-sm text-gray-600">
              <p>Current Move: {currentMoveInfo.move}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

