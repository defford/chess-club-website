"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RotateCcw, Play, Square, BarChart3, PanelRight, Edit3, Check, Puzzle, ArrowRight } from 'lucide-react';
import { StockfishWorker, StockfishMessage, EvaluationData } from '@/lib/stockfish-worker';
import { VerticalEvaluationBar } from '@/components/analysis/VerticalEvaluationBar';
import { PositionSetup } from '@/components/analysis/PositionSetup';
import { GameHistory } from '@/components/analysis/GameHistory';
import { PuzzleSelector } from '@/components/analysis/PuzzleSelector';
import { GameHistoryMove, GameHistory as GameHistoryType, PuzzleData, PuzzleParams, PuzzleState } from '@/lib/types';

// Types
interface MoveNode {
  move: string;
  fen: string;
  evaluation?: number;
  children: MoveNode[];
  parent?: MoveNode;
}

interface Evaluation extends EvaluationData {}

export function AnalysisBoardClient() {
  // Game state
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Move tree
  const [moveTree, setMoveTree] = useState<MoveNode>({
    move: '',
    fen: game.fen(),
    children: []
  });
  const [currentNode, setCurrentNode] = useState<MoveNode>(moveTree);
  
  // Game history - initialize with empty state to avoid hydration mismatch
  const [gameHistory, setGameHistory] = useState<GameHistoryType>({
    id: `game-${Date.now()}`,
    startFen: game.fen(),
    moves: [],
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    currentMoveIndex: -1
  });
  
  // Worker reference
  const workerRef = useRef<StockfishWorker | null>(null);
  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load game history from localStorage after hydration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chess-analysis-history');
      if (saved) {
        try {
          const parsedHistory = JSON.parse(saved);
          setGameHistory(parsedHistory);
        } catch (error) {
          console.error('Failed to parse saved game history:', error);
        }
      }
    }
  }, []); // Only run once after hydration

  // Save game history to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('chess-analysis-history', JSON.stringify(gameHistory));
    }
  }, [gameHistory]);

  // Initialize Stockfish worker
  useEffect(() => {
    const initWorker = () => {
      try {
        const worker = new StockfishWorker((message: StockfishMessage) => {
          switch (message.type) {
            case 'ready':
              console.log('Stockfish engine ready');
              break;
            case 'evaluation':
              setEvaluation(message.data);
              // Update the latest move with evaluation
              if (gameHistory.moves.length > 0) {
                setGameHistory(prev => ({
                  ...prev,
                  moves: prev.moves.map((move, index) => 
                    index === prev.moves.length - 1 
                      ? {
                          ...move,
                          evaluation: {
                            score: message.data.score,
                            mate: message.data.mate,
                            depth: message.data.depth,
                            bestMove: message.data.bestMove,
                            pv: message.data.pv
                          }
                        }
                      : move
                  )
                }));
              }
              break;
            case 'bestmove':
              setIsAnalyzing(false);
              break;
            case 'error':
              console.error('Stockfish error:', message.data);
              setIsAnalyzing(false);
              break;
          }
        });
        
        workerRef.current = worker;
        
      } catch (error) {
        console.error('Failed to initialize Stockfish worker:', error);
      }
    };

    initWorker();

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, []);

  // Record move in game history
  const recordMove = (move: any, fen: string, evaluation?: Evaluation) => {
    const moveNumber = Math.floor(gameHistory.moves.length / 2) + 1;
    const isWhiteMove = gameHistory.moves.length % 2 === 0;
    
    const historyMove: GameHistoryMove = {
      moveNumber,
      move: move.san,
      fen,
      evaluation: evaluation ? {
        score: evaluation.score,
        mate: evaluation.mate,
        depth: evaluation.depth,
        bestMove: evaluation.bestMove,
        pv: evaluation.pv
      } : undefined,
      timestamp: new Date().toISOString(),
      isWhiteMove
    };

    setGameHistory(prev => ({
      ...prev,
      moves: [...prev.moves, historyMove],
      currentMoveIndex: prev.moves.length,
      lastUpdated: new Date().toISOString()
    }));
  };

  // Handle piece drop
  const onPieceDrop = (sourceSquare: string, targetSquare: string, piece?: string) => {
    console.log('🚀 onPieceDrop called:', {
      sourceSquare,
      targetSquare,
      piece,
      isCustomBoardMode,
      isPuzzleMode: puzzleState.isPuzzleMode
    });
    
    // Handle custom board mode
    if (isCustomBoardMode) {
      return handleCustomPieceDrop(sourceSquare, targetSquare, piece);
    }

    // Handle puzzle mode
    if (puzzleState.isPuzzleMode) {
      return handlePuzzleMove(sourceSquare, targetSquare);
    }

    // Handle normal analysis mode
    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q' // Always promote to queen for simplicity
      });

      if (move) {
        const newGame = new Chess(game.fen());
        setGame(newGame);
        setFen(newGame.fen());
        
        // Update move tree
        const newMove = {
          move: move.san,
          fen: newGame.fen(),
          children: []
        };
        
        setCurrentNode(prev => {
          const updated = { ...prev };
          updated.children.push(newMove);
          return updated;
        });
        
        setCurrentNode(newMove);
        
        // Record move in history (without evaluation initially)
        recordMove(move, newGame.fen());
        
        // Start analysis
        startAnalysis(newGame.fen());
        
        return true;
      }
    } catch (error) {
      console.error('Invalid move:', error);
    }
    
    return false;
  };

  // Start analysis
  const startAnalysis = (positionFen: string) => {
    if (!workerRef.current || !workerRef.current.isEngineReady()) return;
    
    setIsAnalyzing(true);
    setEvaluation(null);
    
    // Cancel previous analysis
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }
    
    // Set position and start analysis
    workerRef.current.setPosition(positionFen);
    workerRef.current.startAnalysis(18);
  };

  // Reset to starting position
  const resetPosition = () => {
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setEvaluation(null);
    setIsAnalyzing(false);
    
    const newTree = {
      move: '',
      fen: newGame.fen(),
      children: []
    };
    setMoveTree(newTree);
    setCurrentNode(newTree);
    
    // Reset game history
    setGameHistory({
      id: `game-${Date.now()}`,
      startFen: newGame.fen(),
      moves: [],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      currentMoveIndex: -1
    });
  };

  // Go back one move
  const goBack = () => {
    if (currentNode.parent) {
      setCurrentNode(currentNode.parent);
      setGame(new Chess(currentNode.parent.fen));
      setFen(currentNode.parent.fen);
      startAnalysis(currentNode.parent.fen);
    }
  };

  // Navigate to a specific move in history
  const navigateToMove = (moveIndex: number) => {
    if (moveIndex < 0 || moveIndex >= gameHistory.moves.length) return;
    
    const targetMove = gameHistory.moves[moveIndex];
    const newGame = new Chess(targetMove.fen);
    setGame(newGame);
    setFen(targetMove.fen);
    setEvaluation(targetMove.evaluation || null);
    setIsAnalyzing(false);
    
    // Update current move index
    setGameHistory(prev => ({
      ...prev,
      currentMoveIndex: moveIndex
    }));
    
    // Start analysis for the position
    startAnalysis(targetMove.fen);
  };

  // Flip board
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
  const flipBoard = () => {
    setBoardOrientation(prev => prev === 'white' ? 'black' : 'white');
  };

  // Evaluation bar visibility toggle
  const [showEvaluationBar, setShowEvaluationBar] = useState(true);
  const toggleEvaluationBar = () => {
    setShowEvaluationBar(prev => !prev);
  };

  // Sidebar visibility toggle
  const [showSidebar, setShowSidebar] = useState(true);
  const toggleSidebar = () => {
    setShowSidebar(prev => !prev);
  };

  // Custom board mode state
  const [isCustomBoardMode, setIsCustomBoardMode] = useState(false);
  const [customPosition, setCustomPosition] = useState<Record<string, string>>({});
  const [customTurn, setCustomTurn] = useState<'w' | 'b'>('w');

  // Puzzle state
  const [puzzleState, setPuzzleState] = useState<PuzzleState>({
    currentPuzzle: null,
    isPuzzleMode: false,
    puzzleSolution: [],
    currentSolutionIndex: 0,
    isPuzzleSolved: false
  });
  const [isPuzzleSelectorOpen, setIsPuzzleSelectorOpen] = useState(false);
  const [isLoadingPuzzle, setIsLoadingPuzzle] = useState(false);
  const [isOpponentMoving, setIsOpponentMoving] = useState(false);
  const [lastPuzzleParams, setLastPuzzleParams] = useState<PuzzleParams | null>(null);


  // Handle position change from setup
  const handlePositionChange = (newFen: string) => {
    const newGame = new Chess(newFen);
    setGame(newGame);
    setFen(newFen);
    setEvaluation(null);
    setIsAnalyzing(false);
    
    const newTree = {
      move: '',
      fen: newFen,
      children: []
    };
    setMoveTree(newTree);
    setCurrentNode(newTree);
    
    // Reset game history for new position
    setGameHistory({
      id: `game-${Date.now()}`,
      startFen: newFen,
      moves: [],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      currentMoveIndex: -1
    });
  };

  // Custom board mode functions
  const enterCustomBoardMode = () => {
    setIsCustomBoardMode(true);
    // Initialize custom position with current board state
    const currentPosition: Record<string, string> = {};
    const currentGame = new Chess(fen);
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const square = String.fromCharCode(97 + j) + (8 - i);
        const piece = currentGame.get(square as any);
        if (piece) {
          currentPosition[square] = piece.color + piece.type;
        }
      }
    }
    setCustomPosition(currentPosition);
    // Set turn based on current game state
    const turn = currentGame.turn() === 'w' ? 'w' : 'b';
    setCustomTurn(turn);
  };

  const exitCustomBoardMode = () => {
    setIsCustomBoardMode(false);
  };

  const applyCustomPosition = () => {
    // Convert custom position to FEN
    let fenString = '';
    for (let i = 0; i < 8; i++) {
      let emptyCount = 0;
      for (let j = 0; j < 8; j++) {
        const square = String.fromCharCode(97 + j) + (8 - i);
        const piece = customPosition[square];
        if (piece) {
          if (emptyCount > 0) {
            fenString += emptyCount;
            emptyCount = 0;
          }
          const pieceChar = piece === 'wk' ? 'K' : piece === 'wq' ? 'Q' : piece === 'wr' ? 'R' : 
                           piece === 'wb' ? 'B' : piece === 'wn' ? 'N' : piece === 'wp' ? 'P' :
                           piece === 'bk' ? 'k' : piece === 'bq' ? 'q' : piece === 'br' ? 'r' :
                           piece === 'bb' ? 'b' : piece === 'bn' ? 'n' : piece === 'bp' ? 'p' : '';
          fenString += pieceChar;
        } else {
          emptyCount++;
        }
      }
      if (emptyCount > 0) {
        fenString += emptyCount;
      }
      if (i < 7) fenString += '/';
    }
    
    // Add remaining FEN parts (turn, castling, en passant, halfmove, fullmove)
    fenString += ` ${customTurn} - - 0 1`;
    
    // Apply the position
    handlePositionChange(fenString);
    
    // Start analysis on the new position
    setTimeout(() => {
      startAnalysis(fenString);
    }, 100);
    
    exitCustomBoardMode();
  };

  const handleCustomPieceDrop = (sourceSquare: string, targetSquare: string, piece?: string) => {
    console.log('🎯 handleCustomPieceDrop called:', {
      sourceSquare,
      targetSquare,
      piece,
      isCustomBoardMode,
      customPositionKeys: Object.keys(customPosition)
    });
    
    if (isCustomBoardMode) {
      // Check if we're moving an existing piece on the board
      if (customPosition[sourceSquare]) {
        // Moving an existing piece to a valid square
        console.log('🔄 Moving existing piece from', sourceSquare, 'to', targetSquare);
        setCustomPosition(prev => {
          const newPosition = { ...prev };
          const pieceToMove = newPosition[sourceSquare];
          delete newPosition[sourceSquare];
          newPosition[targetSquare] = pieceToMove;
          return newPosition;
        });
        return true;
      } else if (piece) {
        // Placing a piece from the sidebar (piece is already in our format: 'bk', 'wp', etc.)
        console.log('📦 Placing piece from sidebar:', piece, 'at', targetSquare);
        setCustomPosition(prev => {
          const newPosition = { ...prev };
          newPosition[targetSquare] = piece;
          return newPosition;
        });
        return true;
      } else {
        console.log('❌ No piece found at source square and no piece parameter provided');
      }
    } else {
      console.log('❌ Not in custom board mode');
    }
    console.log('❌ Returning false from handleCustomPieceDrop');
    return false;
  };

  // Handle piece removal by dragging off board
  const handleCustomPieceRemove = (square: string) => {
    if (isCustomBoardMode && customPosition[square]) {
      setCustomPosition(prev => {
        const newPosition = { ...prev };
        delete newPosition[square];
        return newPosition;
      });
    }
  };

  const clearCustomBoard = () => {
    setCustomPosition({});
  };

  // Puzzle functions
  const handleLoadPuzzle = async (params: PuzzleParams) => {
    setIsLoadingPuzzle(true);
    // Store the parameters for potential reuse
    setLastPuzzleParams(params);
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      if (params.themes && params.themes.length > 0) {
        queryParams.append('themes', params.themes.join(','));
      }
      if (params.rating?.min) {
        queryParams.append('ratingMin', params.rating.min.toString());
      }
      if (params.rating?.max) {
        queryParams.append('ratingMax', params.rating.max.toString());
      }
      if (params.color) {
        queryParams.append('color', params.color);
      }

      const response = await fetch(`/api/puzzle?${queryParams.toString()}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load puzzle');
      }

      const puzzle: PuzzleData = data.puzzle;
      
      // Extract FEN from the puzzle's PGN
      let puzzleFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'; // Default starting position
      
      try {
        // First, try to find FEN in PGN headers
        const pgnLines = puzzle.game.pgn.split('\n');
        const fenLine = pgnLines.find(line => line.startsWith('[FEN'));
        
        if (fenLine) {
          // Extract FEN from [FEN "fen_string"]
          const fenMatch = fenLine.match(/\[FEN "([^"]+)"/);
          if (fenMatch) {
            puzzleFen = fenMatch[1];
            console.log('Found FEN in PGN headers:', puzzleFen);
          }
        } else {
          // If no FEN, play through the PGN moves to reach the puzzle position
          console.log('No FEN found, playing through PGN moves to reach puzzle position');
          console.log('Initial ply:', puzzle.initialPly);
          console.log('PGN:', puzzle.game.pgn);
          
          // Parse the PGN to get moves
          const pgnContent = puzzle.game.pgn.replace(/\[.*?\]/g, '').trim();
          const moves = pgnContent.split(/\s+/).filter(move => move && !move.match(/^\d+\.$/));
          
          console.log('Parsed moves from PGN:', moves);
          
          // Create a new chess game and play moves up to initialPly
          const tempGame = new Chess();
          const movesToPlay = Math.min(puzzle.initialPly, moves.length);
          
          console.log(`Playing ${movesToPlay} moves to reach puzzle position`);
          console.log('Note: initialPly might need adjustment - trying different counts...');
          
          // Try playing moves up to initialPly, but also try initialPly + 1 in case we're off by one
          let finalFen = tempGame.fen();
          
          for (let i = 0; i < movesToPlay; i++) {
            try {
              const move = tempGame.move(moves[i]);
              if (!move) {
                console.warn(`Invalid move at index ${i}: ${moves[i]}`);
                break;
              }
              console.log(`Played move ${i + 1}: ${moves[i]}`);
            } catch (error) {
              console.warn(`Error playing move ${moves[i]} at index ${i}:`, error);
              break;
            }
          }
          
          finalFen = tempGame.fen();
          console.log('Generated FEN from PGN moves:', finalFen);
          
          // If the first move of the solution is not legal, try playing one more move
          const testGame = new Chess(finalFen);
          const firstSolutionMove = puzzle.solution[0];
          const sourceSquare = firstSolutionMove.substring(0, 2);
          const targetSquare = firstSolutionMove.substring(2, 4);
          
          console.log('Testing if first solution move is legal:', firstSolutionMove);
          console.log('Legal moves from', sourceSquare, ':', testGame.moves({ square: sourceSquare as any }));
          
          if (testGame.moves({ square: sourceSquare as any }).length === 0) {
            console.log('First solution move is not legal, trying with one more move...');
            
            // Try playing one more move
            if (movesToPlay < moves.length) {
              try {
                const extraMove = tempGame.move(moves[movesToPlay]);
                if (extraMove) {
                  finalFen = tempGame.fen();
                  console.log('Generated FEN with extra move:', finalFen);
                  
                  // Test again
                  const testGame2 = new Chess(finalFen);
                  console.log('Legal moves from', sourceSquare, 'after extra move:', testGame2.moves({ square: sourceSquare as any }));
                }
              } catch (error) {
                console.log('Extra move failed:', error);
              }
            }
          }
          
          puzzleFen = finalFen;
          
          // Validate that we have a different position than the starting position
          if (puzzleFen === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
            console.warn('Generated FEN is still the starting position - puzzle may not have loaded correctly');
          }
        }
      } catch (error) {
        console.error('Error processing puzzle PGN:', error);
        console.log('Using default starting position');
      }

      // Update puzzle state
      setPuzzleState({
        currentPuzzle: puzzle,
        isPuzzleMode: true,
        puzzleSolution: puzzle.solution,
        currentSolutionIndex: 0,
        isPuzzleSolved: false
      });

      // Determine if puzzle is for black and flip board accordingly
      const puzzleGame = new Chess(puzzleFen);
      const isBlackToMove = puzzleGame.turn() === 'b';
      
      // If puzzle is for black, flip the board to show black's perspective
      if (isBlackToMove) {
        setBoardOrientation('black');
      } else {
        setBoardOrientation('white');
      }
      
      // Set the board position
      handlePositionChange(puzzleFen);
      
      // Close the selector
      setIsPuzzleSelectorOpen(false);
      
      console.log('Puzzle loaded:', {
        id: puzzle.id,
        rating: puzzle.rating,
        themes: puzzle.themes,
        solution: puzzle.solution
      });

    } catch (error) {
      console.error('Failed to load puzzle:', error);
      alert('Failed to load puzzle. Please try again.');
    } finally {
      setIsLoadingPuzzle(false);
    }
  };

  const exitPuzzleMode = () => {
    setPuzzleState({
      currentPuzzle: null,
      isPuzzleMode: false,
      puzzleSolution: [],
      currentSolutionIndex: 0,
      isPuzzleSolved: false
    });
    setIsOpponentMoving(false);
    resetPosition();
  };

  const generateNewPuzzle = async () => {
    if (lastPuzzleParams) {
      await handleLoadPuzzle(lastPuzzleParams);
    } else {
      alert('No previous puzzle parameters found. Please load a puzzle first.');
    }
  };

  const handlePuzzleMove = (sourceSquare: string, targetSquare: string) => {
    console.log('🎯 handlePuzzleMove called:', {
      sourceSquare,
      targetSquare,
      currentSolutionIndex: puzzleState.currentSolutionIndex,
      expectedMove: puzzleState.puzzleSolution[puzzleState.currentSolutionIndex]
    });

    try {
      // Check if the move matches the expected solution move
      const expectedMove = puzzleState.puzzleSolution[puzzleState.currentSolutionIndex];
      const moveNotation = `${sourceSquare}${targetSquare}`;
      
      if (moveNotation === expectedMove) {
        // Correct move!
        console.log('✅ Correct move!');
        
        // Debug: Check what's on the source square
        const piece = game.get(sourceSquare as any);
        console.log('Piece on source square:', piece);
        console.log('Current FEN:', game.fen());
        console.log('Legal moves from', sourceSquare, ':', game.moves({ square: sourceSquare as any }));
        
        // Debug: Check what's on the h-file to see what's blocking
        console.log('H-file pieces:');
        for (let rank = 1; rank <= 8; rank++) {
          const square = `h${rank}`;
          const pieceOnSquare = game.get(square as any);
          console.log(`${square}:`, pieceOnSquare ? `${pieceOnSquare.color}${pieceOnSquare.type}` : 'empty');
        }
        
        // Make the move - try different approaches
        let move = null;
        if (piece) {
          console.log('Making move for piece:', piece.type, piece.color);
          
          // Try with explicit piece type
          try {
            move = game.move({
              from: sourceSquare,
              to: targetSquare
            });
          } catch (error) {
            console.log('Move with piece type failed, trying without promotion...');
            
            // Try without any promotion parameter
            try {
              move = game.move({
                from: sourceSquare,
                to: targetSquare
              });
            } catch (error2) {
              console.log('Standard move failed, trying UCI format...');
              
              // Try using the move as a string (UCI format)
              try {
                move = game.move(moveNotation);
              } catch (error3) {
                console.log('UCI format failed, trying SAN format...');
                
                // Try SAN format - convert UCI to SAN
                try {
                  const sanMove = `${piece.type.toUpperCase()}${targetSquare}`;
                  console.log('Trying SAN move:', sanMove);
                  move = game.move(sanMove);
                } catch (error4) {
                  console.log('SAN format failed, trying with file disambiguation...');
                  
                  // Try with file disambiguation
                  try {
                    const sanMoveWithFile = `${piece.type.toUpperCase()}${sourceSquare}${targetSquare}`;
                    console.log('Trying SAN move with file:', sanMoveWithFile);
                    move = game.move(sanMoveWithFile);
                  } catch (error5) {
                console.error('All move attempts failed:', { error, error2, error3, error4, error5 });
                throw new Error(`Cannot make move ${sourceSquare}${targetSquare}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                  }
                }
              }
            }
          }
        } else {
          throw new Error(`No piece found on square ${sourceSquare}`);
        }

        if (move) {
          const newGame = new Chess(game.fen());
          setGame(newGame);
          setFen(newGame.fen());
          
          // Update puzzle state
          const newSolutionIndex = puzzleState.currentSolutionIndex + 1;
          const isPuzzleSolved = newSolutionIndex >= puzzleState.puzzleSolution.length;
          
          setPuzzleState(prev => ({
            ...prev,
            currentSolutionIndex: newSolutionIndex,
            isPuzzleSolved
          }));
          
          // Record move in history
          recordMove(move, newGame.fen());
          
          // Start analysis
          startAnalysis(newGame.fen());
          
          if (isPuzzleSolved) {
            console.log('🎉 Puzzle solved!');
            alert('Congratulations! Puzzle solved!');
          } else {
            console.log(`Next expected move: ${puzzleState.puzzleSolution[newSolutionIndex]}`);
            
            // Automatically make the opponent's move after a short delay
            setTimeout(() => {
              makeOpponentMove(newSolutionIndex);
            }, 500); // 0.5 second delay
          }
          
          return true;
        }
      } else {
        // Wrong move
        console.log('❌ Wrong move!');
        console.log(`Expected: ${expectedMove}, Got: ${moveNotation}`);
        alert(`Wrong move! Expected: ${expectedMove}`);
        return false;
      }
    } catch (error) {
      console.error('Error making puzzle move:', error);
      return false;
    }
    
    return false;
  };

  const makeOpponentMove = (solutionIndex: number) => {
    console.log('🤖 Making opponent move at solution index:', solutionIndex);
    
    if (solutionIndex >= puzzleState.puzzleSolution.length) {
      console.log('No more moves in solution');
      return;
    }
    
    setIsOpponentMoving(true);
    
    const opponentMove = puzzleState.puzzleSolution[solutionIndex];
    const sourceSquare = opponentMove.substring(0, 2);
    const targetSquare = opponentMove.substring(2, 4);
    
    console.log('🤖 Opponent move:', opponentMove, 'from', sourceSquare, 'to', targetSquare);
    
    try {
      // Make the opponent's move
      const move = game.move({
        from: sourceSquare,
        to: targetSquare
      });
      
      if (move) {
        const newGame = new Chess(game.fen());
        setGame(newGame);
        setFen(newGame.fen());
        
        // Update puzzle state
        const newSolutionIndex = solutionIndex + 1;
        const isPuzzleSolved = newSolutionIndex >= puzzleState.puzzleSolution.length;
        
        setPuzzleState(prev => ({
          ...prev,
          currentSolutionIndex: newSolutionIndex,
          isPuzzleSolved
        }));
        
        // Record move in history
        recordMove(move, newGame.fen());
        
        // Start analysis
        startAnalysis(newGame.fen());
        
        console.log('🤖 Opponent move completed. Next expected move:', puzzleState.puzzleSolution[newSolutionIndex]);
        
        if (isPuzzleSolved) {
          console.log('🎉 Puzzle solved!');
          alert('Congratulations! Puzzle solved!');
        }
      } else {
        console.error('🤖 Failed to make opponent move:', opponentMove);
      }
    } catch (error) {
      console.error('🤖 Error making opponent move:', error);
    } finally {
      setIsOpponentMoving(false);
    }
  };

  // Convert custom position to FEN for display
  const getCustomPositionFen = () => {
    console.log('🔧 getCustomPositionFen called with customPosition:', customPosition);
    
    let fenString = '';
    for (let i = 0; i < 8; i++) {
      let emptyCount = 0;
      let rankString = '';
      for (let j = 0; j < 8; j++) {
        const square = String.fromCharCode(97 + j) + (8 - i);
        const piece = customPosition[square];
        if (piece) {
          if (emptyCount > 0) {
            rankString += emptyCount;
            emptyCount = 0;
          }
          const pieceChar = piece === 'wk' ? 'K' : piece === 'wq' ? 'Q' : piece === 'wr' ? 'R' : 
                           piece === 'wb' ? 'B' : piece === 'wn' ? 'N' : piece === 'wp' ? 'P' :
                           piece === 'bk' ? 'k' : piece === 'bq' ? 'q' : piece === 'br' ? 'r' :
                           piece === 'bb' ? 'b' : piece === 'bn' ? 'n' : piece === 'bp' ? 'p' : '';
          rankString += pieceChar;
        } else {
          emptyCount++;
        }
      }
      if (emptyCount > 0) {
        rankString += emptyCount;
      }
      fenString += rankString;
      if (i < 7) fenString += '/';
    }
    const fullFen = fenString + ` ${customTurn} - - 0 1`;
    
    console.log('🔧 Generated FEN:', fullFen);
    
    // For custom board mode, we'll allow positions without kings
    // The chessboard library can handle these positions even if chess.js can't validate them
    console.log('✅ Using custom FEN (may not be chess.js valid but board can display it)');
    return fullFen;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chess Board */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>
                  {isCustomBoardMode ? "Custom Board Setup" : 
                   puzzleState.isPuzzleMode ? `Puzzle Mode - Rating: ${puzzleState.currentPuzzle?.rating || 'N/A'}` :
                   "Analysis Board"}
                </span>
                <div className="flex gap-2">
                  {puzzleState.isPuzzleMode ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exitPuzzleMode}
                        title="Exit puzzle mode"
                      >
                        Exit Puzzle
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={generateNewPuzzle}
                        title="Generate new puzzle with same parameters"
                        disabled={isLoadingPuzzle || !lastPuzzleParams}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleEvaluationBar}
                        title={showEvaluationBar ? "Hide evaluation bar" : "Show evaluation bar"}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleSidebar}
                        title={showSidebar ? "Hide sidebar" : "Show sidebar"}
                      >
                        <PanelRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={flipBoard}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </>
                  ) : isCustomBoardMode ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearCustomBoard}
                        title="Clear board"
                      >
                        Clear
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exitCustomBoardMode}
                        title="Cancel custom setup"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={applyCustomPosition}
                        title="Apply custom position and start analysis"
                      >
                        <BarChart3 className="h-4 w-4 mr-1" />
                        Analyze
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsPuzzleSelectorOpen(true)}
                        title="Load a chess puzzle"
                      >
                        <Puzzle className="h-4 w-4 mr-1" />
                        Puzzle
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={enterCustomBoardMode}
                        title="Enter custom board mode"
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        Custom
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleEvaluationBar}
                        title={showEvaluationBar ? "Hide evaluation bar" : "Show evaluation bar"}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleSidebar}
                        title={showSidebar ? "Hide sidebar" : "Show sidebar"}
                      >
                        <PanelRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={flipBoard}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetPosition}
                      >
                        Reset
                      </Button>
                    </>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center items-start gap-4">
                {/* Vertical Evaluation Bar */}
                {showEvaluationBar && !isCustomBoardMode && (
                  <div className="flex-shrink-0 self-stretch">
                    <VerticalEvaluationBar 
                      evaluation={evaluation} 
                      isAnalyzing={isAnalyzing}
                      height="100%"
                    />
                  </div>
                )}
                
                {/* Piece Selection Sidebar (Custom Board Mode) */}
                {isCustomBoardMode && (
                  <div className="flex-shrink-0 w-32">
                    <div className="grid grid-cols-2 gap-4">
                      {/* White Pieces Column */}
                      <div className="space-y-2">
                       
                        {['wk', 'wq', 'wr', 'wb', 'wn', 'wp'].map(piece => (
                          <div
                            key={piece}
                            className="w-12 h-12 border border-gray-300 rounded cursor-pointer flex items-center justify-center text-2xl bg-white hover:bg-gray-50 shadow-sm"
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', piece);
                            }}
                            title={`Drag ${piece} to place on board`}
                          >
                            {piece === 'wk' ? '♔' : piece === 'wq' ? '♕' : piece === 'wr' ? '♖' : 
                             piece === 'wb' ? '♗' : piece === 'wn' ? '♘' : '♙'}
                          </div>
                        ))}
                      </div>
                      
                      {/* Black Pieces Column */}
                      <div className="space-y-2">
                       
                        {['bk', 'bq', 'br', 'bb', 'bn', 'bp'].map(piece => (
                          <div
                            key={piece}
                            className="w-12 h-12 border border-gray-300 rounded cursor-pointer flex items-center justify-center text-2xl bg-white hover:bg-gray-50 shadow-sm"
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', piece);
                            }}
                            title={`Drag ${piece} to place on board`}
                          >
                            {piece === 'bk' ? '♚' : piece === 'bq' ? '♛' : piece === 'br' ? '♜' : 
                             piece === 'bb' ? '♝' : piece === 'bn' ? '♞' : '♟'}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Turn Toggle */}
                    <div className="mt-4 flex justify-center">
                      <div 
                        className="relative flex bg-gray-200 rounded-full p-1 h-10 w-20 overflow-hidden cursor-pointer hover:bg-gray-300 transition-colors"
                        onClick={() => setCustomTurn(customTurn === 'w' ? 'b' : 'w')}
                        title={`Click to switch to ${customTurn === 'w' ? 'black' : 'white'} to move`}
                      >
                        {/* Animated background slider */}
                        <div 
                          className={`absolute top-1 w-8 h-8 rounded-full transition-all duration-300 ease-in-out ${
                            customTurn === 'w' 
                              ? 'left-1 bg-white shadow-lg transform scale-105' 
                              : 'left-11 bg-gray-800 shadow-lg transform scale-105'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Chess Board with Drop Zone */}
                <div 
                  className="w-full max-w-lg"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (isCustomBoardMode) {
                      const piece = e.dataTransfer.getData('text/plain');
                      console.log('🎯 Drop event on board container:', { piece });
                      if (piece) {
                        // Get the square from the drop event
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;
                        
                        // Convert pixel coordinates to square (approximate)
                        const squareSize = rect.width / 8;
                        const file = Math.floor(x / squareSize);
                        const rank = 7 - Math.floor(y / squareSize);
                        
                        console.log('🎯 Drop coordinates:', { x, y, file, rank, squareSize });
                        
                        if (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
                          const square = String.fromCharCode(97 + file) + (rank + 1);
                          console.log('🎯 Dropping piece on square:', square);
                          handleCustomPieceDrop('', square, piece);
                        }
                      }
                    }
                  }}
                >
                  <Chessboard
                    position={isCustomBoardMode ? getCustomPositionFen() : fen}
                    onPieceDrop={onPieceDrop}
                    onSquareClick={isCustomBoardMode ? (square) => {
                      // Double-click to remove piece in custom mode
                      if (customPosition[square]) {
                        handleCustomPieceRemove(square);
                      }
                    } : undefined}
                    boardOrientation={boardOrientation}
                    customBoardStyle={{
                      borderRadius: '4px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  {isCustomBoardMode && (
                    <div className="mt-2 space-y-1">
                      <div className="text-xs text-gray-500 text-center">
                        Double-click on a piece to remove it • Drag pieces to move them • Drag from sidebar to place
                      </div>
                      <div className="text-xs text-gray-400 text-center font-mono bg-gray-50 p-2 rounded">
                        {getCustomPositionFen()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analysis Panel */}
        {showSidebar && (
          <div className="space-y-6">
            {/* Puzzle Information */}
            {puzzleState.isPuzzleMode && puzzleState.currentPuzzle && (
              <Card>
                <CardHeader>
                  <CardTitle>Puzzle Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-[--color-text-primary]">
                        Rating:
                      </label>
                      <p className="text-sm text-[--color-text-secondary]">
                        {puzzleState.currentPuzzle.rating}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[--color-text-primary]">
                        Themes:
                      </label>
                      <p className="text-sm text-[--color-text-secondary]">
                        {puzzleState.currentPuzzle.themes.join(', ')}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[--color-text-primary]">
                        Plays:
                      </label>
                      <p className="text-sm text-[--color-text-secondary]">
                        {puzzleState.currentPuzzle.plays.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[--color-text-primary]">
                        Solution Moves:
                      </label>
                      <p className="text-sm text-[--color-text-secondary] font-mono">
                        {puzzleState.puzzleSolution.map((move, index) => (
                          <span key={index} className={index < puzzleState.currentSolutionIndex ? 'text-green-600' : index === puzzleState.currentSolutionIndex ? 'text-blue-600 font-bold' : 'text-gray-500'}>
                            {move}
                            {index < puzzleState.puzzleSolution.length - 1 ? ' → ' : ''}
                          </span>
                        ))}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[--color-text-primary]">
                        Progress:
                      </label>
                      <p className="text-sm text-[--color-text-secondary]">
                        {puzzleState.currentSolutionIndex} / {puzzleState.puzzleSolution.length} moves
                      </p>
                    </div>
                    {isOpponentMoving && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-2">
                        <p className="text-sm text-blue-700 font-medium">
                          🤖 Opponent is thinking...
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Evaluation Details */}
            <Card>
              <CardHeader>
                <CardTitle>Evaluation Details</CardTitle>
              </CardHeader>
              <CardContent>
                {evaluation && (
                  <div className="space-y-3">
                    <div className="text-center">
                      <div className="text-lg font-bold text-[--color-primary] mb-1">
                        {evaluation.mate ? 
                          `#${evaluation.mate}` : 
                          `${evaluation.score > 0 ? '+' : ''}${evaluation.score.toFixed(2)}`
                        }
                      </div>
                      <p className="text-sm text-[--color-text-secondary]">
                        Depth: {evaluation.depth}
                      </p>
                      {evaluation.bestMove && (
                        <p className="text-sm text-[--color-text-secondary] mt-1">
                          Best: {evaluation.bestMove}
                        </p>
                      )}
                      {evaluation.pv && evaluation.pv.length > 0 && (
                        <p className="text-sm text-[--color-text-secondary] mt-1">
                          Line: {evaluation.pv.slice(0, 3).join(' ')}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {!evaluation && !isAnalyzing && (
                  <div className="text-center text-sm text-[--color-text-secondary]">
                    No evaluation available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Move Navigation */}
            {/* <Card>
              <CardHeader>
                <CardTitle>Navigation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goBack}
                    disabled={!currentNode.parent}
                    className="flex-1"
                  >
                    ← Back
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startAnalysis(fen)}
                    disabled={isAnalyzing}
                    className="flex-1"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (workerRef.current) {
                        workerRef.current.stopAnalysis();
                      }
                      setIsAnalyzing(false);
                    }}
                    disabled={!isAnalyzing}
                    className="flex-1"
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card> */}

            {/* Game History */}
            <GameHistory
              moves={gameHistory.moves}
              currentMoveIndex={gameHistory.currentMoveIndex}
              onMoveSelect={navigateToMove}
              onReset={resetPosition}
            />

            {/* Position Setup */}
            {/* <PositionSetup 
              onPositionChange={handlePositionChange}
              currentFen={fen}
            /> */}

            {/* Position Info */}
            {/* <Card>
              <CardHeader>
                <CardTitle>Position Info</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <label className="text-sm font-medium text-[--color-text-primary]">
                      Turn:
                    </label>
                    <p className="text-sm text-[--color-text-secondary]">
                      {game.turn() === 'w' ? 'White' : 'Black'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[--color-text-primary]">
                      Game Status:
                    </label>
                    <p className="text-sm text-[--color-text-secondary]">
                      {game.isGameOver() ? 'Game Over' : 'In Progress'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[--color-text-primary]">
                      Check:
                    </label>
                    <p className="text-sm text-[--color-text-secondary]">
                      {game.isCheck() ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[--color-text-primary]">
                      Checkmate:
                    </label>
                    <p className="text-sm text-[--color-text-secondary]">
                      {game.isCheckmate() ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card> */}
          </div>
        )}
      </div>

      {/* Puzzle Selector Modal */}
      <PuzzleSelector
        isOpen={isPuzzleSelectorOpen}
        onClose={() => setIsPuzzleSelectorOpen(false)}
        onLoadPuzzle={handleLoadPuzzle}
        isLoading={isLoadingPuzzle}
      />
    </div>
  );
}
