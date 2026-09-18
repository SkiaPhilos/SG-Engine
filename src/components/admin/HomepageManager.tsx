import React, { useState } from 'react';
import { Layout, ArrowUp, ArrowDown, Eye, EyeOff, Check, Sparkles } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { HomepageSectionConfig } from '../../types/store';
import { saveStoreConfig } from '../../services/store/storeService';

export const HomepageManager: React.FC = () => {
  const { config, storeId, themeColors } = useStore();
  const [sections, setSections] = useState<HomepageSectionConfig[]>(config.homepageSections || []);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleToggleSection = (index: number) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], enabled: !updated[index].enabled };
    setSections(updated);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const updated = [...sections];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setSections(updated);
  };

  const handleUpdateText = (index: number, field: 'title' | 'subtitle' | 'ctaText' | 'ctaUrl', value: string) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], [field]: value };
    setSections(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      await saveStoreConfig(storeId, {
        homepageSections: sections,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      alert('Error updating homepage configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight" style={{ color: themeColors.text }}>
            Homepage Layout &amp; Content Modules
          </h2>
          <p className="text-xs" style={{ color: themeColors.muted }}>
            Reorder, enable, disable, and configure copy for homepage sections.
          </p>
        </div>

        <button
          id="save-homepage-btn"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-xs transition-all active:scale-95"
          style={{ backgroundColor: themeColors.primary }}
        >
          <Check className="w-4 h-4" />
          <span>{saving ? 'Publishing...' : savedSuccess ? 'Layout Saved!' : 'Save Homepage Layout'}</span>
        </button>
      </div>

      <div className="space-y-3">
        {sections.map((section, idx) => (
          <div
            key={section.id || idx}
            className={`p-4 sm:p-5 rounded-2xl border transition-all ${
              !section.enabled ? 'opacity-50 bg-neutral-50 dark:bg-neutral-900' : ''
            }`}
            style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-400">
                  #{idx + 1}
                </span>
                <div>
                  <h4 className="font-bold text-sm capitalize" style={{ color: themeColors.text }}>
                    {section.type.replace('_', ' ')} Section
                  </h4>
                  <p className="text-[11px]" style={{ color: themeColors.muted }}>
                    {section.title || `Default ${section.type} presentation`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Move buttons */}
                <button
                  type="button"
                  onClick={() => handleMove(idx, 'up')}
                  disabled={idx === 0}
                  className="p-1.5 rounded-lg border text-neutral-400 hover:text-neutral-700 disabled:opacity-20"
                  style={{ borderColor: themeColors.border }}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(idx, 'down')}
                  disabled={idx === sections.length - 1}
                  className="p-1.5 rounded-lg border text-neutral-400 hover:text-neutral-700 disabled:opacity-20"
                  style={{ borderColor: themeColors.border }}
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>

                {/* Enable / Disable toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleSection(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    section.enabled
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                  }`}
                >
                  {section.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{section.enabled ? 'Visible' : 'Hidden'}</span>
                </button>
              </div>
            </div>

            {/* Custom copy inputs for hero or announcement */}
            {section.enabled && (section.type === 'hero' || section.type === 'announcement') && (
              <div className="mt-4 pt-3 border-t grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs" style={{ borderColor: themeColors.border }}>
                <div>
                  <label className="block font-semibold mb-1">Headline Text</label>
                  <input
                    type="text"
                    value={section.title || ''}
                    onChange={e => handleUpdateText(idx, 'title', e.target.value)}
                    placeholder="Headline copy"
                    className="w-full px-3 py-1.5 rounded-xl border text-xs outline-none"
                    style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                  />
                </div>

                {section.type === 'hero' && (
                  <div>
                    <label className="block font-semibold mb-1">Subtitle / Tagline</label>
                    <input
                      type="text"
                      value={section.subtitle || ''}
                      onChange={e => handleUpdateText(idx, 'subtitle', e.target.value)}
                      placeholder="Subheading copy"
                      className="w-full px-3 py-1.5 rounded-xl border text-xs outline-none"
                      style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
