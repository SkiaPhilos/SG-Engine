/**
 * Server-side Order Confirmation Email Dispatcher
 * Generates responsive HTML receipts and dispatches via Resend if RESEND_API_KEY is configured.
 */

export interface EmailOrderPayload {
  order: any;
  storeConfig: any;
  origin?: string;
}

export function generateOrderConfirmationHtml(payload: EmailOrderPayload): string {
  const { order, storeConfig, origin = 'https://storeengine.app' } = payload;
  const storeName = storeConfig?.storeName || 'Online Store';
  const currency = storeConfig?.currency || 'PKR';
  const trackingUrl = `${origin}/#order_confirmation?orderId=${order.id}&token=${order.accessToken || ''}`;

  const formatMoney = (amount: number) => {
    return `${currency} ${Number(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const itemsRows = (order.items || [])
    .map(
      (item: any) => `
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #1f2937;">
          <strong>${item.productName || item.name || 'Product'}</strong>
          ${item.isFreeReward ? '<br><span style="display: inline-block; padding: 2px 6px; font-size: 10px; font-weight: 700; color: #065f46; background-color: #ecfdf5; border-radius: 4px; margin-top: 4px;">COMPLIMENTARY GIFT</span>' : ''}
          ${item.sku ? `<br><span style="font-size: 11px; color: #6b7280; font-family: monospace;">SKU: ${item.sku}</span>` : ''}
        </td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #4b5563; text-align: center;">
          ${item.quantity || 1}
        </td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #111827; text-align: right; font-weight: 600;">
          ${item.isFreeReward ? '<span style="color: #059669; font-weight: 700;">FREE</span>' : formatMoney(item.totalPrice ?? ((item.unitPrice || item.price || 0) * (item.quantity || 1)))}
        </td>
      </tr>
    `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation #${order.orderNumber}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #111827; padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">
                ${storeName}
              </h1>
              <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 13px;">
                Thank you for your order!
              </p>
            </td>
          </tr>

          <!-- Confirmation Hero -->
          <tr>
            <td style="padding: 32px 24px 20px 24px; text-align: center; border-bottom: 1px solid #f3f4f6;">
              <div style="display: inline-block; padding: 8px 16px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 9999px; margin-bottom: 16px;">
                <span style="color: #065f46; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
                  Order Confirmed • #${order.orderNumber}
                </span>
              </div>
              <h2 style="margin: 0 0 8px 0; color: #111827; font-size: 20px; font-weight: 700;">
                We're getting your order ready, ${order.customer?.name || 'Valued Customer'}!
              </h2>
              <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                We have received your order details. You can track fulfillment progress anytime using your personal order link below.
              </p>
            </td>
          </tr>

          <!-- Items Table -->
          <tr>
            <td style="padding: 24px;">
              <h3 style="margin: 0 0 16px 0; font-size: 15px; font-weight: 700; color: #111827; text-transform: uppercase; letter-spacing: 0.05em;">
                Ordered Items
              </h3>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 8px; text-align: left; font-size: 11px; font-weight: 700; color: #4b5563; text-transform: uppercase; border-bottom: 1px solid #e5e7eb;">Item</th>
                    <th style="padding: 8px; text-align: center; font-size: 11px; font-weight: 700; color: #4b5563; text-transform: uppercase; border-bottom: 1px solid #e5e7eb;">Qty</th>
                    <th style="padding: 8px; text-align: right; font-size: 11px; font-weight: 700; color: #4b5563; text-transform: uppercase; border-bottom: 1px solid #e5e7eb;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRows}
                </tbody>
              </table>

              <!-- Financial Summary -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 20px; font-size: 13px;">
                <tr>
                  <td style="padding: 4px 0; color: #6b7280;">Subtotal:</td>
                  <td style="padding: 4px 0; color: #111827; text-align: right; font-weight: 500;">${formatMoney(order.subtotal)}</td>
                </tr>
                ${
                  order.discountTotal > 0
                    ? `<tr>
                        <td style="padding: 4px 0; color: #059669; font-weight: 500;">Discounts / Offers:</td>
                        <td style="padding: 4px 0; color: #059669; text-align: right; font-weight: 600;">-${formatMoney(order.discountTotal)}</td>
                      </tr>`
                    : ''
                }
                <tr>
                  <td style="padding: 4px 0; color: #6b7280;">Delivery / Fulfillment:</td>
                  <td style="padding: 4px 0; color: #111827; text-align: right; font-weight: 500;">
                    ${order.deliveryFee === 0 ? 'FREE' : formatMoney(order.deliveryFee)}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0 0 0; color: #111827; font-size: 16px; font-weight: 800; border-top: 2px solid #e5e7eb;">Total Amount:</td>
                  <td style="padding: 12px 0 0 0; color: #111827; font-size: 18px; font-weight: 800; text-align: right; border-top: 2px solid #e5e7eb;">
                    ${formatMoney(order.total)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Delivery & Payment Info -->
          <tr>
            <td style="padding: 0 24px 24px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f9fafb; border-radius: 12px; padding: 16px;">
                <tr>
                  <td width="50%" valign="top" style="padding-right: 12px;">
                    <strong style="display: block; font-size: 12px; text-transform: uppercase; color: #6b7280; margin-bottom: 6px;">
                      Delivery Address
                    </strong>
                    <div style="font-size: 13px; color: #1f2937; line-height: 1.4;">
                      ${order.customer?.name}<br>
                      ${order.customer?.address || 'Store Pickup'}<br>
                      ${order.customer?.city || ''}<br>
                      ${order.customer?.phone || ''}
                    </div>
                  </td>
                  <td width="50%" valign="top" style="padding-left: 12px; border-left: 1px solid #e5e7eb;">
                    <strong style="display: block; font-size: 12px; text-transform: uppercase; color: #6b7280; margin-bottom: 6px;">
                      Payment Method
                    </strong>
                    <div style="font-size: 13px; color: #1f2937; line-height: 1.4;">
                      <strong>${order.paymentMethodName || 'Direct Payment'}</strong><br>
                      Status: <span style="font-weight: 600; text-transform: uppercase; font-size: 11px;">${(order.paymentStatus || 'pending').replace('_', ' ')}</span>
                      ${order.transactionReference ? `<br><span style="font-family: monospace; font-size: 11px;">TID: ${order.transactionReference}</span>` : ''}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Call to Action -->
          <tr>
            <td style="padding: 0 24px 32px 24px; text-align: center;">
              <a href="${trackingUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 14px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
                View &amp; Track Your Order Online →
              </a>
              <p style="margin: 16px 0 0 0; color: #9ca3af; font-size: 12px;">
                Questions about your order? Reply directly to this email or contact support.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 24px; text-align: center; border-top: 1px solid #f3f4f6; color: #9ca3af; font-size: 12px;">
              © ${new Date().getFullYear()} ${storeName}. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Handles dispatching email via Resend if RESEND_API_KEY is available.
 * If not available, logs email content gracefully to console without failing.
 */
export async function sendOrderEmail(payload: EmailOrderPayload): Promise<{ success: boolean; simulated?: boolean; message: string }> {
  const { order, storeConfig } = payload;
  const customerEmail = (order.customer?.email || '').trim();

  if (!customerEmail || !customerEmail.includes('@')) {
    return { success: false, message: 'No customer email provided.' };
  }

  const html = generateOrderConfirmationHtml(payload);
  const resendApiKey = process.env.RESEND_API_KEY;

  if (resendApiKey) {
    try {
      const fromEmail = process.env.EMAIL_FROM || 'Store Orders <onboarding@resend.dev>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: customerEmail,
          subject: `Order Confirmation #${order.orderNumber} - ${storeConfig?.storeName || 'Store Engine'}`,
          html,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[EmailService] Resend API error:', errorText);
        return { success: false, message: `Resend error: ${errorText}` };
      }

      const resData = await res.json();
      console.log('[EmailService] Live order confirmation email sent to', customerEmail, 'id:', resData.id);
      return { success: true, simulated: false, message: `Confirmation email sent to ${customerEmail}` };
    } catch (err: any) {
      console.error('[EmailService] Exception sending via Resend:', err);
      return { success: false, message: err.message };
    }
  }

  // Graceful simulation & logging when RESEND_API_KEY is not yet added
  console.log(`[EmailService Simulated] Order #${order.orderNumber} confirmation drafted for ${customerEmail}.`);
  console.log(`[EmailService Simulated] To send real emails, set RESEND_API_KEY in your deployment environment variables.`);

  return {
    success: true,
    simulated: true,
    message: `Order confirmation email prepared for ${customerEmail}. Add RESEND_API_KEY in environment variables to send live emails.`,
  };
}
