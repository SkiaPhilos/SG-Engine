import React from 'react';
import { ShoppingBag, Eye, Percent, Check } from 'lucide-react';
import { Product, ProductDisplayPreset } from '../../types/store';
import { useStore } from '../../context/StoreContext';
import { calculateProductPrice } from '../../engine/pricing/pricingEngine';

interface ProductCardProps {
  product: Product;
  preset?: ProductDisplayPreset;
  onSelect?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  preset = 'standard-grid',
  onSelect,
}) => {
  const { themeColors, formatPrice, addToCart, setSelectedProduct } = useStore();
  const { unitPrice, originalPrice, discountPercent, savings } = calculateProductPrice(product);

  const primaryImage = product.images?.[product.primaryImageIndex || 0] || product.images?.[0] || '';
  const isOutOfStock = product.stock <= 0;

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(product);
    } else {
      setSelectedProduct(product);
    }
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    addToCart(product.id, 1);
  };

  // Render presets
  if (preset === 'compact') {
    return (
      <div
        id={`product-card-${product.id}`}
        onClick={handleCardClick}
        className="group flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm cursor-pointer"
        style={{
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
        }}
      >
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 flex-shrink-0 relative">
          {primaryImage ? (
            <img src={primaryImage} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-300 text-xs font-medium">
              No photo
            </div>
          )}
          {discountPercent > 0 && (
            <span className="absolute top-1 left-1 bg-red-600 text-white text-[10px] font-bold px-1 rounded-sm">
              -{discountPercent}%
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate" style={{ color: themeColors.text }}>
            {product.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-sm font-bold" style={{ color: themeColors.primary }}>
              {formatPrice(unitPrice)}
            </span>
            {discountPercent > 0 && (
              <span className="text-xs line-through" style={{ color: themeColors.muted }}>
                {formatPrice(originalPrice)}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={handleQuickAdd}
          disabled={isOutOfStock}
          className="p-2 rounded-lg transition-transform active:scale-90"
          style={{
            backgroundColor: isOutOfStock ? themeColors.border : themeColors.primary,
            color: '#ffffff',
          }}
          title="Add to cart"
        >
          <ShoppingBag className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (preset === 'minimal') {
    return (
      <div
        id={`product-card-${product.id}`}
        onClick={handleCardClick}
        className="group flex flex-col cursor-pointer transition-opacity hover:opacity-90"
      >
        <div className="aspect-square w-full overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800 relative mb-3">
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">
              No Image
            </div>
          )}
          {discountPercent > 0 && (
            <div className="absolute top-2 left-2 bg-neutral-900 text-white text-[11px] font-medium px-2 py-0.5 rounded-full">
              Save {discountPercent}%
            </div>
          )}
        </div>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-medium" style={{ color: themeColors.text }}>
              {product.name}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: themeColors.muted }}>
              {isOutOfStock ? 'Sold out' : `${product.stock} in stock`}
            </p>
          </div>
          <span className="text-sm font-semibold" style={{ color: themeColors.text }}>
            {formatPrice(unitPrice)}
          </span>
        </div>
      </div>
    );
  }

  // Standard Grid / Modern / Large Cards / Editorial default layout
  return (
    <div
      id={`product-card-${product.id}`}
      onClick={handleCardClick}
      className={`group relative flex flex-col rounded-2xl border transition-all duration-300 hover:shadow-md cursor-pointer overflow-hidden ${
        preset === 'large-cards' ? 'p-5' : 'p-4'
      }`}
      style={{
        backgroundColor: themeColors.surface,
        borderColor: themeColors.border,
      }}
    >
      {/* Badges container */}
      <div className="absolute top-6 left-6 z-10 flex flex-col gap-1.5 pointer-events-none">
        {discountPercent > 0 && (
          <span className="inline-flex items-center gap-1 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-xs">
            <Percent className="w-3 h-3" />
            {discountPercent}% OFF
          </span>
        )}
        {product.featured && (
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${themeColors.secondary}20`,
              color: themeColors.secondary,
            }}
          >
            Featured
          </span>
        )}
      </div>

      {/* Product Image Stage */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-850 mb-4 flex items-center justify-center">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={product.name}
            className="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-neutral-400 p-4 text-center">
            <ShoppingBag className="w-8 h-8 mb-1 stroke-1" />
            <span className="text-xs font-medium">Asset Not Uploaded</span>
          </div>
        )}

        {/* Hover Quick Action Buttons */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
          <button
            onClick={e => {
              e.stopPropagation();
              setSelectedProduct(product);
            }}
            className="p-2.5 bg-white text-neutral-800 rounded-full shadow-md hover:bg-neutral-100 active:scale-95 transition-all"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          {!isOutOfStock && (
            <button
              onClick={handleQuickAdd}
              className="p-2.5 rounded-full text-white shadow-md active:scale-95 transition-all"
              style={{ backgroundColor: themeColors.primary }}
              title="Add to cart"
            >
              <ShoppingBag className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Meta Information */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h3
            className="font-bold text-base line-clamp-1 group-hover:text-primary transition-colors"
            style={{ color: themeColors.text }}
          >
            {product.name}
          </h3>
          {product.description && (
            <p className="text-xs mt-1 line-clamp-2" style={{ color: themeColors.muted }}>
              {product.description}
            </p>
          )}
        </div>

        {/* Price & Action Row */}
        <div className="mt-4 pt-3 border-t flex items-center justify-between" style={{ borderColor: themeColors.border }}>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-extrabold" style={{ color: themeColors.primary }}>
                {formatPrice(unitPrice)}
              </span>
              {discountPercent > 0 && (
                <span className="text-xs line-through font-medium" style={{ color: themeColors.muted }}>
                  {formatPrice(originalPrice)}
                </span>
              )}
            </div>
            <p className="text-[11px] font-medium mt-0.5" style={{ color: isOutOfStock ? '#dc2626' : themeColors.muted }}>
              {isOutOfStock ? 'Out of Stock' : `${product.stock} available`}
            </p>
          </div>

          <button
            onClick={handleQuickAdd}
            disabled={isOutOfStock}
            className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
            style={{
              backgroundColor: isOutOfStock ? themeColors.border : themeColors.primary,
              color: isOutOfStock ? themeColors.muted : '#ffffff',
            }}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{isOutOfStock ? 'Sold Out' : 'Add'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
