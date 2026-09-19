import { initSafepayTracker } from './_safepayService.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
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

    const { storeId = 'default', orderId, redirectUrl, cancelUrl } = body;

    if (!orderId) {
      return res.status(400).json({ error: 'Missing required orderId' });
    }

    const host = req.headers?.host || 'localhost:3000';
    const protocol = req.headers?.['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    const finalRedirectUrl = redirectUrl || `${baseUrl}/#order_confirmation?orderId=${orderId}`;
    const finalCancelUrl = cancelUrl || `${baseUrl}/#checkout?orderId=${orderId}&cancelled=true`;

    const result = await initSafepayTracker({
      storeId,
      orderId,
      redirectUrl: finalRedirectUrl,
      cancelUrl: finalCancelUrl,
    });

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[SafepayCreateTracker] Error initializing Safepay tracker:', err);
    return res.status(400).json({ error: err?.message || 'Payment tracker creation failed' });
  }
}
