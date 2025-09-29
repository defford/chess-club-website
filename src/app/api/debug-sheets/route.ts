import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';

// GET /api/debug-sheets - Debug Google Sheets data for a specific email
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required. Use: /api/debug-sheets?email=test@example.com' },
        { status: 400 }
      );
    }

    console.log(`🔍 Debugging Google Sheets data for email: ${email}`);

    // Get the processed parent account (this uses the existing public method)
    const parentAccount = await googleSheetsService.getParentAccount(email);

    if (!parentAccount) {
      return NextResponse.json(
        { error: `No account found for email: ${email}` },
        { status: 404 }
      );
    }

    // Get parent data (this also uses existing public method)
    const parentData = await googleSheetsService.getParentByEmail(email);

    const debugResults = {
      email,
      timestamp: new Date().toISOString(),
      processedAccount: parentAccount,
      parentData: parentData,
      summary: {
        foundAccount: !!parentAccount,
        isAdmin: parentAccount.isAdmin,
        isActive: parentAccount.isActive,
        registrationType: parentAccount.registrationType,
        isSelfRegistered: parentAccount.isSelfRegistered
      }
    };

    return NextResponse.json(debugResults, { status: 200 });

  } catch (error) {
    console.error('Debug sheets API error:', error);
    return NextResponse.json(
      { 
        error: 'Debug failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
