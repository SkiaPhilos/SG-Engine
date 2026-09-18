import React, { useState } from 'react';
import { Settings, Save, Check, Truck, Shield, Phone, Mail, Store } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { saveStoreConfig } from '../../services/store/storeService';
import { ImageUpload } from '../common/ImageUpload';

export const SettingsManager: React.FC = () => {
  const { config, storeId, themeColors } = useStore();

  const [storeName, setStoreName] = useState(config.storeName || '');
  const [storeDescription, setStoreDescription] = useState(config.storeDescription || '');
  const [currency, setCurrency] = useState(config.currency || 'PKR');
  const [currencySymbol, setCurrencySymbol] = useState(config.currencySymbol || 'Rs.');
  const [logoUrl, setLogoUrl] = useState(config.logoUrl || '');

  // Contact
  const [contactEmail, setContactEmail] = useState(config.contactEmail || '');
  const [contactPhone, setContactPhone] = useState(config.contactPhone || '');
  const [whatsappNumber, setWhatsappNumber] = useState(config.whatsappNumber || '');

  // Delivery
  const [deliveryEnabled, setDeliveryEnabled] = useState(config.deliveryConfig?.enabled !== false);
  const [flatFee, setFlatFee] = useState(String(config.deliveryConfig?.flatFee ?? 250));
  const [freeThreshold, setFreeThreshold] = useState(String(config.deliveryConfig?.freeDeliveryThreshold ?? 3000));
  const [estimateText, setEstimateText] = useState(config.deliveryConfig?.estimateText || '2-4 business days nationwide');

  // Checkout
  const [requirePhone, setRequirePhone] = useState(config.checkoutConfig?.requirePhone !== false);
  const [requireEmail, setRequireEmail] = useState(Boolean(config.checkoutConfig?.requireEmail));
  const [requireAddress, setRequireAddress] = useState(config.checkoutConfig?.requireAddress !== false);
  const [orderNotesEnabled, setOrderNotesEnabled] = useState(config.checkoutConfig?.orderNotesEnabled !== false);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      await saveStoreConfig(storeId, {
        storeName: storeName.trim(),
        storeDescription: storeDescription.trim(),
        currency: currency.trim().toUpperCase(),
        currencySymbol: currencySymbol.trim(),
        logoUrl: logoUrl.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        whatsappNumber: whatsappNumber.trim(),
        deliveryConfig: {
          enabled: deliveryEnabled,
          flatFee: Number(flatFee) || 0,
          freeDeliveryThreshold: Number(freeThreshold) || 0,
          estimateText: estimateText.trim(),
        },
        checkoutConfig: {
          requirePhone,
          requireEmail,
          requireAddress,
          orderNotesEnabled,
        },
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      alert('Error updating store settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight" style={{ color: themeColors.text }}>
            Store Configuration &amp; Settings
          </h2>
          <p className="text-xs" style={{ color: themeColors.muted }}>
            Manage store metadata, local currency symbols, checkout validation, and delivery rates.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-xs transition-all active:scale-95"
          style={{ backgroundColor: themeColors.primary }}
        >
          {savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Saving...' : savedSuccess ? 'Settings Saved!' : 'Save Changes'}</span>
        </button>
      </div>

      {/* General Information */}
      <div
        className="p-6 rounded-2xl border space-y-4 shadow-xs"
        style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface }}
      >
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: themeColors.text }}>
          <Store className="w-4 h-4 text-indigo-600" />
          <span>General Storefront Identity</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold mb-1">Store Name</label>
            <input
              type="text"
              required
              value={storeName}
              onChange={e => setStoreName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
              style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Store Tagline / Description</label>
            <input
              type="text"
              value={storeDescription}
              onChange={e => setStoreDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
              style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Currency Code</label>
            <input
              type="text"
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border font-mono outline-none"
              style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Currency Symbol</label>
            <input
              type="text"
              value={currencySymbol}
              onChange={e => setCurrencySymbol(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border font-bold outline-none"
              style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
            />
          </div>

          <div className="sm:col-span-2 pt-2">
            <ImageUpload
              value={logoUrl}
              onChange={setLogoUrl}
              label="Storefront Logo & Brand Mark"
              helperText="Upload transparent PNG, SVG or WebP for header and receipts"
              aspectRatio="auto"
              maxDimension={800}
            />
          </div>
        </div>
      </div>

      {/* Delivery Rules */}
      <div
        className="p-6 rounded-2xl border space-y-4 shadow-xs"
        style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface }}
      >
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: themeColors.text }}>
          <Truck className="w-4 h-4 text-emerald-600" />
          <span>Delivery &amp; Shipping Rates</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold mb-1">Standard Delivery Fee ({currencySymbol})</label>
            <input
              type="number"
              min={0}
              value={flatFee}
              onChange={e => setFlatFee(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border outline-none"
              style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Free Delivery Threshold ({currencySymbol})</label>
            <input
              type="number"
              min={0}
              value={freeThreshold}
              onChange={e => setFreeThreshold(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border outline-none"
              style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Estimated Delivery Timeline</label>
            <input
              type="text"
              value={estimateText}
              onChange={e => setEstimateText(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border outline-none"
              style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
            />
          </div>
        </div>
      </div>

      {/* Checkout Requirements */}
      <div
        className="p-6 rounded-2xl border space-y-4 shadow-xs"
        style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface }}
      >
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: themeColors.text }}>
          <Shield className="w-4 h-4 text-indigo-600" />
          <span>Checkout Field Enforcement</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <label className="flex items-center gap-2 p-3 rounded-xl border cursor-pointer" style={{ borderColor: themeColors.border }}>
            <input
              type="checkbox"
              checked={requirePhone}
              onChange={e => setRequirePhone(e.target.checked)}
            />
            <span className="font-semibold">Require Contact Phone Number</span>
          </label>

          <label className="flex items-center gap-2 p-3 rounded-xl border cursor-pointer" style={{ borderColor: themeColors.border }}>
            <input
              type="checkbox"
              checked={requireEmail}
              onChange={e => setRequireEmail(e.target.checked)}
            />
            <span className="font-semibold">Require Customer Email Address</span>
          </label>

          <label className="flex items-center gap-2 p-3 rounded-xl border cursor-pointer" style={{ borderColor: themeColors.border }}>
            <input
              type="checkbox"
              checked={requireAddress}
              onChange={e => setRequireAddress(e.target.checked)}
            />
            <span className="font-semibold">Require Complete Street Address &amp; City</span>
          </label>

          <label className="flex items-center gap-2 p-3 rounded-xl border cursor-pointer" style={{ borderColor: themeColors.border }}>
            <input
              type="checkbox"
              checked={orderNotesEnabled}
              onChange={e => setOrderNotesEnabled(e.target.checked)}
            />
            <span className="font-semibold">Enable Special Delivery Instructions Box</span>
          </label>
        </div>
      </div>
    </form>
  );
};
