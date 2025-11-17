import { NextRequest, NextResponse } from 'next/server';
import { KVCacheService } from '@/lib/kv';
import { dataService } from '@/lib/dataService';

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

    // Normalize email (lowercase, trim)
    const normalizedEmail = email.toLowerCase().trim();
    console.log(`[Parent Account API] Fetching account for email: ${normalizedEmail}`);

    // Get parent data (includes all needed fields) - single optimized call with fallback
    let parentData;
    try {
      parentData = await KVCacheService.getParentByEmail(normalizedEmail);
      console.log(`[Parent Account API] Cache lookup result:`, parentData ? `Found (ID: ${parentData.id})` : 'Not found');
    } catch (cacheError: any) {
      console.error(`[Parent Account API] Cache lookup failed:`, {
        error: cacheError?.message || cacheError,
        stack: cacheError?.stack
      });
      // Try direct dataService as fallback
      try {
        parentData = await dataService.getParentByEmail(normalizedEmail);
        console.log(`[Parent Account API] Fallback lookup:`, parentData ? `Found (ID: ${parentData.id})` : 'Not found');
      } catch (fallbackError: any) {
        console.error(`[Parent Account API] Fallback also failed:`, fallbackError?.message || fallbackError);
        throw new Error(`Failed to fetch parent account: ${fallbackError?.message || 'Unknown error'}`);
      }
    }
    
    if (!parentData) {
      console.warn(`[Parent Account API] Parent account not found for email: ${normalizedEmail}`);
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

  } catch (error: any) {
    console.error('[Parent Account API] Error:', {
      error: error?.message || error,
      stack: error?.stack,
      name: error?.name,
      code: error?.code
    });
    
    // Return more detailed error in development, generic in production
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Failed to get parent account: ${error?.message || 'Unknown error'}`
      : 'Failed to get parent account';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { details: error?.stack })
      },
      { status: 500 }
    );
  }
}
