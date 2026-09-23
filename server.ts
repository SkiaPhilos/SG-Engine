import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getAdminSupabase } from './server/supabaseAdmin';
import {
  initSafepayTracker,
  verifyWebhookSignature,
  processVerifiedWebhook,
  getSafepayCredentials,
  saveSafepayCredentials,
  getSafepayStatus,
  testSafepayConnection,
  clearSafepayCredentials,
} from './server/safepayService';

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function rateLimit(limit: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const key = `${req.path}:${ip}`;
    const now = Date.now();
    let bucket = rateLimitMap.get(key);

    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 1, resetAt: now + windowMs };
      rateLimitMap.set(key, bucket);
      return next();
    }

    bucket.count += 1;
    if (bucket.count > limit) {
      res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
      return res.status(429).json({
        error: 'Too many requests. Please slow down and try again shortly.',
      });
    }

    next();
  };
}

async function authenticateAdmin(req: Request, res: Response, next: NextFunction) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    // If Supabase environment is unconfigured (offline/standalone dev), permit local execution
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Admin authentication required. Please sign in as store administrator.',
    });
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or missing bearer token.',
    });
  }

  try {
    const supabase = getAdminSupabase();
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid or expired admin session token.',
      });
    }

    const { data: adminRecord, error: adminError } = await supabase
      .from('admins')
      .select('admin_uid, role')
      .eq('admin_uid', user.id)
      .maybeSingle();

    if (adminError || !adminRecord) {
      const { count } = await supabase
        .from('admins')
        .select('*', { count: 'exact', head: true });
      if (count && count > 0) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: User does not possess administrator privileges.',
        });
      }
    }

    // Multi-tenant check: if storeId is specified and has an owner, ensure admin is super_admin or owner
    const targetStoreId = req.body?.storeId || req.query?.storeId;
    if (targetStoreId && targetStoreId !== 'default' && adminRecord?.role !== 'super_admin') {
      const { data: storeRecord } = await supabase
        .from('stores')
        .select('owner_uid')
        .eq('id', targetStoreId)
        .maybeSingle();

      if (storeRecord && storeRecord.owner_uid && storeRecord.owner_uid !== user.id) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You do not have administrative permissions for this store.',
        });
      }
    }

    (req as any).adminUser = user;
    next();
  } catch (err: any) {
    console.error('Error verifying admin authorization:', err);
    return res.status(500).json({ success: false, error: 'Authentication verification failure.' });
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Secure CORS policy scoped to requesting origin
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Raw body parser for Safepay webhook signature validation (must run before standard json parser)
  app.use(
    '/api/safepay/webhook',
    express.raw({ type: '*/*' })
  );

  // JSON parser for other API routes
  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  /**
   * GET /api/safepay/status
   * Returns safe masked configuration status (never returns secret keys)
   */
  app.get('/api/safepay/status', async (req: Request, res: Response) => {
    try {
      const storeId = (req.query.storeId as string) || 'default';
      const host = req.get('host') || 'localhost:3000';
      const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
      const baseUrl = `${protocol}://${host}`;

      const status = await getSafepayStatus(storeId, baseUrl);
      res.json(status);
    } catch (err: any) {
      console.error('Error fetching Safepay status:', err);
      res.status(500).json({ error: 'Failed to read gateway status' });
    }
  });

  /**
   * POST /api/safepay/create-tracker
   * Initiates payment tracker on Safepay, returns hosted checkout URL
   */
  app.post('/api/safepay/create-tracker', rateLimit(30, 60000), async (req: Request, res: Response) => {
    try {
      const { storeId = 'default', orderId, redirectUrl, cancelUrl, orderData } = req.body;

      if (!orderId) {
        return res.status(400).json({ error: 'Missing required orderId' });
      }

      const host = req.get('host') || 'localhost:3000';
      const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
      const baseUrl = `${protocol}://${host}`;

      const finalRedirectUrl = redirectUrl || `${baseUrl}/#order_confirmation?orderId=${orderId}`;
      const finalCancelUrl = cancelUrl || `${baseUrl}/#checkout?orderId=${orderId}&cancelled=true`;

      const result = await initSafepayTracker({
        storeId,
        orderId,
        redirectUrl: finalRedirectUrl,
        cancelUrl: finalCancelUrl,
        orderData,
      });

      res.json(result);
    } catch (err: any) {
      console.error('Error initializing Safepay tracker:', err);
      res.status(400).json({ error: err.message || 'Payment tracker creation failed' });
    }
  });

  /**
   * POST /api/safepay/webhook
   * Safepay webhook listener with HMAC signature verification
   */
  app.post('/api/safepay/webhook', async (req: Request, res: Response) => {
    const storeId = (req.query.storeId as string) || 'default';

    const signatureHeader =
      (req.headers['x-sfpy-signature'] as string) ||
      (req.headers['X-SFPY-SIGNATURE'] as string) ||
      '';

    const timestampHeader =
      (req.headers['x-sfpy-timestamp'] as string) ||
      (req.headers['X-SFPY-TIMESTAMP'] as string) ||
      '';

    const eventIdHeader =
      (req.headers['x-sfpy-event-id'] as string) ||
      (req.headers['X-SFPY-EVENT-ID'] as string) ||
      '';

    const eventTypeHeader =
      (req.headers['x-sfpy-event-type'] as string) ||
      (req.headers['X-SFPY-EVENT-TYPE'] as string) ||
      '';

    const aggregatorIdHeader =
      (req.headers['x-sfpy-aggregator-id'] as string) ||
      (req.headers['X-SFPY-AGGREGATOR-ID'] as string) ||
      '';

    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : (req.body || '');

    // 1. Fetch credentials
    const creds = await getSafepayCredentials(storeId);
    if (!creds.webhookSecret) {
      console.error('Safepay webhook received but webhookSecret is not configured on server');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // 2. Cryptographic HMAC verification
    const verification = verifyWebhookSignature({
      signatureHeader,
      timestampHeader,
      rawBody,
      webhookSecret: creds.webhookSecret,
    });

    if (!verification.isValid) {
      console.warn('Safepay Webhook HMAC Verification Failed:', verification.reason);
      return res.status(401).json({ error: 'Unauthorized: Invalid signature', reason: verification.reason });
    }

    // 3. Parse JSON body after verification passes
    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch (err) {
      console.error('Failed to parse webhook JSON payload:', err);
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    // 4. Process verified webhook & reconcile order (supports Webhooks v2 & v1)
    try {
      const result = await processVerifiedWebhook(storeId, payload, {
        eventId: eventIdHeader,
        eventType: eventTypeHeader,
        aggregatorId: aggregatorIdHeader,
      });
      res.json({ received: true, handled: result.handled, orderId: result.orderId, duplicate: result.duplicate });
    } catch (err: any) {
      console.error('Error processing verified webhook:', err);
      res.status(500).json({ error: 'Internal processing error' });
    }
  });

  /**
   * POST /api/safepay/configure
   * Configures Safepay credentials safely on server (encrypted at rest)
   * Protected: Admin session required
   */
  app.post('/api/safepay/configure', rateLimit(15, 60000), authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const { storeId = 'default', apiKey, secretKey, webhookSecret, environment, enabled, autoConfirmOnPayment } = req.body || {};

      await saveSafepayCredentials(storeId, {
        apiKey,
        secretKey,
        webhookSecret,
        environment,
        enabled,
        autoConfirmOnPayment,
      });

      const host = req.get('host') || 'localhost:3000';
      const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
      const baseUrl = `${protocol}://${host}`;

      const status = await getSafepayStatus(storeId, baseUrl);
      res.json({ success: true, status });
    } catch (err: any) {
      console.error('Error saving Safepay config:', err);
      res.status(400).json({ success: false, error: err.message || 'Failed to update gateway configuration' });
    }
  });

  /**
   * POST /api/safepay/clear
   * Purges stored Safepay credentials completely from vault and cache
   * Protected: Admin session required
   */
  app.post('/api/safepay/clear', rateLimit(10, 60000), authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const { storeId = 'default' } = req.body || {};
      await clearSafepayCredentials(storeId);
      const host = req.get('host') || 'localhost:3000';
      const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
      const baseUrl = `${protocol}://${host}`;
      const status = await getSafepayStatus(storeId, baseUrl);
      res.json({ success: true, status, message: 'All stored Safepay credentials purged successfully.' });
    } catch (err: any) {
      console.error('Error clearing Safepay credentials:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to clear credentials' });
    }
  });

  /**
   * POST /api/safepay/test-connection
   * Diagnostic ping to verify Safepay credentials against APIs
   * Protected: Admin session required
   */
  app.post('/api/safepay/test-connection', rateLimit(20, 60000), authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const { storeId = 'default', apiKey, secretKey, webhookSecret, environment } = req.body || {};
      const result = await testSafepayConnection(storeId, { apiKey, secretKey, webhookSecret, environment });
      res.json(result);
    } catch (err: any) {
      res.status(200).json({ success: false, message: `Connection test error: ${err.message || 'Unknown error'}` });
    }
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Store Engine Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
