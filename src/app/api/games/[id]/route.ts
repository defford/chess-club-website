import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';

// GET /api/games/[id] - Get a specific game
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const games = await googleSheetsService.getGames();
    const game = games.find(g => g.id === id);
    
    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(game);
  } catch (error) {
    console.error('Game API GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve game' },
      { status: 500 }
    );
  }
}

// PUT /api/games/[id] - Update a specific game
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await request.json();
    
    // Validate that the game exists
    const games = await googleSheetsService.getGames();
    const game = games.find(g => g.id === id);
    
    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Update the game
    await googleSheetsService.updateGame(id, updates);
    
    return NextResponse.json(
      { message: 'Game updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Game API PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update game' },
      { status: 500 }
    );
  }
}

// DELETE /api/games/[id] - Delete a specific game
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Validate that the game exists
    const games = await googleSheetsService.getGames();
    const game = games.find(g => g.id === id);
    
    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Delete the game
    await googleSheetsService.deleteGame(id);
    
    return NextResponse.json(
      { message: 'Game deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Game API DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete game' },
      { status: 500 }
    );
  }
}
