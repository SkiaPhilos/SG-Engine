import type { IncomingMessage, ServerResponse } from 'http';

function getSanitizedEnv(val?: string): string {
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

export default async function handler(req: any, res: any) {
  const origin = req.headers?.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Resolve Supabase URL from all standard environment variable conventions
  const rawUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.PUBLIC_SUPABASE_URL ||
    process.env.REACT_APP_SUPABASE_URL ||
    '';

  // Resolve Supabase Anon/Publishable Key from all standard conventions
  const rawAnonKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.VITE_SUPABASE_API_KEY ||
    process.env.SUPABASE_API_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_KEY ||
    process.env.REACT_APP_SUPABASE_ANON_KEY ||
    process.env.REACT_APP_SUPABASE_KEY ||
    '';

  // Optional bootstrap admin email
  const rawAdminEmail =
    process.env.VITE_ADMIN_EMAIL ||
    process.env.ADMIN_EMAIL ||
    '';

  const supabaseUrl = getSanitizedEnv(rawUrl);
  const supabaseAnonKey = getSanitizedEnv(rawAnonKey);
  const adminEmail = getSanitizedEnv(rawAdminEmail);

  const hasUrl = Boolean(
    supabaseUrl &&
    (supabaseUrl.startsWith('https://') || supabaseUrl.startsWith('http://'))
  );
  const hasKey = Boolean(supabaseAnonKey && supabaseAnonKey.length > 20);
  const configured = hasUrl && hasKey;

  return res.status(200).json({
    configured,
    supabaseUrl: configured ? supabaseUrl : undefined,
    supabaseAnonKey: configured ? supabaseAnonKey : undefined,
    adminEmail: adminEmail || undefined,
  });
}
