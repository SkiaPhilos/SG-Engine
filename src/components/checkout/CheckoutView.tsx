import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Copy,
  Check,
  QrCode,
  Upload,
  AlertCircle,
  Truck,
  CreditCard,
  Building2,
  Wallet,
  Smartphone,
  Info,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { PaymentMethod, CustomerDetails } from '../../types/store';
import {
  createOrder,
  createInventoryHold,
  releaseInventoryHold,
  consumeInventoryHold,
} from '../../services/store/storeService';
import { ImageUpload } from '../common/ImageUpload';
import {
  getSafepayStatus,
  createSafepayTracker,
  SafepayStatusResponse,
} from '../../services/safepay/safepayClient';

export const CheckoutView: React.FC = () => {
  const {
    pricing,
    paymentMethods,
    config,
    storeId,
    formatPrice,
    themeColors,
    setCurrentView,
    clearCart,
    setActiveOrderId,
  } = useStore();

  const activeMethods = paymentMethods.filter(pm => pm.enabled);
  const codMethod = activeMethods.find(pm => pm.type === 'cod');
  const advanceMethods = activeMethods.filter(pm => pm.type !== 'cod' && pm.type !== 'safepay');

  // Gateway and Payment Rail State: 'cod' (Cash on Delivery), 'safepay' (Pay Live Online), 'manual' (Pay in Advance)
  const [safepayStatus, setSafepayStatus] = useState<SafepayStatusResponse | null>(null);
  const [paymentRail, setPaymentRail] = useState<'cod' | 'safepay' | 'manual'>('cod');

  useEffect(() => {
    let isMounted = true;

    getSafepayStatus(storeId).then(status => {
      if (!isMounted) return;
      const isOnlineAvailable = Boolean(status?.enabled && status?.hasApiKey);
      setSafepayStatus({
        ...status,
        enabled: isOnlineAvailable,
      });

      if (codMethod) {
        setPaymentRail('cod');
      } else if (isOnlineAvailable) {
        setPaymentRail('safepay');
      } else {
        setPaymentRail('manual');
      }
    }).catch(err => {
      console.warn('Payment status query note:', err);
      if (isMounted) {
        if (codMethod) {
          setPaymentRail('cod');
        } else {
          setPaymentRail('manual');
        }
      }
    });

    // Check if customer was redirected back after cancelling checkout
    try {
      const url = new URL(window.location.href);
      const searchParams = new URLSearchParams(url.search || (url.hash.includes('?') ? url.hash.split('?')[1] : ''));
      if (searchParams.get('cancelled') === 'true') {
        const cancelledOrderId = searchParams.get('orderId');
        if (cancelledOrderId) {
          releaseInventoryHold(undefined, cancelledOrderId);
          setErrorMessage('Payment was cancelled. Reserved items have been released.');
        }
      }
    } catch {
      // Ignore URL parsing fallback
    }

    return () => {
      isMounted = false;
    };
  }, [storeId]);

  // Form State
  const [customer, setCustomer] = useState<CustomerDetails>({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    notes: '',
  });

  const [selectedMethodId, setSelectedMethodId] = useState<string>(
    advanceMethods[0]?.id || activeMethods[0]?.id || ''
  );
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [proofImageBase64, setProofImageBase64] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedMethod = advanceMethods.find(m => m.id === selectedMethodId) || advanceMethods[0];

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setErrorMessage('Image size should be less than 3MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProofImageBase64(reader.result as string);
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Form validation
    if (!customer.name.trim()) {
      setErrorMessage('Please enter your full customer name.');
      return;
    }
    if (config.checkoutConfig?.requirePhone && !customer.phone.trim()) {
      setErrorMessage('Please enter your contact phone number.');
      return;
    }
    if (config.checkoutConfig?.requireEmail && !customer.email.trim()) {
      setErrorMessage('Please enter your email address for order confirmation.');
      return;
    }
    if (config.checkoutConfig?.requireAddress && (!customer.address.trim() || !customer.city.trim())) {
      setErrorMessage('Please provide complete delivery street address and city.');
      return;
    }

    if (paymentRail === 'manual') {
      if (!selectedMethod) {
        setErrorMessage('Please select an advance transfer destination.');
        return;
      }
      if (selectedMethod.requireTransactionReference && !transactionRef.trim()) {
        setErrorMessage(`Please enter the transaction reference / TID for your ${selectedMethod.displayName} transfer.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // 1. Atomically reserve inventory hold (15-min stock lock) to prevent race conditions
      const hold = await createInventoryHold(storeId, pricing.items, undefined, 15);
      if (!hold.success) {
        setErrorMessage(
          hold.message ||
          'One or more items in your cart are currently out of stock or reserved by another customer. Please review your cart.'
        );
        setIsSubmitting(false);
        return;
      }

      const orderNumber = `SE-${Math.floor(100000 + Math.random() * 900000)}`;

      // 2a. Cash on Delivery (COD) Order Placement
      if (paymentRail === 'cod') {
        const orderId = await createOrder(storeId, {
          storeId,
          orderNumber,
          customer,
          items: pricing.items,
          appliedOffers: pricing.appliedOffers,
          subtotal: pricing.subtotal,
          discountTotal: pricing.discountTotal,
          deliveryFee: pricing.deliveryFee,
          total: pricing.total,
          paymentMethodId: codMethod?.id || 'cod',
          paymentMethodName: codMethod?.displayName || 'Cash on Delivery (COD)',
          paymentStatus: 'pending_verification',
          orderStatus: 'pending',
          inventoryHoldId: hold.holdId,
        });

        if (hold.holdId) {
          await consumeInventoryHold(hold.holdId, orderId);
        }

        setActiveOrderId(orderId);
        clearCart();
        setCurrentView('order_confirmation');
        return;
      }

      // 2b. Live Online Payment Placement
      if (paymentRail === 'safepay') {
        // Create initial pending order in Supabase with attached reservation hold
        const orderId = await createOrder(storeId, {
          storeId,
          orderNumber,
          customer,
          items: pricing.items,
          appliedOffers: pricing.appliedOffers,
          subtotal: pricing.subtotal,
          discountTotal: pricing.discountTotal,
          deliveryFee: pricing.deliveryFee,
          total: pricing.total,
          paymentMethodId: 'online_gateway',
          paymentMethodName: 'Online Payment (Card / Digital Wallet)',
          paymentStatus: 'pending_verification',
          orderStatus: 'pending',
          inventoryHoldId: hold.holdId,
        });

        // Initialize online payment tracker session via server proxy
        const host = window.location.origin;
        const redirectUrl = `${host}/#order_confirmation?orderId=${orderId}`;
        const cancelUrl = `${host}/#checkout?orderId=${orderId}&cancelled=true`;

        const trackerRes = await createSafepayTracker({
          storeId,
          orderId,
          redirectUrl,
          cancelUrl,
          orderData: {
            total: pricing.total,
            orderNumber,
            customer,
          },
        });

        setActiveOrderId(orderId);
        clearCart();

        // Redirect to secure hosted checkout
        if (trackerRes?.checkoutUrl) {
          window.location.href = trackerRes.checkoutUrl;
        } else {
          setCurrentView('order_confirmation');
        }
        return;
      }

      // 2c. Pay in Advance (Manual Transfer) Order Placement
      const orderId = await createOrder(storeId, {
        storeId,
        orderNumber,
        customer,
        items: pricing.items,
        appliedOffers: pricing.appliedOffers,
        subtotal: pricing.subtotal,
        discountTotal: pricing.discountTotal,
        deliveryFee: pricing.deliveryFee,
        total: pricing.total,
        paymentMethodId: selectedMethod!.id,
        paymentMethodName: selectedMethod!.displayName,
        paymentStatus: transactionRef || proofImageBase64 ? 'payment_submitted' : 'pending_verification',
        orderStatus: 'pending',
        transactionReference: transactionRef || undefined,
        paymentProofUrl: proofImageBase64 || undefined,
        inventoryHoldId: hold.holdId,
      });

      // For confirmed manual orders, immediately consume the reservation and decrement physical stock
      if (hold.holdId) {
        await consumeInventoryHold(hold.holdId, orderId);
      }

      setActiveOrderId(orderId);
      clearCart();
      setCurrentView('order_confirmation');
    } catch (err: any) {
      console.error('Order placement error:', err);
      setErrorMessage(err.message || 'Unable to submit order. Please check connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'jazzcash':
      case 'easypaisa':
      case 'nayapay':
        return <Smartphone className="w-4 h-4" />;
      case 'bank_transfer':
      case 'raast':
        return <Building2 className="w-4 h-4" />;
      default:
        return <Wallet className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen py-8 sm:py-12 px-4 sm:px-6 lg:px-8 transition-colors" style={{ backgroundColor: themeColors.background }}>
      <div className="max-w-4xl mx-auto">
        
        {/* Navigation & Title */}
        <button
          onClick={() => setCurrentView('store')}
          className="inline-flex items-center gap-2 text-sm font-semibold mb-6 hover:opacity-80 transition-opacity"
          style={{ color: themeColors.primary }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Store</span>
        </button>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2" style={{ color: themeColors.text }}>
          Checkout &amp; Payment
        </h1>
        <p className="text-xs sm:text-sm mb-8" style={{ color: themeColors.muted }}>
          Provide your delivery details and choose your preferred direct payment destination.
        </p>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Customer & Shipping Details */}
          <div className="lg:col-span-7 space-y-6">
            <div
              className="p-6 rounded-2xl border shadow-xs space-y-4"
              style={{
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
              }}
            >
              <h2 className="text-base font-bold flex items-center gap-2" style={{ color: themeColors.text }}>
                <Truck className="w-4 h-4" style={{ color: themeColors.primary }} />
                <span>Delivery Information</span>
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: themeColors.text }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customer.name}
                    onChange={e => setCustomer({ ...customer, name: e.target.value })}
                    placeholder="e.g. Alex Johnson"
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2"
                    style={{
                      borderColor: themeColors.border,
                      backgroundColor: themeColors.background,
                      color: themeColors.text,
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: themeColors.text }}>
                      Phone Number {config.checkoutConfig?.requirePhone ? '*' : '(Optional)'}
                    </label>
                    <input
                      type="tel"
                      required={config.checkoutConfig?.requirePhone}
                      value={customer.phone}
                      onChange={e => setCustomer({ ...customer, phone: e.target.value })}
                      placeholder="e.g. +92 300 0000000"
                      className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2"
                      style={{
                        borderColor: themeColors.border,
                        backgroundColor: themeColors.background,
                        color: themeColors.text,
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: themeColors.text }}>
                      Email Address {config.checkoutConfig?.requireEmail ? '*' : '(Optional)'}
                    </label>
                    <input
                      type="email"
                      required={config.checkoutConfig?.requireEmail}
                      value={customer.email}
                      onChange={e => setCustomer({ ...customer, email: e.target.value })}
                      placeholder="alex@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2"
                      style={{
                        borderColor: themeColors.border,
                        backgroundColor: themeColors.background,
                        color: themeColors.text,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: themeColors.text }}>
                    Street Address {config.checkoutConfig?.requireAddress ? '*' : ''}
                  </label>
                  <input
                    type="text"
                    required={config.checkoutConfig?.requireAddress}
                    value={customer.address}
                    onChange={e => setCustomer({ ...customer, address: e.target.value })}
                    placeholder="Apartment, suite, unit, building, street address"
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2"
                    style={{
                      borderColor: themeColors.border,
                      backgroundColor: themeColors.background,
                      color: themeColors.text,
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: themeColors.text }}>
                    City / Town {config.checkoutConfig?.requireAddress ? '*' : ''}
                  </label>
                  <input
                    type="text"
                    required={config.checkoutConfig?.requireAddress}
                    value={customer.city}
                    onChange={e => setCustomer({ ...customer, city: e.target.value })}
                    placeholder="e.g. Karachi, Lahore, Islamabad"
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2"
                    style={{
                      borderColor: themeColors.border,
                      backgroundColor: themeColors.background,
                      color: themeColors.text,
                    }}
                  />
                </div>

                {config.checkoutConfig?.orderNotesEnabled && (
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: themeColors.text }}>
                      Special Delivery Instructions (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={customer.notes}
                      onChange={e => setCustomer({ ...customer, notes: e.target.value })}
                      placeholder="Notes for courier or packaging preferences"
                      className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2 resize-none"
                      style={{
                        borderColor: themeColors.border,
                        backgroundColor: themeColors.background,
                        color: themeColors.text,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div
              className="p-6 rounded-2xl border shadow-xs space-y-4"
              style={{
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
              }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold flex items-center gap-2" style={{ color: themeColors.text }}>
                  <CreditCard className="w-4 h-4" style={{ color: themeColors.primary }} />
                  <span>Payment Method</span>
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-500/20">
                  Select an Option
                </span>
              </div>

              {/* Multi-Option Selector Cards */}
              {((codMethod ? 1 : 0) + (safepayStatus?.enabled ? 1 : 0) + (advanceMethods.length > 0 ? 1 : 0)) > 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pb-1">
                  {/* COD Option */}
                  {codMethod && (
                    <button
                      type="button"
                      onClick={() => setPaymentRail('cod')}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        paymentRail === 'cod' ? 'ring-2 shadow-xs' : 'hover:border-neutral-400 opacity-80'
                      }`}
                      style={{
                        borderColor: paymentRail === 'cod' ? '#059669' : themeColors.border,
                        backgroundColor: paymentRail === 'cod' ? '#05966912' : themeColors.background,
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                          <Truck className="w-3.5 h-3.5 text-emerald-600" />
                          Cash on Delivery
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-emerald-500/20 text-emerald-800 dark:text-emerald-200">
                          70% Popular
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed" style={{ color: themeColors.muted }}>
                        Pay cash at your doorstep upon package arrival.
                      </p>
                    </button>
                  )}

                  {/* Live Online Payment Option */}
                  {safepayStatus?.enabled && (
                    <button
                      type="button"
                      onClick={() => setPaymentRail('safepay')}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        paymentRail === 'safepay' ? 'ring-2 shadow-xs' : 'hover:border-neutral-400 opacity-80'
                      }`}
                      style={{
                        borderColor: paymentRail === 'safepay' ? '#2563eb' : themeColors.border,
                        backgroundColor: paymentRail === 'safepay' ? '#2563eb12' : themeColors.background,
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                          <Zap className="w-3.5 h-3.5 fill-blue-500 text-blue-500" />
                          Pay Live Online
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-blue-500/20 text-blue-800 dark:text-blue-200">
                          Instant Confirm
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed" style={{ color: themeColors.muted }}>
                        Visa, Mastercard, PayPak, or digital wallets.
                      </p>
                    </button>
                  )}

                  {/* Pay in Advance (Manual) */}
                  {advanceMethods.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPaymentRail('manual')}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        paymentRail === 'manual' ? 'ring-2 shadow-xs' : 'hover:border-neutral-400 opacity-80'
                      }`}
                      style={{
                        borderColor: paymentRail === 'manual' ? themeColors.primary : themeColors.border,
                        backgroundColor: paymentRail === 'manual' ? `${themeColors.primary}12` : themeColors.background,
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: themeColors.text }}>
                          <Building2 className="w-3.5 h-3.5" style={{ color: themeColors.primary }} />
                          Pay in Advance
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-neutral-200 dark:bg-neutral-800" style={{ color: themeColors.text }}>
                          Manual Proof
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed" style={{ color: themeColors.muted }}>
                        Transfer via JazzCash, Easypaisa, or Bank IBAN.
                      </p>
                    </button>
                  )}
                </div>
              )}

              {/* No Payment Methods Available at All */}
              {!safepayStatus?.enabled && !codMethod && advanceMethods.length === 0 ? (
                <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 text-neutral-600 dark:text-neutral-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-neutral-500" />
                  <span>Payment methods not available. Please contact store owner.</span>
                </div>
              ) : paymentRail === 'cod' && codMethod ? (
                /* Cash on Delivery Card */
                <div
                  className="p-5 rounded-xl border space-y-3"
                  style={{
                    backgroundColor: themeColors.background,
                    borderColor: '#05966940',
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-emerald-600" />
                        Cash on Delivery (COD) Selected
                      </span>
                      <p className="text-xs mt-1" style={{ color: themeColors.text }}>
                        Pay cash directly to the courier delivery rider upon package arrival.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      Doorstep Collection
                    </span>
                  </div>

                  <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-100 text-xs space-y-1.5">
                    <p className="font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Amount due at delivery: {formatPrice(pricing.total)}
                    </p>
                    <p className="text-[11px] opacity-90 leading-relaxed">
                      No advance bank deposit or card payment needed. Your items are reserved immediately upon clicking Confirm Order below.
                    </p>
                  </div>
                </div>
              ) : paymentRail === 'safepay' && safepayStatus?.enabled ? (
                /* Online Payment Rail Card */
                <div
                  className="p-5 rounded-xl border space-y-4"
                  style={{
                    backgroundColor: themeColors.background,
                    borderColor: '#2563eb40',
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-blue-600" />
                        Live Online Checkout
                      </span>
                      <p className="text-xs mt-1" style={{ color: themeColors.muted }}>
                        Instant, encrypted checkout with automated order confirmation.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                      💳 Visa &amp; Mastercard
                    </span>
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                      🇵🇰 PayPak Debit
                    </span>
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                      📱 Digital Wallets
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-200 text-xs flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
                    <span className="leading-relaxed">
                      When you click <strong>Proceed to Pay</strong>, you will be securely redirected to complete your payment with instant automated confirmation.
                    </span>
                  </div>
                </div>
              ) : advanceMethods.length === 0 ? (
                <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 text-neutral-600 dark:text-neutral-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-neutral-500" />
                  <span>Advance payment methods not available.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-medium" style={{ color: themeColors.muted }}>
                    Select your bank or mobile wallet to view transfer details:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {advanceMethods.map(method => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setSelectedMethodId(method.id)}
                        className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                          selectedMethodId === method.id ? 'ring-2' : 'hover:border-neutral-400'
                        }`}
                        style={{
                          borderColor: selectedMethodId === method.id ? themeColors.primary : themeColors.border,
                          backgroundColor: selectedMethodId === method.id ? `${themeColors.primary}08` : themeColors.surface,
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{
                            backgroundColor: selectedMethodId === method.id ? themeColors.primary : `${themeColors.border}`,
                            color: selectedMethodId === method.id ? '#ffffff' : themeColors.text,
                          }}
                        >
                          {getMethodIcon(method.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate" style={{ color: themeColors.text }}>
                            {method.displayName}
                          </p>
                          <p className="text-[10px] truncate" style={{ color: themeColors.muted }}>
                            {method.accountTitle || method.bankName || 'Direct transfer'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Destination Details & Instructions */}
                  {selectedMethod && (
                    <div
                      className="p-4 rounded-xl border space-y-3 mt-4"
                      style={{
                        backgroundColor: themeColors.background,
                        borderColor: themeColors.border,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                          {selectedMethod.displayName} Transfer Details
                        </span>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-sm bg-neutral-200 dark:bg-neutral-800">
                          Pay in Advance
                        </span>
                      </div>

                      {/* Account Title */}
                      {selectedMethod.accountTitle && (
                        <div className="flex items-center justify-between text-xs py-1 border-b" style={{ borderColor: themeColors.border }}>
                          <span style={{ color: themeColors.muted }}>Account Title:</span>
                          <span className="font-bold" style={{ color: themeColors.text }}>
                            {selectedMethod.accountTitle}
                          </span>
                        </div>
                      )}

                      {/* Account Number */}
                      {selectedMethod.accountNumber && (
                        <div className="flex items-center justify-between text-xs py-1 border-b" style={{ borderColor: themeColors.border }}>
                          <span style={{ color: themeColors.muted }}>Account / Mobile Number:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold" style={{ color: themeColors.text }}>
                              {selectedMethod.accountNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(selectedMethod.accountNumber, 'accNo')}
                              className="p-1 rounded-sm hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                              title="Copy account number"
                            >
                              {copiedField === 'accNo' ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-neutral-400" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* IBAN */}
                      {selectedMethod.iban && (
                        <div className="flex items-center justify-between text-xs py-1 border-b" style={{ borderColor: themeColors.border }}>
                          <span style={{ color: themeColors.muted }}>IBAN / Raast ID:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[11px]" style={{ color: themeColors.text }}>
                              {selectedMethod.iban}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(selectedMethod.iban || '', 'iban')}
                              className="p-1 rounded-sm hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                              title="Copy IBAN"
                            >
                              {copiedField === 'iban' ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-neutral-400" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Bank Name */}
                      {selectedMethod.bankName && (
                        <div className="flex items-center justify-between text-xs py-1 border-b" style={{ borderColor: themeColors.border }}>
                          <span style={{ color: themeColors.muted }}>Bank / Financial Provider:</span>
                          <span className="font-bold" style={{ color: themeColors.text }}>
                            {selectedMethod.bankName}
                          </span>
                        </div>
                      )}

                      {/* QR Code */}
                      {selectedMethod.qrCodeUrl && (
                        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white dark:bg-neutral-900 border text-center" style={{ borderColor: themeColors.border }}>
                          <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-2 flex items-center gap-1">
                            <QrCode className="w-3.5 h-3.5" /> Scan with Banking App
                          </p>
                          <img
                            src={selectedMethod.qrCodeUrl}
                            alt="Payment Destination QR"
                            className="w-36 h-36 object-contain rounded-lg border p-1"
                            style={{ borderColor: themeColors.border }}
                          />
                        </div>
                      )}

                      {/* Instructions */}
                      {selectedMethod.instructions && (
                        <div className="text-xs p-3 rounded-lg bg-neutral-100 dark:bg-neutral-850" style={{ color: themeColors.muted }}>
                          <p className="font-semibold text-neutral-700 dark:text-neutral-300 mb-0.5">Instructions:</p>
                          <p className="whitespace-pre-line">{selectedMethod.instructions}</p>
                        </div>
                      )}

                      {/* Payment Verification Proof / TID Input */}
                      <div className="pt-2 space-y-3">
                        <div>
                          <label className="block text-xs font-semibold mb-1" style={{ color: themeColors.text }}>
                            Transaction ID / Reference Number {selectedMethod.requireTransactionReference ? '*' : '(Recommended)'}
                          </label>
                          <input
                            type="text"
                            value={transactionRef}
                            onChange={e => setTransactionRef(e.target.value)}
                            placeholder="e.g. 9876543210 or Bank Ref #"
                            className="w-full px-3 py-2 rounded-xl border text-xs font-mono outline-none"
                            style={{
                              borderColor: themeColors.border,
                              backgroundColor: themeColors.surface,
                              color: themeColors.text,
                            }}
                          />
                        </div>

                        <div>
                          <ImageUpload
                            value={proofImageBase64}
                            onChange={setProofImageBase64}
                            label="Attach Payment Receipt Screenshot (Optional)"
                            helperText="Take or select a screenshot of your transfer confirmation"
                            aspectRatio="video"
                            maxDimension={900}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-5 space-y-6">
            <div
              className="p-6 rounded-2xl border shadow-xs space-y-4 sticky top-24"
              style={{
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
              }}
            >
              <h2 className="text-base font-bold" style={{ color: themeColors.text }}>
                Order Summary ({pricing.items.reduce((a, b) => a + b.quantity, 0)} items)
              </h2>

              {/* Items List */}
              <div className="max-h-60 overflow-y-auto space-y-3 divide-y" style={{ borderColor: themeColors.border }}>
                {pricing.items.map((item, idx) => (
                  <div key={idx} className="pt-3 first:pt-0 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate" style={{ color: themeColors.text }}>
                        {item.productName}
                      </p>
                      <p style={{ color: themeColors.muted }}>
                        Qty: {item.quantity} {item.isFreeReward ? '• Free Gift' : ''}
                      </p>
                    </div>
                    <span className="font-bold whitespace-nowrap" style={{ color: item.isFreeReward ? '#10b981' : themeColors.text }}>
                      {item.isFreeReward ? 'FREE' : formatPrice(item.totalPrice)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Breakdown */}
              <div className="space-y-2 pt-4 border-t text-xs" style={{ borderColor: themeColors.border }}>
                <div className="flex justify-between" style={{ color: themeColors.muted }}>
                  <span>Subtotal</span>
                  <span className="font-semibold" style={{ color: themeColors.text }}>{formatPrice(pricing.subtotal)}</span>
                </div>

                {pricing.discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Promotions &amp; Discounts</span>
                    <span>-{formatPrice(pricing.discountTotal)}</span>
                  </div>
                )}

                <div className="flex justify-between" style={{ color: themeColors.muted }}>
                  <span>Delivery Fee</span>
                  <span className="font-semibold" style={{ color: themeColors.text }}>
                    {pricing.deliveryFee === 0 ? 'FREE' : formatPrice(pricing.deliveryFee)}
                  </span>
                </div>

                <div className="flex justify-between text-lg font-black pt-3 border-t" style={{ borderColor: themeColors.border }}>
                  <span>Total Due</span>
                  <span style={{ color: themeColors.primary }}>{formatPrice(pricing.total)}</span>
                </div>
              </div>

              <button
                id="submit-order-btn"
                type="submit"
                disabled={isSubmitting || pricing.items.length === 0 || (!safepayStatus?.enabled && !codMethod && advanceMethods.length === 0)}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-40"
                style={{
                  backgroundColor: paymentRail === 'cod' ? '#059669' : paymentRail === 'safepay' ? '#2563eb' : themeColors.primary,
                }}
              >
                {paymentRail === 'cod' ? (
                  <Truck className="w-4 h-4" />
                ) : paymentRail === 'safepay' ? (
                  <Zap className="w-4 h-4 fill-white" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                <span>
                  {isSubmitting
                    ? paymentRail === 'safepay'
                      ? 'Redirecting to Payment...'
                      : paymentRail === 'cod'
                      ? 'Placing COD Order...'
                      : 'Submitting Order...'
                    : !safepayStatus?.enabled && !codMethod && advanceMethods.length === 0
                    ? 'Payment Methods Not Available'
                    : paymentRail === 'safepay'
                    ? `Proceed to Pay (${formatPrice(pricing.total)})`
                    : paymentRail === 'cod'
                    ? `Place Order (COD) • ${formatPrice(pricing.total)}`
                    : `Submit Order for Verification • ${formatPrice(pricing.total)}`}
                </span>
              </button>

              <div className="text-[11px] text-center space-y-1" style={{ color: themeColors.muted }}>
                {paymentRail === 'cod' ? (
                  <>
                    <p>Pay cash upon delivery at your doorstep.</p>
                    <p>No card or advance deposit required.</p>
                  </>
                ) : paymentRail === 'safepay' ? (
                  <>
                    <p>256-bit SSL encrypted secure checkout.</p>
                    <p>Your order is verified automatically upon payment completion.</p>
                  </>
                ) : (
                  <>
                    <p>Payment will be verified directly by store management.</p>
                    <p>Please upload proof of transfer for faster order processing.</p>
                  </>
                )}
              </div>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
