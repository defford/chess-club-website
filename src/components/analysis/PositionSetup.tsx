"use client"

import React, { useState } from 'react';
import { Chess } from 'chess.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RotateCcw, Upload } from 'lucide-react';

interface PositionSetupProps {
  onPositionChange: (fen: string) => void;
  currentFen: string;
}

export function PositionSetup({ onPositionChange, currentFen }: PositionSetupProps) {
  const [fenInput, setFenInput] = useState('');
  const [error, setError] = useState('');

  const handleLoadPosition = () => {
    try {
      const game = new Chess(fenInput);
      onPositionChange(game.fen());
      setError('');
    } catch (err) {
      setError('Invalid FEN position');
    }
  };

  const handleResetToStart = () => {
    const game = new Chess();
    onPositionChange(game.fen());
    setFenInput('');
    setError('');
  };

  const handleLoadCurrentFen = () => {
    setFenInput(currentFen);
    setError('');
  };

  const handlePGNImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const pgn = e.target?.result as string;
        const game = new Chess();
        game.loadPgn(pgn);
        onPositionChange(game.fen());
        setError('');
      } catch (err) {
        setError('Invalid PGN file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Position Setup</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* FEN Input */}
        <div>
          <label className="text-sm font-medium text-[--color-text-primary] mb-2 block">
            FEN Position:
          </label>
          <div className="flex gap-2">
            <Input
              value={fenInput}
              onChange={(e) => setFenInput(e.target.value)}
              placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadPosition}
              disabled={!fenInput.trim()}
            >
              Load
            </Button>
          </div>
          {error && (
            <p className="text-sm text-red-600 mt-1">{error}</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetToStart}
            className="flex-1"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Start Position
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadCurrentFen}
            className="flex-1"
          >
            Current FEN
          </Button>
        </div>

        {/* PGN Import */}
        <div>
          <label className="text-sm font-medium text-[--color-text-primary] mb-2 block">
            Import PGN:
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept=".pgn"
              onChange={handlePGNImport}
              className="flex-1"
            />
            <Upload className="h-4 w-4 text-[--color-text-secondary]" />
          </div>
        </div>

        {/* Current FEN Display */}
        <div>
          <label className="text-sm font-medium text-[--color-text-primary] mb-2 block">
            Current Position:
          </label>
          <div className="p-2 bg-gray-50 rounded text-xs font-mono break-all">
            {currentFen}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}



