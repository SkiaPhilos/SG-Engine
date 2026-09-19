import { testSafepayConnection } from '../../server/safepayService';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { storeId = 'default', apiKey, secretKey, environment } = body;
    const result = await testSafepayConnection(storeId, { apiKey, secretKey, environment });
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Connection test failed' });
  }
}
