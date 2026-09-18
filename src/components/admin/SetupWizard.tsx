import React, { useState } from 'react';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Store,
  Palette,
  Image,
  FolderTree,
  Package,
  CreditCard,
  Truck,
  Layout,
  Eye,
  Sparkles,
  Upload,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { THEME_PRESETS } from '../../engine/theme/themes';
import { ImageUpload } from '../common/ImageUpload';
import {
  saveStoreConfig,
  saveCategory,
  saveProduct,
  savePaymentMethod,
} from '../../services/store/storeService';

interface SetupWizardProps {
  onComplete: () => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const { storeId, config, themeColors, setCurrentView } = useStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Wizard state values
  const [storeName, setStoreName] = useState(config.storeName === 'Configure Your Store' ? '' : config.storeName);
  const [storeDescription, setStoreDescription] = useState(config.storeDescription);
  const [currency, setCurrency] = useState(config.currency || 'PKR');
  const [currencySymbol, setCurrencySymbol] = useState(config.currencySymbol || 'Rs.');
  const [themeId, setThemeId] = useState(config.themeId || 'clean-commerce');
  const [logoUrl, setLogoUrl] = useState(config.logoUrl || '');
  const [customPrimary, setCustomPrimary] = useState('');
  const [customAccent, setCustomAccent] = useState('');

  // Step 5: First Category
  const [catName, setCatName] = useState('');

  // Step 6: First Product
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('2500');
  const [prodDesc, setProdDesc] = useState('');
  const [prodStock, setProdStock] = useState('20');
  const [prodImageUrl, setProdImageUrl] = useState('');

  // Step 7: Payment destination
  const [payType, setPayType] = useState('jazzcash');
  const [payName, setPayName] = useState('JazzCash');
  const [payTitle, setPayTitle] = useState('');
  const [payNumber, setPayNumber] = useState('');
  const [payInstructions, setPayInstructions] = useState('Send mobile transfer to account above and upload payment screenshot.');

  // Step 8: Delivery
  const [deliveryFee, setDeliveryFee] = useState(config.deliveryConfig?.flatFee ? String(config.deliveryConfig.flatFee) : '250');
  const [freeThreshold, setFreeThreshold] = useState(config.deliveryConfig?.freeDeliveryThreshold ? String(config.deliveryConfig.freeDeliveryThreshold) : '3000');

  // Step 9: Homepage hero headline
  const [heroHeading, setHeroHeading] = useState('Modern Essentials Crafted for Quality');

  const steps = [
    { num: 1, title: 'Store Identity', icon: <Store className="w-4 h-4" /> },
    { num: 2, title: 'Choose Theme', icon: <Palette className="w-4 h-4" /> },
    { num: 3, title: 'Logo & Visuals', icon: <Image className="w-4 h-4" /> },
    { num: 4, title: 'Colors', icon: <Sparkles className="w-4 h-4" /> },
    { num: 5, title: 'First Category', icon: <FolderTree className="w-4 h-4" /> },
    { num: 6, title: 'First Product', icon: <Package className="w-4 h-4" /> },
    { num: 7, title: 'Payment Setup', icon: <CreditCard className="w-4 h-4" /> },
    { num: 8, title: 'Delivery Rules', icon: <Truck className="w-4 h-4" /> },
    { num: 9, title: 'Homepage Hero', icon: <Layout className="w-4 h-4" /> },
    { num: 10, title: 'Launch Preview', icon: <Eye className="w-4 h-4" /> },
  ];

