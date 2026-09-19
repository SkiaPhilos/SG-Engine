import { SafepayGatewayConfig } from '../../types/store';

export interface VaultDiagnostic {
  status: 'connected' | 'not_configured' | 'missing_key' | 'api_disabled' | 'permission_denied' | 'error';
  message: string;
  details?: string;
}

export type SecretManagerDiagnostic = VaultDiagnostic;

export interface SafepayStatusResponse {
  configured: boolean;
  enabled: boolean;
  environment: 'sandbox' | 'production';
  hasApiKey: boolean;
  hasSecretKey?: boolean;
  hasWebhookSecret: boolean;
  maskedApiKey?: string;
  maskedSecretKey?: string;
  webhookUrl: string;
  vault?: VaultDiagnostic;
  secretManager?: VaultDiagnostic;
}

export interface SafepayTrackerResponse {
  checkoutUrl: string;
  tracker: string;
}

export interface SafepayTestResponse {
  success: boolean;
  message: string;
}

/**
 * Fetch current public status of Safepay gateway.
 * Zero plaintext secrets are returned to the client.
 */
export async function getSafepayStatus(storeId: string = 'default'): Promise<SafepayStatusResponse> {
  try {
    const res = await fetch(`/api/safepay/status?storeId=${encodeURIComponent(storeId)}`);
    if (!res.ok) {
      throw new Error(`Status check failed: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    return {
      configured: false,
      enabled: false,
      environment: 'sandbox',
      hasApiKey: false,
      hasWebhookSecret: false,
      webhookUrl: `${window.location.origin}/api/safepay/webhook`,
    };
  }
}

/**
 * Request server to initialize an authoritative Safepay payment session.
 * Order total and parameters are verified on server.
 */
export async function createSafepayTracker(params: {
  storeId: string;
  orderId: string;
  redirectUrl?: string;
  cancelUrl?: string;
}): Promise<SafepayTrackerResponse> {
  const res = await fetch('/api/safepay/create-tracker', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Payment session initialization failed (${res.status})`);
  }

  return await res.json();
}

/**
 * Admin operator: Configure or rotate Safepay credentials.
 * Inputs are sent directly to server-side encrypted vault.
 */
export async function configureSafepay(params: {
  storeId: string;
  apiKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  environment: 'sandbox' | 'production';
  enabled: boolean;
}): Promise<SafepayStatusResponse> {
  const res = await fetch('/api/safepay/configure', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Configuration update failed (${res.status})`);
  }

  const data = await res.json();
  return data.status;
}

/**
 * Admin operator: Test sandbox API connectivity.
 */
export async function testSafepayConnection(
  storeId: string = 'default',
  options?: { apiKey?: string; secretKey?: string; environment?: 'sandbox' | 'production' }
): Promise<SafepayTestResponse> {
  const res = await fetch('/api/safepay/test-connection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storeId, ...options }),
  });

  const data = await res.json().catch(() => ({ success: false, message: 'Invalid response from server' }));
  if (!res.ok && !data.message) {
    throw new Error(`Connection test failed (${res.status})`);
  }

  return data;
}
