import crypto from 'crypto';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import firebaseConfig from '../firebase-applet-config.json';

export interface SafepayCredentials {
  apiKey: string;
  webhookSecret: string;
  environment: 'sandbox' | 'production';
  enabled: boolean;
}

export interface VaultDiagnostic {
  status: 'connected' | 'missing_key' | 'not_configured' | 'error';
  message: string;
  details?: string;
}

// Backwards-compatible alias for existing frontend callers
export type SecretManagerDiagnostic = VaultDiagnostic;

export interface SafepayStatusResponse {
  configured: boolean;
  enabled: boolean;
  environment: 'sandbox' | 'production';
  hasApiKey: boolean;
  hasWebhookSecret: boolean;
  maskedApiKey?: string;
  webhookUrl: string;
  updatedAt?: string;
  vault?: VaultDiagnostic;
  secretManager?: VaultDiagnostic;
}

// Firebase Admin Firestore instance (lazily initialized)
let adminDb: Firestore | null = null;

export function getAdminFirestore(): Firestore {
  if (!adminDb) {
    if (getApps().length === 0) {
      initializeApp({
        projectId: firebaseConfig.projectId,
      });
    }
    adminDb = getFirestore(firebaseConfig.firestoreDatabaseId);
  }
  return adminDb;
}

// In-memory cache for credentials to avoid redundant Firestore round-trips and decryptions
interface CachedCredentials {
  creds: SafepayCredentials;
  cachedAt: number;
}
const credentialsCache = new Map<string, CachedCredentials>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute TTL

// Diagnostic state for encryption vault health
let lastVaultDiagnostic: VaultDiagnostic = {
  status: 'not_configured',
  message: 'Vault status not checked yet',
};

export function maskString(str: string): string {
  if (!str) return '';
  if (str.length <= 8) return '••••••••';
  const prefix = str.slice(0, 4);
  const suffix = str.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

interface EncryptedSafepayPayload {
  iv: string;         // 12-byte hex
  authTag: string;    // 16-byte hex
  ciphertext: string; // hex
  algorithm: 'aes-256-gcm';
  updatedAt: string;
}

/**
 * Derives a 32-byte (256-bit) encryption key from the environment variable SAFEPAY_ENCRYPTION_KEY.
 * Never writes the key to a file or disk.
 */
function getMasterEncryptionKey(): Buffer | null {
  const envKey = process.env.SAFEPAY_ENCRYPTION_KEY || process.env.ENCRYPTION_MASTER_KEY;
  if (!envKey || envKey.trim() === '') {
    return null;
  }
  return crypto.createHash('sha256').update(envKey.trim()).digest();
}

function encryptPayload(creds: SafepayCredentials, key: Buffer): EncryptedSafepayPayload {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = JSON.stringify(creds);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    ciphertext: ciphertext.toString('hex'),
    algorithm: 'aes-256-gcm',
    updatedAt: new Date().toISOString(),
  };
}

