import { getSafepayStatus } from '../../server/safepayService';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const storeId = (req.query?.storeId as string) || 'default';
    const host = req.headers?.host || 'localhost:3000';
    const protocol = req.headers?.['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    const status = await getSafepayStatus(storeId, baseUrl);
    return res.status(200).json(status);
  } catch (err: any) {
    console.error('Error fetching Safepay status:', err);
    return res.status(500).json({ error: 'Failed to read gateway status' });
  }
}
