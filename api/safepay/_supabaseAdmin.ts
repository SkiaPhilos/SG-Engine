import { createClient, SupabaseClient } from '@supabase/supabase-js';

let adminSupabaseInstance: SupabaseClient | null = null;

const DEFAULT_SUPABASE_URL = 'https://herdyennsqwjusuikmis.supabase.co';
const DEFAULT_FALLBACK_KEY = 'sb_publishable_sxnVYuDmAo6QwI0c7nOQKw_UQJ9QAGa';

/**
 * Serverless administrative Supabase client using SUPABASE_SERVICE_ROLE_KEY or publishable fallback.
 */
export function getAdminSupabase(): SupabaseClient {
  if (!adminSupabaseInstance) {
    const supabaseUrl = (
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      DEFAULT_SUPABASE_URL
    ).trim();

    const serviceRoleKey = (
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      DEFAULT_FALLBACK_KEY
    ).trim();

    adminSupabaseInstance = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return adminSupabaseInstance;
}
