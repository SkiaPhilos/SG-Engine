import React from 'react';
import { ShieldCheck, Truck, Lock } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const StoreFooter: React.FC = () => {
  const { config, paymentMethods, themeColors } = useStore();

  const activeMethods = paymentMethods.filter(p => p.enabled);

  return (
    <footer
      id="store-footer"
      className="border-t mt-16 sm:mt-24 transition-colors"
      style={{
        backgroundColor: themeColors.surface,
        borderColor: themeColors.border,
        color: themeColors.text,
      }}
    >
      {/* Value props banner */}
      <div className="border-b py-8" style={{ borderColor: themeColors.border }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="flex items-center gap-3.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
              style={{ backgroundColor: themeColors.primary }}
            >
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider">Fast Delivery</h4>
              <p className="text-xs mt-0.5" style={{ color: themeColors.muted }}>
                {config.deliveryConfig?.estimateText || '2-4 business days nationwide'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
              style={{ backgroundColor: themeColors.secondary }}
            >
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider">Direct Verified Payments</h4>
              <p className="text-xs mt-0.5" style={{ color: themeColors.muted }}>
                Direct bank transfers &amp; mobile wallets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
              style={{ backgroundColor: themeColors.accent }}
            >
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider">Safe &amp; Authentic</h4>
              <p className="text-xs mt-0.5" style={{ color: themeColors.muted }}>
                100% genuine guaranteed items
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8 text-xs">
        {/* Brand identity */}
        <div className="space-y-3 md:col-span-2">
          <div className="flex items-center gap-2">
            {config.logoUrl ? (
              <img src={config.logoUrl} alt={config.storeName} className="h-7 w-auto object-contain" />
            ) : null}
            <span className="text-lg font-black tracking-tight" style={{ color: themeColors.text }}>
              {config.storeName}
            </span>
          </div>
          <p className="max-w-sm text-xs leading-relaxed" style={{ color: themeColors.muted }}>
            {config.storeDescription || 'A reusable, configurable e-commerce store engine with dynamic theme presets, offer and bundle engine, product management, and direct payment destinations.'}
          </p>

          {/* Payment destinations badges */}
          {activeMethods.length > 0 && (
            <div className="pt-2">
              <span className="text-[11px] font-bold text-neutral-400 block mb-2">
                Supported Direct Payment Rails:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {activeMethods.map(m => (
                  <span
                    key={m.id}
                    className="px-2.5 py-1 rounded-md text-[10px] font-bold border"
                    style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                  >
                    {m.displayName}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Contact info */}
        <div className="space-y-2">
          <h4 className="font-bold uppercase tracking-wider text-xs" style={{ color: themeColors.text }}>
            Customer Care
          </h4>
          <p style={{ color: themeColors.muted }}>Email: {config.contactEmail || 'support@store.com'}</p>
          <p style={{ color: themeColors.muted }}>Phone: {config.contactPhone || '+92 300 1234567'}</p>
          {config.whatsappNumber && (
            <p style={{ color: themeColors.muted }}>WhatsApp: {config.whatsappNumber}</p>
          )}
        </div>

        {/* Order Policies & Assurance */}
        <div className="space-y-2">
          <h4 className="font-bold uppercase tracking-wider text-xs" style={{ color: themeColors.text }}>
            Shopping Assurance
          </h4>
          <p style={{ color: themeColors.muted }}>
            Direct payment verification, secure order tracking, and dedicated customer support for all nationwide deliveries.
          </p>
          <p className="text-[11px] font-medium pt-1" style={{ color: themeColors.primary }}>
            Guaranteed genuine products &amp; hassle-free fulfillment.
          </p>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t py-4 text-center text-[11px]" style={{ borderColor: themeColors.border, color: themeColors.muted }}>
        <p>© {new Date().getFullYear()} {config.storeName || 'Store'}. All rights reserved.</p>
      </div>
    </footer>
  );
};
