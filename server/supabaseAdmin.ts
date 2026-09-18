import { createClient, SupabaseClient } from '@supabase/supabase-js';

let adminSupabaseInstance: SupabaseClient | null = null;

/**
 * Server-side administrative Supabase client using SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY.
 * Bypasses RLS or operates with backend authority for webhooks and administrative actions.
 */
export function getAdminSupabase(): SupabaseClient {
  if (!adminSupabaseInstance) {
    const supabaseUrl = (
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      'https://herdyennsqwjusuikmis.supabase.co'
    ).trim();
    const serviceRoleKey = (
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      ''
    ).trim();

    if (!supabaseUrl || !serviceRoleKey) {
      console.warn(
        '[AdminSupabase] Missing SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_URL in server environment. ' +
        'Backend server will initialize a fallback client.'
      );
      adminSupabaseInstance = createClient(
        supabaseUrl || 'https://placeholder-project.supabase.co',
        serviceRoleKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder',
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );
    } else {
      adminSupabaseInstance = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }
  }
  return adminSupabaseInstance;
}
