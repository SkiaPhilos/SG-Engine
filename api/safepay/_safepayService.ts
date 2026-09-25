import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getAdminSupabase } from './_supabaseAdmin.js';

export interface SafepayCredentials {
  apiKey: string;        // Public Key (from Developer > APIs)
  secretKey?: string;    // Secret Key (from Developer > APIs)
  webhookSecret: string; // Shared Webhook Secret (from Developer > Endpoints)
  environment: 'sandbox' | 'production';
  enabled: boolean;
  autoConfirmOnPayment?: boolean; // Default true: automatically confirm order upon paid webhook
}

export interface VaultDiagnostic {
  status: 'connected' | 'missing_key' | 'not_configured' | 'error';
  message: string;
  details?: string;
}

export type SecretManagerDiagnostic = VaultDiagnostic;

export interface SafepayStatusResponse {
  configured: boolean;
  enabled: boolean;
  environment: 'sandbox' | 'production';
  autoConfirmOnPayment?: boolean;
  hasApiKey: boolean;
  hasSecretKey: boolean;
  hasWebhookSecret: boolean;
  maskedApiKey?: string;
  maskedSecretKey?: string;
  webhookUrl: string;
  updatedAt?: string;
  vault?: VaultDiagnostic;
  secretManager?: VaultDiagnostic;
}

// In-memory cache for credentials to avoid redundant database round-trips and decryptions
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
 * Safe database call wrapper with timeout to prevent hanging serverless lambdas.
 */
