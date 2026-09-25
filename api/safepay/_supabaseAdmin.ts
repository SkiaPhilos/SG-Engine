import { createClient, SupabaseClient } from '@supabase/supabase-js';

let adminSupabaseInstance: SupabaseClient | null = null;

/**
 * Serverless administrative Supabase client using SUPABASE_SERVICE_ROLE_KEY or secret key.
 */
export function getAdminSupabase(): SupabaseClient {
  if (!adminSupabaseInstance) {
    const supabaseUrl = (
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.PUBLIC_SUPABASE_URL ||
      process.env.REACT_APP_SUPABASE_URL ||
      ''
    ).trim();

    const serviceRoleKey = (
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      ''
    ).trim();

    if (!supabaseUrl || !serviceRoleKey) {
      console.warn(
        '[SupabaseAdmin] SUPABASE_URL and SUPABASE_SECRET_KEY are not configured in environment.'
      );
      adminSupabaseInstance = createClient('https://unconfigured.supabase.co', 'placeholder_key', {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      return adminSupabaseInstance;
    }

    adminSupabaseInstance = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return adminSupabaseInstance;
}
