import { NextRequest, NextResponse } from 'next/server';
import { KVCacheService } from '@/lib/kv';
import { revalidateTag } from 'next/cache';

interface WebhookPayload {
  sheetName: string;
  cacheTag: string;
  editedRange: string;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.WEBHOOK_SECRET}`;
    
    if (!process.env.WEBHOOK_SECRET || authHeader !== expectedAuth) {
      console.error('Webhook auth failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: WebhookPayload = await request.json();
    const { sheetName, cacheTag, editedRange, timestamp } = body;

    console.log(`Sheets webhook received: ${sheetName} updated at ${editedRange} - ${timestamp}`);

    // Map sheet names to cache invalidation strategy
    let invalidatedKeys: string[] = [];
    
    switch (sheetName) {
      case 'events':
        await KVCacheService.invalidateKey('events:all');
        await KVCacheService.invalidateByTags(['events']);
        invalidatedKeys = ['events:all'];
        break;
        
      case 'rankings':
        await KVCacheService.invalidateKey('rankings:all');
        await KVCacheService.invalidateByTags(['rankings']);
        invalidatedKeys = ['rankings:all'];
        break;
        
      case 'parents':
      case 'students':
        await KVCacheService.invalidateKey('members:all');
        await KVCacheService.invalidateByTags(['members', 'parent-data']);
        invalidatedKeys = ['members:all', 'parent-data:*'];
        break;
        
        
      case 'event registrations':
        await KVCacheService.invalidateByTags(['event-registrations']);
        invalidatedKeys = ['event-registrations:*'];
        break;
        
      default:
        console.warn(`Unknown sheet name in webhook: ${sheetName}`);
    }
    
    // Trigger ISR revalidation for the affected tag
    if (cacheTag) {
      try {
        revalidateTag(cacheTag);
        console.log(`ISR revalidation triggered for tag: ${cacheTag}`);
      } catch (error) {
        console.error('ISR revalidation error:', error);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      invalidated: invalidatedKeys,
      sheet: sheetName,
      cacheTag,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' }, 
      { status: 500 }
    );
  }
}

// Support GET for webhook verification
export async function GET(request: NextRequest) {
  // Verify webhook secret
  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.WEBHOOK_SECRET}`;
  
  if (!process.env.WEBHOOK_SECRET || authHeader !== expectedAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  return NextResponse.json({ 
    status: 'ok',
    message: 'Chess Club Website Sheets Webhook is active',
    timestamp: new Date().toISOString()
  });
}
