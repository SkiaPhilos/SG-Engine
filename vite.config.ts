import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

// Load environment variables from .env files into process.env before Vite builds
dotenv.config();

function cleanEnv(val?: string): string {
  if (!val || typeof val !== 'string') return '';
  let clean = val.trim();
  if (
    (clean.startsWith('"') && clean.endsWith('"')) ||
    (clean.startsWith("'") && clean.endsWith("'"))
  ) {
    clean = clean.slice(1, -1).trim();
  }
  return clean;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const rawUrl =
    env.VITE_SUPABASE_URL ||
    env.SUPABASE_URL ||
    env.NEXT_PUBLIC_SUPABASE_URL ||
    env.PUBLIC_SUPABASE_URL ||
    env.REACT_APP_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.PUBLIC_SUPABASE_URL ||
    process.env.REACT_APP_SUPABASE_URL ||
    '';

  const rawAnonKey =
    env.VITE_SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY ||
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_KEY ||
    env.SUPABASE_KEY ||
    env.VITE_SUPABASE_API_KEY ||
    env.SUPABASE_API_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_KEY ||
    env.REACT_APP_SUPABASE_ANON_KEY ||
    env.REACT_APP_SUPABASE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.VITE_SUPABASE_API_KEY ||
    process.env.SUPABASE_API_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_KEY ||
    process.env.REACT_APP_SUPABASE_ANON_KEY ||
    process.env.REACT_APP_SUPABASE_KEY ||
    '';

  const rawAdminEmail =
    env.VITE_ADMIN_EMAIL ||
    env.ADMIN_EMAIL ||
    process.env.VITE_ADMIN_EMAIL ||
    process.env.ADMIN_EMAIL ||
    '';

  const supabaseUrl = cleanEnv(rawUrl);
  const supabaseAnonKey = cleanEnv(rawAnonKey);
  const adminEmail = cleanEnv(rawAdminEmail);

  // Define object only injects keys if non-empty to prevent hardcoding empty strings
  const defines: Record<string, string> = {};
  if (supabaseUrl) {
    defines['import.meta.env.VITE_SUPABASE_URL'] = JSON.stringify(supabaseUrl);
    defines['import.meta.env.SUPABASE_URL'] = JSON.stringify(supabaseUrl);
  }
  if (supabaseAnonKey) {
    defines['import.meta.env.VITE_SUPABASE_ANON_KEY'] = JSON.stringify(supabaseAnonKey);
    defines['import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY'] = JSON.stringify(supabaseAnonKey);
    defines['import.meta.env.SUPABASE_ANON_KEY'] = JSON.stringify(supabaseAnonKey);
  }
  if (adminEmail) {
    defines['import.meta.env.VITE_ADMIN_EMAIL'] = JSON.stringify(adminEmail);
  }

  return {
    plugins: [react(), tailwindcss()],
    define: defines,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
