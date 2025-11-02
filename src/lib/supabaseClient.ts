import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
// Use service role key for server-side operations (bypasses RLS)
// Use anon key for client-side operations (respects RLS)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing SUPABASE_ANON_KEY environment variable');
}

// Client for server-side operations (admin access)
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// Client for regular operations (respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Helper to get the appropriate client based on context
export function getSupabaseClient(useAdmin: boolean = false) {
  if (useAdmin && supabaseAdmin) {
    return supabaseAdmin;
  }
  return supabase;
}

