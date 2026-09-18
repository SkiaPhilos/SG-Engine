import { initSafepayTracker } from '../../server/safepayService';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
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
    console.error('Error initializing Safepay tracker:', err);
    return res.status(400).json({ error: err.message || 'Payment tracker creation failed' });
  }
}
