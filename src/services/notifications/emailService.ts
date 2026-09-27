import { Order, StoreConfig } from '../../types/store';

export interface SendOrderEmailResult {
  success: boolean;
  message?: string;
  simulated?: boolean;
}

/**
 * Dispatches an order confirmation email to the customer.
 * In production with RESEND_API_KEY, sends a live HTML email.
 * In development or when unconfigured, logs the formatted receipt and audit record.
 */
export async function sendOrderConfirmationEmail(
  order: Order,
  storeConfig: StoreConfig
): Promise<SendOrderEmailResult> {
  const customerEmail = (order.customer?.email || '').trim();
  if (!customerEmail || !customerEmail.includes('@')) {
    return {
      success: false,
      message: 'No valid customer email address found on order.',
    };
  }

  try {
    const res = await fetch('/api/orders/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        order,
        storeConfig,
        origin: window.location.origin,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Email service returned ${res.status}`);
    }

    const data = await res.json();
    return {
      success: true,
      message: data.message || 'Order confirmation email queued successfully.',
      simulated: Boolean(data.simulated),
    };
  } catch (err: any) {
    console.warn('[EmailService] Order confirmation email non-blocking notice:', err.message);
    return {
      success: false,
      message: err.message,
    };
  }
}
