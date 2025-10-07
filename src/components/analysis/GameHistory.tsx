"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GameHistoryMove } from '@/lib/types';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

interface GameHistoryProps {
  moves: GameHistoryMove[];
  currentMoveIndex: number;
  onMoveSelect: (moveIndex: number) => void;
  onReset: () => void;
}

export function GameHistory({ moves, currentMoveIndex, onMoveSelect, onReset }: GameHistoryProps) {
  const formatEvaluation = (evaluation?: GameHistoryMove['evaluation']) => {
    if (!evaluation) return 'N/A';
    
    if (evaluation.mate) {
      return `#${evaluation.mate}`;
    }
    
    const score = evaluation.score > 0 ? `+${evaluation.score.toFixed(1)}` : evaluation.score.toFixed(1);
    return score;
  };

  const getEvaluationColor = (evaluation?: GameHistoryMove['evaluation']) => {
    if (!evaluation) return 'text-gray-500';
    
    if (evaluation.mate) {
      return evaluation.mate > 0 ? 'text-green-600' : 'text-red-600';
    }
    
    if (evaluation.score > 0.5) return 'text-green-600';
    if (evaluation.score < -0.5) return 'text-red-600';
    return 'text-gray-600';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Game History</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMoveSelect(Math.max(0, currentMoveIndex - 1))}
              disabled={currentMoveIndex <= 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMoveSelect(Math.min(moves.length - 1, currentMoveIndex + 1))}
              disabled={currentMoveIndex >= moves.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              title="Reset to start"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {moves.length === 0 ? (
          <div className="text-center text-sm text-gray-500 py-4">
            No moves recorded yet
          </div>
        ) : (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {/* Render rows where each row contains white and black moves for the move number */}
            {Array.from({ length: Math.ceil(moves.length / 2) }).map((_, pairIndex) => {
              const whiteIndex = pairIndex * 2;
              const blackIndex = whiteIndex + 1;
              const whiteMove = moves[whiteIndex];
              const blackMove = moves[blackIndex];

              const isWhiteActive = currentMoveIndex === whiteIndex;
              const isBlackActive = currentMoveIndex === blackIndex;

              return (
                <div key={pairIndex} className="grid grid-cols-[2rem_1fr_1fr] gap-2 items-stretch">
                  {/* Move number once per row */}
                  <div className="flex items-center justify-end pr-1">
                    <span className="text-sm font-medium text-gray-600">{whiteMove?.moveNumber}.</span>
                  </div>

                  {/* White move cell */}
                  <button
                    type="button"
                    className={`flex items-center justify-between p-2 rounded text-left transition-colors border ${
                      isWhiteActive ? 'bg-blue-100 border-blue-300' : 'hover:bg-gray-50 border-transparent'
                    } ${!whiteMove ? 'opacity-50 cursor-default' : 'cursor-pointer'}`}
                    onClick={() => whiteMove && onMoveSelect(whiteIndex)}
                    disabled={!whiteMove}
                  >
                    <span className="font-mono text-sm font-medium truncate">
                      {whiteMove ? whiteMove.move : ''}
                    </span>
                  </button>

                  {/* Black move cell */}
                  <button
                    type="button"
                    className={`flex items-center justify-between p-2 rounded text-left transition-colors border ${
                      isBlackActive ? 'bg-blue-100 border-blue-300' : 'hover:bg-gray-50 border-transparent'
                    } ${!blackMove ? 'opacity-50 cursor-default' : 'cursor-pointer'}`}
                    onClick={() => blackMove && onMoveSelect(blackIndex)}
                    disabled={!blackMove}
                  >
                    <span className="font-mono text-sm font-medium truncate">
                      {blackMove ? blackMove.move : ''}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
        
        {moves.length > 0 && (
          <div className="mt-4 pt-3 border-t text-xs text-gray-500 text-center">
            Move {currentMoveIndex + 1} of {moves.length}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
