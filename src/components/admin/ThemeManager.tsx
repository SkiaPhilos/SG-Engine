import React, { useState } from 'react';
import { Palette, Check, LayoutGrid, Sparkles, RefreshCw } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { THEME_PRESETS } from '../../engine/theme/themes';
import { ProductDisplayPreset } from '../../types/store';
import { saveStoreConfig } from '../../services/store/storeService';

export const ThemeManager: React.FC = () => {
  const { config, storeId, themeColors } = useStore();
  const [selectedThemeId, setSelectedThemeId] = useState(config.themeId || 'clean-commerce');
  const [displayPreset, setDisplayPreset] = useState<ProductDisplayPreset>(
    config.productDisplayPreset || 'standard-grid'
  );

  // Custom colors overrides
  const [customPrimary, setCustomPrimary] = useState(config.themeCustomColors?.primary || '');
  const [customSecondary, setCustomSecondary] = useState(config.themeCustomColors?.secondary || '');
  const [customAccent, setCustomAccent] = useState(config.themeCustomColors?.accent || '');
  const [customBackground, setCustomBackground] = useState(config.themeCustomColors?.background || '');
  const [customSurface, setCustomSurface] = useState(config.themeCustomColors?.surface || '');
  const [customText, setCustomText] = useState(config.themeCustomColors?.text || '');

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const displayPresets: { id: ProductDisplayPreset; name: string; desc: string }[] = [
    { id: 'standard-grid', name: 'Standard Grid', desc: 'Balanced e-commerce grid with hover previews' },
    { id: 'compact', name: 'Compact List', desc: 'Space-efficient horizontal cards for dense catalogs' },
    { id: 'large-cards', name: 'Large Cards', desc: 'Spacious editorial hero cards for luxury visual impact' },
    { id: 'editorial', name: 'Editorial', desc: 'Magazine-style presentation with typography focus' },
    { id: 'bento', name: 'Bento Matrix', desc: 'Dynamic visual grid with varied focal ratios' },
    { id: 'modern', name: 'Modern Soft', desc: 'Smooth shadows, pill badges, and refined radius' },
    { id: 'minimal', name: 'Minimalist Clean', desc: 'Ultra-clean layout stripped of heavy borders' },
  ];

  const handleApplyPreset = (presetId: string) => {
    setSelectedThemeId(presetId);
    // Clear custom overrides to let preset shine
    setCustomPrimary('');
    setCustomSecondary('');
    setCustomAccent('');
    setCustomBackground('');
    setCustomSurface('');
    setCustomText('');
  };

  const handleSaveThemeSettings = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      const customColors = {
        ...(customPrimary ? { primary: customPrimary } : {}),
        ...(customSecondary ? { secondary: customSecondary } : {}),
        ...(customAccent ? { accent: customAccent } : {}),
        ...(customBackground ? { background: customBackground } : {}),
        ...(customSurface ? { surface: customSurface } : {}),
        ...(customText ? { text: customText } : {}),
      };

      await saveStoreConfig(storeId, {
        themeId: selectedThemeId,
        productDisplayPreset: displayPreset,
        themeCustomColors: Object.keys(customColors).length > 0 ? customColors : undefined,
      });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      alert('Error updating theme settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight" style={{ color: themeColors.text }}>
            Theme System &amp; Visual Design
          </h2>
          <p className="text-xs" style={{ color: themeColors.muted }}>
            Choose from 10 production-ready presets, tweak custom brand tokens, and configure product card layouts.
          </p>
        </div>

        <button
          id="save-theme-btn"
          onClick={handleSaveThemeSettings}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-xs transition-all active:scale-95"
          style={{ backgroundColor: themeColors.primary }}
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          <span>{saving ? 'Publishing Theme...' : savedSuccess ? 'Theme Saved!' : 'Save & Publish Theme'}</span>
        </button>
      </div>

      {/* 10 Theme Presets Grid */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: themeColors.text }}>
          <Palette className="w-4 h-4 text-indigo-600" />
          <span>Select From 10 Coordinated Design Presets</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {THEME_PRESETS.map(preset => {
            const isSelected = selectedThemeId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handleApplyPreset(preset.id)}
                className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  isSelected ? 'ring-2 ring-indigo-600 border-indigo-600 shadow-md' : 'hover:border-neutral-400'
                }`}
                style={{
                  backgroundColor: isSelected ? `${preset.colors.primary}08` : themeColors.surface,
                  borderColor: isSelected ? preset.colors.primary : themeColors.border,
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm" style={{ color: themeColors.text }}>
                      {preset.name}
                    </span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-sm bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                      {preset.mode}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: themeColors.muted }}>
                    {preset.description}
                  </p>
                </div>

                {/* Color Palette Chips */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t" style={{ borderColor: themeColors.border }}>
                  <span className="w-5 h-5 rounded-full border shadow-2xs" style={{ backgroundColor: preset.colors.primary }} title="Primary" />
                  <span className="w-5 h-5 rounded-full border shadow-2xs" style={{ backgroundColor: preset.colors.secondary }} title="Secondary" />
                  <span className="w-5 h-5 rounded-full border shadow-2xs" style={{ backgroundColor: preset.colors.accent }} title="Accent" />
                  <span className="w-5 h-5 rounded-full border shadow-2xs" style={{ backgroundColor: preset.colors.background }} title="Background" />
                  <span className="w-5 h-5 rounded-full border shadow-2xs" style={{ backgroundColor: preset.colors.text }} title="Text" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Display Presets */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: themeColors.text }}>
          <LayoutGrid className="w-4 h-4 text-emerald-600" />
          <span>Product Display Preset (Section 14)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {displayPresets.map(dp => {
            const isSelected = displayPreset === dp.id;
            return (
              <button
                key={dp.id}
                onClick={() => setDisplayPreset(dp.id)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  isSelected ? 'ring-2 ring-indigo-600 border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20' : 'hover:border-neutral-400'
                }`}
                style={{
                  backgroundColor: isSelected ? undefined : themeColors.surface,
                  borderColor: isSelected ? undefined : themeColors.border,
                }}
              >
                <p className="font-bold text-xs" style={{ color: themeColors.text }}>{dp.name}</p>
                <p className="text-[11px] mt-0.5" style={{ color: themeColors.muted }}>{dp.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Brand Colors Overrides */}
      <div
        className="p-6 rounded-2xl border space-y-4"
        style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: themeColors.text }}>
              Fine-Tune Brand Colors (Optional Overrides)
            </h3>
            <p className="text-xs" style={{ color: themeColors.muted }}>
              Leave blank to preserve automatic preset colors. Entering values will override specific tokens.
            </p>
          </div>
          <button
            onClick={() => {
              setCustomPrimary('');
              setCustomSecondary('');
              setCustomAccent('');
              setCustomBackground('');
              setCustomSurface('');
              setCustomText('');
            }}
            className="text-xs font-semibold hover:underline"
            style={{ color: themeColors.muted }}
          >
            Reset Custom Overrides
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold mb-1">Primary Brand</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={customPrimary || themeColors.primary}
                onChange={e => setCustomPrimary(e.target.value)}
                className="w-8 h-8 rounded-md cursor-pointer border p-0.5"
              />
              <input
                type="text"
                placeholder={themeColors.primary}
                value={customPrimary}
                onChange={e => setCustomPrimary(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg border font-mono"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Secondary Brand</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={customSecondary || themeColors.secondary}
                onChange={e => setCustomSecondary(e.target.value)}
                className="w-8 h-8 rounded-md cursor-pointer border p-0.5"
              />
              <input
                type="text"
                placeholder={themeColors.secondary}
                value={customSecondary}
                onChange={e => setCustomSecondary(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg border font-mono"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Accent Highlight</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={customAccent || themeColors.accent}
                onChange={e => setCustomAccent(e.target.value)}
                className="w-8 h-8 rounded-md cursor-pointer border p-0.5"
              />
              <input
                type="text"
                placeholder={themeColors.accent}
                value={customAccent}
                onChange={e => setCustomAccent(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg border font-mono"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