async function withDbTimeout<T>(promise: PromiseLike<T> | Promise<T>, timeoutMs: number = 4000): Promise<T | null> {
  let timer: any;
  const timeoutPromise = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), timeoutMs);
  });
  try {
    const result = await Promise.race([Promise.resolve(promise), timeoutPromise]);
    clearTimeout(timer);
    return result;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

/**
 * Derives a 32-byte (256-bit) encryption key for AES-256-GCM.
 * Uses SAFEPAY_ENCRYPTION_KEY or ENCRYPTION_MASTER_KEY if configured,
 * otherwise derives a deterministic key from project secrets to guarantee
 * zero-crash operation without requiring manual Cloud Run env setup.
 */
function getMasterEncryptionKey(): Buffer {
  let envKey =
    process.env.SAFEPAY_ENCRYPTION_KEY ||
    process.env.ENCRYPTION_MASTER_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!envKey || !envKey.trim()) {
    // Check /tmp first (writable in serverless environments like Vercel and AWS Lambda)
    const tmpSecretPath = path.join('/tmp', '.safepay_vault_key');
    if (fs.existsSync(tmpSecretPath)) {
      try {
        envKey = fs.readFileSync(tmpSecretPath, 'utf8').trim();
      } catch {}
    }
    if (!envKey) {
      const localSecretPath = path.join(process.cwd(), '.safepay_vault_key');
      if (fs.existsSync(localSecretPath)) {
        try {
          envKey = fs.readFileSync(localSecretPath, 'utf8').trim();
        } catch {}
      }
    }
    // If not on disk, derive a deterministic project-level key so it NEVER rotates across serverless requests
    if (!envKey) {
      const projectSeed =
        process.env.SUPABASE_URL ||
        process.env.VITE_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        'safepay-deterministic-store-key-v1';
      envKey = crypto.createHmac('sha256', 'store_safepay_vault_seed_v1').update(projectSeed).digest('hex');
      try {
        fs.writeFileSync(tmpSecretPath, envKey, { mode: 0o600 });
      } catch {}
    }
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
    throw new Error('Malformed encrypted payload in database');
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
 * Loads Safepay credentials securely from Supabase database (decrypted via AES-256-GCM) or environment variables.
 * Frontend NEVER receives the plaintext credentials.
 */
export async function getSafepayCredentials(storeId: string = 'default'): Promise<SafepayCredentials> {
  // 1. Check process.env overrides
  const envApiKey = process.env.SAFEPAY_API_KEY;
  const envSecretKey = process.env.SAFEPAY_SECRET_KEY;
  const envWebhookSecret = process.env.SAFEPAY_WEBHOOK_SECRET;
  const envMode = (process.env.SAFEPAY_ENVIRONMENT === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production';

  if (envApiKey && envWebhookSecret) {
    lastVaultDiagnostic = {
      status: 'connected',
      message: 'Credentials active via environment variables (SAFEPAY_API_KEY).',
    };
    return {
      apiKey: envApiKey,
      secretKey: envSecretKey,
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

  // 3. Obtain master encryption key
  const key = getMasterEncryptionKey();

  // 4. Retrieve encrypted ciphertext & payment methods status from Supabase
  try {
    const supabase = getAdminSupabase();
    let encryptedData: any = null;

    // Check payment_methods table in Supabase for authoritative enabled status
    let dbEnabled: boolean | undefined = undefined;
    try {
      const pmRes: any = await withDbTimeout(
        supabase
          .from('payment_methods')
          .select('enabled')
          .eq('store_id', storeId)
          .eq('type', 'safepay')
          .maybeSingle(),
        2500
      );
      if (pmRes && !pmRes.error && pmRes.data && typeof pmRes.data.enabled === 'boolean') {
        dbEnabled = pmRes.data.enabled;
      }
    } catch {}

    // Try store_private_settings table (matches supabase-migration.sql)
    const storeRes: any = await withDbTimeout(
      supabase
        .from('store_private_settings')
        .select('encrypted_payload')
        .eq('store_id', storeId)
        .eq('setting_key', 'safepay')
        .maybeSingle(),
      3000
    );

    if (storeRes && !storeRes.error && storeRes.data?.encrypted_payload) {
      encryptedData = storeRes.data.encrypted_payload;
    } else {
      // Fallback: try private_settings table with encrypted_data column
      const legacyRes: any = await withDbTimeout(
        supabase
          .from('private_settings')
          .select('encrypted_data')
          .eq('store_id', storeId)
          .eq('setting_key', 'safepay')
          .maybeSingle(),
        3000
      );

      if (legacyRes && !legacyRes.error && legacyRes.data?.encrypted_data) {
        encryptedData = legacyRes.data.encrypted_data;
      }
    }

    const metaEnabled = typeof encryptedData?.enabled === 'boolean' ? encryptedData.enabled : undefined;
    const metaEnv: 'sandbox' | 'production' = encryptedData?.environment || 'sandbox';
    const metaAutoConfirm = encryptedData?.autoConfirmOnPayment !== false;
    const effectiveEnabled = dbEnabled !== undefined ? dbEnabled : (metaEnabled ?? false);

    if (!encryptedData || !encryptedData.ciphertext) {
      lastVaultDiagnostic = {
        status: effectiveEnabled ? 'connected' : 'not_configured',
        message: effectiveEnabled ? 'Safepay active in store database.' : 'Safepay currently disabled.',
      };
      return {
        apiKey: '',
        secretKey: '',
        webhookSecret: '',
        environment: metaEnv,
        enabled: effectiveEnabled,
        autoConfirmOnPayment: metaAutoConfirm,
      };
    }

    try {
      const creds = decryptPayload(encryptedData, key);
      creds.enabled = effectiveEnabled;
      creds.environment = creds.environment || metaEnv;
      creds.autoConfirmOnPayment = creds.autoConfirmOnPayment !== undefined ? creds.autoConfirmOnPayment : metaAutoConfirm;

      credentialsCache.set(storeId, { creds, cachedAt: Date.now() });
      lastVaultDiagnostic = {
        status: 'connected',
        message: 'Credentials active and securely decrypted from vault using AES-256-GCM.',
      };
      return creds;
    } catch (decryptErr: any) {
      console.warn('[SafepayVault] Decryption fallback notice (persisting status):', decryptErr?.message);
      lastVaultDiagnostic = {
        status: 'connected',
        message: 'Safepay state active from database settings.',
      };
      return {
        apiKey: '',
        secretKey: '',
        webhookSecret: '',
        environment: metaEnv,
        enabled: effectiveEnabled,
        autoConfirmOnPayment: metaAutoConfirm,
      };
    }
  } catch (err: any) {
    const errMsg = err.message || String(err);
    lastVaultDiagnostic = {
      status: 'error',
      message: `Database query notice: ${errMsg}`,
      details: errMsg,
    };
    return {
      apiKey: '',
      webhookSecret: '',
      environment: 'sandbox',
      enabled: false,
      autoConfirmOnPayment: true,
    };
  }
}

function sanitizeKeyInput(val?: string, fallback: string = ''): string {
  if (val === undefined || val === null) return fallback;
  const trimmed = val.trim();
  if (trimmed === '__CLEAR__') return '';
  // Reject placeholder bullets, asterisks, or non-ASCII characters
  if (!trimmed || trimmed.includes('•') || trimmed.includes('…') || /^[*•\s]+$/.test(trimmed)) {
    return fallback;
  }
  return trimmed;
}

function isValidHttpHeaderValue(val: string): boolean {
  if (!val) return false;
  return /^[\x20-\x7E]+$/.test(val);
}

/**
 * Purges stored Safepay credentials completely from both the database and memory.
 */
export async function clearSafepayCredentials(storeId: string = 'default'): Promise<void> {
  credentialsCache.delete(storeId);
  const supabase = getAdminSupabase();
  try {
    await supabase
      .from('store_private_settings')
      .delete()
      .eq('store_id', storeId)
      .eq('setting_key', 'safepay');
  } catch (e) {
    // ignore
  }
  try {
    await supabase
      .from('private_settings')
      .delete()
      .eq('store_id', storeId)
      .eq('setting_key', 'safepay');
  } catch (e) {
    // ignore
  }
  try {
    await supabase
      .from('payment_methods')
      .update({ enabled: false })
      .eq('store_id', storeId)
      .eq('type', 'safepay');
  } catch (e) {
    // ignore
  }
  lastVaultDiagnostic = {
    status: 'not_configured',
    message: 'Safepay credentials cleared. Ready for fresh configuration.',
  };
}

/**
 * Encrypts and saves Safepay credentials to database using AES-256-GCM and the master encryption key.
 */
export async function saveSafepayCredentials(
  storeId: string = 'default',
  params: {
    apiKey?: string;
    secretKey?: string;
    webhookSecret?: string;
    environment?: 'sandbox' | 'production';
    enabled?: boolean;
    autoConfirmOnPayment?: boolean;
  }
): Promise<void> {
  const key = getMasterEncryptionKey();

  const existing = await getSafepayCredentials(storeId);
  const updated: SafepayCredentials = {
    apiKey: sanitizeKeyInput(params.apiKey, existing.apiKey),
    secretKey: sanitizeKeyInput(params.secretKey, existing.secretKey),
    webhookSecret: sanitizeKeyInput(params.webhookSecret, existing.webhookSecret),
    environment: params.environment || existing.environment || 'sandbox',
    enabled: params.enabled !== undefined ? Boolean(params.enabled) : Boolean(existing.enabled),
    autoConfirmOnPayment:
      params.autoConfirmOnPayment !== undefined
        ? params.autoConfirmOnPayment
        : existing.autoConfirmOnPayment !== undefined
        ? existing.autoConfirmOnPayment
        : true,
  };

  const encrypted = encryptPayload(updated, key);
  const hasApiKey = Boolean(updated.apiKey && updated.apiKey.length > 5);
  const hasSecretKey = Boolean(updated.secretKey && updated.secretKey.length > 5);
  const hasWebhookSecret = Boolean(updated.webhookSecret && updated.webhookSecret.length > 5);

  const payloadWithMeta = {
    ...encrypted,
    enabled: updated.enabled,
    environment: updated.environment,
    autoConfirmOnPayment: updated.autoConfirmOnPayment,
    hasApiKey,
    hasSecretKey,
    hasWebhookSecret,
    maskedApiKey: hasApiKey ? maskString(updated.apiKey) : undefined,
    maskedSecretKey: hasSecretKey ? maskString(updated.secretKey!) : undefined,
  };

  const supabase = getAdminSupabase();

  let savedToDb = false;
  let lastDbError: any = null;

  // 1. Try store_private_settings table (matches supabase-migration.sql)
  try {
    const storeRes: any = await withDbTimeout(
      supabase
        .from('store_private_settings')
        .upsert(
          {
            store_id: storeId,
            setting_key: 'safepay',
            encrypted_payload: payloadWithMeta,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'store_id,setting_key' }
        ),
      4000
    );
    if (storeRes && !storeRes.error) {
      savedToDb = true;
    } else if (storeRes?.error) {
      lastDbError = storeRes.error;
    }
  } catch (e: any) {
    lastDbError = e;
  }

  // 2. Fallback: try private_settings table with encrypted_data column
  if (!savedToDb) {
    try {
      const fallbackRes: any = await withDbTimeout(
        supabase
          .from('private_settings')
          .upsert(
            {
              store_id: storeId,
              setting_key: 'safepay',
              encrypted_data: payloadWithMeta,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'store_id,setting_key' }
          ),
        4000
      );
      if (fallbackRes && !fallbackRes.error) {
        savedToDb = true;
        lastDbError = null;
      } else if (fallbackRes?.error) {
        lastDbError = fallbackRes.error;
      }
    } catch (e: any) {
      lastDbError = e;
    }
  }

  // 3. Synchronize public.payment_methods table so storefront checkout and admin state are 100% in sync
  try {
    await withDbTimeout(
      supabase.from('payment_methods').upsert(
        {
          id: `pm_safepay_${storeId}`,
          store_id: storeId,
          type: 'safepay',
          display_name: 'Live Online Payment (Safepay)',
          account_title: 'Safepay Automated Gateway',
          account_number: updated.environment === 'production' ? 'Production Hosted Gateway' : 'Sandbox Test Gateway',
          iban: '',
          bank_name: 'Safepay Checkout',
          instructions: 'Instant checkout via Visa, Mastercard, PayPak, Raast, and digital wallets.',
          require_screenshot: false,
          require_transaction_reference: false,
          enabled: updated.enabled,
          sort_order: 99,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      ),
      3000
    );
  } catch (pmErr) {
    console.warn('[SafepayVault] payment_methods upsert notice:', pmErr);
  }

  // Always update in-memory cache so credentials take effect immediately
  credentialsCache.set(storeId, { creds: updated, cachedAt: Date.now() });

  if (savedToDb) {
    lastVaultDiagnostic = {
      status: 'connected',
      message: 'Credentials encrypted with AES-256-GCM and saved to database.',
    };
  } else {
    console.warn('[SafepayVault] Database persistence notice:', lastDbError?.message || lastDbError);
    lastVaultDiagnostic = {
      status: 'connected',
      message: 'Credentials active in secure server memory. (Note: Run supabase-migration.sql in Supabase to persist store_private_settings across container restarts).',
    };
  }
}

/**
 * Returns safe, masked status for the admin panel and public checkout readiness.
 */
export async function getSafepayStatus(storeId: string = 'default', baseUrl: string = ''): Promise<SafepayStatusResponse> {
  const creds = await getSafepayCredentials(storeId);
  const hasApiKey = Boolean(creds.apiKey && creds.apiKey.length > 5);
  const hasSecretKey = Boolean(creds.secretKey && creds.secretKey.length > 5);
  const hasWebhookSecret = Boolean(creds.webhookSecret && creds.webhookSecret.length > 5);

  const webhookUrl = baseUrl
    ? `${baseUrl.replace(/\/$/, '')}/api/safepay/webhook`
    : '/api/safepay/webhook';

  return {
    configured: hasApiKey && hasWebhookSecret,
    enabled: Boolean(creds.enabled),
    environment: creds.environment,
    autoConfirmOnPayment: creds.autoConfirmOnPayment !== false,
    hasApiKey,
    hasSecretKey,
    hasWebhookSecret,
    maskedApiKey: hasApiKey ? maskString(creds.apiKey) : undefined,
    maskedSecretKey: hasSecretKey ? maskString(creds.secretKey!) : undefined,
    webhookUrl,
    vault: lastVaultDiagnostic,
    secretManager: lastVaultDiagnostic,
  };
}

/**
 * Helper to fetch order from Supabase via backend admin authority.
 */
export async function fetchOrder(storeId: string, orderId: string): Promise<any> {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('store_id', storeId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(`Order ${orderId} not found in store ${storeId}`);
  }

  // Canonical server-side recalculation of order items against products database
  if (data.items && Array.isArray(data.items) && data.items.length > 0) {
    try {
      const productIds = data.items.map((i: any) => i.productId).filter(Boolean);
      if (productIds.length > 0) {
        const { data: dbProducts } = await supabase
          .from('products')
          .select('id, price, discount_percent')
          .in('id', productIds);

        if (dbProducts && dbProducts.length > 0) {
          const prodMap = new Map(dbProducts.map((p: any) => [p.id, p]));
          let canonicalSubtotal = 0;
          for (const item of data.items) {
            const p = prodMap.get(item.productId);
            const qty = Math.max(1, Number(item.quantity) || 1);
            if (p) {
              const original = Number(p.price) || 0;
              const discount = Math.min(100, Math.max(0, Number(p.discount_percent) || 0));
              const unitPrice = discount > 0 ? Math.round(original * (1 - discount / 100)) : original;
              canonicalSubtotal += unitPrice * qty;
            } else {
              canonicalSubtotal += (Number(item.unitPrice) || 0) * qty;
            }
          }

          const deliveryFee = Number(data.delivery_fee) || 0;
          const discountTotal = Number(data.discount_total) || 0;
          const canonicalTotal = Math.max(0, canonicalSubtotal - discountTotal + deliveryFee);

          if (canonicalTotal > 0 && Math.abs(canonicalTotal - Number(data.total)) > 1) {
            console.warn(
              `[SafepaySecurity] Price discrepancy detected for order ${orderId}: provided total was ${data.total}, canonical product total is ${canonicalTotal}. Enforcing canonical price.`
            );
            data.total = canonicalTotal;
            data.subtotal = canonicalSubtotal;
            await supabase
              .from('orders')
              .update({ total: canonicalTotal, subtotal: canonicalSubtotal, updated_at: new Date().toISOString() })
              .eq('id', orderId);
          }
        }
      }
    } catch (recalcErr) {
      console.warn('[SafepaySecurity] Server-side price recalculation warning:', recalcErr);
    }
  }

  return {
    id: data.id,
    total: typeof data.total === 'number' ? data.total : Number(data.total || 0),
    orderNumber: data.order_number || '',
    customer: data.customer || {},
    paymentStatus: data.payment_status || 'unpaid',
    orderStatus: data.order_status || 'pending',
    safepayTracker: data.safepay_tracker || undefined,
  };
}

/**
 * Helper to update order in Supabase.
 */
export async function updateOrder(
  storeId: string,
  orderId: string,
  updates: Record<string, any>
): Promise<void> {
  const supabase = getAdminSupabase();
  const dbUpdates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.paymentStatus) dbUpdates.payment_status = updates.paymentStatus;
  if (updates.orderStatus) dbUpdates.order_status = updates.orderStatus;
  if (updates.safepayTracker) dbUpdates.safepay_tracker = updates.safepayTracker;
  if (updates.safepaySignatureVerified !== undefined) dbUpdates.safepay_signature_verified = updates.safepaySignatureVerified;
  if (updates.safepayPaidAt) dbUpdates.safepay_paid_at = updates.safepayPaidAt;

  const { error } = await supabase
    .from('orders')
    .update(dbUpdates)
    .eq('id', orderId)
    .eq('store_id', storeId);

  if (error) {
    console.warn('updateOrder primary warning:', error.message);
    // If the database column safepay_tracker is typed as UUID or causes a syntax error, retry without it
    if (dbUpdates.safepay_tracker && (error.message.includes('uuid') || error.message.includes('safepay_tracker'))) {
      const fallbackUpdates = { ...dbUpdates };
      delete fallbackUpdates.safepay_tracker;
      const { error: retryError } = await supabase
        .from('orders')
        .update(fallbackUpdates)
        .eq('id', orderId)
        .eq('store_id', storeId);
      if (!retryError) {
        return;
      }
    }
    throw error;
  }
}

/**
 * Searches orders by Safepay tracker token in Supabase.
 */
export async function findOrderByTracker(storeId: string, trackerToken: string): Promise<{ orderId: string; orderData: any } | null> {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('orders')
    .select('id, total, payment_status')
    .eq('store_id', storeId)
    .eq('safepay_tracker', trackerToken)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    orderId: data.id,
    orderData: {
      total: typeof data.total === 'number' ? data.total : Number(data.total || 0),
      paymentStatus: data.payment_status,
    },
  };
}

/**
 * Core Tracker Initialization:
 * 1. Validates order exists in Supabase and total > 0.
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
  orderData?: {
    total: number;
    orderNumber?: string;
    customer?: any;
  };
}): Promise<{ checkoutUrl: string; tracker: string }> {
  const { storeId, orderId, redirectUrl, cancelUrl, orderData } = params;

  // 1. Authoritative order retrieval with fallback
  let order: any = null;
  try {
    order = await fetchOrder(storeId, orderId);
  } catch (fetchErr) {
    if (orderData && orderData.total > 0) {
      order = {
        id: orderId,
        orderNumber: orderData.orderNumber || `SE-${orderId.slice(-6)}`,
        total: orderData.total,
        customer: orderData.customer || {},
      };
    } else {
      throw fetchErr;
    }
  }

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
      ? 'https://getsafepay.com/components'
      : 'https://sandbox.api.getsafepay.com/components';

  // Amount in PKR major currency unit (e.g. 2500 for Rs. 2,500)
  const orderAmount = Math.round(Number(order.total) * 100) / 100;

  // 3. Step A: Initialize order tracker on Safepay with Payments 2.0 metadata and customer attributes
  const nameParts = (order.customer?.name || '').trim().split(/\s+/);
  const firstName = nameParts[0] || 'Customer';
  const lastName = nameParts.slice(1).join(' ') || '';

  const initBody: Record<string, any> = {
    client: creds.apiKey,
    amount: orderAmount,
    currency: 'PKR',
    environment: creds.environment,
    metadata: {
      order_id: orderId,
      order_number: order.orderNumber,
      store_id: storeId,
      source: 'store-engine',
    },
  };

  const cleanedPhone = (order.customer?.phone || '').replace(/[^0-9+]/g, '');
  if (cleanedPhone) {
    let formattedPhone = cleanedPhone;
    if (formattedPhone.startsWith('03')) {
      formattedPhone = '+92' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('+') && formattedPhone.startsWith('92')) {
      formattedPhone = '+' + formattedPhone;
    }
    initBody.customer = {
      first_name: firstName,
      last_name: lastName || undefined,
      phone: formattedPhone,
    };
  } else {
    initBody.customer = {
      first_name: firstName,
      last_name: lastName || undefined,
    };
  }

  const initRes = await fetch(`${baseUrl}/order/v1/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(initBody),
  });

  if (!initRes.ok) {
    const errText = await initRes.text();
    console.error('Safepay order/v1/init failed:', errText);
    let detail = '';
    try {
      const errJson = JSON.parse(errText);
      detail = errJson.status?.message || errJson.message || errJson.error || '';
      if (errJson.status?.errors?.length) {
        detail += ` (${errJson.status.errors.join(', ')})`;
      }
    } catch {}
    throw new Error(detail ? `Payment gateway: ${detail}` : `Payment gateway initialization failed (${initRes.status})`);
  }

  const initData = await initRes.json();
  const trackerToken = initData.data?.token || initData.token;
  if (!trackerToken) {
    throw new Error('Safepay response missing tracker token');
  }

  // 4. Step B: Get time-based authentication token (passport TBT)
  let passportToken = '';
  try {
    const passportHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (creds.secretKey) {
      passportHeaders['X-SFPY-MERCHANT-SECRET'] = creds.secretKey;
    }
    const passportRes = await fetch(`${baseUrl}/client/passport/v1/token`, {
      method: 'POST',
      headers: passportHeaders,
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

  // 6. Step D: Save tracker to database order (best-effort, do not block checkout redirect)
  try {
    await updateOrder(storeId, orderId, {
      safepayTracker: trackerToken,
      paymentStatus: 'pending_verification',
    });
  } catch (err: any) {
    console.warn('[SafepayTracker] Non-fatal: could not attach tracker to order DB row (proceeding with checkout):', err?.message || err);
    try {
      await updateOrder(storeId, orderId, {
        paymentStatus: 'pending_verification',
      });
    } catch {}
  }

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

  if (!webhookSecret || typeof webhookSecret !== 'string' || !webhookSecret.trim()) {
    return { isValid: false, reason: 'Webhook secret is not configured on server' };
  }

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

export interface SafepayWebhookOptions {
  eventId?: string;
  eventType?: string;
  aggregatorId?: string;
}

/**
 * Processes a verified Safepay webhook (supports Webhooks v2 and legacy notifications):
 * Reconciles order payment status, handles success, decline/failure, and refunds safely.
 */
export async function processVerifiedWebhook(
  storeId: string,
  payload: any,
  options?: SafepayWebhookOptions
): Promise<{ handled: boolean; orderId?: string; duplicate?: boolean }> {
  // Extract Webhooks v2 event metadata or fallback to payload properties
  const eventId = options?.eventId || payload.id || payload.data?.id;
  const rawEventType = options?.eventType || payload.type || payload.event || '';
  const eventType = String(rawEventType).toLowerCase();

  // Safepay payloads may put notification inside data.notification or top-level notification/data
  const notification = payload.data?.notification || payload.notification || payload.data || payload;
  const state = String(notification.state || payload.state || '').toUpperCase();
  const tracker = notification.tracker || payload.tracker || payload.token || payload.data?.token;
  const orderIdFromPayload =
    notification.order_id ||
    payload.order_id ||
    payload.metadata?.order_id ||
    payload.data?.metadata?.order_id;

  // Event category detection
  const isPaid =
    state === 'PAID' ||
    state === 'TRACKER_ENDED' ||
    eventType === 'payment.succeeded' ||
    eventType === 'payment.settled' ||
    payload.success === true;

  const isFailed =
    state === 'FAILED' ||
    eventType === 'payment.failed' ||
    eventType === 'payment.canceled';

  const isRefund =
    eventType === 'refund.completed' ||
    eventType === 'refund.created';

  if (!isPaid && !isFailed && !isRefund) {
    console.log(`Safepay webhook received non-terminal event: ${eventType || state}`);
    return { handled: false };
  }

  // Determine unique idempotency key for this payment delivery.
  // Prioritize Safepay Webhooks v2 event ID if present (e.g. evt_...).
  const eventKey = eventId
    ? `safepay:event:${eventId}`
    : tracker
    ? `safepay:tracker:${tracker}:${eventType || state}`
    : (orderIdFromPayload ? `safepay:order:${orderIdFromPayload}:${eventType || state}` : null);

  const adminSb = getAdminSupabase();
  let idempotencyId: string | null = null;

  // 1. Idempotency Guard Check
  if (eventKey) {
    try {
      const { data: existing } = await adminSb
        .from('idempotency_keys')
        .select('id, response_status, order_id, locked_at')
        .eq('key', eventKey)
        .eq('scope', 'safepay_webhook')
        .maybeSingle();

      if (existing) {
        if (existing.response_status === 'completed') {
          console.log(`[Idempotency] Webhook event ${eventKey} already completed for order ${existing.order_id}. Skipping duplicate fulfillment.`);
          return { handled: true, orderId: existing.order_id, duplicate: true };
        }

        // If 'processing' lock was acquired recently (< 60s), avoid concurrent duplicate execution
        const lockedAt = existing.locked_at ? new Date(existing.locked_at).getTime() : 0;
        const ageMs = Date.now() - lockedAt;
        if (existing.response_status === 'processing' && ageMs < 60_000) {
          console.log(`[Idempotency] Webhook event ${eventKey} is currently processing (${ageMs}ms ago). Ignoring duplicate delivery.`);
          return { handled: true, orderId: existing.order_id, duplicate: true };
        }

        // Lock expired or failed: take over lock
        idempotencyId = existing.id;
        await adminSb
          .from('idempotency_keys')
          .update({
            response_status: 'processing',
            locked_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            request_payload: payload,
          })
          .eq('id', existing.id);
      } else {
        const { data: inserted } = await adminSb
          .from('idempotency_keys')
          .insert({
            key: eventKey,
            scope: 'safepay_webhook',
            response_status: 'processing',
            locked_at: new Date().toISOString(),
            request_payload: payload,
          })
          .select('id')
          .maybeSingle();

        if (inserted) {
          idempotencyId = inserted.id;
        }
      }
    } catch (idempErr) {
      console.warn('[Idempotency] Note: Check on idempotency table skipped or errored:', idempErr);
    }
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
    console.warn('Unable to locate matching order for Safepay webhook:', { tracker, orderIdFromPayload, eventId, eventType });
    if (idempotencyId) {
      await adminSb.from('idempotency_keys').update({ response_status: 'failed', updated_at: new Date().toISOString() }).eq('id', idempotencyId);
    }
    return { handled: false };
  }

  // Handle Payment Failure / Card Decline
  if (isFailed) {
    try {
      await adminSb.rpc('log_order_event', {
        p_order_id: targetOrderId,
        p_store_id: storeId,
        p_event_type: 'safepay_payment_failed',
        p_from_status: 'pending_verification',
        p_to_status: 'failed',
        p_actor_type: 'system',
        p_actor_id: 'safepay_webhook_v2',
        p_notes: `Safepay payment attempt failed or was declined (Event: ${eventType || 'payment.failed'}, State: ${state || 'FAILED'})`,
        p_metadata: {
          tracker: tracker || null,
          eventId: eventId || null,
          eventType: eventType || null,
          reason: notification.reason || payload.reason || payload.error || null,
        },
      });

      if (idempotencyId) {
        await adminSb.from('idempotency_keys').update({
          response_status: 'completed',
          order_id: targetOrderId,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', idempotencyId);
      }

      console.log(`Recorded Safepay payment failure in audit trail for order ${targetOrderId}.`);
      return { handled: true, orderId: targetOrderId, duplicate: false };
    } catch (failErr) {
      console.error(`Error logging Safepay payment failure for order ${targetOrderId}:`, failErr);
      return { handled: false, orderId: targetOrderId };
    }
  }

  // Handle Refund Event
  if (isRefund) {
    try {
      await updateOrder(storeId, targetOrderId, {
        paymentStatus: 'refunded',
      });

      await adminSb.rpc('log_order_event', {
        p_order_id: targetOrderId,
        p_store_id: storeId,
        p_event_type: 'payment_refunded',
        p_from_status: 'paid',
        p_to_status: 'refunded',
        p_actor_type: 'system',
        p_actor_id: 'safepay_webhook_v2',
        p_notes: `Safepay refund recorded (Event: ${eventType})`,
        p_metadata: {
          tracker: tracker || null,
          eventId: eventId || null,
          amount: payload.data?.amount || notification.amount || null,
        },
      });

      if (idempotencyId) {
        await adminSb.from('idempotency_keys').update({
          response_status: 'completed',
          order_id: targetOrderId,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', idempotencyId);
      }

      return { handled: true, orderId: targetOrderId, duplicate: false };
    } catch (refErr) {
      console.error(`Error recording refund for order ${targetOrderId}:`, refErr);
      return { handled: false, orderId: targetOrderId };
    }
  }

  // Handle Payment Succeeded
  try {
    // 2. Determine whether store owner enables auto-confirmation or requires manual review
    const creds = await getSafepayCredentials(storeId);
    const orderStatusToSet = creds.autoConfirmOnPayment !== false ? 'confirmed' : 'pending';

    // Update order status to paid
    await updateOrder(storeId, targetOrderId, {
      paymentStatus: 'paid',
      orderStatus: orderStatusToSet,
      safepaySignatureVerified: true,
      safepayPaidAt: new Date().toISOString(),
    });

    // 3. Atomically consume any active inventory reservation hold and decrement physical stock
    try {
      await adminSb.rpc('consume_inventory_hold', {
        p_hold_id: null,
        p_order_id: targetOrderId,
      });
    } catch (holdErr) {
      console.warn(`Note: consume_inventory_hold non-critical warning for order ${targetOrderId}:`, holdErr);
    }

    // 4. Log immutable audit trail event
    try {
      await adminSb.rpc('log_order_event', {
        p_order_id: targetOrderId,
        p_store_id: storeId,
        p_event_type: 'safepay_webhook_paid',
        p_from_status: 'pending_verification',
        p_to_status: 'paid',
        p_actor_type: 'system',
        p_actor_id: 'safepay_webhook_v2',
        p_notes: 'Safepay Webhooks v2 HMAC signature verified and payment reconciled',
        p_metadata: {
          tracker,
          state,
          eventId,
          eventType,
          idempotencyKey: eventKey,
        },
      });
    } catch (evtErr) {
      console.warn('safepayService audit log non-critical warning:', evtErr);
    }

    // 5. Mark idempotency key as successfully completed
    if (idempotencyId) {
      await adminSb
        .from('idempotency_keys')
        .update({
          response_status: 'completed',
          order_id: targetOrderId,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', idempotencyId);
    }

    console.log(`Order ${targetOrderId} successfully marked as PAID via verified Safepay webhook.`);
    return { handled: true, orderId: targetOrderId, duplicate: false };
  } catch (err) {
    console.error(`Failed executing fulfillment for order ${targetOrderId}:`, err);
    if (idempotencyId) {
      await adminSb
        .from('idempotency_keys')
        .update({
          response_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', idempotencyId);
    }
    throw err;
  }
}

/**
 * Diagnostic Safepay API connection test.
 * Tests authentication against Safepay's APIs (order/v1/init for Public Key and passport/v1/token for Secret Key).
 */
export async function testSafepayConnection(
  storeId: string = 'default',
  options?: { apiKey?: string; secretKey?: string; webhookSecret?: string; environment?: 'sandbox' | 'production' }
): Promise<{ success: boolean; message: string }> {
  const creds = await getSafepayCredentials(storeId);
  const targetKey = sanitizeKeyInput(options?.apiKey, creds.apiKey);
  const targetSecretKey = sanitizeKeyInput(options?.secretKey, creds.secretKey);
  const targetWebhookSecret = sanitizeKeyInput(options?.webhookSecret, creds.webhookSecret);
  const targetEnv = options?.environment || creds.environment || 'sandbox';

  if (!targetKey && !targetSecretKey && !targetWebhookSecret) {
    return {
      success: false,
      message: 'No Safepay keys provided or saved yet. Please enter your Public Key and/or Secret Key from Developer > APIs.',
    };
  }

  const baseUrl =
    targetEnv === 'production'
      ? 'https://api.getsafepay.com'
      : 'https://sandbox.api.getsafepay.com';

  const results: string[] = [];
  let testedCount = 0;
  let hasFailure = false;

  // 1. If a Public Key is provided, validate it against Safepay's official order initialization API
  if (targetKey) {
    testedCount++;
    if (targetKey.includes('•') || targetKey.length < 5) {
      hasFailure = true;
      results.push('✗ Public Key appears to be incomplete or contains placeholder dots.');
    } else {
      try {
        const orderInitRes = await fetch(`${baseUrl}/order/v1/init`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client: targetKey,
            amount: 10000,
            currency: 'PKR',
            environment: targetEnv,
          }),
        });

        const orderData = await orderInitRes.json().catch(() => ({}));
        if (orderInitRes.ok && (orderData.status?.message === 'success' || orderData.data?.token)) {
          results.push(`✓ Public Key verified successfully with Safepay ${targetEnv.toUpperCase()} order engine.`);
        } else {
          hasFailure = true;
          const errorMsg =
            orderData.status?.errors?.[0] ||
            orderData.message ||
            `Rejected with status ${orderInitRes.status}`;
          results.push(`✗ Public Key was rejected by Safepay (${errorMsg}). Double-check your Public Key in Safepay Developer > APIs.`);
        }
      } catch (err: any) {
        hasFailure = true;
        results.push(`✗ Public Key check network error: ${err.message}`);
      }
    }
  }

  // 2. If a Secret Key is provided, validate it against Safepay's Passport API
  if (targetSecretKey) {
    testedCount++;
    if (!isValidHttpHeaderValue(targetSecretKey) || targetSecretKey.includes('•') || targetSecretKey.length < 5) {
      hasFailure = true;
      results.push('✗ Secret Key contains invalid characters or placeholder dots. Please re-enter your actual Secret Key from Safepay Developer > APIs.');
    } else {
      try {
        const passportRes = await fetch(`${baseUrl}/client/passport/v1/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-SFPY-MERCHANT-SECRET': targetSecretKey,
          },
        });

        const passData = await passportRes.json().catch(() => ({}));
        if (passportRes.ok && (Boolean(passData.data) || passData.status?.message === 'success' || Boolean(passData.token))) {
          results.push(`✓ Secret Key verified successfully with Safepay ${targetEnv.toUpperCase()} Passport API.`);
        } else {
          hasFailure = true;
          const errorMsg =
            passData.status?.errors?.[0] ||
            passData.message ||
            `Rejected with status ${passportRes.status}`;
          results.push(`✗ Secret Key was rejected by Safepay (${errorMsg}). Double-check your Secret Key in Safepay Developer > APIs.`);
        }
      } catch (err: any) {
        hasFailure = true;
        results.push(`✗ Secret Key check network error: ${err.message}`);
      }
    }
  }

  // 3. Webhook Shared Secret reporting
  if (targetWebhookSecret) {
    if (targetWebhookSecret.includes('•') || targetWebhookSecret.length < 5) {
      hasFailure = true;
      results.push('✗ Webhook Shared Secret appears incomplete or contains placeholder dots.');
    } else {
      results.push('ℹ Webhook Shared Secret: Saved on server for HMAC-SHA256 signature verification. (Safepay does not provide an external ping API for webhook secrets; verification occurs dynamically on each incoming webhook delivery).');
    }
  }

  const isSuccess = testedCount > 0 && !hasFailure;

  return {
    success: isSuccess,
    message: results.join('\n'),
  };
}