  const handleFinishWizard = async () => {
    setIsSaving(true);
    try {
      // 1. Save Category if entered
      let createdCatId = '';
      if (catName.trim()) {
        createdCatId = await saveCategory(storeId, {
          name: catName.trim(),
          sortOrder: 1,
          isActive: true,
        });
      }

      // 2. Save Product if entered
      if (prodName.trim() && Number(prodPrice) > 0) {
        await saveProduct(storeId, {
          name: prodName.trim(),
          price: Number(prodPrice),
          description: prodDesc,
          stock: Number(prodStock) || 10,
          categoryIds: createdCatId ? [createdCatId] : [],
          images: prodImageUrl ? [prodImageUrl] : [],
          status: 'active',
          featured: true,
        });
      }

      // 3. Save Payment Method if entered
      if (payTitle.trim() || payNumber.trim()) {
        await savePaymentMethod(storeId, {
          type: payType as any,
          displayName: payName,
          accountTitle: payTitle,
          accountNumber: payNumber,
          instructions: payInstructions,
          enabled: true,
          requireScreenshot: true,
          requireTransactionReference: true,
        });
      }

      // 4. Update homepage sections
      const updatedSections = config.homepageSections.map(sec => {
        if (sec.type === 'hero' && heroHeading.trim()) {
          return { ...sec, title: heroHeading.trim() };
        }
        return sec;
      });

      // 5. Save final StoreConfig
      await saveStoreConfig(storeId, {
        storeName: storeName.trim() || 'My Online Store',
        storeDescription,
        currency,
        currencySymbol,
        themeId,
        logoUrl,
        themeCustomColors: {
          ...(customPrimary ? { primary: customPrimary } : {}),
          ...(customAccent ? { accent: customAccent } : {}),
        },
        deliveryConfig: {
          enabled: true,
          flatFee: Number(deliveryFee) || 0,
          freeDeliveryThreshold: Number(freeThreshold) || 0,
        },
        homepageSections: updatedSections,
        isConfigured: true,
      });

      onComplete();
    } catch (e) {
      console.error(e);
      alert('Failed to save store configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8">
      {/* Wizard Header */}
      <div className="text-center space-y-2">
        <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
          Store Onboarding
        </span>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: themeColors.text }}>
          10-Step Store Setup Wizard
        </h1>
        <p className="text-xs sm:text-sm" style={{ color: themeColors.muted }}>
          Configure all core parameters of your commerce engine in minutes.
        </p>
      </div>

      {/* Steps Pill Indicator */}
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 pb-2">
        {steps.map(s => {
          const isDone = s.num < currentStep;
          const isCurrent = s.num === currentStep;
          return (
            <button
              key={s.num}
              onClick={() => setCurrentStep(s.num)}
              className={`p-2 rounded-xl text-center flex flex-col items-center gap-1 border transition-all text-[10px] font-bold ${
                isCurrent
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300 ring-1 ring-indigo-600'
                  : isDone
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                  : 'border-neutral-200 dark:border-neutral-800 text-neutral-400'
              }`}
            >
              {isDone ? <Check className="w-3.5 h-3.5" /> : s.icon}
              <span className="truncate w-full">{s.num}. {s.title}</span>
            </button>
          );
        })}
      </div>

      {/* Step Content Container */}
      <div
        className="p-6 sm:p-8 rounded-2xl border shadow-sm transition-all"
        style={{
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
          color: themeColors.text,
        }}
      >
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Step 1: Store Name &amp; Currency</h2>
            <p className="text-xs" style={{ color: themeColors.muted }}>
              Give your store an authentic name. Never hardcode any predefined name.
            </p>
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold mb-1">Store Name *</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={e => setStoreName(e.target.value)}
                  placeholder="e.g. Silk & Stone, TechNova, Atelier Living"
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Store Tagline / Description</label>
                <input
                  type="text"
                  value={storeDescription}
                  onChange={e => setStoreDescription(e.target.value)}
                  placeholder="Curated apparel & lifestyle essentials"
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Currency Code</label>
                  <input
                    type="text"
                    value={currency}
                    onChange={e => setCurrency(e.target.value.toUpperCase())}
                    placeholder="PKR, USD, EUR, GBP"
                    className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                    style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Currency Symbol</label>
                  <input
                    type="text"
                    value={currencySymbol}
                    onChange={e => setCurrencySymbol(e.target.value)}
                    placeholder="Rs., $, €, £"
                    className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                    style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Step 2: Choose Preset Theme</h2>
            <p className="text-xs" style={{ color: themeColors.muted }}>
              Select a coordinated design system tailored to your industry.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {THEME_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => setThemeId(preset.id)}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    themeId === preset.id ? 'ring-2 ring-indigo-600 border-indigo-600' : 'hover:border-neutral-400'
                  }`}
                  style={{
                    backgroundColor: themeId === preset.id ? `${preset.colors.primary}0a` : themeColors.surface,
                    borderColor: themeId === preset.id ? preset.colors.primary : themeColors.border,
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm" style={{ color: themeColors.text }}>{preset.name}</span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm bg-neutral-200 dark:bg-neutral-800">
                        {preset.mode}
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: themeColors.muted }}>{preset.description}</p>
                  </div>

                  {/* Swatches */}
                  <div className="flex items-center gap-1.5 mt-3">
                    <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: preset.colors.primary }} />
                    <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: preset.colors.secondary }} />
                    <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: preset.colors.accent }} />
                    <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: preset.colors.background }} />
                    <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: preset.colors.text }} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Step 3: Upload Logo &amp; Brand Assets</h2>
            <p className="text-xs" style={{ color: themeColors.muted }}>
              Upload your store logo or visual mark for your header, checkout, and order receipts.
            </p>
            <div className="pt-2">
              <ImageUpload
                value={logoUrl}
                onChange={setLogoUrl}
                label="Store Logo"
                helperText="Upload transparent PNG, SVG, or JPG (max 800px)"
                aspectRatio="auto"
                maxDimension={800}
              />
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Step 4: Custom Brand Colors (Optional)</h2>
            <p className="text-xs" style={{ color: themeColors.muted }}>
              Leave blank to use chosen preset colors, or enter custom HEX colors.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold mb-1">Primary Brand Color (HEX)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customPrimary || '#18181b'}
                    onChange={e => setCustomPrimary(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border p-0.5"
                  />
                  <input
                    type="text"
                    value={customPrimary}
                    onChange={e => setCustomPrimary(e.target.value)}
                    placeholder="#18181b"
                    className="flex-1 px-3 py-2 rounded-xl border text-xs font-mono"
                    style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Accent Highlight Color (HEX)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customAccent || '#059669'}
                    onChange={e => setCustomAccent(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border p-0.5"
                  />
                  <input
                    type="text"
                    value={customAccent}
                    onChange={e => setCustomAccent(e.target.value)}
                    placeholder="#059669"
                    className="flex-1 px-3 py-2 rounded-xl border text-xs font-mono"
                    style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Step 5: Create First Category</h2>
            <p className="text-xs" style={{ color: themeColors.muted }}>
              Categories are completely dynamic. Create what fits your catalog (e.g. Summer Collection, Smart Devices, Skincare, Outerwear).
            </p>
            <div className="pt-2">
              <label className="block text-xs font-semibold mb-1">Category Name *</label>
              <input
                type="text"
                value={catName}
                onChange={e => setCatName(e.target.value)}
                placeholder="e.g. Featured Arrivals"
                className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
              />
            </div>
          </div>
        )}

        {currentStep === 6 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Step 6: Add Your First Product</h2>
            <p className="text-xs" style={{ color: themeColors.muted }}>
              Enter product details to populate your storefront instantly.
            </p>
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold mb-1">Product Title *</label>
                <input
                  type="text"
                  value={prodName}
                  onChange={e => setProdName(e.target.value)}
                  placeholder="e.g. Premium Cotton Overshirt or Wireless ANC Earbuds"
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Price ({currencySymbol}) *</label>
                  <input
                    type="number"
                    value={prodPrice}
                    onChange={e => setProdPrice(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                    style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Initial Stock Units</label>
                  <input
                    type="number"
                    value={prodStock}
                    onChange={e => setProdStock(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                    style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                  />
                </div>
              </div>

              <div>
                <ImageUpload
                  value={prodImageUrl}
                  onChange={setProdImageUrl}
                  label="Product Photography"
                  helperText="Upload image from phone or computer, or drop file here"
                  aspectRatio="square"
                  maxDimension={1000}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Brief Description</label>
                <textarea
                  rows={2}
                  value={prodDesc}
                  onChange={e => setProdDesc(e.target.value)}
                  placeholder="Tailored with premium finishes and durable materials."
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none resize-none"
                  style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 7 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Step 7: Configure Payment Destination</h2>
            <p className="text-xs" style={{ color: themeColors.muted }}>
              Define where customers send payments (JazzCash, Easypaisa, Raast, or Bank IBAN).
            </p>
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-3 gap-2">
                {['jazzcash', 'easypaisa', 'bank_transfer'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setPayType(type);
                      setPayName(type === 'jazzcash' ? 'JazzCash' : type === 'easypaisa' ? 'Easypaisa' : 'Bank Transfer');
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold capitalize ${
                      payType === type ? 'ring-2 ring-indigo-600 border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30' : ''
                    }`}
                    style={{ borderColor: themeColors.border }}
                  >
                    {type.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Account Title / Beneficiary</label>
                <input
                  type="text"
                  value={payTitle}
                  onChange={e => setPayTitle(e.target.value)}
                  placeholder="e.g. John Doe / Store Operations"
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Account Number / IBAN</label>
                <input
                  type="text"
                  value={payNumber}
                  onChange={e => setPayNumber(e.target.value)}
                  placeholder="03001234567 or PK36MEZN0000..."
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none font-mono"
                  style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 8 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Step 8: Delivery &amp; Shipping Rules</h2>
            <p className="text-xs" style={{ color: themeColors.muted }}>
              Configure nationwide shipping charges and free delivery threshold.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold mb-1">Standard Delivery Fee ({currencySymbol})</label>
                <input
                  type="number"
                  value={deliveryFee}
                  onChange={e => setDeliveryFee(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Free Delivery on Orders Above ({currencySymbol})</label>
                <input
                  type="number"
                  value={freeThreshold}
                  onChange={e => setFreeThreshold(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 9 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Step 9: Homepage Hero Section</h2>
            <p className="text-xs" style={{ color: themeColors.muted }}>
              Set the main banner headline welcoming shoppers.
            </p>
            <div className="pt-2">
              <label className="block text-xs font-semibold mb-1">Hero Tagline / Heading</label>
              <input
                type="text"
                value={heroHeading}
                onChange={e => setHeroHeading(e.target.value)}
                placeholder="Curated Essentials Crafted with Precision"
                className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
              />
            </div>
          </div>
        )}

        {currentStep === 10 && (
          <div className="space-y-4 text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-extrabold">Ready to Publish &amp; Launch!</h2>
            <p className="text-xs max-w-md mx-auto" style={{ color: themeColors.muted }}>
              Your store configuration, theme tokens, product data, and payment rails are ready to be saved to Firestore.
            </p>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t" style={{ borderColor: themeColors.border }}>
          <button
            type="button"
            onClick={() => setCurrentStep(s => Math.max(1, s - 1))}
            disabled={currentStep === 1}
            className="px-4 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1 disabled:opacity-30"
            style={{ borderColor: themeColors.border }}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {currentStep < 10 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(s => Math.min(10, s + 1))}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-1 shadow-sm transition-all"
              style={{ backgroundColor: themeColors.primary }}
            >
              <span>Next Step</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              id="finish-wizard-btn"
              type="button"
              disabled={isSaving}
              onClick={handleFinishWizard}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-md transition-all active:scale-95 bg-emerald-600 hover:bg-emerald-700"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Publishing Store...' : 'Publish & Launch Store'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
