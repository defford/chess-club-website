"use client"

import React from 'react';
import { EvaluationData } from '@/lib/stockfish-worker';

interface EvaluationBarProps {
  evaluation: EvaluationData | null;
  isAnalyzing: boolean;
}

export function EvaluationBar({ evaluation, isAnalyzing }: EvaluationBarProps) {
  if (isAnalyzing) {
    return (
      <div className="w-full h-8 bg-gray-200 rounded-lg overflow-hidden relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-xs text-gray-600">Analyzing...</div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-200 to-blue-300 animate-pulse"></div>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="w-full h-8 bg-gray-200 rounded-lg flex items-center justify-center">
        <div className="text-xs text-gray-600">No evaluation</div>
      </div>
    );
  }

  // Calculate bar position (0-100%)
  let barPosition = 50; // Default to center (equal position)
  
  if (evaluation.mate) {
    // Mate positions - extreme positions
    barPosition = evaluation.mate > 0 ? 95 : 5;
  } else {
    // Convert score to percentage (clamp between -5 and +5 for display)
    // Score is always from White's perspective: positive = White advantage, negative = Black advantage
    const clampedScore = Math.max(-5, Math.min(5, evaluation.score));
    barPosition = 50 + (clampedScore * 8); // Scale to 10-90% range
  }

  const isWhiteAdvantage = evaluation.score > 0 || (evaluation.mate && evaluation.mate > 0);
  const barColor = isWhiteAdvantage ? 'bg-white' : 'bg-gray-800';

  return (
    <div className="w-full h-8 bg-gradient-to-r from-gray-800 to-white rounded-lg overflow-hidden relative">
      {/* Evaluation bar */}
      <div
        className={`absolute top-0 h-full w-1 ${barColor} transition-all duration-300`}
        style={{ left: `${barPosition}%` }}
      />
      
      {/* Score display */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-xs font-medium text-gray-700 bg-white/80 px-2 py-1 rounded">
          {evaluation.mate ? 
            `#${Math.abs(evaluation.mate)}` : 
            `${evaluation.score > 0 ? '+' : ''}${evaluation.score.toFixed(2)}`
          }
        </div>
      </div>
      
      {/* Depth indicator */}
      <div className="absolute bottom-0 right-1 text-xs text-gray-500">
        {evaluation.depth}
      </div>
    </div>
  );
}