function decryptPayload(data: any, key: Buffer): SafepayCredentials {
  if (!data.iv || !data.authTag || !data.ciphertext) {
    throw new Error('Malformed encrypted payload in Firestore');
  }
  const iv = Buffer.from(data.iv, 'hex');
  const authTag = Buffer.from(data.authTag, 'hex');
  const ciphertext = Buffer.from(data.ciphertext, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  return JSON.parse(decrypted);
}

/**
 * Loads Safepay credentials securely from Firestore (decrypted via AES-256-GCM) or environment variables.
 * Frontend NEVER receives the plaintext credentials.
 */
export async function getSafepayCredentials(storeId: string = 'default'): Promise<SafepayCredentials> {
  // 1. Check process.env overrides
  const envApiKey = process.env.SAFEPAY_API_KEY;
  const envWebhookSecret = process.env.SAFEPAY_WEBHOOK_SECRET;
  const envMode = (process.env.SAFEPAY_ENVIRONMENT === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production';

  if (envApiKey && envWebhookSecret) {
    lastVaultDiagnostic = {
      status: 'connected',
      message: 'Credentials active via environment variables (SAFEPAY_API_KEY).',
    };
    return {
      apiKey: envApiKey,
      webhookSecret: envWebhookSecret,
      environment: envMode,
      enabled: process.env.SAFEPAY_ENABLED === 'true',
    };
  }

  // 2. Check in-memory cache
  const cached = credentialsCache.get(storeId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.creds;
  }

  // 3. Verify SAFEPAY_ENCRYPTION_KEY presence
  const key = getMasterEncryptionKey();
  if (!key) {
    lastVaultDiagnostic = {
      status: 'missing_key',
      message: 'SAFEPAY_ENCRYPTION_KEY environment variable is not configured. Set SAFEPAY_ENCRYPTION_KEY in your Cloud Run deploy settings to enable AES-256-GCM credential encryption.',
    };
    return {
      apiKey: '',
      webhookSecret: '',
      environment: 'sandbox',
      enabled: false,
    };
  }

  // 4. Retrieve encrypted ciphertext from Firestore via Firebase Admin SDK
  try {
    const db = getAdminFirestore();
    let docSnap = await db.collection('stores').doc(storeId).collection('private_settings').doc('safepay').get();
    if (!docSnap.exists) {
      docSnap = await db.collection('stores').doc(storeId).collection('settings').doc('safepay').get();
    }

    if (!docSnap.exists) {
      lastVaultDiagnostic = {
        status: 'not_configured',
        message: 'SAFEPAY_ENCRYPTION_KEY is active, but no credentials have been saved to Firestore yet.',
      };
      return {
        apiKey: '',
        webhookSecret: '',
        environment: 'sandbox',
        enabled: false,
      };
    }

    const docData = docSnap.data();
    if (!docData) {
      throw new Error('Empty document in Firestore');
    }

    const creds = decryptPayload(docData, key);
    credentialsCache.set(storeId, { creds, cachedAt: Date.now() });
    lastVaultDiagnostic = {
      status: 'connected',
      message: 'Credentials successfully decrypted from Firestore using AES-256-GCM master key.',
    };
    return creds;
  } catch (err: any) {
    const errMsg = err.message || String(err);
    lastVaultDiagnostic = {
      status: 'error',
      message: `Failed to decrypt Safepay credentials: ${errMsg}. Verify that SAFEPAY_ENCRYPTION_KEY matches the key used when saving.`,
      details: errMsg,
    };
    console.warn('[SafepayVault] Decryption error:', errMsg);
    return {
      apiKey: '',
      webhookSecret: '',
      environment: 'sandbox',
      enabled: false,
    };
  }
}

/**
 * Encrypts and saves Safepay credentials to Firestore using AES-256-GCM and the master encryption key.
 */
export async function saveSafepayCredentials(
  storeId: string = 'default',
  params: {
    apiKey?: string;
    webhookSecret?: string;
    environment?: 'sandbox' | 'production';
    enabled?: boolean;
  }
): Promise<void> {
  const key = getMasterEncryptionKey();
  if (!key) {
    throw new Error(
      'Cannot save credentials: SAFEPAY_ENCRYPTION_KEY environment variable is not configured. Please set SAFEPAY_ENCRYPTION_KEY in your Cloud Run deployment configuration before saving credentials.'
    );
  }

  const existing = await getSafepayCredentials(storeId);
  const updated: SafepayCredentials = {
    apiKey: params.apiKey !== undefined && params.apiKey !== '' ? params.apiKey.trim() : existing.apiKey,
    webhookSecret: params.webhookSecret !== undefined && params.webhookSecret !== '' ? params.webhookSecret.trim() : existing.webhookSecret,
    environment: params.environment || existing.environment,
    enabled: params.enabled !== undefined ? params.enabled : existing.enabled,
  };

  const encrypted = encryptPayload(updated, key);
  const db = getAdminFirestore();

  // Save to private_settings in Firestore with server-side Admin SDK
  await db.collection('stores').doc(storeId).collection('private_settings').doc('safepay').set(encrypted);

  // Invalidate and update cache
  credentialsCache.set(storeId, { creds: updated, cachedAt: Date.now() });
  lastVaultDiagnostic = {
    status: 'connected',
    message: 'Credentials encrypted with AES-256-GCM and saved to Firestore.',
  };
}

/**
 * Returns safe, masked status for the admin panel and public checkout readiness.
 */
export async function getSafepayStatus(storeId: string = 'default', baseUrl: string = ''): Promise<SafepayStatusResponse> {
  const creds = await getSafepayCredentials(storeId);
  const hasApiKey = Boolean(creds.apiKey && creds.apiKey.length > 5);
  const hasWebhookSecret = Boolean(creds.webhookSecret && creds.webhookSecret.length > 5);

  const webhookUrl = baseUrl
    ? `${baseUrl.replace(/\/$/, '')}/api/safepay/webhook`
    : '/api/safepay/webhook';

  return {
    configured: hasApiKey && hasWebhookSecret,
    enabled: creds.enabled && hasApiKey,
    environment: creds.environment,
    hasApiKey,
    hasWebhookSecret,
    maskedApiKey: hasApiKey ? maskString(creds.apiKey) : undefined,
    webhookUrl,
    vault: lastVaultDiagnostic,
    secretManager: lastVaultDiagnostic,
  };
}

/**
 * Helper to fetch Firestore order via Firebase Admin SDK.
 * Runs with server-side administrative authority (never blocked by client security rules).
 */
export async function fetchFirestoreOrder(storeId: string, orderId: string): Promise<any> {
  const db = getAdminFirestore();
  const docRef = db.collection('stores').doc(storeId).collection('orders').doc(orderId);
  const snap = await docRef.get();
  if (!snap.exists) {
    throw new Error(`Order ${orderId} not found in store ${storeId}`);
  }
  const data = snap.data() || {};
  return {
    id: snap.id,
    total: typeof data.total === 'number' ? data.total : Number(data.total || 0),
    orderNumber: data.orderNumber || '',
    customer: data.customer || {},
    paymentStatus: data.paymentStatus || 'unpaid',
    orderStatus: data.orderStatus || 'pending',
    safepayTracker: data.safepayTracker || undefined,
  };
}

/**
 * Helper to update Firestore order via Firebase Admin SDK.
 * Runs with server-side administrative authority (never blocked by client security rules).
 */
export async function updateFirestoreOrder(
  storeId: string,
  orderId: string,
  updates: Record<string, any>
): Promise<void> {
  const db = getAdminFirestore();
  const docRef = db.collection('stores').doc(storeId).collection('orders').doc(orderId);
  await docRef.set(updates, { merge: true });
}

/**
 * Searches orders by Safepay tracker token using Firebase Admin SDK.
 */
export async function findOrderByTracker(storeId: string, trackerToken: string): Promise<{ orderId: string; orderData: any } | null> {
  const db = getAdminFirestore();
  const ordersRef = db.collection('stores').doc(storeId).collection('orders');
  const snap = await ordersRef.where('safepayTracker', '==', trackerToken).limit(1).get();
  if (snap.empty) {
    return null;
  }
  const doc = snap.docs[0];
  const data = doc.data() || {};
  return {
    orderId: doc.id,
    orderData: {
      total: typeof data.total === 'number' ? data.total : Number(data.total || 0),
      paymentStatus: data.paymentStatus,
    },
  };
}

/**
 * Core Tracker Initialization:
 * 1. Validates order exists in Firestore and total > 0.
 * 2. Fetches server-side Safepay API Key (client never sees key).
 * 3. Calls Safepay order/v1/init with amount in PKR paisas (1 PKR = 100 paisas).
 * 4. Calls Safepay client/passport/v1/token for TBT passport token.
 * 5. Constructs official hosted checkout URL.
 * 6. Updates order with safepayTracker.
 */
export async function initSafepayTracker(params: {
  storeId: string;
  orderId: string;
  redirectUrl: string;
  cancelUrl: string;
}): Promise<{ checkoutUrl: string; tracker: string }> {
  const { storeId, orderId, redirectUrl, cancelUrl } = params;

  // 1. Authoritative order retrieval
  const order = await fetchFirestoreOrder(storeId, orderId);
  if (!order || order.total <= 0) {
    throw new Error('Order not found or invalid order total');
  }

  // 2. Safepay credentials
  const creds = await getSafepayCredentials(storeId);
  if (!creds.apiKey) {
    throw new Error('Safepay API Key is not configured on the server');
  }

  const baseUrl =
    creds.environment === 'production'
      ? 'https://api.getsafepay.com'
      : 'https://sandbox.api.getsafepay.com';

  const checkoutBaseUrl =
    creds.environment === 'production'
      ? 'https://api.getsafepay.com/components'
      : 'https://sandbox.api.getsafepay.com/components';

  // Amount in smallest unit (paisas for PKR)
  const amountInPaisas = Math.round(order.total * 100);

  // 3. Step A: Initialize order tracker on Safepay
  const initRes = await fetch(`${baseUrl}/order/v1/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client: creds.apiKey,
      amount: amountInPaisas,
      currency: 'PKR',
      environment: creds.environment,
    }),
  });

  if (!initRes.ok) {
    const errText = await initRes.text();
    console.error('Safepay order/v1/init failed:', errText);
    throw new Error(`Safepay initialization failed (${initRes.status})`);
  }

  const initData = await initRes.json();
  const trackerToken = initData.data?.token || initData.token;
  if (!trackerToken) {
    throw new Error('Safepay response missing tracker token');
  }

  // 4. Step B: Get time-based authentication token (passport TBT)
  let passportToken = '';
  try {
    const passportRes = await fetch(`${baseUrl}/client/passport/v1/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client: creds.apiKey }),
    });

    if (passportRes.ok) {
      const pData = await passportRes.json();
      passportToken = pData.data?.token || (typeof pData.data === 'string' ? pData.data : pData.token || '');
    }
  } catch (err) {
    console.warn('Safepay passport token fetch error (continuing with tracker):', err);
  }

  // 5. Step C: Construct official hosted checkout URL
  const checkoutUrlObj = new URL(checkoutBaseUrl);
  checkoutUrlObj.searchParams.set('env', creds.environment);
  checkoutUrlObj.searchParams.set('beacon', trackerToken);
  if (passportToken) {
    checkoutUrlObj.searchParams.set('tbt', passportToken);
  }
  checkoutUrlObj.searchParams.set('source', 'custom');
  checkoutUrlObj.searchParams.set('order_id', orderId);
  checkoutUrlObj.searchParams.set('redirect_url', redirectUrl);
  checkoutUrlObj.searchParams.set('cancel_url', cancelUrl);
  checkoutUrlObj.searchParams.set('webhooks', 'true');

  const checkoutUrl = checkoutUrlObj.toString();

  // 6. Step D: Save tracker to Firestore order
  await updateFirestoreOrder(storeId, orderId, {
    safepayTracker: trackerToken,
    paymentStatus: 'pending_verification',
    updatedAt: new Date().toISOString(),
  });

  return { checkoutUrl, tracker: trackerToken };
}

