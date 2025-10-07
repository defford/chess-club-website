"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RotateCcw, Play, Square, BarChart3, PanelRight, Edit3, Check } from 'lucide-react';
import { StockfishWorker, StockfishMessage, EvaluationData } from '@/lib/stockfish-worker';
import { VerticalEvaluationBar } from '@/components/analysis/VerticalEvaluationBar';
import { PositionSetup } from '@/components/analysis/PositionSetup';
import { GameHistory } from '@/components/analysis/GameHistory';
import { GameHistoryMove, GameHistory as GameHistoryType } from '@/lib/types';

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
  
  // Game history
  const [gameHistory, setGameHistory] = useState<GameHistoryType>(() => {
    // Try to load from localStorage on initialization
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chess-analysis-history');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (error) {
          console.error('Failed to parse saved game history:', error);
        }
      }
    }
    
    return {
      id: `game-${Date.now()}`,
      startFen: game.fen(),
      moves: [],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      currentMoveIndex: -1
    };
  });
  
  // Worker reference
  const workerRef = useRef<StockfishWorker | null>(null);
  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    // Handle custom board mode
    if (isCustomBoardMode) {
      return handleCustomPieceDrop(sourceSquare, targetSquare, piece);
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
    if (isCustomBoardMode) {
      // Check if we're moving an existing piece on the board
      if (customPosition[sourceSquare]) {
        // Moving an existing piece to a valid square
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
        setCustomPosition(prev => {
          const newPosition = { ...prev };
          newPosition[targetSquare] = piece;
          return newPosition;
        });
        return true;
      }
    }
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

  // Convert custom position to FEN for display
  const getCustomPositionFen = () => {
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
    
    // Validate the FEN string
    try {
      new Chess(fullFen);
      return fullFen;
    } catch (error) {
      // Return a default valid FEN if our custom position is invalid
      return '8/8/8/8/8/8/8/8 w - - 0 1';
    }
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
                <span>{isCustomBoardMode ? "Custom Board Setup" : "Analysis Board"}</span>
                <div className="flex gap-2">
                  {isCustomBoardMode ? (
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
                        onClick={enterCustomBoardMode}
                        title="Enter custom board mode"
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        Custom
                      </Button>
                      <Button
                        variant={showEvaluationBar ? "primary" : "outline"}
                        size="sm"
                        onClick={toggleEvaluationBar}
                        title={showEvaluationBar ? "Hide evaluation bar" : "Show evaluation bar"}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={showSidebar ? "primary" : "outline"}
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
                
                {/* Chess Board */}
                <div className="w-full max-w-lg">
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
    </div>
  );
}
