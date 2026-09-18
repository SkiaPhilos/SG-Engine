import { ThemePreset, ThemeColors } from '../../types/store';

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'clean-commerce',
    name: 'Clean Commerce',
    description: 'Crisp, modern, high-contrast light layout suitable for versatile retail & goods.',
    mode: 'light',
    colors: {
      primary: '#18181b', // zinc-900
      secondary: '#4f46e5', // indigo-600
      accent: '#059669', // emerald-600
      background: '#f8fafc', // slate-50
      surface: '#ffffff',
      text: '#0f172a', // slate-900
      muted: '#64748b', // slate-500
      border: '#e2e8f0', // slate-200
    },
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: '8px',
  },
  {
    id: 'midnight-luxury',
    name: 'Midnight Luxury',
    description: 'Deep obsidian and champagne accents for high-end jewelry, apparel, and premium electronics.',
    mode: 'dark',
    colors: {
      primary: '#d4af37', // soft gold
      secondary: '#e5e7eb',
      accent: '#fbbf24',
      background: '#090a0f',
      surface: '#13151f',
      text: '#f9fafb',
      muted: '#9ca3af',
      border: '#1f2430',
    },
    fontFamily: 'Playfair Display, Georgia, serif',
    borderRadius: '6px',
  },
  {
    id: 'warm-minimal',
    name: 'Warm Minimal',
    description: 'Organic clay, terracotta and warm sand tones for ceramics, home living, and artisan crafts.',
    mode: 'light',
    colors: {
      primary: '#854d0e', // amber-800
      secondary: '#c2410c', // orange-700
      accent: '#d97706', // amber-600
      background: '#faf6f0', // warm linen
      surface: '#ffffff',
      text: '#292524', // stone-800
      muted: '#78716c', // stone-500
      border: '#e7e0d6',
    },
    fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
    borderRadius: '12px',
  },
  {
    id: 'modern-tech',
    name: 'Modern Tech',
    description: 'Sleek dark cyan and sharp slate geometry for gadgets, gear, and digital electronics.',
    mode: 'dark',
    colors: {
      primary: '#06b6d4', // cyan-500
      secondary: '#38bdf8', // sky-400
      accent: '#10b981', // emerald-500
      background: '#0b1120', // deep tech slate
      surface: '#151f32',
      text: '#f8fafc',
      muted: '#94a3b8',
      border: '#1e293b',
    },
    fontFamily: 'Space Grotesk, system-ui, sans-serif',
    borderRadius: '10px',
  },
  {
    id: 'soft-boutique',
    name: 'Soft Boutique',
    description: 'Graceful rose and cashmere palette tailored for cosmetics, skincare, and women’s apparel.',
    mode: 'light',
    colors: {
      primary: '#be185d', // pink-700
      secondary: '#db2777', // pink-600
      accent: '#7c3aed', // violet-600
      background: '#fdf8f9',
      surface: '#ffffff',
      text: '#371826',
      muted: '#836574',
      border: '#f5dbe4',
    },
    fontFamily: 'Outfit, system-ui, sans-serif',
    borderRadius: '16px',
  },
  {
    id: 'bold-retail',
    name: 'Bold Retail',
    description: 'High energy cobalt and crimson accents for sportswear, streetwear, and flash sales.',
    mode: 'light',
    colors: {
      primary: '#1d4ed8', // blue-700
      secondary: '#dc2626', // red-600
      accent: '#ea580c', // orange-600
      background: '#f4f5f8',
      surface: '#ffffff',
      text: '#111827',
      muted: '#4b5563',
      border: '#d1d5db',
    },
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: '6px',
  },
  {
    id: 'dark-premium',
    name: 'Dark Premium',
    description: 'Subtle charcoal and sterling highlights with minimal noise for sophisticated catalogs.',
    mode: 'dark',
    colors: {
      primary: '#f3f4f6',
      secondary: '#a1a1aa',
      accent: '#38bdf8',
      background: '#121316',
      surface: '#1c1e24',
      text: '#f4f4f5',
      muted: '#71717a',
      border: '#27272a',
    },
    fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
    borderRadius: '8px',
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Magazine-grade monochrome with rich typography and structured editorial grids.',
    mode: 'light',
    colors: {
      primary: '#0a0a0a',
      secondary: '#262626',
      accent: '#b91c1c',
      background: '#fafafa',
      surface: '#ffffff',
      text: '#171717',
      muted: '#525252',
      border: '#e5e5e5',
    },
    fontFamily: 'Playfair Display, Georgia, serif',
    borderRadius: '0px', // strict editorial sharp corners
  },
  {
    id: 'fresh-market',
    name: 'Fresh Market',
    description: 'Vibrant botanical greens and citrus highlights for organic groceries, wellness, and beverages.',
    mode: 'light',
    colors: {
      primary: '#15803d', // green-700
      secondary: '#ca8a04', // yellow-600
      accent: '#0284c7', // sky-600
      background: '#f6fbf7',
      surface: '#ffffff',
      text: '#142a1b',
      muted: '#51705a',
      border: '#d7ebd9',
    },
    fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
    borderRadius: '12px',
  },
  {
    id: 'elegant-neutral',
    name: 'Elegant Neutral',
    description: 'Calm oyster, taupe, and polished graphite for contemporary furniture, eyewear, and decor.',
    mode: 'light',
    colors: {
      primary: '#334155', // slate-700
      secondary: '#475569',
      accent: '#0d9488', // teal-600
      background: '#f8fafc',
      surface: '#ffffff',
      text: '#1e293b',
      muted: '#64748b',
      border: '#e2e8f0',
    },
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: '10px',
  },
];

export function getThemePreset(themeId?: string): ThemePreset {
  const found = THEME_PRESETS.find(p => p.id === themeId);
  return found || THEME_PRESETS[0];
}

/**
 * Derive full palette from 2-5 user brand colors if custom colors are supplied
 */
export function deriveThemeColors(basePreset: ThemePreset, customColors?: Partial<ThemeColors>): ThemeColors {
  const base = { ...basePreset.colors };
  if (!customColors) return base;

  const primary = customColors.primary || base.primary;
  const secondary = customColors.secondary || base.secondary;
  const accent = customColors.accent || base.accent;
  const background = customColors.background || base.background;
  const surface = customColors.surface || base.surface;
  const text = customColors.text || base.text;
  const muted = customColors.muted || base.muted;
  const border = customColors.border || base.border;

  return {
    primary,
    secondary,
    accent,
    background,
    surface,
    text,
    muted,
    border,
  };
}
