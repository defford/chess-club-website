import { NextRequest } from 'next/server';
import { AchievementNotification } from '@/lib/types';

// Store active connections
const connections = new Set<ReadableStreamDefaultController>();

export async function GET(request: NextRequest) {
  let controller: ReadableStreamDefaultController | null = null;
  
  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;
      // Add this connection to our set
      connections.add(ctrl);
      
      // Send initial connection message
      const data = JSON.stringify({
        type: 'connected',
        message: 'Connected to achievement notifications'
      });
      ctrl.enqueue(`data: ${data}\n\n`);

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
    }
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

// Function to broadcast achievement notifications to all connected clients
function broadcastAchievement(notification: AchievementNotification) {
  const data = JSON.stringify({
    type: 'achievement',
    notification
  });

  // Send to all connected clients
  connections.forEach(controller => {
    try {
      controller.enqueue(`data: ${data}\n\n`);
    } catch {
      // Remove dead connections
      connections.delete(controller);
    }
  });
}

// Function to broadcast custom messages
function broadcastMessage(message: string, type: string = 'info') {
  const data = JSON.stringify({
    type,
    message
  });

  connections.forEach(controller => {
    try {
      controller.enqueue(`data: ${data}\n\n`);
    } catch {
      connections.delete(controller);
    }
  });
}
