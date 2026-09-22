import React, { useState } from 'react';
import { Settings, Save, Check, Truck, Shield, Phone, Mail, Store, MapPin, Percent, Receipt } from 'lucide-react';
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

  // Location & Shop Pickup
  const [ownerCity, setOwnerCity] = useState(config.deliveryConfig?.ownerCity || 'Lahore');
  const [shopAddress, setShopAddress] = useState(config.deliveryConfig?.shopAddress || 'My Shop Address');
  const [pickupEnabled, setPickupEnabled] = useState(config.deliveryConfig?.pickupEnabled !== false);

  // Delivery Rates (Owner City vs Countrywide)
  const [deliveryEnabled, setDeliveryEnabled] = useState(config.deliveryConfig?.enabled !== false);
  const [cityFee, setCityFee] = useState(String(config.deliveryConfig?.cityFee ?? 150));
  const [countryFee, setCountryFee] = useState(String(config.deliveryConfig?.countryFee ?? 250));
  const [freeThreshold, setFreeThreshold] = useState(String(config.deliveryConfig?.freeDeliveryThreshold ?? 3000));
  const [estimateText, setEstimateText] = useState(config.deliveryConfig?.estimateText || '2-4 business days nationwide');

  // Taxes
  const [taxEnabled, setTaxEnabled] = useState(Boolean(config.taxConfig?.enabled));
  const [taxCategory, setTaxCategory] = useState(config.taxConfig?.category || 'GST / Sales Tax');
  const [taxPercentage, setTaxPercentage] = useState(String(config.taxConfig?.percentage ?? 5));

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
          flatFee: Number(countryFee) || 250,
          cityFee: Number(cityFee) || 0,
          countryFee: Number(countryFee) || 0,
          ownerCity: ownerCity.trim() || 'Lahore',
          shopAddress: shopAddress.trim() || 'My Shop Address',
          pickupEnabled,
          freeDeliveryThreshold: Number(freeThreshold) || 0,
          estimateText: estimateText.trim(),
        },
        taxConfig: {
          enabled: taxEnabled,
          category: taxCategory.trim() || 'GST / Sales Tax',
          percentage: Number(taxPercentage) || 0,
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

      {/* Store Location & Shop Pickup */}
      <div
        className="p-6 rounded-2xl border space-y-4 shadow-xs"
        style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: themeColors.text }}>
            <MapPin className="w-4 h-4 text-indigo-600" />
            <span>Store Location &amp; Customer Pickup</span>
          </h3>
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={pickupEnabled}
              onChange={e => setPickupEnabled(e.target.checked)}
              className="rounded"
            />
            <span>Enable In-Store Pickup Option</span>
          </label>
        </div>

        <p className="text-xs text-neutral-500">
          When customers choose "Store Pickup" at checkout, no delivery fee is added, and Cash on Delivery is disabled so you only hold orders after advance payment or customer collection.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold mb-1">Owner / Store City</label>
            <input
              type="text"
              value={ownerCity}
              onChange={e => setOwnerCity(e.target.value)}
              placeholder="e.g. Lahore, Karachi, Islamabad"
              className="w-full px-3 py-2 rounded-xl border outline-none"
              style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
            />
            <span className="text-[11px] text-neutral-400 mt-1 block">
              Used to apply discounted local city delivery rates.
            </span>
          </div>

          <div>
            <label className="block font-semibold mb-1">Shop Address for Customer Collection</label>
            <input
              type="text"
              value={shopAddress}
              onChange={e => setShopAddress(e.target.value)}
              placeholder="e.g. Shop # 4, Main Commercial Market, Lahore"
              className="w-full px-3 py-2 rounded-xl border outline-none"
              style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
            />
            <span className="text-[11px] text-neutral-400 mt-1 block">
              Displayed to customers when they choose Store Pickup. Default: "My Shop Address".
            </span>
          </div>
        </div>
      </div>

      {/* Location-Based Delivery & Shipping Rates */}
      <div
        className="p-6 rounded-2xl border space-y-4 shadow-xs"
        style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: themeColors.text }}>
            <Truck className="w-4 h-4 text-emerald-600" />
            <span>Delivery &amp; Courier Charges</span>
          </h3>
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={deliveryEnabled}
              onChange={e => setDeliveryEnabled(e.target.checked)}
              className="rounded"
            />
            <span>Enable Home Delivery</span>
          </label>
        </div>

        <p className="text-xs text-neutral-500">
          Set custom delivery rates for customers in your city ({ownerCity || 'Owner City'}) vs elsewhere in Pakistan.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-semibold mb-1">
              In {ownerCity || 'Owner City'} ({currencySymbol})
            </label>
            <input
              type="number"
              min={0}
              value={cityFee}
              onChange={e => setCityFee(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border outline-none font-bold"
              style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
            />
            <span className="text-[11px] text-neutral-400 mt-1 block">
              Local intra-city delivery charge (Rs. X)
            </span>
          </div>

          <div>
            <label className="block font-semibold mb-1">
              Elsewhere Nationwide ({currencySymbol})
            </label>
            <input
              type="number"
              min={0}
              value={countryFee}
              onChange={e => setCountryFee(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border outline-none font-bold"
              style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
            />
            <span className="text-[11px] text-neutral-400 mt-1 block">
              Courier fee for all other cities (Rs. Y)
            </span>
          </div>

          <div>
            <label className="block font-semibold mb-1">Free Delivery Above ({currencySymbol})</label>
            <input
              type="number"
              min={0}
              value={freeThreshold}
              onChange={e => setFreeThreshold(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border outline-none"
              style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
            />
            <span className="text-[11px] text-neutral-400 mt-1 block">
              Orders at or above this get free delivery.
            </span>
          </div>

          <div>
            <label className="block font-semibold mb-1">Estimated Timeline</label>
            <input
              type="text"
              value={estimateText}
              onChange={e => setEstimateText(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border outline-none"
              style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
            />
            <span className="text-[11px] text-neutral-400 mt-1 block">
              e.g. 2-4 business days
            </span>
          </div>
        </div>
      </div>

      {/* Taxes & GST Configuration */}
      <div
        className="p-6 rounded-2xl border space-y-4 shadow-xs"
        style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: themeColors.text }}>
            <Receipt className="w-4 h-4 text-amber-600" />
            <span>Taxes &amp; Sales Tax (GST)</span>
          </h3>
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={taxEnabled}
              onChange={e => setTaxEnabled(e.target.checked)}
              className="rounded"
            />
            <span>Apply Taxes at Checkout</span>
          </label>
        </div>

        <p className="text-xs text-neutral-500">
          When enabled, tax is automatically calculated as a percentage of the order subtotal and itemized at checkout.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold mb-1">Tax Category / Label</label>
            <input
              type="text"
              value={taxCategory}
              onChange={e => setTaxCategory(e.target.value)}
              placeholder="e.g. Sales Tax (GST), Provincial Sales Tax, VAT"
              disabled={!taxEnabled}
              className={`w-full px-3 py-2 rounded-xl border outline-none ${!taxEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
            />
            <span className="text-[11px] text-neutral-400 mt-1 block">
              Label displayed to customer on checkout summary and receipts.
            </span>
          </div>

          <div>
            <label className="block font-semibold mb-1">Tax Percentage (%)</label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={taxPercentage}
                onChange={e => setTaxPercentage(e.target.value)}
                disabled={!taxEnabled}
                placeholder="e.g. 5 or 18"
                className={`w-full px-3 py-2 rounded-xl border outline-none pr-8 font-bold ${!taxEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
              />
              <span className="absolute right-3 top-2.5 text-neutral-400 font-bold">%</span>
            </div>
            <span className="text-[11px] text-neutral-400 mt-1 block">
              Percentage calculated on order subtotal after discounts.
            </span>
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
