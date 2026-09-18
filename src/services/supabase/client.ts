import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve environment variables from Vite runtime
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

let supabaseInstance: SupabaseClient | null = null;

/**
 * Checks whether valid Supabase configuration credentials are provided.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
    (supabaseUrl.startsWith('https://') || supabaseUrl.startsWith('http://')) &&
    supabaseAnonKey &&
    supabaseAnonKey.length > 10
  );
}

/**
 * Lazily returns the Supabase client instance.
 * If credentials are not yet configured in the environment,
 * initializes a dummy fallback client so that module evaluation does not crash.
 */
export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    if (!isSupabaseConfigured()) {
      console.warn(
        '[Supabase] Missing or invalid VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
        'Please add these variables to your environment to connect to Supabase.'
      );
      // Safe placeholder prevents startup crash
      supabaseInstance = createClient(
        supabaseUrl || 'https://placeholder-project.supabase.co',
        supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder',
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
          },
        }
      );
    } else {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    }
  }
  return supabaseInstance;
}

/**
 * Direct proxy export of SupabaseClient for convenience:
 * import { supabase } from '../supabase/client';
 * await supabase.from('products').select('*');
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop: string | symbol) {
    const client = getSupabase();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

/**
 * Helper to get a public CDN URL for an image in Supabase Storage.
 */
export function getPublicStorageUrl(bucket: string, path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const client = getSupabase();
  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || path;
}
