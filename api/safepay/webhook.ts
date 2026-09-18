import {
  getSafepayCredentials,
  verifyWebhookSignature,
  processVerifiedWebhook,
} from '../../server/safepayService';

// Disable default bodyParser in Vercel to preserve raw stream for cryptographic HMAC verification
export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req: any): Promise<string> {
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const storeId = (req.query?.storeId as string) || 'default';

  const signatureHeader =
    (req.headers?.['x-sfpy-signature'] as string) ||
    (req.headers?.['X-SFPY-SIGNATURE'] as string) ||
    '';

  const timestampHeader =
    (req.headers?.['x-sfpy-timestamp'] as string) ||
    (req.headers?.['X-SFPY-TIMESTAMP'] as string) ||
    '';

  const rawBody = await getRawBody(req);

  // 1. Fetch credentials from encrypted database via Supabase
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

  // 4. Process verified webhook & reconcile order in Supabase
  try {
    const result = await processVerifiedWebhook(storeId, payload);
    return res.status(200).json({ received: true, handled: result.handled, orderId: result.orderId });
  } catch (err: any) {
    console.error('Error processing verified webhook:', err);
    return res.status(500).json({ error: 'Internal processing error' });
  }
}