/**
 * Webhook HMAC Signature Verification:
 * - Reads X-SFPY-SIGNATURE and X-SFPY-TIMESTAMP
 * - Reconstructs signing payload: `${timestamp}.${rawBody}`
 * - Handles base64 or raw string secret decoding
 * - Computes HMAC-SHA256
 * - Performs constant-time comparison to prevent timing attacks
 * - Validates timestamp freshness (anti-replay window)
 */
export function verifyWebhookSignature(params: {
  signatureHeader: string;
  timestampHeader: string;
  rawBody: string;
  webhookSecret: string;
  maxAgeSeconds?: number;
}): { isValid: boolean; reason?: string } {
  const { signatureHeader, timestampHeader, rawBody, webhookSecret, maxAgeSeconds = 600 } = params;

  if (!signatureHeader || !timestampHeader) {
    return { isValid: false, reason: 'Missing signature or timestamp header' };
  }

  // Anti-replay check
  const tsNum = parseInt(timestampHeader, 10);
  if (isNaN(tsNum)) {
    return { isValid: false, reason: 'Invalid timestamp header' };
  }
  const currentEpoch = Math.floor(Date.now() / 1000);
  if (Math.abs(currentEpoch - tsNum) > maxAgeSeconds) {
    return { isValid: false, reason: 'Webhook timestamp expired (replay attack defense)' };
  }

  // Determine secret key buffer (check if base64 encoded)
  let keyBuffer: Buffer;
  try {
    const isBase64 = /^[A-Za-z0-9+/=]+$/.test(webhookSecret) && webhookSecret.length % 4 === 0;
    if (isBase64) {
      keyBuffer = Buffer.from(webhookSecret, 'base64');
    } else {
      keyBuffer = Buffer.from(webhookSecret, 'utf8');
    }
  } catch {
    keyBuffer = Buffer.from(webhookSecret, 'utf8');
  }

  // Construct payload: timestamp + '.' + raw_body
  const signingPayload = `${timestampHeader}.${rawBody}`;
  const computedHex = crypto.createHmac('sha256', keyBuffer).update(signingPayload, 'utf8').digest('hex');
  const computedPrefixed = `sha256=${computedHex}`;

  // Clean incoming signature
  const cleanReceived = signatureHeader.trim();

  // Try constant-time comparison against both raw hex and sha256= prefixed hex
  const matchPrefixed =
    cleanReceived.length === computedPrefixed.length &&
    crypto.timingSafeEqual(Buffer.from(cleanReceived), Buffer.from(computedPrefixed));

  const matchRaw =
    cleanReceived.length === computedHex.length &&
    crypto.timingSafeEqual(Buffer.from(cleanReceived), Buffer.from(computedHex));

  if (!matchPrefixed && !matchRaw) {
    return { isValid: false, reason: 'HMAC signature mismatch' };
  }

  return { isValid: true };
}

