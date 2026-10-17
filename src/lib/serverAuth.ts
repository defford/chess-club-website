import type { User } from '@supabase/supabase-js';
import { supabaseAdmin } from './supabaseClient';

// Existing admin compatibility helper.
export async function isAdminAuthenticatedServer(request: Request): Promise<boolean> {
  try {
    if (process.env.NODE_ENV === 'development') {
      const url = new URL(request.url)
      const email = url.searchParams.get('email')
      return email === 'dev@example.com'
    }

    const user = await requireSupabaseUser(request)
    if (!supabaseAdmin || !user.email) return false

    const { data } = await supabaseAdmin
      .from('parents')
      .select('is_admin')
      .ilike('email', user.email.toLowerCase().trim())

    return Boolean(data?.some((row) => row.is_admin))
  } catch {
    return false
  }
}

export interface LinkedFamily {
  user: User;
  primaryParentId: string;
  parentIds: string[];
  email: string;
}

export async function requireSupabaseUser(request: Request): Promise<User> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured');
  }

  const authorization = request.headers.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    throw new Error('UNAUTHORIZED');
  }

  const { data, error } = await supabaseAdmin.auth.getUser(match[1]);

  if (error || !data.user) {
    throw new Error('UNAUTHORIZED');
  }

  return data.user;
}

export async function requireLinkedFamily(request: Request): Promise<LinkedFamily> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured');
  }

  const user = await requireSupabaseUser(request);
  const email = user.email?.toLowerCase().trim();

  if (!email || !user.email_confirmed_at) {
    throw new Error('EMAIL_NOT_VERIFIED');
  }

  let { data: links, error: linksError } = await supabaseAdmin
    .from('parent_auth_links')
    .select('parent_id')
    .eq('auth_user_id', user.id);

  if (linksError) {
    throw new Error(`Failed to load family links: ${linksError.message}`);
  }

  if (!links || links.length === 0) {
    if (email === 'pending@chessclub.local') {
      throw new Error('FAMILY_NOT_FOUND');
    }

    const { data: parents, error: parentsError } = await supabaseAdmin
      .from('parents')
      .select('id, created_at')
      .ilike('email', email)
      .order('created_at', { ascending: false });

    if (parentsError) {
      throw new Error(`Failed to locate family account: ${parentsError.message}`);
    }

    if (!parents || parents.length === 0) {
      throw new Error('FAMILY_NOT_FOUND');
    }

    const newLinks = parents.map((parent) => ({
      auth_user_id: user.id,
      parent_id: parent.id,
    }));

    const { error: linkError } = await supabaseAdmin
      .from('parent_auth_links')
      .upsert(newLinks, { onConflict: 'auth_user_id,parent_id' });

    if (linkError) {
      throw new Error(`Failed to link family account: ${linkError.message}`);
    }

    links = parents.map((parent) => ({ parent_id: parent.id }));
  }

  const parentIds = links.map((link) => link.parent_id);

  const { data: parentRows, error: parentRowsError } = await supabaseAdmin
    .from('parents')
    .select('id, created_at')
    .in('id', parentIds)
    .order('created_at', { ascending: false });

  if (parentRowsError || !parentRows || parentRows.length === 0) {
    throw new Error('FAMILY_NOT_FOUND');
  }

  return {
    user,
    email,
    parentIds,
    primaryParentId: parentRows[0].id,
  };
}
