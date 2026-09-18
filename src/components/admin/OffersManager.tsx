import React, { useState } from 'react';
import {
  Plus,
  Sparkles,
  Gift,
  Tag,
  Trash2,
  Edit2,
  X,
  Layers,
  Check,
  Percent,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Offer, OfferType, OfferPricingRule, OfferDisplayStyle } from '../../types/store';
import { saveOffer, deleteOffer } from '../../services/store/storeService';
import { OfferCard } from '../offers/OfferCard';

export const OffersManager: React.FC = () => {
  const { offers, products, storeId, formatPrice, themeColors } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [currentOffer, setCurrentOffer] = useState<Partial<Offer> | null>(null);
  const [saving, setSaving] = useState(false);

  const displayStyles: { id: OfferDisplayStyle; label: string }[] = [
    { id: 'floating', label: 'Floating Offset' },
    { id: 'stacked', label: 'Stacked Layer' },
    { id: 'clean', label: 'Clean Side-by-Side' },
    { id: 'bundle_hero', label: 'Bundle Hero Showcase' },
    { id: 'sale_burst', label: 'Sale Burst' },
    { id: 'minimal_premium', label: 'Minimal Premium' },
  ];

  const handleOpenAdd = () => {
    setCurrentOffer({
      name: '',
      description: '',
      type: 'free_product',
      primaryProductIds: products[0] ? [products[0].id] : [],
      primaryQuantity: 1,
      rewardProductIds: products[1] ? [products[1].id] : products[0] ? [products[0].id] : [],
      rewardQuantity: 1,
      pricingRule: 'percentage_discount',
      pricingValue: 20,
      displayStyle: 'floating',
      badgeText: 'Free Gift Bundle',
      status: 'active',
    });
    setIsEditing(true);
  };

  const handleEdit = (o: Offer) => {
    setCurrentOffer({ ...o });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this promotional offer?')) {
      await deleteOffer(storeId, id);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOffer?.name?.trim()) return;
    setSaving(true);
    try {
      await saveOffer(storeId, currentOffer as any);
      setIsEditing(false);
      setCurrentOffer(null);
    } catch (e) {
      console.error(e);
      alert('Error saving offer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight" style={{ color: themeColors.text }}>
            Promotional &amp; Bundle Engine ({offers.length})
          </h2>
          <p className="text-xs" style={{ color: themeColors.muted }}>
            Structured promotional rules: Buy X Get Y Free, Multi-item Bundles, and Free Gift Combinations.
          </p>
        </div>

        <button
          id="create-offer-btn"
          onClick={handleOpenAdd}
          disabled={products.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white shadow-xs transition-all active:scale-95 disabled:opacity-40"
          style={{ backgroundColor: themeColors.primary }}
        >
          <Sparkles className="w-4 h-4" />
          <span>Create Promotion</span>
        </button>
      </div>

      {products.length === 0 && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200 text-xs">
          Please add products to your catalog before creating bundle offers.
        </div>
      )}

      {/* Offers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {offers.length === 0 ? (
          <div className="col-span-2 p-8 text-center rounded-2xl border" style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface }}>
            <Gift className="w-12 h-12 mx-auto mb-2 opacity-30 text-indigo-600" />
            <p className="font-bold text-sm">No promotional offers active</p>
            <p className="text-xs mt-1" style={{ color: themeColors.muted }}>
              Click &quot;Create Promotion&quot; to configure a Buy X Get Y Free, Bundle, or Complimentary Gift deal.
            </p>
          </div>
        ) : (
          offers.map(offer => (
            <div key={offer.id} className="relative group">
              <OfferCard offer={offer} />
              <div className="absolute top-4 right-4 flex items-center gap-1.5 z-20">
                <button
                  onClick={() => handleEdit(offer)}
                  className="p-2 rounded-lg bg-white/90 dark:bg-neutral-800/90 shadow-md text-neutral-600 hover:text-indigo-600 transition-colors"
                  title="Edit offer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(offer.id)}
                  className="p-2 rounded-lg bg-white/90 dark:bg-neutral-800/90 shadow-md text-neutral-600 hover:text-red-600 transition-colors"
                  title="Delete offer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Guided Offer Modal Editor */}
      {isEditing && currentOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div
            className="w-full max-w-3xl rounded-2xl border shadow-2xl p-6 sm:p-8 my-8 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border, color: themeColors.text }}
          >
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: themeColors.border }}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold">
                  {currentOffer.id ? 'Edit Promotion Rule' : 'Guided Offer Builder'}
                </h3>
              </div>
              <button onClick={() => setIsEditing(false)} className="p-1 text-neutral-400 hover:text-neutral-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5 pt-4 text-xs">
              {/* Step 1: Choose Offer Type */}
              <div>
                <label className="block font-bold mb-2">1. Select Offer Engine Archetype</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'free_product',
                      title: 'Complimentary Gift Bundle',
                      desc: 'Buy Product A, get Product B completely FREE with badge.',
                    },
                    {
                      id: 'free_quantity',
                      title: 'Buy X, Get Y Free',
                      desc: 'Buy specified units of a product, receive extra free units.',
                    },
                    {
                      id: 'bundle',
                      title: 'Curated Bundle Deal',
                      desc: 'Group 2+ items together at a discount or custom package price.',
                    },
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setCurrentOffer({ ...currentOffer, type: t.id as OfferType })}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        currentOffer.type === t.id
                          ? 'border-indigo-600 ring-2 ring-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                          : 'hover:border-neutral-400'
                      }`}
                      style={{ borderColor: currentOffer.type === t.id ? undefined : themeColors.border }}
                    >
                      <span className="font-bold text-xs" style={{ color: themeColors.text }}>{t.title}</span>
                      <span className="text-[11px] mt-1" style={{ color: themeColors.muted }}>{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Name & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Offer Title *</label>
                  <input
                    type="text"
                    required
                    value={currentOffer.name || ''}
                    onChange={e => setCurrentOffer({ ...currentOffer, name: e.target.value })}
                    placeholder="e.g. Creator Audio Package or Summer Buy 2 Get 1"
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                    style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Badge Text</label>
                  <input
                    type="text"
                    value={currentOffer.badgeText || ''}
                    onChange={e => setCurrentOffer({ ...currentOffer, badgeText: e.target.value })}
                    placeholder="e.g. Free Gift Bundle, Limited Time, Buy 1 Get 1"
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                    style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                  />
                </div>
              </div>

              {/* Step 3: Primary Product Selection */}
              <div>
                <label className="block font-semibold mb-1">
                  Primary Product(s) {currentOffer.type === 'bundle' ? '(Select multiple)' : '(Main item)'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
                  {products.map(p => {
                    const isSelected = currentOffer.primaryProductIds?.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          if (currentOffer.type === 'bundle') {
                            const exists = currentOffer.primaryProductIds || [];
                            const updated = isSelected ? exists.filter(x => x !== p.id) : [...exists, p.id];
                            setCurrentOffer({ ...currentOffer, primaryProductIds: updated });
                          } else {
                            setCurrentOffer({ ...currentOffer, primaryProductIds: [p.id] });
                          }
                        }}
                        className={`p-2 rounded-xl border text-left flex items-center gap-2 text-xs truncate ${
                          isSelected ? 'bg-indigo-600 text-white border-indigo-600 font-bold' : ''
                        }`}
                        style={{ borderColor: isSelected ? undefined : themeColors.border }}
                      >
                        <span className="truncate">{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantities & Reward product config */}
              {currentOffer.type === 'free_quantity' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Required Purchase Qty (X)</label>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={currentOffer.primaryQuantity ?? 2}
                      onChange={e => setCurrentOffer({ ...currentOffer, primaryQuantity: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border text-xs"
                      style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Complimentary Free Qty (Y)</label>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={currentOffer.rewardQuantity ?? 1}
                      onChange={e => setCurrentOffer({ ...currentOffer, rewardQuantity: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border text-xs"
                      style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                    />
                  </div>
                </div>
              )}

              {currentOffer.type === 'free_product' && (
                <div>
                  <label className="block font-semibold mb-1">Select Free Gift Product (Given 100% Free)</label>
                  <select
                    value={currentOffer.rewardProductIds?.[0] || ''}
                    onChange={e => setCurrentOffer({ ...currentOffer, rewardProductIds: [e.target.value] })}
                    className="w-full px-3 py-2 rounded-xl border text-xs"
                    style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatPrice(p.price)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {currentOffer.type === 'bundle' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Pricing Rule</label>
                    <select
                      value={currentOffer.pricingRule || 'percentage_discount'}
                      onChange={e => setCurrentOffer({ ...currentOffer, pricingRule: e.target.value as OfferPricingRule })}
                      className="w-full px-3 py-2 rounded-xl border text-xs"
                      style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                    >
                      <option value="percentage_discount">Option B: Percentage Discount</option>
                      <option value="custom_price">Option C: Fixed Bundle Price</option>
                      <option value="combined_original">Option A: Full Combined Price</option>
                    </select>
                  </div>

                  {currentOffer.pricingRule !== 'combined_original' && (
                    <div>
                      <label className="block font-semibold mb-1">
                        {currentOffer.pricingRule === 'percentage_discount' ? 'Discount % (e.g. 20)' : 'Fixed Total Price'}
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={currentOffer.pricingValue ?? 15}
                        onChange={e => setCurrentOffer({ ...currentOffer, pricingValue: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl border text-xs"
                        style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Visual Composition Preset */}
              <div>
                <label className="block font-semibold mb-1">Visual Composition Preset (Section 21)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {displayStyles.map(ds => (
                    <button
                      key={ds.id}
                      type="button"
                      onClick={() => setCurrentOffer({ ...currentOffer, displayStyle: ds.id })}
                      className={`p-2 rounded-xl border text-center text-xs font-semibold ${
                        currentOffer.displayStyle === ds.id ? 'bg-indigo-600 text-white border-indigo-600' : ''
                      }`}
                      style={{ borderColor: currentOffer.displayStyle === ds.id ? undefined : themeColors.border }}
                    >
                      {ds.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Customer Description</label>
                <input
                  type="text"
                  value={currentOffer.description || ''}
                  onChange={e => setCurrentOffer({ ...currentOffer, description: e.target.value })}
                  placeholder="e.g. Order today to unlock complimentary travel case with every unit!"
                  className="w-full px-3 py-2 rounded-xl border text-xs outline-none"
                  style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t" style={{ borderColor: themeColors.border }}>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl border font-semibold"
                  style={{ borderColor: themeColors.border }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 rounded-xl font-bold text-white shadow-xs"
                  style={{ backgroundColor: themeColors.primary }}
                >
                  {saving ? 'Saving Offer...' : 'Save Promotion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
