"use client"

import React from 'react';
import { EvaluationData } from '@/lib/stockfish-worker';

interface VerticalEvaluationBarProps {
  evaluation: EvaluationData | null;
  isAnalyzing: boolean;
  height?: string;
}

export function VerticalEvaluationBar({ evaluation, isAnalyzing, height = "400px" }: VerticalEvaluationBarProps) {
  const heightClass = height === "100%" ? "min-h-full" : "";
  const heightStyle = height === "100%" ? {} : { height };
  
  if (isAnalyzing) {
    return (
      <div 
        className={`w-12 bg-gray-200 rounded-lg overflow-hidden relative flex flex-col justify-center items-center ${heightClass}`}
        style={heightStyle}
      >
        <div className="text-xs text-gray-600 transform -rotate-90 whitespace-nowrap">
          Analyzing...
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-blue-200 to-blue-300 animate-pulse"></div>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div 
        className={`w-12 bg-gray-200 rounded-lg flex flex-col justify-center items-center ${heightClass}`}
        style={heightStyle}
      >
        <div className="text-xs text-gray-600 transform -rotate-90 whitespace-nowrap">
          No evaluation
        </div>
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
    <div 
      className={`w-12 bg-gradient-to-b from-white to-gray-800 rounded-lg overflow-hidden relative ${heightClass}`}
      style={heightStyle}
    >
      {/* Evaluation bar */}
      <div
        className={`absolute left-0 w-full h-1 ${barColor} transition-all duration-300`}
        style={{ top: `${100 - barPosition}%` }}
      />
      
      {/* Score display */}
      <div className="absolute inset-0 flex flex-col justify-center items-center">
        <div className="text-xs font-medium text-gray-700 bg-white/80 px-1 py-1 rounded transform -rotate-90 whitespace-nowrap">
          {evaluation.mate ? 
            `#${Math.abs(evaluation.mate)}` : 
            `${evaluation.score > 0 ? '+' : ''}${evaluation.score.toFixed(2)}`
          }
        </div>
      </div>
      
      {/* Depth indicator */}
      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-xs text-gray-500">
        {evaluation.depth}
      </div>
      
      {/* Center line indicator for 0.00 */}
      <div className="absolute left-0 right-0 h-px bg-gray-400" style={{ top: '50%' }} />
    </div>
  );
}
