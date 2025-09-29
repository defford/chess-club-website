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

    // Get the raw Google Sheets data
    const spreadsheetId = googleSheetsService.getSpreadsheetId('registrations');
    
    if (!spreadsheetId) {
      return NextResponse.json(
        { error: 'Google Sheets ID not configured' },
        { status: 500 }
      );
    }

    // Get the raw data from Google Sheets
    const response = await googleSheetsService.executeWithRetry(
      () => googleSheetsService.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'parents!A:O',
      }),
      'debugSheetsData'
    );

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return NextResponse.json(
        { error: 'No data found in parents sheet' },
        { status: 404 }
      );
    }

    // Get headers
    const headers = rows[0];
    
    // Find the specific row for the email
    const accountRow = rows.slice(1).find(row => 
      row[2] && row[2].toLowerCase() === email.toLowerCase()
    );

    if (!accountRow) {
      return NextResponse.json(
        { error: `No account found for email: ${email}` },
        { status: 404 }
      );
    }

    // Create a detailed mapping of columns
    const columnMapping = headers.map((header, index) => ({
      index,
      header,
      value: accountRow[index] || '',
      type: typeof (accountRow[index] || ''),
      isEmpty: !accountRow[index]
    }));

    // Find admin-related columns
    const adminColumns = columnMapping.filter(col => 
      col.header && col.header.toLowerCase().includes('admin')
    );

    // Get the processed parent account
    const parentAccount = await googleSheetsService.getParentAccount(email);

    const debugResults = {
      email,
      timestamp: new Date().toISOString(),
      spreadsheetId,
      rawData: {
        totalRows: rows.length,
        headers: headers,
        accountRow: accountRow,
        columnMapping: columnMapping
      },
      adminAnalysis: {
        adminColumns: adminColumns,
        columnOValue: accountRow[14] || 'EMPTY',
        columnOType: typeof (accountRow[14] || ''),
        isColumnOTrue: accountRow[14] === 'true',
        isColumnOBoolean: accountRow[14] === true,
        isColumnOStringTrue: accountRow[14] === 'True',
        isColumnOStringTRUE: accountRow[14] === 'TRUE',
        isColumnOString1: accountRow[14] === '1',
        isColumnOStringYes: accountRow[14] === 'yes',
        isColumnOStringYes: accountRow[14] === 'Yes',
        isColumnOStringYES: accountRow[14] === 'YES'
      },
      processedAccount: parentAccount,
      summary: {
        foundAccount: !!accountRow,
        hasAdminColumn: adminColumns.length > 0,
        adminColumnIndex: adminColumns.length > 0 ? adminColumns[0].index : null,
        adminColumnValue: adminColumns.length > 0 ? adminColumns[0].value : null,
        processedIsAdmin: parentAccount?.isAdmin,
        mismatch: parentAccount?.isAdmin !== (accountRow[14] === 'true')
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
