import { sendOrderEmail } from '../../server/emailService.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { order, storeConfig, origin } = req.body || {};
    if (!order) {
      return res.status(400).json({ error: 'Missing required order object' });
    }

    const host = origin || (req.headers['x-forwarded-host'] ? `https://${req.headers['x-forwarded-host']}` : undefined);
    const result = await sendOrderEmail({
      order,
      storeConfig,
      origin: host,
    });

    return res.json(result);
  } catch (err: any) {
    console.error('Error handling order email:', err);
    return res.status(500).json({ error: err.message || 'Internal error dispatching email' });
  }
}
