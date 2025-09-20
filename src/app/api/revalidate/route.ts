import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { KVCacheService } from '@/lib/kv';

export async function POST(request: NextRequest) {
  try {
    // Verify revalidation token
    const authHeader = request.headers.get('authorization');
    const token = process.env.REVALIDATE_TOKEN;
    
    if (!token || authHeader !== `Bearer ${token}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tag, path, clearCache } = body;

    if (!tag && !path) {
      return NextResponse.json(
        { error: 'Either tag or path is required' },
        { status: 400 }
      );
    }

    const revalidated: string[] = [];

    // Revalidate by tag
    if (tag) {
      revalidateTag(tag);
      revalidated.push(`tag:${tag}`);
      
      // Also clear KV cache for the tag
      if (clearCache !== false) {
        await KVCacheService.invalidateByTags([tag]);
      }
    }

    // Revalidate by path
    if (path) {
      revalidatePath(path);
      revalidated.push(`path:${path}`);
    }

    console.log(`Revalidation triggered for: ${revalidated.join(', ')}`);

    return NextResponse.json({
      revalidated,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Revalidation error:', error);
    return NextResponse.json(
      { error: 'Revalidation failed' },
      { status: 500 }
    );
  }
}

// GET endpoint to check revalidation status
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = process.env.REVALIDATE_TOKEN;
  
  if (!token || authHeader !== `Bearer ${token}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    status: 'ok',
    message: 'Revalidation endpoint is active',
    timestamp: new Date().toISOString()
  });
}
