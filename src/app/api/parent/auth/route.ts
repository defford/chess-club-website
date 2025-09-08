import { NextRequest, NextResponse } from 'next/server';
import { parentAuthService } from '@/lib/parentAuth';
import { googleSheetsService } from '@/lib/googleSheets';

export async function POST(request: NextRequest) {
  try {
    const { email, smsNumber, preferSms } = await request.json();
    
    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    // Check if email exists in parents sheet
    const parent = await googleSheetsService.getParentByEmail(email);
    const emailExists = parent !== null;

    // Send magic link with additional context about whether email exists
    await parentAuthService.sendMagicLink(email, 'login', {
      smsNumber,
      preferSms,
      emailExistsInRegistrations: emailExists
    });

    return NextResponse.json(
      { 
        message: 'Magic link sent successfully',
        sentTo: preferSms && smsNumber ? 'SMS' : 'email',
        emailExistsInRegistrations: emailExists
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Parent auth API error:', error);
    
    // If SMS failed and we have fallback email
    if (error instanceof Error && error.message.includes('SMS not yet implemented')) {
      const { email } = await request.json();
      try {
        await parentAuthService.sendMagicLink(email, 'login');
        return NextResponse.json(
          { 
            message: 'SMS not available, magic link sent to email instead',
            sentTo: 'email'
          },
          { status: 200 }
        );
      } catch (emailError) {
        return NextResponse.json(
          { error: 'Failed to send magic link via email or SMS' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to send magic link' },
      { status: 500 }
    );
  }
}
