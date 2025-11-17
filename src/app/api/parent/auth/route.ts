import { NextRequest, NextResponse } from 'next/server';
import { parentAuthService } from '@/lib/parentAuth';
import { dataService } from '@/lib/dataService';

export async function POST(request: NextRequest) {
  try {
    const { email, smsNumber, preferSms, isSelfRegistered } = await request.json();
    
    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    // Check if email exists in parents sheet
    console.log(`[Parent Auth] Checking if email exists: ${email}`);
    const parent = await dataService.getParentByEmail(email);
    const emailExists = parent !== null;
    console.log(`[Parent Auth] Email lookup result:`, { 
      email, 
      found: emailExists,
      parentId: parent?.id,
      USE_SUPABASE: process.env.USE_SUPABASE 
    });

    // Determine if this is a self-registered student
    let actualIsSelfRegistered = isSelfRegistered || false;
    if (emailExists && parent) {
      // Get the full parent account to check if they're self-registered
      const parentAccount = await dataService.getParentAccount(email);
      actualIsSelfRegistered = parentAccount?.isSelfRegistered || false;
    }

    // Send magic link with additional context about whether email exists
    await parentAuthService.sendMagicLink(email, 'login', {
      smsNumber,
      preferSms,
      emailExistsInRegistrations: emailExists,
      isSelfRegistered: actualIsSelfRegistered
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
      const { email, isSelfRegistered } = await request.json();
      try {
        // Determine if this is a self-registered student for fallback email
        const parent = await dataService.getParentByEmail(email);
        let actualIsSelfRegistered = isSelfRegistered || false;
        if (parent) {
          const parentAccount = await dataService.getParentAccount(email);
          actualIsSelfRegistered = parentAccount?.isSelfRegistered || false;
        }
        
        await parentAuthService.sendMagicLink(email, 'login', {
          isSelfRegistered: actualIsSelfRegistered
        });
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
