import { NextRequest, NextResponse } from 'next/server';
import { parentAuthService } from '@/lib/parentAuth';
import { dataService } from '@/lib/dataService';

export async function POST(request: NextRequest) {
  try {
    const { playerEmail, playerName, parentEmail } = await request.json();
    
    // Validate required fields
    if (!playerEmail || !playerName || !parentEmail) {
      return NextResponse.json(
        { error: 'Player email, player name, and parent email are required' },
        { status: 400 }
      );
    }

    // Get or create parent account
    const parentAccount = await parentAuthService.createOrGetParentAccount(parentEmail);

    // Find the player by email and name
    const registrations = await dataService.getRegistrations();
    const playerRegistration = registrations.find(reg => 
      reg.parentEmail.toLowerCase() === playerEmail.toLowerCase() && 
      reg.playerName.toLowerCase() === playerName.toLowerCase()
    );

    if (!playerRegistration) {
      return NextResponse.json(
        { error: 'Player not found with the provided email and name' },
        { status: 404 }
      );
    }

    // Generate player ID
    const playerId = `chld_${playerRegistration.playerName}_${playerRegistration.parentEmail}_${playerRegistration.timestamp}`.replace(/[^a-zA-Z0-9_]/g, '_');

    // Check if player ownership already exists
    const existingOwnership = await dataService.getPlayerOwnership(playerId);

    if (!existingOwnership) {
      // No ownership record exists - create one and assign to this parent
      const ownership = {
        playerId,
        playerName: playerRegistration.playerName,
        playerEmail: playerRegistration.parentEmail,
        ownerParentId: parentAccount.id,
        approvalStatus: 'approved' as const,
        claimDate: new Date().toISOString()
      };

      await dataService.addPlayerOwnership(ownership);

      return NextResponse.json(
        { 
          message: 'Player claimed successfully',
          playerId,
          playerName: playerRegistration.playerName
        },
        { status: 200 }
      );
    }

    // Ownership record exists - check current owner
    if (existingOwnership.ownerParentId === parentAccount.id) {
      return NextResponse.json(
        { 
          message: 'You already own this player',
          playerId,
          playerName: playerRegistration.playerName
        },
        { status: 200 }
      );
    }

    if (existingOwnership.ownerParentId && existingOwnership.ownerParentId !== '') {
      // Player is owned by another parent - need approval
      
      // Check if there's already a pending request from this parent
      if (existingOwnership.pendingParentId === parentAccount.id) {
        return NextResponse.json(
          { 
            message: 'Your claim request is already pending approval',
            playerId,
            playerName: playerRegistration.playerName
          },
          { status: 200 }
        );
      }

      // Get the current owner's account
      const currentOwnerAccount = await dataService.getParentAccount(existingOwnership.ownerParentId);
      if (!currentOwnerAccount) {
        return NextResponse.json(
          { error: 'Current owner account not found' },
          { status: 500 }
        );
      }

      // Update ownership record with pending request
      await dataService.updatePlayerOwnership(playerId, {
        pendingParentId: parentAccount.id,
        approvalStatus: 'pending'
      });

      // Send approval request to current owner
      await parentAuthService.sendMagicLink(
        currentOwnerAccount.email,
        'approval_request',
        {
          playerId,
          playerName: playerRegistration.playerName,
          requesterId: parentAccount.email,
          requesterEmail: parentAccount.email
        }
      );

      return NextResponse.json(
        { 
          message: 'Claim request sent to current parent for approval',
          playerId,
          playerName: playerRegistration.playerName,
          requiresApproval: true
        },
        { status: 200 }
      );
    }

    // No current owner - assign to this parent
    await dataService.updatePlayerOwnership(playerId, {
      ownerParentId: parentAccount.id,
      approvalStatus: 'approved'
    });

    return NextResponse.json(
      { 
        message: 'Player claimed successfully',
        playerId,
        playerName: playerRegistration.playerName
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Player claim API error:', error);
    return NextResponse.json(
      { error: 'Failed to process player claim' },
      { status: 500 }
    );
  }
}
