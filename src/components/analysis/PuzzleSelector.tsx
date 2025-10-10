"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Loader2 } from 'lucide-react';
import type { PuzzleParams } from '@/lib/types';

interface PuzzleSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadPuzzle: (params: PuzzleParams) => Promise<void>;
  isLoading: boolean;
}

const PUZZLE_THEMES = [
  { value: 'mateIn1', label: 'Mate in 1' },
  { value: 'mateIn2', label: 'Mate in 2' },
  { value: 'mateIn3', label: 'Mate in 3' },
  { value: 'mateIn4', label: 'Mate in 4' },
  { value: 'mateIn5', label: 'Mate in 5' },
  { value: 'endgame', label: 'Endgame' },
  { value: 'middlegame', label: 'Middlegame' },
  { value: 'opening', label: 'Opening' },
  { value: 'attraction', label: 'Attraction' },
  { value: 'backRankMate', label: 'Back Rank Mate' },
  { value: 'deflection', label: 'Deflection' },
  { value: 'discoveredAttack', label: 'Discovered Attack' },
  { value: 'doubleCheck', label: 'Double Check' },
  { value: 'fork', label: 'Fork' },
  { value: 'hangingPiece', label: 'Hanging Piece' },
  { value: 'interference', label: 'Interference' },
  { value: 'pin', label: 'Pin' },
  { value: 'sacrifice', label: 'Sacrifice' },
  { value: 'skewer', label: 'Skewer' },
  { value: 'trappedPiece', label: 'Trapped Piece' },
  { value: 'xRayAttack', label: 'X-Ray Attack' }
];

const DIFFICULTY_LEVELS = [
  { value: 'beginner', label: 'Beginner (800-1200)', min: 800, max: 1200 },
  { value: 'intermediate', label: 'Intermediate (1200-1600)', min: 1200, max: 1600 },
  { value: 'advanced', label: 'Advanced (1600-2000)', min: 1600, max: 2000 },
  { value: 'expert', label: 'Expert (2000+)', min: 2000, max: 3000 }
];

export function PuzzleSelector({ isOpen, onClose, onLoadPuzzle, isLoading }: PuzzleSelectorProps) {
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('intermediate');
  const [selectedColor, setSelectedColor] = useState<'white' | 'black' | 'random'>('random');

  const handleThemeToggle = (theme: string) => {
    setSelectedThemes(prev => 
      prev.includes(theme) 
        ? prev.filter(t => t !== theme)
        : [...prev, theme]
    );
  };

  const handleLoadPuzzle = async () => {
    const difficulty = DIFFICULTY_LEVELS.find(d => d.value === selectedDifficulty);
    
    const params: PuzzleParams = {
      themes: selectedThemes.length > 0 ? selectedThemes : undefined,
      rating: difficulty ? { min: difficulty.min, max: difficulty.max } : undefined,
      color: selectedColor
    };

    await onLoadPuzzle(params);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Load Chess Puzzle</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Theme Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Puzzle Themes</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {PUZZLE_THEMES.map(theme => (
                <Button
                  key={theme.value}
                  variant="outline"
                  size="sm"
                  onClick={() => handleThemeToggle(theme.value)}
                  disabled={isLoading}
                  className={`text-xs ${selectedThemes.includes(theme.value) ? 'bg-blue-50 border-blue-500 text-blue-700' : ''}`}
                >
                  {theme.label}
                </Button>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Select specific themes or leave empty for any theme
            </p>
          </div>

          {/* Difficulty Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Difficulty Level</h3>
            <div className="space-y-2">
              {DIFFICULTY_LEVELS.map(level => (
                <label key={level.value} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="difficulty"
                    value={level.value}
                    checked={selectedDifficulty === level.value}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    disabled={isLoading}
                    className="text-blue-600"
                  />
                  <span className="text-sm">{level.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Color Preference */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Color to Play</h3>
            <div className="space-y-2">
              {[
                { value: 'white', label: 'White to move' },
                { value: 'black', label: 'Black to move' },
                { value: 'random', label: 'Random' }
              ].map(option => (
                <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="color"
                    value={option.value}
                    checked={selectedColor === option.value}
                    onChange={(e) => setSelectedColor(e.target.value as 'white' | 'black' | 'random')}
                    disabled={isLoading}
                    className="text-blue-600"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleLoadPuzzle}
              disabled={isLoading}
              className="min-w-[120px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load Puzzle'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
