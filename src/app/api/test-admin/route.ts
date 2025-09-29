import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/apiAuth';
import { googleSheetsService } from '@/lib/googleSheets';

// GET /api/test-admin - Test admin authentication
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required. Use: /api/test-admin?email=test@example.com' },
        { status: 400 }
      );
    }

    console.log(`🧪 Testing admin auth for email: ${email}`);

    // Test 1: Check if email exists in Google Sheets
    const parentAccount = await googleSheetsService.getParentAccount(email);
    
    // Test 2: Check admin authentication
    const authResult = await requireAdminAuth(request);
    
    // Test 3: Check development mode
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isDevEmail = email === 'dev@example.com';

    const testResults = {
      email,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      tests: {
        googleSheets: {
          accountExists: !!parentAccount,
          accountData: parentAccount ? {
            id: parentAccount.id,
            email: parentAccount.email,
            isAdmin: parentAccount.isAdmin,
            isActive: parentAccount.isActive,
            registrationType: parentAccount.registrationType
          } : null
        },
        adminAuth: {
          isAdmin: authResult.isAdmin,
          error: authResult.error
        },
        development: {
          isDevelopment,
          isDevEmail,
          devAdminAccess: isDevelopment && isDevEmail
        }
      },
      summary: {
        hasGoogleSheetsAccount: !!parentAccount,
        isAdminInSheets: parentAccount?.isAdmin || false,
        passesAdminAuth: authResult.isAdmin,
        hasDevAccess: isDevelopment && isDevEmail,
        overallResult: authResult.isAdmin || (isDevelopment && isDevEmail)
      }
    };

    return NextResponse.json(testResults, { status: 200 });

  } catch (error) {
    console.error('Test admin API error:', error);
    return NextResponse.json(
      { 
        error: 'Test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// POST /api/test-admin - Test admin authentication with custom email
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required in request body' },
        { status: 400 }
      );
    }

    // Create a mock request with the email
    const mockRequest = {
      ...request,
      headers: new Headers({
        'x-user-email': email
      }),
      nextUrl: new URL(request.url)
    };

    return GET(mockRequest as NextRequest);

  } catch (error) {
    console.error('Test admin POST API error:', error);
    return NextResponse.json(
      { 
        error: 'Test failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
