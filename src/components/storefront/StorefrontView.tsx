import React from 'react';
import { useStore } from '../../context/StoreContext';
import { StoreHeader } from './StoreHeader';
import { HeroSection } from './HeroSection';
import { CategoryBar } from './CategoryBar';
import { ProductGrid } from './ProductGrid';
import { OfferSection } from '../offers/OfferSection';
import { StoreFooter } from './StoreFooter';
import { StoreComingSoon } from './StoreComingSoon';
import { ProductDetailModal } from './ProductDetailModal';
import { CartDrawer } from '../cart/CartDrawer';
import { HelpCircle } from 'lucide-react';

export const StorefrontView: React.FC = () => {
  const {
    config,
    products,
    categories,
    selectedCategoryId,
    searchTerm,
    selectedProduct,
    setSelectedProduct,
    themeColors,
  } = useStore();

  const isStoreEmpty = products.length === 0 && !searchTerm.trim() && !selectedCategoryId;

  // Filter products by category and search
  const filteredProducts = products.filter(product => {
    if (product.status !== 'active') return false;

    const matchesCat =
      !selectedCategoryId || product.categoryIds?.includes(selectedCategoryId);

    const matchesSearch =
      !searchTerm.trim() ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCat && matchesSearch;
  });

  const featuredProducts = filteredProducts.filter(p => p.featured);
  const activeCategory = categories.find(c => c.id === selectedCategoryId);

  // Read homepage sections config
  const sections = config.homepageSections || [];
  const heroConfig = sections.find(s => s.type === 'hero');
  const promoConfig = sections.find(s => s.type === 'promotions');
  const featuredConfig = sections.find(s => s.type === 'featured_products');
  const faqConfig = sections.find(s => s.type === 'faq');

  return (
    <div
      id="storefront-container"
      className="min-h-screen flex flex-col transition-colors duration-300"
      style={{
        backgroundColor: themeColors.background,
        color: themeColors.text,
      }}
    >
      {/* Header */}
      <StoreHeader />

      {/* If the store is completely empty (zero products uploaded yet), show polished Coming Soon */}
      {isStoreEmpty ? (
        <StoreComingSoon />
      ) : (
        <>
          {/* Hero section */}
          {heroConfig?.enabled !== false && !selectedCategoryId && !searchTerm && (
            <HeroSection section={heroConfig} />
          )}

          {/* Category navigation bar */}
          {categories.length > 0 && <CategoryBar />}

          {/* Main Catalog Body */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12 sm:space-y-16">
            {/* Promotional Offers Section */}
            {promoConfig?.enabled !== false && !selectedCategoryId && !searchTerm && (
              <OfferSection />
            )}

            {/* Featured Products Section (If not searching or filtering) */}
            {featuredConfig?.enabled !== false &&
              !selectedCategoryId &&
              !searchTerm &&
              featuredProducts.length > 0 && (
                <ProductGrid
                  products={featuredProducts}
                  title="Featured Essentials"
                  subtitle="Hand-picked items selected for premium craftsmanship and design."
                />
              )}

            {/* Main Product Catalog */}
            <ProductGrid
              products={filteredProducts}
              title={
                searchTerm
                  ? `Search Results for "${searchTerm}"`
                  : activeCategory
                  ? activeCategory.name
                  : 'Complete Catalog'
              }
              subtitle={
                activeCategory?.description ||
                (searchTerm
                  ? `Displaying matching items in current store`
                  : `Explore all products with authentic direct payment verification`)
              }
            />

            {/* FAQ Section */}
            {faqConfig?.enabled !== false && !selectedCategoryId && !searchTerm && (
              <section
                id="store-faq-section"
                className="p-8 sm:p-12 rounded-3xl border space-y-6"
                style={{
                  backgroundColor: themeColors.surface,
                  borderColor: themeColors.border,
                }}
              >
                <div className="max-w-xl">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 mb-1">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Frequently Asked Questions</span>
                  </span>
                  <h2 className="text-2xl font-black tracking-tight" style={{ color: themeColors.text }}>
                    How Direct Store Payments Work
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 text-xs">
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-sm" style={{ color: themeColors.text }}>
                      How do I pay for my order?
                    </h4>
                    <p className="leading-relaxed" style={{ color: themeColors.muted }}>
                      During checkout, select your preferred direct destination (such as JazzCash, Easypaisa, Raast, or Bank IBAN). Transfer the order total and enter your transaction ID or receipt screenshot.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-bold text-sm" style={{ color: themeColors.text }}>
                      Are credit cards or payment gateways required?
                    </h4>
                    <p className="leading-relaxed" style={{ color: themeColors.muted }}>
                      No. Payments are made directly to the store owner&apos;s verified accounts without intermediaries, making transactions fast, secure, and transparent.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-bold text-sm" style={{ color: themeColors.text }}>
                      How are promotions and bundle gifts calculated?
                    </h4>
                    <p className="leading-relaxed" style={{ color: themeColors.muted }}>
                      All promotional offers (such as Buy X Get Y Free, Curated Bundles, or Complimentary Gift items) are automatically evaluated and applied by our authoritative pricing engine at checkout.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-bold text-sm" style={{ color: themeColors.text }}>
                      When will my parcel be dispatched?
                    </h4>
                    <p className="leading-relaxed" style={{ color: themeColors.muted }}>
                      Once your transfer is confirmed by store administration, your package is prepared and dispatched according to our nationwide delivery timeline.
                    </p>
                  </div>
                </div>
              </section>
            )}
          </main>
        </>
      )}

      {/* Footer */}
      <StoreFooter />

      {/* Modals and Drawers */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      <CartDrawer />
    </div>
  );
};
