import {
  saveSafepayCredentials,
  getSafepayStatus,
} from './_safepayService.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
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

    const { storeId = 'default', apiKey, secretKey, webhookSecret, environment, enabled, autoConfirmOnPayment } = body;

    await saveSafepayCredentials(storeId, {
      apiKey,
      secretKey,
      webhookSecret,
      environment,
      enabled,
      autoConfirmOnPayment,
    });

    const host = req.headers?.host || 'localhost:3000';
    const protocol = req.headers?.['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    const status = await getSafepayStatus(storeId, baseUrl);
    return res.status(200).json({ success: true, status });
  } catch (err: any) {
    console.error('[SafepayConfigure] Error saving Safepay config:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to update gateway configuration',
    });
  }
}
