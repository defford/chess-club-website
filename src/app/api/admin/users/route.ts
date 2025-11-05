import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/apiAuth';
import { dataService } from '@/lib/dataService';

// GET /api/admin/users - List all parent users with their admin status
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminAuth(request);
    if (!authResult.isAdmin) {
      return NextResponse.json(
        { error: authResult.error || 'Admin privileges required' },
        { status: 403 }
      );
    }

    const parents = await dataService.getAllParents();
    
    return NextResponse.json(parents);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users - Update admin status for a user
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAdminAuth(request);
    if (!authResult.isAdmin) {
      return NextResponse.json(
        { error: authResult.error || 'Admin privileges required' },
        { status: 403 }
      );
    }

    const { parentId, isAdmin } = await request.json();

    if (!parentId || typeof isAdmin !== 'boolean') {
      return NextResponse.json(
        { error: 'parentId and isAdmin (boolean) are required' },
        { status: 400 }
      );
    }

    // Get all parents to find the one with matching ID
    const parents = await dataService.getAllParents();
    const parent = parents.find(p => p.id === parentId);

    if (!parent) {
      return NextResponse.json(
        { error: 'Parent account not found' },
        { status: 404 }
      );
    }

    // Update admin status
    await dataService.updateParentAccount(parentId, { isAdmin });

    return NextResponse.json({ 
      success: true,
      message: `Admin status ${isAdmin ? 'granted' : 'revoked'} successfully`
    });
  } catch (error) {
    console.error('Error updating admin status:', error);
    return NextResponse.json(
      { error: 'Failed to update admin status' },
      { status: 500 }
    );
  }
}

