import React from 'react';
import { useStore } from '../../context/StoreContext';
import { ProductCard } from './ProductCard';
import { Product } from '../../types/store';
import { ShoppingBag } from 'lucide-react';

interface ProductGridProps {
  products: Product[];
  title?: string;
  subtitle?: string;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  title = 'Catalog Collection',
  subtitle,
}) => {
  const { config, themeColors } = useStore();
  const preset = config.productDisplayPreset || 'standard-grid';

  const getGridClasses = () => {
    switch (preset) {
      case 'compact':
        return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3';
      case 'large-cards':
        return 'grid grid-cols-1 md:grid-cols-2 gap-8';
      case 'minimal':
        return 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6';
      case 'editorial':
        return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8';
      case 'bento':
        return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[280px]';
      case 'modern':
      case 'standard-grid':
      default:
        return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6';
    }
  };

  if (products.length === 0) {
    return (
      <div
        id="empty-products-state"
        className="py-16 text-center max-w-md mx-auto p-8 rounded-2xl border"
        style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface }}
      >
        <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-600" />
        <h3 className="font-bold text-base" style={{ color: themeColors.text }}>
          No Products Found
        </h3>
        <p className="text-xs mt-1" style={{ color: themeColors.muted }}>
          Try clearing your search query or selecting a different category from the navigation bar.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: themeColors.text }}>
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm mt-1" style={{ color: themeColors.muted }}>
              {subtitle}
            </p>
          )}
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full border" style={{ borderColor: themeColors.border, color: themeColors.muted }}>
          {products.length} product{products.length === 1 ? '' : 's'}
        </span>
      </div>

      <div id="store-product-grid" className={getGridClasses()}>
        {products.map(product => (
          <ProductCard key={product.id} product={product} preset={preset} />
        ))}
      </div>
    </section>
  );
};
