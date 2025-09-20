import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';
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

    // Get parent data (includes name) - using cache
    const parentData = await KVCacheService.getParentByEmail(email);
    
    if (!parentData) {
      return NextResponse.json(
        { error: 'Parent account not found' },
        { status: 404 }
      );
    }

    // Get parent account details for additional info - using cache
    const parentAccount = await KVCacheService.getParentAccount(email);

    return NextResponse.json({
      id: parentData.id,
      email: parentData.email,
      name: parentData.name,
      phone: parentData.phone,
      createdDate: parentAccount?.createdDate || new Date().toISOString(),
      lastLogin: parentAccount?.lastLogin || new Date().toISOString(),
      isActive: parentAccount?.isActive || true,
      isSelfRegistered: parentAccount?.isSelfRegistered || false
    });

  } catch (error) {
    console.error('Error getting parent account:', error);
    return NextResponse.json(
      { error: 'Failed to get parent account' },
      { status: 500 }
    );
  }
}
