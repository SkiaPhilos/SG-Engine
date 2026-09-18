import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve environment variables from Vite runtime with resilient sanitization
function sanitizeEnv(val: any): string {
  if (!val || typeof val !== 'string') return '';
  let clean = val.trim();
  // Remove wrapping single or double quotes if present from copy-paste in Vercel UI
  if (
    (clean.startsWith('"') && clean.endsWith('"')) ||
    (clean.startsWith("'") && clean.endsWith("'"))
  ) {
    clean = clean.slice(1, -1).trim();
  }
  return clean;
}

const rawUrl =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env && (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)) ||
  '';

const rawKey =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env && (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) ||
  '';

const supabaseUrl = sanitizeEnv(rawUrl);
const supabaseAnonKey = sanitizeEnv(rawKey);

let supabaseInstance: SupabaseClient | null = null;

/**
 * Checks whether valid Supabase configuration credentials are provided.
 */
export function isSupabaseConfigured(): boolean {
  const hasUrl = Boolean(
    supabaseUrl &&
    (supabaseUrl.startsWith('https://') || supabaseUrl.startsWith('http://'))
  );
  const hasKey = Boolean(supabaseAnonKey && supabaseAnonKey.length > 20);
  return hasUrl && hasKey;
}

export function getSupabaseEnvDiagnostics(): { hasUrl: boolean; hasKey: boolean; urlPreview?: string } {
  return {
    hasUrl: Boolean(supabaseUrl),
    hasKey: Boolean(supabaseAnonKey),
    urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 16)}...` : undefined,
  };
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
