import { testSafepayConnection } from './_safepayService.js';

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

    const { storeId = 'default', apiKey, secretKey, environment } = body;
    const result = await testSafepayConnection(storeId, { apiKey, secretKey, environment });
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[SafepayTestConnection] Error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Connection test failed' });
  }
}
