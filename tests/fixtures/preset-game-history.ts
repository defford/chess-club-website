import { Chess } from 'chess.js';
import { GameHistory, GameHistoryMove } from '../../src/lib/types';

/**
 * Generate a preset game history with a well-known opening sequence.
 * Uses the Ruy Lopez opening (10 moves) to create predictable board states.
 */
export function generatePresetGameHistory(): GameHistory {
  const game = new Chess();
  const moves: GameHistoryMove[] = [];
  
  // Ruy Lopez opening sequence
  const moveSequence = [
    'e4', 'e5',        // 1. e4 e5
    'Nf3', 'Nc6',      // 2. Nf3 Nc6
    'Bb5', 'a6',       // 3. Bb5 a6
    'Ba4', 'Nf6',      // 4. Ba4 Nf6
    'O-O', 'Be7',      // 5. O-O Be7
  ];

  let moveNumber = 1;
  let isWhiteMove = true;

  for (const move of moveSequence) {
    try {
      const moveObj = game.move(move);
      if (moveObj) {
        moves.push({
          moveNumber: isWhiteMove ? moveNumber : moveNumber,
          move: moveObj.san,
          fen: game.fen(),
          timestamp: new Date().toISOString(),
          isWhiteMove,
        });

        if (!isWhiteMove) {
          moveNumber++;
        }
        isWhiteMove = !isWhiteMove;
      }
    } catch (error) {
      console.error(`Failed to make move ${move}:`, error);
      break;
    }
  }

  return {
    id: `test-game-${Date.now()}`,
    startFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    moves,
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    currentMoveIndex: -1, // Start at beginning position
  };
}

/**
 * Get expected FEN for a given move index.
 * Returns the starting FEN if index is -1, otherwise returns the FEN after that move.
 */
export function getExpectedFENForMoveIndex(
  gameHistory: GameHistory,
  moveIndex: number
): string {
  if (moveIndex === -1) {
    return gameHistory.startFen;
  }
  
  if (moveIndex >= 0 && moveIndex < gameHistory.moves.length) {
    return gameHistory.moves[moveIndex].fen;
  }
  
  throw new Error(`Invalid move index: ${moveIndex}`);
}

