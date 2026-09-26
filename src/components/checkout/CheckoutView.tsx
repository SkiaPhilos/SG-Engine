import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Copy,
  Check,
  QrCode,
  AlertCircle,
  Truck,
  CreditCard,
  Building2,
  Wallet,
  Smartphone,
  Zap,
  Store,
  MapPin,
  Sparkles,
  Coins,
  Shield,
  Info,
  BadgePercent,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { PaymentMethod, CustomerDetails } from '../../types/store';
import {
  createOrder,
  createInventoryHold,
  releaseInventoryHold,
  consumeInventoryHold,
} from '../../services/store/storeService';
import { calculateOrderTotals } from '../../engine/pricing/pricingEngine';
import { ImageUpload } from '../common/ImageUpload';
import {
  getSafepayStatus,
  createSafepayTracker,
  SafepayStatusResponse,
} from '../../services/safepay/safepayClient';

export const CheckoutView: React.FC = () => {
  const {
    cart,
    products,
    offers,
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

  // Gateway status (Safepay live/sandbox)
  const [safepayStatus, setSafepayStatus] = useState<SafepayStatusResponse | null>(null);

  // 1. Fulfillment Type: 'delivery' | 'pickup'
  const isPickupAllowed = config.deliveryConfig?.pickupEnabled !== false;
  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'pickup'>('delivery');

  // 2. Primary Payment Rail: 'cod' | 'advance'
  const [paymentRail, setPaymentRail] = useState<'cod' | 'advance'>('cod');

  // 3. Advance Payment Mode: 'safepay' (Live online instant) | 'manual' (Bank/Wallet transfer with proof)
  const [advanceMode, setAdvanceMode] = useState<'safepay' | 'manual'>('safepay');

  // Customer form state
  const [customer, setCustomer] = useState<CustomerDetails>({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    notes: '',
  });

  // Manual advance transfer state
  const [selectedMethodId, setSelectedMethodId] = useState<string>(
    advanceMethods[0]?.id || ''
  );
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [proofImageBase64, setProofImageBase64] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load gateway status and synchronize payment defaults
  useEffect(() => {
    let isMounted = true;

    getSafepayStatus(storeId)
      .then(status => {
        if (!isMounted) return;
        const isOnlineAvailable = Boolean(status?.enabled && status?.hasApiKey);
        setSafepayStatus({
          ...status,
          enabled: isOnlineAvailable,
        });

        // Set advance payment mode preference
        if (isOnlineAvailable) {
          setAdvanceMode('safepay');
        } else if (advanceMethods.length > 0) {
          setAdvanceMode('manual');
        }

        // Set primary payment rail preference
        if (fulfillmentType === 'delivery' && codMethod) {
          setPaymentRail('cod');
        } else {
          setPaymentRail('advance');
        }
      })
      .catch(err => {
        console.warn('Payment status query notice:', err);
        if (!isMounted) return;
        if (fulfillmentType === 'delivery' && codMethod) {
          setPaymentRail('cod');
        } else {
          setPaymentRail('advance');
        }
        if (advanceMethods.length > 0) {
          setAdvanceMode('manual');
        }
      });

    // Handle return from cancelled checkout
    try {
      const url = new URL(window.location.href);
      const searchParams = new URLSearchParams(
        url.search || (url.hash.includes('?') ? url.hash.split('?')[1] : '')
      );
      if (searchParams.get('cancelled') === 'true') {
        const cancelledOrderId = searchParams.get('orderId');
        if (cancelledOrderId) {
          releaseInventoryHold(undefined, cancelledOrderId);
          setErrorMessage('Online payment was cancelled. Reserved items have been released.');
        }
      }
    } catch {
      // Ignore URL parsing fallback
    }

    return () => {
      isMounted = false;
    };
  }, [storeId, codMethod, fulfillmentType]);

  // When switching between delivery and pickup:
  // Pickup automatically hides & disables COD, switching to Advance Payment
  useEffect(() => {
    if (fulfillmentType === 'pickup' && paymentRail === 'cod') {
      setPaymentRail('advance');
    }
  }, [fulfillmentType, paymentRail]);

  // Update selected manual method if previous was invalid
  useEffect(() => {
    if (advanceMethods.length > 0 && !advanceMethods.some(m => m.id === selectedMethodId)) {
      setSelectedMethodId(advanceMethods[0].id);
    }
  }, [advanceMethods, selectedMethodId]);

  // Selected manual advance destination
  const selectedMethod = advanceMethods.find(m => m.id === selectedMethodId) || advanceMethods[0];

  // Dynamic order calculations taking into account delivery vs pickup, city matching, and taxes
  const checkoutPricing = useMemo(() => {
    return calculateOrderTotals(cart, products, offers, config.deliveryConfig, {
      fulfillmentType,
      customerCity: customer.city,
      taxConfig: config.taxConfig,
    });
  }, [cart, products, offers, config.deliveryConfig, config.taxConfig, fulfillmentType, customer.city]);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Customer field validation
    if (!customer.name.trim()) {
      setErrorMessage('Please enter your full name.');
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

    // Street address and city only required for Delivery
    if (fulfillmentType === 'delivery') {
      if (config.checkoutConfig?.requireAddress && (!customer.address.trim() || !customer.city.trim())) {
        setErrorMessage('Please provide complete delivery street address and city.');
        return;
      }
    }

    // Manual advance payment validation
    if (paymentRail === 'advance' && advanceMode === 'manual') {
      if (!selectedMethod) {
        setErrorMessage('Please select a bank or wallet transfer destination.');
        return;
      }
      if (selectedMethod.requireTransactionReference && !transactionRef.trim()) {
        setErrorMessage(`Please enter the transaction reference / TID for your ${selectedMethod.displayName} transfer.`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // 2. Reserve inventory hold (15-min stock lock)
      const hold = await createInventoryHold(storeId, checkoutPricing.items, undefined, 15);
      if (!hold.success) {
        setErrorMessage(
          hold.message ||
          'One or more items in your cart are currently out of stock or reserved. Please review your cart.'
        );
        setIsSubmitting(false);
        return;
      }

      const orderNumber = `SE-${Math.floor(100000 + Math.random() * 900000)}`;

      // 3A. Cash on Delivery (COD)
      if (paymentRail === 'cod' && fulfillmentType === 'delivery') {
        const orderId = await createOrder(storeId, {
          storeId,
          orderNumber,
          customer: {
            ...customer,
            // If pickup, save note
            notes: customer.notes || (fulfillmentType === 'pickup' ? 'Store Pickup Order' : ''),
          },
          items: checkoutPricing.items,
          appliedOffers: checkoutPricing.appliedOffers,
          subtotal: checkoutPricing.subtotal,
          discountTotal: checkoutPricing.discountTotal,
          deliveryFee: checkoutPricing.deliveryFee,
          fulfillmentType: 'delivery',
          taxTotal: checkoutPricing.taxTotal,
          taxCategory: checkoutPricing.taxCategory,
          taxPercentage: checkoutPricing.taxPercentage,
          total: checkoutPricing.total,
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

      // 3B. Pay Live Online (Instant Safepay)
      if (paymentRail === 'advance' && advanceMode === 'safepay') {
        if (!safepayStatus?.enabled || !safepayStatus?.hasApiKey) {
          throw new Error('Safepay online checkout is not active. Please select Bank / Wallet Transfer or Cash on Delivery.');
        }

        const orderId = await createOrder(storeId, {
          storeId,
          orderNumber,
          customer: {
            ...customer,
            notes: customer.notes || (fulfillmentType === 'pickup' ? 'Store Pickup Order' : ''),
          },
          items: checkoutPricing.items,
          appliedOffers: checkoutPricing.appliedOffers,
          subtotal: checkoutPricing.subtotal,
          discountTotal: checkoutPricing.discountTotal,
          deliveryFee: checkoutPricing.deliveryFee,
          fulfillmentType,
          taxTotal: checkoutPricing.taxTotal,
          taxCategory: checkoutPricing.taxCategory,
          taxPercentage: checkoutPricing.taxPercentage,
          total: checkoutPricing.total,
          paymentMethodId: 'safepay',
          paymentMethodName: 'Live Online Payment (Safepay)',
          paymentStatus: 'pending_verification',
          orderStatus: 'pending',
          inventoryHoldId: hold.holdId,
        });

        // Initialize online payment tracker session
        const host = window.location.origin;
        const redirectUrl = `${host}/#order_confirmation?orderId=${orderId}`;
        const cancelUrl = `${host}/#checkout?orderId=${orderId}&cancelled=true`;

        const trackerRes = await createSafepayTracker({
          storeId,
          orderId,
          redirectUrl,
          cancelUrl,
          orderData: {
            total: checkoutPricing.total,
            orderNumber,
            customer,
          },
        });

        setActiveOrderId(orderId);
        clearCart();

        if (trackerRes?.checkoutUrl) {
          if (trackerRes.checkoutUrl.includes('safepay_sandbox_paid=true') || trackerRes.checkoutUrl.startsWith(host)) {
            setCurrentView('order_confirmation');
            window.location.hash = `#order_confirmation?orderId=${orderId}`;
          } else {
            try {
              if (window.top && window.top !== window) {
                window.top.location.href = trackerRes.checkoutUrl;
              } else {
                window.location.href = trackerRes.checkoutUrl;
              }
            } catch {
              window.location.href = trackerRes.checkoutUrl;
            }
          }
        } else {
          setCurrentView('order_confirmation');
        }
        return;
      }

      // 3C. Pay in Advance (Manual Bank / Wallet Transfer)
      const orderId = await createOrder(storeId, {
        storeId,
        orderNumber,
        customer: {
          ...customer,
          notes: customer.notes || (fulfillmentType === 'pickup' ? 'Store Pickup Order' : ''),
        },
        items: checkoutPricing.items,
        appliedOffers: checkoutPricing.appliedOffers,
        subtotal: checkoutPricing.subtotal,
        discountTotal: checkoutPricing.discountTotal,
        deliveryFee: checkoutPricing.deliveryFee,
        fulfillmentType,
        taxTotal: checkoutPricing.taxTotal,
        taxCategory: checkoutPricing.taxCategory,
        taxPercentage: checkoutPricing.taxPercentage,
        total: checkoutPricing.total,
        paymentMethodId: selectedMethod?.id || 'manual_transfer',
        paymentMethodName: selectedMethod?.displayName || 'Advance Bank Transfer',
        paymentStatus: transactionRef || proofImageBase64 ? 'payment_submitted' : 'pending_verification',
        orderStatus: 'pending',
        transactionReference: transactionRef || undefined,
        paymentProofUrl: proofImageBase64 || undefined,
        inventoryHoldId: hold.holdId,
      });

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

  const ownerCity = config.deliveryConfig?.ownerCity || 'our city';
  const ownerCountry = config.deliveryConfig?.ownerCountry || 'Pakistan';
  const cityDeliveryFee = Number(config.deliveryConfig?.cityFee ?? config.deliveryConfig?.flatFee ?? 150);
  const countryDeliveryFee = Number(config.deliveryConfig?.countryFee ?? config.deliveryConfig?.flatFee ?? 250);
  const shopAddress = config.deliveryConfig?.shopAddress || 'My Shop Address';

  return (
    <div
      className="min-h-screen py-8 sm:py-12 px-4 sm:px-6 lg:px-8 transition-colors"
      style={{ backgroundColor: themeColors.background }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Navigation & Header */}
        <button
          onClick={() => setCurrentView('store')}
          className="inline-flex items-center gap-2 text-sm font-semibold mb-6 hover:opacity-80 transition-opacity"
          style={{ color: themeColors.primary }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Store</span>
        </button>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2" style={{ color: themeColors.text }}>
          Checkout &amp; Order Completion
        </h1>
        <p className="text-xs sm:text-sm mb-8" style={{ color: themeColors.muted }}>
          Choose your delivery option, review totals, and select your preferred payment mode.
        </p>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Fulfillment, Contact, and Payment Options */}
          <div className="lg:col-span-7 space-y-6">

            {/* STEP 1: Delivery vs. Pickup Selection */}
            <div
              className="p-6 rounded-2xl border shadow-xs space-y-4"
              style={{
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
              }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold flex items-center gap-2" style={{ color: themeColors.text }}>
                  <Truck className="w-4 h-4" style={{ color: themeColors.primary }} />
                  <span>1. How would you like to receive your order?</span>
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-500/20">
                  Step 1 of 2
                </span>
              </div>

              {/* Delivery vs Pickup Choice Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Deliver at Home */}
                <button
                  id="fulfillment-delivery-btn"
                  type="button"
                  onClick={() => setFulfillmentType('delivery')}
                  className={`p-4 rounded-xl border text-left transition-all relative ${
                    fulfillmentType === 'delivery' ? 'ring-2 shadow-xs' : 'hover:border-neutral-400 opacity-80'
                  }`}
                  style={{
                    borderColor: fulfillmentType === 'delivery' ? themeColors.primary : themeColors.border,
                    backgroundColor:
                      fulfillmentType === 'delivery' ? `${themeColors.primary}10` : themeColors.background,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor:
                            fulfillmentType === 'delivery' ? themeColors.primary : `${themeColors.border}`,
                          color: fulfillmentType === 'delivery' ? '#ffffff' : themeColors.text,
                        }}
                      >
                        <Truck className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-sm font-bold block" style={{ color: themeColors.text }}>
                          Deliver at Home
                        </span>
                        <span className="text-[10px]" style={{ color: themeColors.muted }}>
                          Doorstep courier delivery
                        </span>
                      </div>
                    </div>
                    {fulfillmentType === 'delivery' && (
                      <CheckCircle2 className="w-4 h-4" style={{ color: themeColors.primary }} />
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: themeColors.muted }}>
                    Dispatched directly to your street address via tracked courier.
                  </p>
                </button>

                {/* In-Store Pickup */}
                {isPickupAllowed && (
                  <button
                    id="fulfillment-pickup-btn"
                    type="button"
                    onClick={() => {
                      setFulfillmentType('pickup');
                      // If COD was selected, switch to advance payment because pickup doesn't do COD
                      if (paymentRail === 'cod') {
                        setPaymentRail('advance');
                      }
                    }}
                    className={`p-4 rounded-xl border text-left transition-all relative ${
                      fulfillmentType === 'pickup' ? 'ring-2 shadow-xs' : 'hover:border-neutral-400 opacity-80'
                    }`}
                    style={{
                      borderColor: fulfillmentType === 'pickup' ? '#059669' : themeColors.border,
                      backgroundColor:
                        fulfillmentType === 'pickup' ? '#05966910' : themeColors.background,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{
                            backgroundColor: fulfillmentType === 'pickup' ? '#059669' : `${themeColors.border}`,
                            color: fulfillmentType === 'pickup' ? '#ffffff' : themeColors.text,
                          }}
                        >
                          <Store className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-sm font-bold block" style={{ color: themeColors.text }}>
                            Store Pickup
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            FREE • Collect in person
                          </span>
                        </div>
                      </div>
                      {fulfillmentType === 'pickup' && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed" style={{ color: themeColors.muted }}>
                      Collect yourself from our physical store. No delivery charges!
                    </p>
                  </button>
                )}
              </div>

              {/* Informational Callouts based on Fulfillment Type */}
              {fulfillmentType === 'delivery' ? (
                <div
                  className="p-3.5 rounded-xl border text-xs space-y-1.5"
                  style={{
                    backgroundColor: themeColors.background,
                    borderColor: themeColors.border,
                  }}
                >
                  <div className="flex items-center gap-2 font-semibold" style={{ color: themeColors.text }}>
                    <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                    <span>Delivery Charges Schedule</span>
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: themeColors.muted }}>
                    Delivery charges <strong className="font-semibold text-emerald-600 dark:text-emerald-400">{formatPrice(cityDeliveryFee)}</strong> in <strong>{ownerCity}</strong> and <strong className="font-semibold">{formatPrice(countryDeliveryFee)}</strong> elsewhere in <strong>{ownerCountry}</strong> will be added.
                  </p>
                  {checkoutPricing.qualifiesForFreeDelivery ? (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Order qualifies for FREE nationwide delivery!</span>
                    </div>
                  ) : config.deliveryConfig?.freeDeliveryThreshold ? (
                    <p className="text-[10px] text-neutral-500">
                      💡 Free delivery unlocks on orders above {formatPrice(config.deliveryConfig.freeDeliveryThreshold)}.
                    </p>
                  ) : null}
                </div>
              ) : (
                /* Pickup Details: Shows Shop Address & note */
                <div
                  className="p-4 rounded-xl border space-y-2.5 bg-emerald-500/5 border-emerald-500/20"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                        Shop Collection Address
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-200">
                      Zero Delivery Fee
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-neutral-900 border border-emerald-500/20 text-xs">
                    <p className="font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5">
                      📍 {shopAddress}
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                      Ready during store business hours. We will notify you when your items are packed.
                    </p>
                  </div>

                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>For store pickup, Cash on Delivery is disabled. Please pay in advance via online or bank transfer.</span>
                  </p>
                </div>
              )}
            </div>

            {/* STEP 2: Customer Contact & Delivery Address Form */}
            <div
              className="p-6 rounded-2xl border shadow-xs space-y-4"
              style={{
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
              }}
            >
              <h2 className="text-base font-bold flex items-center gap-2" style={{ color: themeColors.text }}>
                <Building2 className="w-4 h-4" style={{ color: themeColors.primary }} />
                <span>2. Contact &amp; {fulfillmentType === 'delivery' ? 'Shipping Details' : 'Pickup Customer Details'}</span>
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

                {/* Street address and City only needed for delivery */}
                {fulfillmentType === 'delivery' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: themeColors.text }}>
                        Street Address {config.checkoutConfig?.requireAddress ? '*' : ''}
                      </label>
                      <input
                        type="text"
                        required={config.checkoutConfig?.requireAddress}
                        value={customer.address}
                        onChange={e => setCustomer({ ...customer, address: e.target.value })}
                        placeholder="House / Apartment #, Street, Sector / Area"
                        className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2"
                        style={{
                          borderColor: themeColors.border,
                          backgroundColor: themeColors.background,
                          color: themeColors.text,
                        }}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold" style={{ color: themeColors.text }}>
                          City / Town {config.checkoutConfig?.requireAddress ? '*' : ''}
                        </label>
                        <span className="text-[10px] text-neutral-400">
                          {ownerCity ? `Local city: ${ownerCity}` : ''}
                        </span>
                      </div>
                      <input
                        type="text"
                        required={config.checkoutConfig?.requireAddress}
                        value={customer.city}
                        onChange={e => setCustomer({ ...customer, city: e.target.value })}
                        placeholder={`e.g. ${ownerCity || 'Karachi'}, Lahore, Islamabad`}
                        className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2"
                        style={{
                          borderColor: themeColors.border,
                          backgroundColor: themeColors.background,
                          color: themeColors.text,
                        }}
                      />
                    </div>
                  </>
                )}

                {config.checkoutConfig?.orderNotesEnabled && (
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: themeColors.text }}>
                      Special Notes / Instructions (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={customer.notes}
                      onChange={e => setCustomer({ ...customer, notes: e.target.value })}
                      placeholder={
                        fulfillmentType === 'delivery'
                          ? 'Gate code, delivery landmark, or parcel instructions'
                          : 'Preferred pickup time or notes for store staff'
                      }
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

            {/* STEP 3: Payment Options (COD vs Advance Payment) */}
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
                  <span>3. Payment Options</span>
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-500/20">
                  {paymentRail === 'cod' ? 'Doorstep Cash' : 'Advance Payment'}
                </span>
              </div>

              {/* Top-Level Payment Options Selector: COD vs Advance Payment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Cash on Delivery (COD) - Hidden if Pickup is selected */}
                {fulfillmentType === 'delivery' && codMethod && (
                  <button
                    id="payment-option-cod-btn"
                    type="button"
                    onClick={() => setPaymentRail('cod')}
                    className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
                      paymentRail === 'cod' ? 'ring-2 shadow-sm' : 'hover:border-neutral-400 opacity-80'
                    }`}
                    style={{
                      borderColor: paymentRail === 'cod' ? '#059669' : themeColors.border,
                      backgroundColor: paymentRail === 'cod' ? '#05966910' : themeColors.background,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                          <Truck className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-black block text-emerald-800 dark:text-emerald-300">
                            Cash on Delivery (COD)
                          </span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            70% Popular Choice
                          </span>
                        </div>
                      </div>
                      {paymentRail === 'cod' && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                      Pay cash in hand directly to the delivery rider upon package arrival at your door.
                    </p>
                  </button>
                )}

                {/* 2. Advance Payment */}
                <button
                  id="payment-option-advance-btn"
                  type="button"
                  onClick={() => setPaymentRail('advance')}
                  className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
                    fulfillmentType === 'pickup' || !codMethod ? 'sm:col-span-2' : ''
                  } ${
                    paymentRail === 'advance' ? 'ring-2 shadow-sm' : 'hover:border-neutral-400 opacity-80'
                  }`}
                  style={{
                    borderColor: paymentRail === 'advance' ? themeColors.primary : themeColors.border,
                    backgroundColor:
                      paymentRail === 'advance' ? `${themeColors.primary}10` : themeColors.background,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs"
                        style={{ backgroundColor: themeColors.primary }}
                      >
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-black block" style={{ color: themeColors.text }}>
                          Advance Payment
                        </span>
                        <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                          Live Instant or Bank Transfer
                        </span>
                      </div>
                    </div>
                    {paymentRail === 'advance' && (
                      <CheckCircle2 className="w-4 h-4" style={{ color: themeColors.primary }} />
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: themeColors.muted }}>
                    Pay securely upfront for priority order handling and instant automated confirmation.
                  </p>
                </button>
              </div>

              {/* DETAILED CONTENT BASED ON CHOSEN PAYMENT OPTION */}

              {/* IF CASH ON DELIVERY (COD) SELECTED */}
              {paymentRail === 'cod' && fulfillmentType === 'delivery' && (
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
                        Doorstep Cash Collection Active
                      </span>
                      <p className="text-xs mt-1" style={{ color: themeColors.text }}>
                        Hand payment to the courier rider upon parcel handover.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      Zero Advance Risk
                    </span>
                  </div>

                  <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-100 text-xs space-y-1.5">
                    <p className="font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Amount due upon doorstep delivery: {formatPrice(checkoutPricing.total)}
                    </p>
                    <p className="text-[11px] opacity-90 leading-relaxed">
                      No card, bank transfer, or screenshot needed. Your items will be reserved immediately upon clicking <strong>Place COD Order</strong> below.
                    </p>
                  </div>
                </div>
              )}

              {/* IF ADVANCE PAYMENT SELECTED: Present the 2 Types */}
              {paymentRail === 'advance' && (
                <div className="space-y-4 pt-2">
                  {Boolean(safepayStatus?.enabled && safepayStatus?.hasApiKey) && advanceMethods.length > 0 && (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold" style={{ color: themeColors.text }}>
                          Select how you want to pay in advance:
                        </p>
                        <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                          Instant Online &amp; Manual Options
                        </span>
                      </div>

                      {/* Advance Sub-Option Tabs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        
                        {/* Sub-Option A: Pay Live Online (Instant Order - No Waiting) */}
                        <button
                          id="advance-suboption-safepay-btn"
                          type="button"
                          onClick={() => setAdvanceMode('safepay')}
                          className={`p-3.5 rounded-xl border text-left transition-all ${
                            advanceMode === 'safepay'
                              ? 'ring-2 border-blue-600 bg-blue-500/10 shadow-xs'
                              : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 opacity-80'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-extrabold flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                              <Zap className="w-4 h-4 fill-blue-500 text-blue-500" />
                              Pay Live Online
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-800 dark:text-blue-200">
                              RECOMMENDED
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                            Instant confirmation. No proof or screenshot required. No waiting!
                          </p>
                        </button>

                        {/* Sub-Option B: Manual Bank / Wallet Transfer (Wait for confirmation) */}
                        <button
                          id="advance-suboption-manual-btn"
                          type="button"
                          onClick={() => setAdvanceMode('manual')}
                          className={`p-3.5 rounded-xl border text-left transition-all ${
                            advanceMode === 'manual'
                              ? 'ring-2 border-amber-600 bg-amber-500/10 shadow-xs'
                              : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 opacity-80'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-extrabold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                              <Building2 className="w-4 h-4 text-amber-600" />
                              Bank / Wallet Transfer
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200">
                              Manual Proof
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                            Direct transfer via Bank IBAN, JazzCash, or Easypaisa + TID upload.
                          </p>
                        </button>
                      </div>
                    </>
                  )}

                  {/* DETAIL FOR SUB-OPTION A: PAY LIVE ONLINE */}
                  {Boolean(safepayStatus?.enabled && safepayStatus?.hasApiKey) && advanceMode === 'safepay' && (
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
                            <Zap className="w-4 h-4 text-blue-600 fill-blue-600" />
                            Live Online Payment via Safepay
                          </span>
                          <p className="text-xs mt-1" style={{ color: themeColors.muted }}>
                            Instant automated order confirmation without manual receipt check delays.
                          </p>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                          Instant Order
                        </span>
                      </div>

                      {/* Payment Card Badges */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                          💳 Visa &amp; Mastercard
                        </span>
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                          🇵🇰 PayPak Debit Cards
                        </span>
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                          📱 Raast &amp; Digital Wallets
                        </span>
                      </div>

                      <div className="p-3.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-950 dark:text-blue-200 text-xs space-y-1.5">
                        <div className="flex items-center gap-2 font-semibold">
                          <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <span>How Live Payment Works:</span>
                        </div>
                        <p className="text-[11px] leading-relaxed opacity-95">
                          When you click <strong>Pay Live Online</strong>, you are transferred to a 256-bit encrypted checkout. Your payment is verified instantly, and your order is confirmed without having to wait for a store agent to manually inspect your transfer.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* DETAIL FOR SUB-OPTION B: MANUAL BANK / WALLET TRANSFER */}
                  {advanceMode === 'manual' && (
                    <div className="space-y-3 pt-1">
                      {advanceMethods.length === 0 ? (
                        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 text-neutral-600 dark:text-neutral-400 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 text-neutral-500" />
                          <span>No manual bank accounts configured by store owner yet.</span>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs font-medium" style={{ color: themeColors.muted }}>
                            Select store bank account or mobile wallet:
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

                          {/* Destination Account Details */}
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
                                  Requires Proof
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

                              {/* IBAN / Raast */}
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
                                    <QrCode className="w-3.5 h-3.5" /> Scan QR with Banking App
                                  </p>
                                  <img
                                    src={selectedMethod.qrCodeUrl}
                                    alt="Payment Destination QR"
                                    className="w-36 h-36 object-contain rounded-lg border p-1"
                                    style={{ borderColor: themeColors.border }}
                                  />
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
                                    placeholder="e.g. 9876543210 or Bank Reference #"
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
                                    helperText="Select or drag screenshot of your transfer confirmation"
                                    aspectRatio="video"
                                    maxDimension={900}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                </div>
              )}

            </div>
          </div>

          {/* Right Column: Order Summary and Submission */}
          <div className="lg:col-span-5 space-y-6">
            <div
              className="p-6 rounded-2xl border shadow-xs space-y-4 sticky top-24"
              style={{
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
              }}
            >
              <h2 className="text-base font-bold" style={{ color: themeColors.text }}>
                Order Summary ({checkoutPricing.items.reduce((a, b) => a + b.quantity, 0)} items)
              </h2>

              {/* Items List */}
              <div className="max-h-60 overflow-y-auto space-y-3 divide-y" style={{ borderColor: themeColors.border }}>
                {checkoutPricing.items.map((item, idx) => (
                  <div key={idx} className="pt-3 first:pt-0 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate" style={{ color: themeColors.text }}>
                        {item.productName}
                      </p>
                      <p style={{ color: themeColors.muted }}>
                        Qty: {item.quantity} {item.isFreeReward ? '• Free Gift' : ''}
                      </p>
                    </div>
                    <span
                      className="font-bold whitespace-nowrap"
                      style={{ color: item.isFreeReward ? '#10b981' : themeColors.text }}
                    >
                      {item.isFreeReward ? 'FREE' : formatPrice(item.totalPrice)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Breakdown */}
              <div className="space-y-2 pt-4 border-t text-xs" style={{ borderColor: themeColors.border }}>
                <div className="flex justify-between" style={{ color: themeColors.muted }}>
                  <span>Subtotal</span>
                  <span className="font-semibold" style={{ color: themeColors.text }}>
                    {formatPrice(checkoutPricing.subtotal)}
                  </span>
                </div>

                {checkoutPricing.discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Promotions &amp; Discounts</span>
                    <span>-{formatPrice(checkoutPricing.discountTotal)}</span>
                  </div>
                )}

                {/* Fulfillment / Delivery Row */}
                <div className="flex justify-between" style={{ color: themeColors.muted }}>
                  <span>Fulfillment ({fulfillmentType === 'delivery' ? 'Home Delivery' : 'Store Pickup'})</span>
                  <span
                    className="font-semibold"
                    style={{ color: checkoutPricing.deliveryFee === 0 ? '#059669' : themeColors.text }}
                  >
                    {fulfillmentType === 'pickup'
                      ? 'FREE (Store Pickup)'
                      : checkoutPricing.deliveryFee === 0
                      ? 'FREE'
                      : formatPrice(checkoutPricing.deliveryFee)}
                  </span>
                </div>

                {/* Itemized Taxes (if configured & applied) */}
                {config.taxConfig?.enabled && checkoutPricing.taxTotal > 0 && (
                  <div className="flex justify-between text-xs" style={{ color: themeColors.muted }}>
                    <span className="flex items-center gap-1">
                      <BadgePercent className="w-3.5 h-3.5 text-amber-600" />
                      <span>
                        {checkoutPricing.taxCategory || 'Sales Tax'} ({checkoutPricing.taxPercentage || 0}%)
                      </span>
                    </span>
                    <span className="font-semibold" style={{ color: themeColors.text }}>
                      {formatPrice(checkoutPricing.taxTotal)}
                    </span>
                  </div>
                )}

                {/* Total */}
                <div
                  className="flex justify-between text-lg font-black pt-3 border-t"
                  style={{ borderColor: themeColors.border }}
                >
                  <span>Total Due</span>
                  <span style={{ color: themeColors.primary }}>{formatPrice(checkoutPricing.total)}</span>
                </div>
              </div>

              {/* Submit / Order Action Button */}
              <button
                id="submit-order-btn"
                type="submit"
                disabled={
                  isSubmitting ||
                  checkoutPricing.items.length === 0 ||
                  (paymentRail === 'cod' && fulfillmentType === 'pickup')
                }
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-40"
                style={{
                  backgroundColor:
                    paymentRail === 'cod'
                      ? '#059669'
                      : paymentRail === 'advance' && advanceMode === 'safepay'
                      ? '#2563eb'
                      : themeColors.primary,
                }}
              >
                {paymentRail === 'cod' ? (
                  <Truck className="w-4 h-4" />
                ) : paymentRail === 'advance' && advanceMode === 'safepay' ? (
                  <Zap className="w-4 h-4 fill-white" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}

                <span>
                  {isSubmitting
                    ? paymentRail === 'advance' && advanceMode === 'safepay'
                      ? 'Redirecting to Safepay...'
                      : paymentRail === 'cod'
                      ? 'Placing COD Order...'
                      : 'Submitting Order...'
                    : paymentRail === 'cod'
                    ? `Place COD Order • ${formatPrice(checkoutPricing.total)}`
                    : paymentRail === 'advance' && advanceMode === 'safepay'
                    ? `Pay Live Online • ${formatPrice(checkoutPricing.total)}`
                    : `Submit Order for Verification • ${formatPrice(checkoutPricing.total)}`}
                </span>
              </button>

              {/* Payment Reassurance Footnotes */}
              <div className="text-[11px] text-center space-y-1" style={{ color: themeColors.muted }}>
                {paymentRail === 'cod' ? (
                  <>
                    <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                      Doorstep Cash on Delivery
                    </p>
                    <p>Pay upon delivery. No advance card deposit needed.</p>
                  </>
                ) : paymentRail === 'advance' && advanceMode === 'safepay' ? (
                  <>
                    <p className="font-semibold text-blue-700 dark:text-blue-300">
                      Instant Automated Verification
                    </p>
                    <p>Direct sandbox/live checkout session. No manual proof required.</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-amber-700 dark:text-amber-300">
                      Direct Transfer with Verification
                    </p>
                    <p>Order will be processed upon staff receipt verification.</p>
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
