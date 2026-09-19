import {
  saveSafepayCredentials,
  getSafepayStatus,
} from '../../server/safepayService';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { storeId = 'default', apiKey, secretKey, webhookSecret, environment, enabled } = body;

    await saveSafepayCredentials(storeId, {
      apiKey,
      secretKey,
      webhookSecret,
      environment,
      enabled,
    });

    const host = req.headers?.host || 'localhost:3000';
    const protocol = req.headers?.['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    const status = await getSafepayStatus(storeId, baseUrl);
    return res.status(200).json({ success: true, status });
  } catch (err: any) {
    console.error('Error saving Safepay config:', err);
    return res.status(500).json({ error: err.message || 'Failed to update gateway configuration' });
  }
}
