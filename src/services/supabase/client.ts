import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Resilient string cleaner for environment strings
function sanitizeEnv(val: any): string {
  if (!val || typeof val !== 'string') return '';
  let clean = val.trim();
  if (
    (clean.startsWith('"') && clean.endsWith('"')) ||
    (clean.startsWith("'") && clean.endsWith("'"))
  ) {
    clean = clean.slice(1, -1).trim();
  }
  return clean;
}

const defaultSupabaseUrl = '';
const defaultPublishableKey = '';

const rawUrl =
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL)) ||
  (typeof process !== 'undefined' && process.env && (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)) ||
  defaultSupabaseUrl;

const rawKey =
  (typeof import.meta !== 'undefined' && import.meta.env && (
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.SUPABASE_ANON_KEY
  )) ||
  (typeof process !== 'undefined' && process.env && (
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )) ||
  defaultPublishableKey;

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
 */
export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    if (!isSupabaseConfigured()) {
      console.warn(
        '[Supabase] Warning: Missing or invalid Supabase URL/Key. Initializing fallback client.'
      );
      supabaseInstance = createClient(
        'https://placeholder-project.supabase.co',
        'sb_publishable_placeholder_key_for_unconfigured_build_safeguard',
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        }
      );
    } else {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    }
  }

  return supabaseInstance;
}

export const supabase = getSupabase();
