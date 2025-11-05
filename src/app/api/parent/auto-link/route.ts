import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';

export async function POST(request: NextRequest) {
  try {
    const { parentEmail } = await request.json();
    
    if (!parentEmail) {
      return NextResponse.json(
        { error: 'Parent email is required' },
        { status: 400 }
      );
    }

    // Get the parent account
    const parentAccount = await dataService.getParentAccount(parentEmail);
    if (!parentAccount) {
      return NextResponse.json(
        { error: 'Parent account not found' },
        { status: 404 }
      );
    }

    // Auto-link existing students to this parent
    await dataService.autoLinkExistingStudentsToParent(parentAccount.id, parentEmail);

    // Get the linked players to return count
    const players = await dataService.getParentPlayers(parentAccount.id);

    return NextResponse.json(
      { 
        message: 'Students auto-linked successfully',
        parentId: parentAccount.id,
        linkedPlayersCount: players.length,
        players: players.map(player => ({
          name: player.playerName,
          grade: player.playerGrade
        }))
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Auto-link API error:', error);
    return NextResponse.json(
      { error: 'Failed to auto-link students' },
      { status: 500 }
    );
  }
}
