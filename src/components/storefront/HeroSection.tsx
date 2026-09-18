import React from 'react';
import { ArrowRight, Sparkles, Tag } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { HomepageSection } from '../../types/store';

interface HeroSectionProps {
  section?: HomepageSection;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ section: propSection }) => {
  const { config: storeConfig, themeColors, activeTheme, formatPrice, products } = useStore();
  const section =
    propSection ||
    storeConfig?.homepageSections?.find(s => s.type === 'hero') || {
      id: 'default-hero',
      type: 'hero' as const,
      title: 'Curated Essentials for Every Lifestyle',
      subtitle:
        'Discover thoughtfully crafted collections engineered with premium materials, contemporary styling, and direct delivery.',
      enabled: true,
      config: {},
    };

  const config = section.config || {};

  const featuredProduct = products.find(p => p.featured && p.images?.length > 0) || products[0];

  return (
    <section
      id="hero-section"
      className="relative overflow-hidden py-12 sm:py-20 lg:py-24 transition-colors"
      style={{
        backgroundColor: themeColors.background,
        color: themeColors.text,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Text Content */}
          <div className="lg:col-span-7 flex flex-col items-start space-y-6">
            {config.badgeText && (
              <div
                id="hero-badge"
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase shadow-xs"
                style={{
                  backgroundColor: `${themeColors.primary}15`,
                  color: themeColors.primary,
                  border: `1px solid ${themeColors.primary}30`,
                }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{config.badgeText}</span>
              </div>
            )}

            <h1
              id="hero-heading"
              className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight"
              style={{ color: themeColors.text }}
            >
              {section.title || 'Curated Essentials for Every Lifestyle'}
            </h1>

            <p
              id="hero-subtitle"
              className="text-base sm:text-lg max-w-2xl leading-relaxed"
              style={{ color: themeColors.muted }}
            >
              {section.subtitle ||
                'Discover thoughtfully crafted collections engineered with premium materials, contemporary styling, and direct delivery.'}
            </p>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2">
              <a
                id="hero-cta-primary"
                href={config.ctaPrimaryLink || '#products'}
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-full text-sm font-semibold text-white shadow-sm transition-all hover:opacity-95 active:scale-95"
                style={{
                  backgroundColor: themeColors.primary,
                }}
              >
                <span>{config.ctaPrimaryText || 'Explore Catalog'}</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </a>

              {config.ctaSecondaryText && (
                <a
                  id="hero-cta-secondary"
                  href={config.ctaSecondaryLink || '#offers'}
                  className="inline-flex items-center justify-center px-6 py-3.5 rounded-full text-sm font-semibold border transition-all hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  style={{
                    borderColor: themeColors.border,
                    color: themeColors.text,
                    backgroundColor: themeColors.surface,
                  }}
                >
                  <Tag className="w-4 h-4 mr-2" style={{ color: themeColors.secondary }} />
                  <span>{config.ctaSecondaryText}</span>
                </a>
              )}
            </div>
          </div>

          {/* Visual Showcase / Featured Hero Asset */}
          <div className="lg:col-span-5 flex justify-center">
            <div
              className="relative w-full max-w-md aspect-4/3 sm:aspect-square rounded-2xl overflow-hidden shadow-lg border flex items-center justify-center transition-all"
              style={{
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
              }}
            >
              {config.imageUrl ? (
                <img
                  src={config.imageUrl}
                  alt={section.title}
                  className="w-full h-full object-cover"
                />
              ) : featuredProduct?.images?.[0] ? (
                <div className="relative w-full h-full p-6 flex flex-col justify-between">
                  <div className="absolute top-4 right-4 z-10">
                    <span
                      className="px-2.5 py-1 text-xs font-bold rounded-full shadow-xs"
                      style={{
                        backgroundColor: themeColors.accent,
                        color: '#ffffff',
                      }}
                    >
                      Featured
                    </span>
                  </div>
                  <img
                    src={featuredProduct.images[0]}
                    alt={featuredProduct.name}
                    className="w-full h-full object-contain transition-transform hover:scale-105 duration-300"
                  />
                  <div
                    className="absolute bottom-4 left-4 right-4 p-3 rounded-xl backdrop-blur-md border shadow-sm flex items-center justify-between"
                    style={{
                      backgroundColor: `${themeColors.surface}ee`,
                      borderColor: themeColors.border,
                    }}
                  >
                    <div>
                      <p className="text-xs font-medium text-neutral-400">Spotlight</p>
                      <p className="text-sm font-bold truncate max-w-[180px] sm:max-w-[220px]" style={{ color: themeColors.text }}>
                        {featuredProduct.name}
                      </p>
                    </div>
                    <span className="text-sm font-bold" style={{ color: themeColors.primary }}>
                      {formatPrice(featuredProduct.price)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center p-8">
                  <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-40" style={{ color: themeColors.primary }} />
                  <p className="text-sm font-medium" style={{ color: themeColors.muted }}>
                    Configure hero visual in Admin &gt; Homepage
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
