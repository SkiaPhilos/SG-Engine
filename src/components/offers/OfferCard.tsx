import React from 'react';
import { Plus, Gift, Sparkles, Tag, ShoppingBag, ArrowRight } from 'lucide-react';
import { Offer, Product } from '../../types/store';
import { useStore } from '../../context/StoreContext';
import { calculateProductPrice } from '../../engine/pricing/pricingEngine';

interface OfferCardProps {
  offer: Offer;
}

export const OfferCard: React.FC<OfferCardProps> = ({ offer }) => {
  const { products, themeColors, formatPrice, addToCart, setIsCartOpen } = useStore();

  const primaryProducts = products.filter(p => offer.primaryProductIds?.includes(p.id));
  const rewardProducts = products.filter(p => offer.rewardProductIds?.includes(p.id));

  // Compute pricing preview
  const primaryCombined = primaryProducts.reduce((acc, p) => acc + calculateProductPrice(p).unitPrice, 0);
  const rewardCombined = rewardProducts.reduce((acc, p) => acc + calculateProductPrice(p).unitPrice, 0);
  const fullRegularTotal = primaryCombined + rewardCombined;

  let offerPrice = fullRegularTotal;
  let savings = 0;

  if (offer.type === 'free_product') {
    offerPrice = primaryCombined;
    savings = rewardCombined;
  } else if (offer.type === 'free_quantity') {
    const unitPrice = primaryProducts[0] ? calculateProductPrice(primaryProducts[0]).unitPrice : 0;
    offerPrice = unitPrice * (offer.primaryQuantity || 1);
    savings = unitPrice * (offer.rewardQuantity || 1);
  } else if (offer.type === 'bundle') {
    if (offer.pricingRule === 'percentage_discount' && offer.pricingValue) {
      savings = Math.round(primaryCombined * (offer.pricingValue / 100));
      offerPrice = primaryCombined - savings;
    } else if (offer.pricingRule === 'custom_price' && offer.pricingValue !== undefined) {
      offerPrice = offer.pricingValue;
      savings = Math.max(0, primaryCombined - offerPrice);
    }
  }

  const handleClaimOffer = () => {
    // Add all primary products
    if (offer.type === 'free_quantity') {
      if (primaryProducts[0]) {
        addToCart(primaryProducts[0].id, offer.primaryQuantity, offer.id);
      }
    } else if (offer.type === 'bundle') {
      primaryProducts.forEach(p => {
        addToCart(p.id, 1, offer.id);
      });
    } else if (offer.type === 'free_product') {
      primaryProducts.forEach(p => {
        addToCart(p.id, offer.primaryQuantity || 1, offer.id);
      });
    }
    setIsCartOpen(true);
  };

  const primaryImage = primaryProducts[0]?.images?.[0] || '';
  const rewardImage = rewardProducts[0]?.images?.[0] || primaryProducts[1]?.images?.[0] || '';

  // Visual Composition Presets
  return (
    <div
      id={`offer-card-${offer.id}`}
      className="relative rounded-2xl border p-5 sm:p-6 flex flex-col justify-between overflow-hidden shadow-sm transition-all hover:shadow-md"
      style={{
        backgroundColor: themeColors.surface,
        borderColor: themeColors.border,
      }}
    >
      {/* Top Banner Tag */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-xs"
          style={{
            backgroundColor: themeColors.primary,
            color: '#ffffff',
          }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          {offer.badgeText || (offer.type === 'free_product' ? 'Free Gift Bundle' : 'Special Offer')}
        </span>

        {savings > 0 && (
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            Save {formatPrice(savings)}
          </span>
        )}
      </div>

      {/* Offer Title & Info */}
      <div className="mb-4">
        <h3 className="text-lg sm:text-xl font-black tracking-tight" style={{ color: themeColors.text }}>
          {offer.name}
        </h3>
        <p className="text-xs sm:text-sm mt-1" style={{ color: themeColors.muted }}>
          {offer.description ||
            (offer.type === 'free_quantity'
              ? `Buy ${offer.primaryQuantity}, Get ${offer.rewardQuantity} Free`
              : offer.type === 'free_product'
              ? `Buy ${primaryProducts[0]?.name || 'Primary Product'} & receive complimentary gift!`
              : 'Curated bundled products with exclusive pricing.')}
        </p>
      </div>

      {/* Visual Composition Stage: Floating / Offset Product Cutouts */}
      <div className="relative py-6 my-2 flex items-center justify-center min-h-[160px] bg-neutral-50 dark:bg-neutral-900 rounded-xl overflow-hidden border" style={{ borderColor: themeColors.border }}>
        {offer.type === 'free_product' && primaryImage && rewardImage ? (
          <div className="relative flex items-center justify-center gap-3">
            {/* Primary Product */}
            <div className="w-24 sm:w-28 aspect-square rounded-xl bg-white dark:bg-neutral-800 p-2 shadow-sm border flex items-center justify-center transition-transform hover:-translate-y-1" style={{ borderColor: themeColors.border }}>
              <img src={primaryImage} alt="" className="w-full h-full object-contain" />
            </div>

            {/* Plus operator */}
            <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300 font-bold z-10 shadow-xs">
              <Plus className="w-4 h-4" />
            </div>

            {/* Reward Product with offset and FREE badge */}
            <div className="relative w-24 sm:w-28 aspect-square rounded-xl bg-white dark:bg-neutral-800 p-2 shadow-md border flex items-center justify-center translate-y-3 transition-transform hover:translate-y-2" style={{ borderColor: themeColors.secondary }}>
              <img src={rewardImage} alt="" className="w-full h-full object-contain" />
              <span className="absolute -bottom-2 -right-2 bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm uppercase tracking-wide">
                FREE
              </span>
            </div>
          </div>
        ) : offer.type === 'free_quantity' ? (
          <div className="flex flex-col items-center justify-center text-center p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl font-black px-3 py-1 rounded-lg" style={{ backgroundColor: `${themeColors.primary}15`, color: themeColors.primary }}>
                Buy {offer.primaryQuantity}
              </span>
              <span className="text-lg font-bold text-neutral-400">+</span>
              <span className="text-2xl font-black px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Get {offer.rewardQuantity} Free
              </span>
            </div>
            {primaryProducts[0] && (
              <p className="text-xs font-semibold" style={{ color: themeColors.text }}>
                Applies on: {primaryProducts[0].name}
              </p>
            )}
          </div>
        ) : (
          /* General Bundle showcase */
          <div className="flex items-center justify-center gap-2 p-2">
            {primaryProducts.slice(0, 3).map((p, idx) => (
              <React.Fragment key={p.id}>
                {idx > 0 && <Plus className="w-4 h-4 text-neutral-400 flex-shrink-0" />}
                <div className="w-20 aspect-square rounded-lg bg-white dark:bg-neutral-800 p-1.5 shadow-xs border flex items-center justify-center" style={{ borderColor: themeColors.border }}>
                  <img src={p.images?.[0] || ''} alt={p.name} className="w-full h-full object-contain" />
                </div>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Price & Claim CTA */}
      <div className="mt-4 pt-4 border-t flex items-center justify-between gap-3" style={{ borderColor: themeColors.border }}>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black" style={{ color: themeColors.primary }}>
              {formatPrice(offerPrice)}
            </span>
            {savings > 0 && (
              <span className="text-xs line-through" style={{ color: themeColors.muted }}>
                {formatPrice(fullRegularTotal)}
              </span>
            )}
          </div>
          <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            Instant bundle savings applied
          </p>
        </div>

        <button
          id={`claim-offer-btn-${offer.id}`}
          onClick={handleClaimOffer}
          className="px-4 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
          style={{ backgroundColor: themeColors.primary }}
        >
          <Gift className="w-3.5 h-3.5" />
          <span>Claim Offer</span>
        </button>
      </div>
    </div>
  );
};
