import { NextRequest, NextResponse } from 'next/server';
import { KVCacheService } from '@/lib/kv';

export async function GET(request: NextRequest) {
  try {
    // Get parent email from query parameters
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    // Get parent data (includes all needed fields) - single optimized call
    const parentData = await KVCacheService.getParentByEmail(email);
    
    if (!parentData) {
      return NextResponse.json(
        { error: 'Parent account not found' },
        { status: 404 }
      );
    }

    // Use parentData fields directly - no need for separate getParentAccount call
    // timestamp can be used as createdDate, and isSelfRegistered is in registrationType
    return NextResponse.json({
      id: parentData.id,
      email: parentData.email,
      name: parentData.name,
      phone: parentData.phone,
      createdDate: parentData.timestamp || new Date().toISOString(),
      lastLogin: parentData.timestamp || new Date().toISOString(), // Use timestamp as lastLogin fallback
      isActive: true, // Assume active if exists
      isSelfRegistered: parentData.registrationType === 'self'
    });

  } catch (error) {
    console.error('Error getting parent account:', error);
    return NextResponse.json(
      { error: 'Failed to get parent account' },
      { status: 500 }
    );
  }
}
