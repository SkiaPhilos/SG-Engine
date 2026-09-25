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

const STORAGE_KEY_URL = '__sb_runtime_url__';
const STORAGE_KEY_ANON = '__sb_runtime_anon__';
const STORAGE_KEY_EMAIL = '__sb_runtime_email__';

function getCachedConfig(): { url: string; anonKey: string; adminEmail: string } {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const url = sanitizeEnv(sessionStorage.getItem(STORAGE_KEY_URL) || '');
      const anonKey = sanitizeEnv(sessionStorage.getItem(STORAGE_KEY_ANON) || '');
      const adminEmail = sanitizeEnv(sessionStorage.getItem(STORAGE_KEY_EMAIL) || '');
      return { url, anonKey, adminEmail };
    }
  } catch {}
  return { url: '', anonKey: '', adminEmail: '' };
}

function setCachedConfig(url: string, anonKey: string, adminEmail?: string) {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      if (url) sessionStorage.setItem(STORAGE_KEY_URL, url);
      if (anonKey) sessionStorage.setItem(STORAGE_KEY_ANON, anonKey);
      if (adminEmail) sessionStorage.setItem(STORAGE_KEY_EMAIL, adminEmail);
    }
  } catch {}
}

const cached = getCachedConfig();

const initialRawUrl =
  cached.url ||
  (typeof import.meta !== 'undefined' && import.meta.env && (
    import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.SUPABASE_URL ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_URL
  )) ||
  (typeof process !== 'undefined' && process.env && (
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL
  )) ||
  (typeof window !== 'undefined' && (window as any).__SUPABASE_CONFIG__?.url) ||
  '';

const initialRawKey =
  cached.anonKey ||
  (typeof import.meta !== 'undefined' && import.meta.env && (
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_KEY ||
    import.meta.env.SUPABASE_KEY
  )) ||
  (typeof process !== 'undefined' && process.env && (
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )) ||
  (typeof window !== 'undefined' && (window as any).__SUPABASE_CONFIG__?.anonKey) ||
  '';

let currentSupabaseUrl = sanitizeEnv(initialRawUrl);
let currentSupabaseAnonKey = sanitizeEnv(initialRawKey);
let currentAdminEmail = sanitizeEnv(
  cached.adminEmail ||
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_ADMIN_EMAIL || import.meta.env.ADMIN_EMAIL)) ||
  ''
);

let activeInstance: SupabaseClient | null = null;
type ConfigListener = (configured: boolean) => void;
const configListeners: Set<ConfigListener> = new Set();

export function onSupabaseConfigured(listener: ConfigListener): () => void {
  configListeners.add(listener);
  return () => configListeners.delete(listener);
}

function notifyConfigListeners() {
  const configured = isSupabaseConfigured();
  configListeners.forEach((fn) => {
    try {
      fn(configured);
    } catch (e) {
      console.warn('Config listener error:', e);
    }
  });
}

/**
 * Checks whether valid Supabase configuration credentials are provided.
 */
export function isSupabaseConfigured(): boolean {
  const hasUrl = Boolean(
    currentSupabaseUrl &&
    (currentSupabaseUrl.startsWith('https://') || currentSupabaseUrl.startsWith('http://'))
  );
  const hasKey = Boolean(currentSupabaseAnonKey && currentSupabaseAnonKey.length > 20);
  return hasUrl && hasKey;
}

export function getSupabaseEnvDiagnostics(): {
  hasUrl: boolean;
  hasKey: boolean;
  urlPreview?: string;
} {
  return {
    hasUrl: Boolean(currentSupabaseUrl),
    hasKey: Boolean(currentSupabaseAnonKey),
    urlPreview: currentSupabaseUrl ? `${currentSupabaseUrl.substring(0, 16)}...` : undefined,
  };
}

export function getRuntimeAdminEmail(): string {
  return currentAdminEmail;
}

/**
 * Explicitly configures or updates the Supabase client at runtime.
 */
export function configureSupabase(url: string, anonKey: string, adminEmail?: string): boolean {
  const cleanUrl = sanitizeEnv(url);
  const cleanKey = sanitizeEnv(anonKey);

  const hasUrl = Boolean(
    cleanUrl && (cleanUrl.startsWith('https://') || cleanUrl.startsWith('http://'))
  );
  const hasKey = Boolean(cleanKey && cleanKey.length > 20);

  if (!hasUrl || !hasKey) {
    return false;
  }

  currentSupabaseUrl = cleanUrl;
  currentSupabaseAnonKey = cleanKey;
  if (adminEmail) {
    currentAdminEmail = sanitizeEnv(adminEmail).toLowerCase();
  }

  setCachedConfig(cleanUrl, cleanKey, currentAdminEmail);

  activeInstance = createClient(currentSupabaseUrl, currentSupabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  notifyConfigListeners();
  return true;
}

let inFlightConfigPromise: Promise<boolean> | null = null;

/**
 * Ensures that Supabase credentials are fully configured.
 * If credentials were not baked into the static bundle at build time,
 * this function automatically requests the runtime configuration from `/api/config`.
 */
export async function ensureSupabaseConfigured(): Promise<boolean> {
  if (isSupabaseConfigured()) {
    return true;
  }

  if (inFlightConfigPromise) {
    return inFlightConfigPromise;
  }

  inFlightConfigPromise = (async () => {
    try {
      if (typeof window === 'undefined') {
        return isSupabaseConfigured();
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);

      const resp = await fetch('/api/config', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (resp.ok) {
        const data = await resp.json();
        if (data.configured && data.supabaseUrl && data.supabaseAnonKey) {
          const success = configureSupabase(data.supabaseUrl, data.supabaseAnonKey, data.adminEmail);
          return success;
        }
      }
    } catch (err) {
      console.warn('[Supabase] Note: /api/config runtime probe could not be completed:', err);
    } finally {
      inFlightConfigPromise = null;
    }

    return isSupabaseConfigured();
  })();

  return inFlightConfigPromise;
}

// Automatically trigger dynamic config fetch in browser on startup if unconfigured
if (typeof window !== 'undefined' && !isSupabaseConfigured()) {
  ensureSupabaseConfigured().catch(() => {});
}

/**
 * Returns the current active SupabaseClient.
 */
export function getSupabase(): SupabaseClient {
  if (!activeInstance) {
    if (!isSupabaseConfigured()) {
      activeInstance = createClient(
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
      activeInstance = createClient(currentSupabaseUrl, currentSupabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    }
  }

  return activeInstance;
}

/**
 * Transparent proxy to the active Supabase client.
 * Calls are dispatched dynamically to whichever client instance is current,
 * ensuring seamless runtime reconfiguration when environment variables load from /api/config.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabase();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});
