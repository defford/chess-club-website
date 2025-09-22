import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/googleSheets';

// POST /api/admin/setup-parents-admin - Add admin column to parents sheet
export async function POST(request: NextRequest) {
  try {
    const result = await googleSheetsService.setupParentsAdminColumn();
    
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Admin setup API error:', error);
    return NextResponse.json(
      { error: 'Failed to setup admin column' },
      { status: 500 }
    );
  }
}
