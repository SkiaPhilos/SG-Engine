import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  Upload,
  Copy,
  Check,
  Building2,
  ShieldCheck,
  Package,
  Zap,
  RotateCw,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Order } from '../../types/store';
import { getOrderById, updateOrderPaymentProof } from '../../services/store/storeService';
import { uploadToStorage } from '../../services/supabase/storage';

export const OrderConfirmationView: React.FC = () => {
  const {
    activeOrderId,
    storeId,
    formatPrice,
    themeColors,
    setCurrentView,
    paymentMethods,
  } = useStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [tidInput, setTidInput] = useState('');
  const [proofImage, setProofImage] = useState('');
  const [copied, setCopied] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Resolve orderId from active state or URL query/hash (when returning from Safepay redirect)
    let targetId = activeOrderId;
    if (!targetId && typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      targetId = searchParams.get('orderId') || searchParams.get('order_id') || searchParams.get('beacon');

      if (!targetId && window.location.hash.includes('orderId=')) {
        const hashQuery = window.location.hash.split('?')[1];
        if (hashQuery) {
          targetId = new URLSearchParams(hashQuery).get('orderId');
        }
      }
    }

    if (!targetId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchOrder = () => {
      let tokenFromUrl: string | undefined;
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        tokenFromUrl = params.get('token') || params.get('accessToken') || undefined;
        if (!tokenFromUrl && window.location.hash.includes('token=')) {
          const hashQuery = window.location.hash.split('?')[1];
          if (hashQuery) {
            tokenFromUrl = new URLSearchParams(hashQuery).get('token') || new URLSearchParams(hashQuery).get('accessToken') || undefined;
          }
        }
      }

      getOrderById(storeId, targetId!, tokenFromUrl || order?.accessToken).then(ord => {
        if (!isMounted) return;
        setOrder(ord);
        if (ord?.transactionReference) setTidInput(ord.transactionReference);
        setLoading(false);
      }).catch(err => {
        console.error('Error loading order confirmation:', err);
        if (isMounted) setLoading(false);
      });
    };

    fetchOrder();

    // Poll every 3 seconds to catch real-time webhook status updates from Safepay
    const interval = setInterval(fetchOrder, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeOrderId, storeId]);

  const handleUpdateProof = async () => {
    if (!activeOrderId || (!tidInput.trim() && !proofImage)) return;
    setIsUpdating(true);
    try {
      await updateOrderPaymentProof(
        storeId,
        activeOrderId,
        proofImage || undefined,
        tidInput.trim() || undefined,
        order?.accessToken
      );
      const updated = await getOrderById(storeId, activeOrderId);
      setOrder(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUpdating(true);
      const cleanName = `receipt_${activeOrderId}_${Date.now()}.${file.name.split('.').pop() || 'jpg'}`;
      const receiptUrl = await uploadToStorage('payment-receipts', file, cleanName);
      setProofImage(receiptUrl);
    } catch (err) {
      console.warn('Receipt upload fallback:', err);
      const reader = new FileReader();
      reader.onload = () => setProofImage(reader.result as string);
      reader.readAsDataURL(file);
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <Package className="w-16 h-16 text-neutral-400 mb-4" />
        <h2 className="text-xl font-bold mb-2">No Active Order Selected</h2>
        <button
          onClick={() => setCurrentView('store')}
          className="px-6 py-2.5 rounded-full text-white font-semibold text-sm shadow-xs"
          style={{ backgroundColor: themeColors.primary }}
        >
          Return to Store
        </button>
      </div>
    );
  }

  const configuredMethod = paymentMethods.find(m => m.id === order.paymentMethodId);

  return (
    <div className="min-h-screen py-10 sm:py-16 px-4 sm:px-6 lg:px-8 transition-colors" style={{ backgroundColor: themeColors.background }}>
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Success Hero Header */}
        <div
          className="p-6 sm:p-8 rounded-2xl border shadow-sm text-center flex flex-col items-center space-y-4"
          style={{
            backgroundColor: themeColors.surface,
            borderColor: themeColors.border,
          }}
        >
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Order Confirmed &amp; Received
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1" style={{ color: themeColors.text }}>
              Thank You for Your Order!
            </h1>
            <p className="text-xs sm:text-sm mt-1" style={{ color: themeColors.muted }}>
              Order Reference Number: <strong className="font-mono text-sm" style={{ color: themeColors.text }}>#{order.orderNumber}</strong>
            </p>
          </div>

          {/* Payment Status Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold"
            style={{
              backgroundColor: order.paymentStatus === 'paid' ? '#10b98120' : '#f59e0b20',
              color: order.paymentStatus === 'paid' ? '#059669' : '#d97706',
              border: `1px solid ${order.paymentStatus === 'paid' ? '#10b98140' : '#f59e0b40'}`,
            }}
          >
            {order.paymentStatus === 'paid' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : order.paymentMethodId === 'safepay' ? (
              <RotateCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
            ) : (
              <Clock className="w-3.5 h-3.5" />
            )}
            <span>
              {order.paymentStatus === 'paid'
                ? order.paymentMethodId === 'safepay'
                  ? 'Live Payment Verified'
                  : 'Payment Verified & Approved'
                : order.paymentMethodId === 'safepay'
                ? 'Awaiting Live Payment Confirmation'
                : order.paymentStatus === 'payment_submitted'
                ? 'Payment Verification in Progress'
                : 'Pending Direct Payment Verification'}
            </span>
          </div>

          {/* Live Online Payment Specific Information */}
          {order.paymentMethodId === 'safepay' && (
            <div
              className={`w-full max-w-lg p-4 rounded-xl border text-xs text-left space-y-1 ${
                order.paymentStatus === 'paid'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-200'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-200'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                <Zap className="w-4 h-4 text-emerald-600" />
                <span>
                  {order.paymentStatus === 'paid'
                    ? 'Automated Online Payment Confirmed'
                    : 'Live Payment Processing'}
                </span>
              </div>
              <p className="text-[11px] opacity-90">
                {order.paymentStatus === 'paid'
                  ? `Transaction settled successfully${
                      order.safepayPaidAt ? ` at ${new Date(order.safepayPaidAt).toLocaleTimeString()}` : ''
                    }.`
                  : 'If you just completed your payment, please stay on this screen. This page automatically updates as soon as the secure confirmation is received.'}
              </p>
              {order.safepayTracker && (
                <p className="font-mono text-[10px] opacity-70 truncate pt-1">
                  Reference: {order.safepayTracker}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Payment Transfer Instructions & Proof Submission */}
        {configuredMethod && order.paymentStatus !== 'paid' && (
          <div
            className="p-6 rounded-2xl border shadow-xs space-y-4"
            style={{
              backgroundColor: themeColors.surface,
              borderColor: themeColors.border,
            }}
          >
            <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: themeColors.primary }}>
              <ShieldCheck className="w-4 h-4" />
              <span>Direct Transfer Instructions: {configuredMethod.displayName}</span>
            </h3>

            <div className="p-4 rounded-xl border text-xs space-y-2" style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}>
              {configuredMethod.accountTitle && (
                <div className="flex justify-between py-1 border-b" style={{ borderColor: themeColors.border }}>
                  <span style={{ color: themeColors.muted }}>Account Title:</span>
                  <span className="font-bold">{configuredMethod.accountTitle}</span>
                </div>
              )}
              {configuredMethod.accountNumber && (
                <div className="flex justify-between py-1 border-b" style={{ borderColor: themeColors.border }}>
                  <span style={{ color: themeColors.muted }}>Account / Mobile Number:</span>
                  <span className="font-mono font-bold">{configuredMethod.accountNumber}</span>
                </div>
              )}
              {configuredMethod.iban && (
                <div className="flex justify-between py-1 border-b" style={{ borderColor: themeColors.border }}>
                  <span style={{ color: themeColors.muted }}>IBAN / Raast:</span>
                  <span className="font-mono font-bold text-[11px]">{configuredMethod.iban}</span>
                </div>
              )}
              {configuredMethod.bankName && (
                <div className="flex justify-between py-1" style={{ borderColor: themeColors.border }}>
                  <span style={{ color: themeColors.muted }}>Bank Provider:</span>
                  <span className="font-bold">{configuredMethod.bankName}</span>
                </div>
              )}
            </div>

            {/* Proof form if not submitted or updating */}
            <div className="pt-2 space-y-3">
              <label className="block text-xs font-semibold" style={{ color: themeColors.text }}>
                Need to attach receipt or TID? Submit details below:
              </label>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Enter Transaction ID (TID)"
                  value={tidInput}
                  onChange={e => setTidInput(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs font-mono rounded-xl border outline-none"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.background,
                    color: themeColors.text,
                  }}
                />

                <label className="cursor-pointer px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors" style={{ borderColor: themeColors.border }}>
                  <Upload className="w-3.5 h-3.5" />
                  <span>{proofImage ? 'Screenshot Chosen' : 'Upload Receipt'}</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>

                <button
                  type="button"
                  onClick={handleUpdateProof}
                  disabled={isUpdating}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-all active:scale-95"
                  style={{ backgroundColor: themeColors.primary }}
                >
                  {isUpdating ? 'Saving...' : 'Update Proof'}
                </button>
              </div>

              {(order.transactionReference || order.paymentProofUrl) && (
                <p className="text-[11px] text-emerald-600 font-medium">
                  ✓ Proof on record: Ref #{order.transactionReference || 'Screenshot attached'}. Management has received your notification.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Order Details & Summary Card */}
        <div
          className="p-6 rounded-2xl border shadow-xs space-y-4"
          style={{
            backgroundColor: themeColors.surface,
            borderColor: themeColors.border,
          }}
        >
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: themeColors.text }}>
            Summary of Items
          </h3>

          <div className="divide-y text-xs" style={{ borderColor: themeColors.border }}>
            {order.items?.map((item, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold truncate" style={{ color: themeColors.text }}>{item.productName}</p>
                  <p style={{ color: themeColors.muted }}>Qty: {item.quantity}</p>
                </div>
                <span className="font-bold" style={{ color: item.isFreeReward ? '#10b981' : themeColors.text }}>
                  {item.isFreeReward ? 'FREE' : formatPrice(item.totalPrice)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t space-y-1 text-xs" style={{ borderColor: themeColors.border }}>
            <div className="flex justify-between" style={{ color: themeColors.muted }}>
              <span>Subtotal:</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.discountTotal > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Savings:</span>
                <span>-{formatPrice(order.discountTotal)}</span>
              </div>
            )}
            <div className="flex justify-between" style={{ color: themeColors.muted }}>
              <span>Delivery:</span>
              <span>{order.deliveryFee === 0 ? 'FREE' : formatPrice(order.deliveryFee)}</span>
            </div>
            <div className="flex justify-between font-extrabold text-base pt-2 border-t" style={{ borderColor: themeColors.border }}>
              <span>Total Amount:</span>
              <span style={{ color: themeColors.primary }}>{formatPrice(order.total)}</span>
            </div>
          </div>

          <div className="pt-4 border-t text-xs space-y-1" style={{ borderColor: themeColors.border, color: themeColors.muted }}>
            <p><strong className="text-neutral-700 dark:text-neutral-300">Recipient:</strong> {order.customer?.name} ({order.customer?.phone})</p>
            <p><strong className="text-neutral-700 dark:text-neutral-300">Address:</strong> {order.customer?.address}, {order.customer?.city}</p>
          </div>
        </div>

        {/* Back to store CTA */}
        <div className="text-center pt-2">
          <button
            id="order-confirmation-return-btn"
            onClick={() => setCurrentView('store')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-bold text-sm shadow-sm transition-all active:scale-95"
            style={{ backgroundColor: themeColors.primary }}
          >
            <span>Continue Exploring Store</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
