import { NextRequest, NextResponse } from 'next/server';
import { parentAuthService } from '@/lib/parentAuth';
import { dataService } from '@/lib/dataService';

export async function POST(request: NextRequest) {
  try {
    const { token, action } = await request.json();
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Verify the magic link token
    const decoded = parentAuthService.verifyMagicToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    switch (decoded.type) {
      case 'login':
        // Check if email exists in registrations
        if (decoded.emailExistsInRegistrations === false) {
          // Email doesn't exist in registrations - redirect to registration
          return NextResponse.json(
            { 
              message: 'Email not found in registrations',
              needsRegistration: true,
              email: decoded.email
            },
            { status: 200 }
          );
        }
        
        // Login the parent
        const session = await parentAuthService.loginParent(decoded.email, decoded.isSelfRegistered || false);
        
        // Ensure any existing student registrations are linked to this parent account
        try {
          await dataService.autoLinkExistingStudentsToParent(session.parentId, decoded.email);
        } catch (error) {
          console.error('Failed to auto-link existing students during login:', error);
          // Don't fail the login if auto-linking fails
        }
        
        return NextResponse.json(
          { 
            message: 'Login successful',
            session: {
              parentId: session.parentId,
              email: session.email,
              isSelfRegistered: session.isSelfRegistered,
              registrationType: session.registrationType,
              isAdmin: session.isAdmin
            }
          },
          { status: 200 }
        );

      case 'approval_request':
        // If no action provided, return that this is an approval request
        if (!action) {
          return NextResponse.json(
            { 
              isApprovalRequest: true,
              playerId: decoded.playerId,
              requesterId: decoded.requesterId
            },
            { status: 200 }
          );
        }
        
        // Handle player claim approval/denial
        if (!['approve', 'deny'].includes(action)) {
          return NextResponse.json(
            { error: 'Action must be "approve" or "deny"' },
            { status: 400 }
          );
        }

        if (!decoded.playerId || !decoded.requesterId) {
          return NextResponse.json(
            { error: 'Invalid approval token' },
            { status: 400 }
          );
        }

        // Get the player ownership record
        const ownership = await dataService.getPlayerOwnership(decoded.playerId);
        if (!ownership) {
          return NextResponse.json(
            { error: 'Player not found' },
            { status: 404 }
          );
        }

        // Get requester account
        const requesterAccount = await dataService.getParentAccount(decoded.requesterId);
        if (!requesterAccount) {
          return NextResponse.json(
            { error: 'Requester account not found' },
            { status: 404 }
          );
        }

        if (action === 'approve') {
          // Transfer ownership to the requester
          await dataService.updatePlayerOwnership(decoded.playerId, {
            ownerParentId: requesterAccount.id,
            pendingParentId: undefined,
            approvalStatus: 'approved'
          });

          // Send approval confirmation to requester
          await parentAuthService.sendMagicLink(
            decoded.requesterId,
            'approval_response',
            {
              playerId: decoded.playerId,
              playerName: ownership.playerName,
              action: 'approve'
            }
          );
        } else {
          // Deny the request
          await dataService.updatePlayerOwnership(decoded.playerId, {
            pendingParentId: undefined,
            approvalStatus: 'denied'
          });

          // Send denial notification to requester
          await parentAuthService.sendMagicLink(
            decoded.requesterId,
            'approval_response',
            {
              playerId: decoded.playerId,
              playerName: ownership.playerName,
              action: 'deny'
            }
          );
        }

        return NextResponse.json(
          { 
            message: `Player claim ${action}d successfully`,
            playerName: ownership.playerName,
            action
          },
          { status: 200 }
        );

      case 'approval_response':
        // This is just an informational token - redirect user to result page
        return NextResponse.json(
          { 
            message: 'Approval response processed',
            playerId: decoded.playerId,
            action: decoded.action
          },
          { status: 200 }
        );

      default:
        return NextResponse.json(
          { error: 'Invalid token type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Parent verify API error:', error);
    return NextResponse.json(
      { error: 'Token verification failed' },
      { status: 500 }
    );
  }
}
