import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let authClientPromise: Promise<SupabaseClient> | null = null;

export function getBrowserAuthClient(): Promise<SupabaseClient> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Browser auth client is only available in the browser'));
  }

  if (!authClientPromise) {
    authClientPromise = fetch('/api/auth/config', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Authentication configuration is unavailable');
        }

        return createClient(result.url, result.publishableKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        });
      });
  }

  return authClientPromise;
}

export async function getAccessToken(): Promise<string | null> {
  const supabase = await getBrowserAuthClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = await getAccessToken();
  const headers = new Headers(init.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(input, { ...init, headers });
}
