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

  // Fetch initial state
  useEffect(() => {
    const fetchInitialState = async () => {
      try {
        const response = await fetch('/api/analysis/state/current');
        if (response.ok) {
          const data = await response.json();
          setState(data.state);
        }
      } catch (error) {
        console.error('Failed to fetch initial state:', error);
      }
    };

    fetchInitialState();
  }, []);

  // Subscribe to SSE stream
  useEffect(() => {
    const eventSource = new EventSource('/api/analysis/state');

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'connected' || data.type === 'state-change') {
          setState(data.state);
        }
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Navigate to first move
  const goToFirst = async () => {
    if (!state) return;
    
    try {
      await fetch('/api/analysis/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentMoveIndex: -1, // -1 means starting position
        }),
      });
    } catch (error) {
      console.error('Failed to navigate to first:', error);
    }
  };

  // Navigate to previous move
  const goToPrevious = async () => {
    if (!state) return;
    
    const newIndex = state.currentMoveIndex - 1;
    const minIndex = -1;
    
    if (newIndex < minIndex) return; // Already at first
    
    try {
      await fetch('/api/analysis/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentMoveIndex: newIndex,
        }),
      });
    } catch (error) {
      console.error('Failed to navigate to previous:', error);
    }
  };

  // Navigate to next move
  const goToNext = async () => {
    if (!state || !state.gameHistory) return;
    
    const maxIndex = state.gameHistory.moves.length - 1;
    const newIndex = state.currentMoveIndex + 1;
    
    if (newIndex > maxIndex) return; // Already at last
    
    try {
      await fetch('/api/analysis/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentMoveIndex: newIndex,
        }),
      });
    } catch (error) {
      console.error('Failed to navigate to next:', error);
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
              variant={isAtFirst ? "outline" : "primary"}
            >
              <RotateCcw className="mr-2 h-6 w-6" />
              First Move
            </Button>

            {/* Previous Move Button */}
            <Button
              onClick={goToPrevious}
              disabled={!canGoPrevious}
              className="h-32 text-xl font-bold py-8"
              variant={!canGoPrevious ? "outline" : "primary"}
            >
              <ChevronLeft className="mr-2 h-6 w-6" />
              Previous
            </Button>

            {/* Next Move Button */}
            <Button
              onClick={goToNext}
              disabled={!canGoNext}
              className="h-32 text-xl font-bold py-8"
              variant={!canGoNext ? "outline" : "primary"}
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

