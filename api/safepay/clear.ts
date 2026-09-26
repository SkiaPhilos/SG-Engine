import {
  clearSafepayCredentials,
  getSafepayStatus,
} from './_safepayService.js';
import { getAdminSupabase } from './_supabaseAdmin.js';

async function verifyAdminAuth(req: any, storeId?: string): Promise<{ authorized: boolean; error?: string }> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return { authorized: true }; // offline/standalone dev

  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) {
      try {
        const supabase = getAdminSupabase();
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (!userError && user) return { authorized: true };
      } catch {}
    }
  }

  // Permit local dev / container preview environment
  const isDev = process.env.NODE_ENV !== 'production';
  const host = req.headers?.host || '';
  if (isDev || host.includes('localhost') || host.includes('run.app')) {
    return { authorized: true };
  }

  return { authorized: false, error: 'Bearer authorization token required' };
}

export default async function handler(req: any, res: any) {
  const origin = req.headers?.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    } else if (Buffer.isBuffer(body)) {
      try {
        body = JSON.parse(body.toString('utf-8'));
      } catch {
        body = {};
      }
    } else if (!body) {
      body = {};
    }

    const authCheck = await verifyAdminAuth(req, body.storeId);
    if (!authCheck.authorized) {
      return res.status(401).json({
        success: false,
        error: authCheck.error || 'Admin authentication required to clear payment gateway credentials',
      });
    }

    const { storeId = 'default' } = body;
    await clearSafepayCredentials(storeId);

    const host = req.headers?.host || 'localhost:3000';
    const protocol = req.headers?.['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    const status = await getSafepayStatus(storeId, baseUrl);
    return res.status(200).json({ success: true, status });
  } catch (err: any) {
    console.error('[SafepayClear] Error clearing Safepay credentials:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to clear credentials',
    });
  }
}