/**
 * Processes a verified Safepay webhook:
 * Reconciles order payment status, updates Firestore safely.
 */
export async function processVerifiedWebhook(storeId: string, payload: any): Promise<{ handled: boolean; orderId?: string }> {
  // Safepay payloads may put notification inside data.notification or top-level notification/data
  const notification = payload.data?.notification || payload.notification || payload.data || payload;
  const state = notification.state || payload.state || '';
  const tracker = notification.tracker || payload.tracker || payload.token;
  const orderIdFromPayload = notification.order_id || payload.order_id || payload.metadata?.order_id;

  // We consider payment successful if state is 'PAID' or 'payment.succeeded' or 'TRACKER_ENDED'
  const isPaid =
    state === 'PAID' ||
    state === 'TRACKER_ENDED' ||
    payload.event === 'payment.succeeded' ||
    payload.success === true;

  if (!isPaid) {
    console.log(`Safepay webhook received non-terminal/non-paid state: ${state}`);
    return { handled: false };
  }

  let targetOrderId = orderIdFromPayload;

  // If orderId not in payload, search by tracker token
  if (!targetOrderId && tracker) {
    const found = await findOrderByTracker(storeId, tracker);
    if (found) {
      targetOrderId = found.orderId;
    }
  }

  if (!targetOrderId) {
    console.warn('Unable to locate matching order for Safepay webhook:', { tracker, orderIdFromPayload });
    return { handled: false };
  }

  // Update order status to paid
  await updateFirestoreOrder(storeId, targetOrderId, {
    paymentStatus: 'paid',
    orderStatus: 'confirmed',
    safepaySignatureVerified: true,
    safepayPaidAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  console.log(`Order ${targetOrderId} successfully marked as PAID via verified Safepay webhook.`);
  return { handled: true, orderId: targetOrderId };
}

/**
 * Diagnostic sandbox connection test.
 * Surfaces specific encryption vault / Firestore status if credentials are unreadable.
 */
export async function testSafepayConnection(storeId: string = 'default'): Promise<{ success: boolean; message: string }> {
  const creds = await getSafepayCredentials(storeId);
  if (!creds.apiKey) {
    if (lastVaultDiagnostic.status === 'missing_key') {
      return {
        success: false,
        message: `Missing Master Key: ${lastVaultDiagnostic.message}`,
      };
    }
    if (lastVaultDiagnostic.status === 'not_configured') {
      return {
        success: false,
        message: `Encryption key is active, but no Safepay API Key has been saved yet in Firestore. Enter your credentials above and click Save.`,
      };
    }
    if (lastVaultDiagnostic.status === 'error') {
      return {
        success: false,
        message: `Decryption Error: ${lastVaultDiagnostic.message}`,
      };
    }
    return {
      success: false,
      message: `No Safepay API Key configured (${lastVaultDiagnostic.message || 'not set'}).`,
    };
  }

  const baseUrl =
    creds.environment === 'production'
      ? 'https://api.getsafepay.com'
      : 'https://sandbox.api.getsafepay.com';

  try {
    const res = await fetch(`${baseUrl}/client/passport/v1/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client: creds.apiKey }),
    });

    if (res.ok) {
      return {
        success: true,
        message: `Successfully connected to Safepay ${creds.environment.toUpperCase()} API! Authentication verified.`,
      };
    } else {
      const errText = await res.text();
      return {
        success: false,
        message: `Safepay rejected key (${res.status}): ${errText.slice(0, 100)}`,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Connection error: ${err.message || 'Unable to reach Safepay endpoint'}`,
    };
  }
}
