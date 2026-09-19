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
 * Admin operator: Purge stored credentials.
 */
export async function clearSafepayCredentials(storeId: string = 'default'): Promise<SafepayStatusResponse> {
  const res = await fetch('/api/safepay/clear', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storeId }),
  });

  const text = await res.text();
  let data: any = {};
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Clear credentials failed (${res.status})`);
  }

  if (!res.ok || data.success === false) {
    throw new Error(data.error || `Clear failed (${res.status})`);
  }

  return data.status;
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

  const text = await res.text();
  let data: any = {};
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Configuration update failed (${res.status}): ${text.slice(0, 100)}`);
  }

  if (!res.ok || data.success === false) {
    throw new Error(data.error || `Configuration update failed (${res.status})`);
  }

  return data.status;
}

/**
 * Admin operator: Test sandbox API connectivity.
 * Features dual-path testing: tests server-side token & order engine, with client-side fallback if server is unreachable.
 */
export async function testSafepayConnection(
  storeId: string = 'default',
  options?: { apiKey?: string; secretKey?: string; environment?: 'sandbox' | 'production' }
): Promise<SafepayTestResponse> {
  let serverResult: SafepayTestResponse | null = null;
  let serverErrorMessage = '';

  try {
    const res = await fetch('/api/safepay/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId, ...options }),
    });

    const text = await res.text();
    try {
      serverResult = JSON.parse(text);
    } catch {
      serverErrorMessage = `Server returned non-JSON response (${res.status})`;
    }
  } catch (netErr: any) {
    serverErrorMessage = `Network connection error: ${netErr.message}`;
  }

  if (serverResult) {
    return serverResult;
  }

  // Fallback direct client-side test if server endpoint was unreachable
  if (options?.apiKey && !options.apiKey.includes('•') && options.apiKey.length > 5) {
    const baseUrl = options.environment === 'production'
      ? 'https://api.getsafepay.com'
      : 'https://sandbox.api.getsafepay.com';
    try {
      const directRes = await fetch(`${baseUrl}/order/v1/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: options.apiKey.trim(),
          amount: 10000,
          currency: 'PKR',
          environment: options.environment || 'sandbox',
        }),
      });
      const orderData = await directRes.json().catch(() => ({}));
      if (directRes.ok && (orderData.status?.message === 'success' || orderData.data?.token)) {
        return {
          success: true,
          message: `✓ Public Key verified directly with Safepay (${options.environment || 'sandbox'}).`,
        };
      } else {
        const msg = orderData.status?.errors?.[0] || orderData.message || `Status ${directRes.status}`;
        return {
          success: false,
          message: `✗ Safepay rejected Public Key (${msg}). Please verify your Public Key in Safepay Developer > APIs.`,
        };
      }
    } catch (e: any) {
      return {
        success: false,
        message: `${serverErrorMessage}. Direct test also failed: ${e.message}`,
      };
    }
  }

  return {
    success: false,
    message: serverErrorMessage || 'Failed to reach validation service',
  };
}
