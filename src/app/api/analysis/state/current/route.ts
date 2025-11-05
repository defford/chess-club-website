import { NextResponse } from 'next/server';
import { getCurrentState } from '../shared-state';

// Get current state
export async function GET() {
  try {
    const state = getCurrentState();
    
    return NextResponse.json({
      success: true,
      state,
    });
  } catch (error) {
    console.error('Error fetching current state:', error);
    return NextResponse.json(
      { error: 'Failed to fetch state' },
      { status: 500 }
    );
  }
}

