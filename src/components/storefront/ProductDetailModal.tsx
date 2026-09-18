import React, { useState } from 'react';
import { X, ShoppingBag, Check, ShieldCheck, Truck, Sparkles, Tag, Plus, Minus } from 'lucide-react';
import { Product } from '../../types/store';
import { useStore } from '../../context/StoreContext';
import { calculateProductPrice } from '../../engine/pricing/pricingEngine';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose }) => {
  const { themeColors, formatPrice, addToCart, offers, categories, config } = useStore();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  if (!product) return null;

  const { unitPrice, originalPrice, discountPercent, savings } = calculateProductPrice(product);
  const isOutOfStock = product.stock <= 0;

  // Find relevant offers
  const relevantOffers = offers.filter(
    o => o.status === 'active' && (o.primaryProductIds.includes(product.id) || o.rewardProductIds.includes(product.id))
  );

  const productCategories = categories.filter(c => product.categoryIds?.includes(c.id));
  const images = product.images?.length > 0 ? product.images : [];
  const currentImage = images[selectedImageIndex] || images[0] || '';

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToCart(product.id, quantity);
    onClose();
  };

  return (
    <div
      id="product-detail-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-xs transition-all"
      onClick={onClose}
    >
      <div
        id="product-detail-dialog"
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col md:flex-row"
        style={{
          backgroundColor: themeColors.surface,
          color: themeColors.text,
          borderColor: themeColors.border,
        }}
      >
        {/* Close Button */}
        <button
          id="close-product-modal-btn"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-neutral-150 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 transition-all"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Gallery Column */}
        <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r" style={{ borderColor: themeColors.border }}>
          <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-neutral-50 dark:bg-neutral-900 border flex items-center justify-center" style={{ borderColor: themeColors.border }}>
            {currentImage ? (
              <img
                src={currentImage}
                alt={product.name}
                className="w-full h-full object-contain p-4 transition-transform duration-300"
              />
            ) : (
              <div className="text-center p-6 text-neutral-400">
                <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No media preview available</p>
              </div>
            )}
            {discountPercent > 0 && (
              <div className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-xs">
                Save {discountPercent}%
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`w-14 h-14 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                    selectedImageIndex === idx ? 'ring-2' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    borderColor: selectedImageIndex === idx ? themeColors.primary : themeColors.border,
                  }}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details Column */}
        <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto max-h-[550px] md:max-h-none">
          <div className="space-y-4">
            {/* Categories & SKU */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {productCategories.map(cat => (
                <span
                  key={cat.id}
                  className="px-2.5 py-0.5 rounded-full font-semibold"
                  style={{
                    backgroundColor: `${themeColors.primary}15`,
                    color: themeColors.primary,
                  }}
                >
                  {cat.name}
                </span>
              ))}
              {product.sku && (
                <span className="text-neutral-400 font-mono">SKU: {product.sku}</span>
              )}
            </div>

            {/* Title */}
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: themeColors.text }}>
              {product.name}
            </h2>

            {/* Price Row */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black" style={{ color: themeColors.primary }}>
                {formatPrice(unitPrice)}
              </span>
              {discountPercent > 0 && (
                <span className="text-base line-through font-medium" style={{ color: themeColors.muted }}>
                  {formatPrice(originalPrice)}
                </span>
              )}
              {savings > 0 && (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  (You save {formatPrice(savings)})
                </span>
              )}
            </div>

            {/* Stock indicator */}
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span
                className={`w-2 h-2 rounded-full ${
                  isOutOfStock ? 'bg-red-500' : product.stock < 5 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              />
              <span style={{ color: isOutOfStock ? '#ef4444' : themeColors.text }}>
                {isOutOfStock
                  ? 'Currently Out of Stock'
                  : product.stock < 5
                  ? `Hurry! Only ${product.stock} units remaining`
                  : 'In Stock & Ready to Ship'}
              </span>
            </div>

            {/* Description */}
            <div className="pt-2 border-t" style={{ borderColor: themeColors.border }}>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: themeColors.muted }}>
                Product Overview
              </h4>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: themeColors.muted }}>
                {product.description || 'Crafted with premium specifications according to store standards.'}
              </p>
            </div>

            {/* Applicable Offers Callout */}
            {relevantOffers.length > 0 && (
              <div
                className="p-3.5 rounded-xl border flex flex-col gap-2"
                style={{
                  backgroundColor: `${themeColors.secondary}10`,
                  borderColor: `${themeColors.secondary}30`,
                }}
              >
                <div className="flex items-center gap-2 text-xs font-bold" style={{ color: themeColors.secondary }}>
                  <Tag className="w-4 h-4" />
                  <span>Available Promotional Offer</span>
                </div>
                {relevantOffers.map(off => (
                  <p key={off.id} className="text-xs font-medium" style={{ color: themeColors.text }}>
                    ★ <span className="font-bold">{off.name}:</span> {off.description || 'Special package pricing available at checkout.'}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Add to Cart Actions */}
          <div className="pt-6 mt-6 border-t space-y-3" style={{ borderColor: themeColors.border }}>
            <div className="flex items-center gap-3">
              {/* Quantity Counter */}
              <div
                className="flex items-center border rounded-xl overflow-hidden h-12"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface }}
              >
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || isOutOfStock}
                  className="px-3 h-full hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center font-bold text-sm">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => Math.min(product.stock || 99, q + 1))}
                  disabled={quantity >= product.stock || isOutOfStock}
                  className="px-3 h-full hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Add to Cart CTA */}
              <button
                id="modal-add-to-cart-btn"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="flex-1 h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-40"
                style={{ backgroundColor: themeColors.primary }}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>
                  {isOutOfStock ? 'Sold Out' : `Add to Cart • ${formatPrice(unitPrice * quantity)}`}
                </span>
              </button>
            </div>

            {/* Delivery Trust Note */}
            <div className="flex items-center justify-between text-[11px] pt-1" style={{ color: themeColors.muted }}>
              <span className="flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-emerald-600" />
                {config.deliveryConfig?.estimateText || 'Fast delivery'}
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                Direct verified payment
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
