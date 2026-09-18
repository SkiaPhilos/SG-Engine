import React from 'react';
import { useStore } from '../../context/StoreContext';
import { Sparkles, Mail, Phone, MessageCircle } from 'lucide-react';

export const StoreComingSoon: React.FC = () => {
  const { config, themeColors } = useStore();

  const storeTitle = config.storeName || 'Online Store';
  const description =
    config.storeDescription ||
    'Our catalog is currently being prepared. We are crafting a curated shopping experience with direct delivery.';

  return (
    <div
      id="store-coming-soon"
      className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-24 text-center"
      style={{
        backgroundColor: themeColors.background,
        color: themeColors.text,
      }}
    >
      <div className="max-w-xl mx-auto space-y-8">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase shadow-xs"
          style={{
            backgroundColor: `${themeColors.primary}15`,
            color: themeColors.primary,
            border: `1px solid ${themeColors.primary}30`,
          }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Catalog In Preparation</span>
        </div>

        {/* Store Title & Description */}
        <div className="space-y-4">
          <h1
            className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight"
            style={{ color: themeColors.text }}
          >
            {storeTitle}
          </h1>
          <p
            className="text-base sm:text-lg leading-relaxed max-w-md mx-auto"
            style={{ color: themeColors.muted }}
          >
            {description}
          </p>
        </div>

        {/* Contact info if configured */}
        {(config.contact?.email || config.contact?.phone || config.contact?.whatsapp) && (
          <div
            className="p-6 rounded-2xl border space-y-3 max-w-md mx-auto"
            style={{
              backgroundColor: themeColors.surface,
              borderColor: themeColors.border,
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: themeColors.muted }}>
              For inquiries & direct orders
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
              {config.contact?.email && (
                <a
                  href={`mailto:${config.contact.email}`}
                  className="inline-flex items-center gap-1.5 hover:underline font-medium"
                  style={{ color: themeColors.text }}
                >
                  <Mail className="w-3.5 h-3.5 text-primary" />
                  <span>{config.contact.email}</span>
                </a>
              )}
              {config.contact?.phone && (
                <a
                  href={`tel:${config.contact.phone}`}
                  className="inline-flex items-center gap-1.5 hover:underline font-medium"
                  style={{ color: themeColors.text }}
                >
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  <span>{config.contact.phone}</span>
                </a>
              )}
              {config.contact?.whatsapp && (
                <a
                  href={`https://wa.me/${config.contact.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 hover:underline font-medium"
                  style={{ color: themeColors.text }}
                >
                  <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                  <span>WhatsApp</span>
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
