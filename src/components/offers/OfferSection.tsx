import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { OfferCard } from './OfferCard';

export const OfferSection: React.FC = () => {
  const { offers, themeColors } = useStore();
  const activeOffers = offers.filter(o => o.status === 'active');

  if (activeOffers.length === 0) return null;

  return (
    <section id="store-promotions-section" className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-1" style={{ color: themeColors.primary }}>
            <Sparkles className="w-3.5 h-3.5" />
            <span>Limited Time Packages</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: themeColors.text }}>
            Exclusive Bundle &amp; Promotional Deals
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {activeOffers.map(offer => (
          <OfferCard key={offer.id} offer={offer} />
        ))}
      </div>
    </section>
  );
};
