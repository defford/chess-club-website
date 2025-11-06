import { NextRequest, NextResponse } from 'next/server';
import { connections, getCurrentState, updateState, broadcastStateChange } from '../shared-state';

export const dynamic = 'force-dynamic';

// GET endpoint for SSE stream
export async function GET(request: NextRequest) {
  let controller: ReadableStreamDefaultController | null = null;
  
  console.log('[Analysis State API] GET request - current connections:', connections.size);
  
  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;
      // Add this connection to our set
      connections.add(ctrl);
      console.log('[Analysis State API] New SSE connection established. Total connections:', connections.size);
      
      // Send initial connection message with current state
      getCurrentState()
        .then(currentState => {
          const data = JSON.stringify({
            type: 'connected',
            state: currentState,
          });
          ctrl.enqueue(`data: ${data}\n\n`);
        })
        .catch(error => {
          console.error('[Analysis State API] Failed to load initial state for SSE:', error);
        });

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        if (controller) {
          connections.delete(controller);
          controller.close();
        }
      });
    },
    cancel() {
      if (controller) {
        connections.delete(controller);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}

// POST endpoint to update state
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentMoveIndex, gameHistory } = body;
    const currentState = await getCurrentState();
    
    console.log('[Analysis State API] POST received:', { currentMoveIndex, gameHistory: gameHistory ? 'present' : 'null', connections: connections.size });

    // Validate move index if game history exists
    if (gameHistory && gameHistory.moves) {
      const maxIndex = gameHistory.moves.length - 1;
      const minIndex = -1; // -1 means starting position
      
      // Clamp move index to valid range
      let newMoveIndex = currentMoveIndex;
      if (typeof currentMoveIndex === 'number') {
        newMoveIndex = Math.max(minIndex, Math.min(maxIndex, currentMoveIndex));
      } else {
        // If not provided, keep current or default to -1
        newMoveIndex = currentState.currentMoveIndex;
      }

      // Update global state
      const updatedState = await updateState({
        currentMoveIndex: newMoveIndex,
        gameHistory: gameHistory || currentState.gameHistory,
      });
      
      // Broadcast state change to all connected clients
      console.log('[Analysis State API] Broadcasting state change to', connections.size, 'connections');
      broadcastStateChange(updatedState);

      return NextResponse.json({
        success: true,
        state: updatedState,
      });
    } else if (typeof currentMoveIndex === 'number') {
      // Update just the move index if no game history provided
      // Validate against existing game history if available
      const existingHistory = currentState.gameHistory;
      if (existingHistory && existingHistory.moves) {
        const maxIndex = existingHistory.moves.length - 1;
        const minIndex = -1;
        const clampedIndex = Math.max(minIndex, Math.min(maxIndex, currentMoveIndex));
        const updatedState = await updateState({ currentMoveIndex: clampedIndex });
        console.log('[Analysis State API] Broadcasting state change (move index with existing history) to', connections.size, 'connections');
        broadcastStateChange(updatedState);
        return NextResponse.json({
          success: true,
          state: updatedState,
        });
      } else {
        const updatedState = await updateState({ currentMoveIndex });
        console.log('[Analysis State API] Broadcasting state change (move index only, no history) to', connections.size, 'connections');
        broadcastStateChange(updatedState);
        return NextResponse.json({
          success: true,
          state: updatedState,
        });
      }
    } else if (gameHistory) {
      // Update game history if provided
      const updatedState = await updateState({ gameHistory });
      console.log('[Analysis State API] Broadcasting state change (game history) to', connections.size, 'connections');
      broadcastStateChange(updatedState);
      return NextResponse.json({
        success: true,
        state: updatedState,
      });
    }

    // No valid update provided
    return NextResponse.json(
      { error: 'Invalid request: provide currentMoveIndex or gameHistory' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating analysis state:', error);
    return NextResponse.json(
      { error: 'Failed to update state' },
      { status: 500 }
    );
  }
}

