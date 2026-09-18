-- ============================================================================
-- STORE ENGINE: FULL SUPABASE MIGRATION SCRIPT
-- Run this complete script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. TABLE DEFINITIONS
-- ============================================================================

-- 2.1 Admins Table (Role-Based Access Control)
CREATE TABLE IF NOT EXISTS public.admins (
  admin_uid UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2 Stores Table (Store Configuration & Custom Themes)
CREATE TABLE IF NOT EXISTS public.stores (
  id TEXT PRIMARY KEY DEFAULT 'default',
  store_name TEXT NOT NULL DEFAULT 'Store Engine',
  store_description TEXT NOT NULL DEFAULT '',
  logo_url TEXT,
  favicon_url TEXT,
  currency TEXT NOT NULL DEFAULT 'PKR',
  currency_symbol TEXT NOT NULL DEFAULT 'Rs.',
  contact JSONB NOT NULL DEFAULT '{}'::jsonb,
  contact_email TEXT,
  contact_phone TEXT,
  whatsapp_number TEXT,
  social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  theme_id TEXT NOT NULL DEFAULT 'modern-emerald',
  theme_custom_colors JSONB,
  product_display_preset TEXT NOT NULL DEFAULT 'standard-grid',
  homepage_sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  delivery_config JSONB NOT NULL DEFAULT '{"enabled": true, "flatFee": 200}'::jsonb,
  checkout_config JSONB NOT NULL DEFAULT '{"requirePhone": true, "requireEmail": true, "requireAddress": true, "orderNotesEnabled": true}'::jsonb,
  search_enabled BOOLEAN NOT NULL DEFAULT true,
  is_configured BOOLEAN NOT NULL DEFAULT false,
  owner_uid UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.3 Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_categories_store_slug UNIQUE(store_id, slug)
);

-- 2.4 Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  compare_at_price NUMERIC(12, 2),
  discount_percent NUMERIC(5, 2) DEFAULT 0,
  category_ids TEXT[] NOT NULL DEFAULT '{}',
  images TEXT[] NOT NULL DEFAULT '{}',
  primary_image_index INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  sku TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_products_store_slug UNIQUE(store_id, slug)
);

-- 2.5 Offers Table (Bundles, Free Quantity, % Discounts)
CREATE TABLE IF NOT EXISTS public.offers (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('free_quantity', 'bundle', 'free_product', 'percentage_discount')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  primary_product_ids TEXT[] NOT NULL DEFAULT '{}',
  primary_quantity INTEGER NOT NULL DEFAULT 1,
  reward_product_ids TEXT[] NOT NULL DEFAULT '{}',
  reward_quantity INTEGER NOT NULL DEFAULT 1,
  pricing_rule TEXT NOT NULL DEFAULT 'original' CHECK (pricing_rule IN ('original', 'percentage_discount', 'custom_price')),
  pricing_value NUMERIC(12, 2),
  display_style TEXT NOT NULL DEFAULT 'clean',
  badge_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.6 Payment Methods Table (Manual Destinations: Bank, EasyPaisa, JazzCash, COD)
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  account_title TEXT NOT NULL,
  account_number TEXT NOT NULL,
  iban TEXT,
  bank_name TEXT,
  instructions TEXT NOT NULL DEFAULT '',
  qr_code_url TEXT,
  require_screenshot BOOLEAN NOT NULL DEFAULT false,
  require_transaction_reference BOOLEAN NOT NULL DEFAULT true,
  enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.7 Orders Table (Hardened with Access Token capability)
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  access_token UUID NOT NULL DEFAULT uuid_generate_v4(),
  customer JSONB NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  applied_offers JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_method_id TEXT NOT NULL,
  payment_method_name TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'payment_submitted', 'pending_verification', 'paid', 'rejected', 'refunded')),
  order_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (order_status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  transaction_reference TEXT,
  payment_proof_url TEXT,
  safepay_tracker TEXT,
  safepay_signature_verified BOOLEAN DEFAULT false,
  safepay_paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.8 Store Private Settings Table (Zero-Exposure AES-256-GCM Vault)
CREATE TABLE IF NOT EXISTS public.store_private_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL,
  encrypted_payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_private_settings_store_key UNIQUE(store_id, setting_key)
);

-- ============================================================================
-- 3. INDEXES FOR OPTIMAL QUERY PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_categories_store_id ON public.categories(store_id);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(store_id, status);
CREATE INDEX IF NOT EXISTS idx_offers_store_id ON public.offers(store_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_store_id ON public.payment_methods(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_created ON public.orders(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_id_token ON public.orders(id, access_token);
CREATE INDEX IF NOT EXISTS idx_orders_tracker ON public.orders(safepay_tracker) WHERE safepay_tracker IS NOT NULL;

-- ============================================================================
-- 4. RBAC HELPER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
    AND (
      lower(u.email) = 'maniacphilos@gmail.com'
      OR EXISTS (
        SELECT 1 FROM public.admins a
        WHERE a.admin_uid = auth.uid()
      )
    )
  );
$$;

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS across all application tables
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_private_settings ENABLE ROW LEVEL SECURITY;

-- 5.1 Admins RLS
DROP POLICY IF EXISTS "Admins read self or superadmin" ON public.admins;
CREATE POLICY "Admins read self or superadmin" ON public.admins
  FOR SELECT TO authenticated
  USING (admin_uid = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins write by admin or bootstrap" ON public.admins;
CREATE POLICY "Admins write by admin or bootstrap" ON public.admins
  FOR ALL TO authenticated
  USING (
    public.is_admin() OR 
    (admin_uid = auth.uid() AND lower(auth.jwt()->>'email') = 'maniacphilos@gmail.com')
  );

-- 5.2 Stores RLS (Public read; Admin write)
DROP POLICY IF EXISTS "Store public read" ON public.stores;
CREATE POLICY "Store public read" ON public.stores
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Store admin write" ON public.stores;
CREATE POLICY "Store admin write" ON public.stores
  FOR ALL TO authenticated
  USING (public.is_admin());

-- 5.3 Categories RLS
DROP POLICY IF EXISTS "Categories public read" ON public.categories;
CREATE POLICY "Categories public read" ON public.categories
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Categories admin write" ON public.categories;
CREATE POLICY "Categories admin write" ON public.categories
  FOR ALL TO authenticated
  USING (public.is_admin());

-- 5.4 Products RLS
DROP POLICY IF EXISTS "Products public read" ON public.products;
CREATE POLICY "Products public read" ON public.products
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Products admin write" ON public.products;
CREATE POLICY "Products admin write" ON public.products
  FOR ALL TO authenticated
  USING (public.is_admin());

-- 5.5 Offers RLS
DROP POLICY IF EXISTS "Offers public read" ON public.offers;
CREATE POLICY "Offers public read" ON public.offers
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Offers admin write" ON public.offers;
CREATE POLICY "Offers admin write" ON public.offers
  FOR ALL TO authenticated
  USING (public.is_admin());

-- 5.6 Payment Methods RLS
DROP POLICY IF EXISTS "Payment methods public read" ON public.payment_methods;
CREATE POLICY "Payment methods public read" ON public.payment_methods
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Payment methods admin write" ON public.payment_methods;
CREATE POLICY "Payment methods admin write" ON public.payment_methods
  FOR ALL TO authenticated
  USING (public.is_admin());

-- 5.7 Orders RLS (HARDENED: No public SELECT or direct UPDATE grants)
DROP POLICY IF EXISTS "Orders admin read" ON public.orders;
CREATE POLICY "Orders admin read" ON public.orders
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Orders public insert" ON public.orders;
CREATE POLICY "Orders public insert" ON public.orders
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Orders admin update" ON public.orders;
CREATE POLICY "Orders admin update" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Orders admin delete" ON public.orders;
CREATE POLICY "Orders admin delete" ON public.orders
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- 5.8 Store Private Settings RLS (Exclusively Service Role)
DROP POLICY IF EXISTS "Private settings service role only" ON public.store_private_settings;
CREATE POLICY "Private settings service role only" ON public.store_private_settings
  FOR ALL TO service_role
  USING (true);

-- ============================================================================
-- 6. SECURITY DEFINER RPC FUNCTIONS (Customer Order Access & Payment Updates)
-- ============================================================================

-- 6.1 Customer-Safe Single-Order Lookup (Projection without internal credentials/trackers)
CREATE OR REPLACE FUNCTION public.get_customer_order(
  p_order_id TEXT,
  p_access_token UUID
)
RETURNS TABLE (
  id TEXT,
  order_number TEXT,
  store_id TEXT,
  customer JSONB,
  items JSONB,
  applied_offers JSONB,
  subtotal NUMERIC,
  discount_total NUMERIC,
  delivery_fee NUMERIC,
  total NUMERIC,
  payment_method_id TEXT,
  payment_method_name TEXT,
  payment_status TEXT,
  order_status TEXT,
  transaction_reference TEXT,
  payment_proof_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.order_number,
    o.store_id,
    o.customer,
    o.items,
    o.applied_offers,
    o.subtotal,
    o.discount_total,
    o.delivery_fee,
    o.total,
    o.payment_method_id,
    o.payment_method_name,
    o.payment_status,
    o.order_status,
    o.transaction_reference,
    o.payment_proof_url,
    o.created_at,
    o.updated_at
  FROM public.orders o
  WHERE o.id = p_order_id
    AND o.access_token = p_access_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_order(TEXT, UUID) TO anon, authenticated;

-- 6.2 Customer Payment Proof & Reference Submission (Surgical update, token-guarded)
CREATE OR REPLACE FUNCTION public.submit_order_payment_proof(
  p_order_id TEXT,
  p_access_token UUID,
  p_payment_proof_url TEXT DEFAULT NULL,
  p_transaction_reference TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_order public.orders%ROWTYPE;
BEGIN
  -- 1. Validate order existence and access token
  SELECT * INTO v_current_order
  FROM public.orders
  WHERE id = p_order_id AND access_token = p_access_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or invalid authorization token.';
  END IF;

  -- 2. Prevent tampering on final states
  IF v_current_order.payment_status = 'paid' THEN
    RAISE EXCEPTION 'This order has already been marked as paid.';
  END IF;

  IF v_current_order.order_status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot update payment on a cancelled order.';
  END IF;

  -- 3. Perform surgical update on payment details only
  UPDATE public.orders
  SET
    payment_proof_url = COALESCE(p_payment_proof_url, payment_proof_url),
    transaction_reference = COALESCE(p_transaction_reference, transaction_reference),
    payment_status = 'payment_submitted',
    updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'orderId', p_order_id,
    'paymentStatus', 'payment_submitted'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_order_payment_proof(TEXT, UUID, TEXT, TEXT) TO anon, authenticated;

-- ============================================================================
-- 7. SUPABASE STORAGE BUCKETS & POLICIES
-- ============================================================================

-- Create storage buckets if they do not exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('product-images', 'product-images', true),
  ('payment-receipts', 'payment-receipts', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- 7.1 Product Images Storage Policies
-- Public can read all product images
DROP POLICY IF EXISTS "Product images are publicly accessible" ON storage.objects;
CREATE POLICY "Product images are publicly accessible" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-images');

-- Admins can upload, update, and delete product images
DROP POLICY IF EXISTS "Admins can manage product images" ON storage.objects;
CREATE POLICY "Admins can manage product images" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

-- 7.2 Payment Receipts Storage Policies
-- Admins can view uploaded payment receipts
DROP POLICY IF EXISTS "Admins can view payment receipts" ON storage.objects;
CREATE POLICY "Admins can view payment receipts" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'payment-receipts' AND public.is_admin());

-- Customers/Guests can upload payment receipts
DROP POLICY IF EXISTS "Anyone can upload payment receipts" ON storage.objects;
CREATE POLICY "Anyone can upload payment receipts" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'payment-receipts');

-- ============================================================================
-- 8. INITIAL STORE SEED (Default Store Configuration)
-- ============================================================================
INSERT INTO public.stores (
  id,
  store_name,
  store_description,
  currency,
  currency_symbol,
  theme_id,
  is_configured
)
VALUES (
  'default',
  'Store Engine',
  'A modern, customizable e-commerce storefront with instant checkout.',
  'PKR',
  'Rs.',
  'modern-emerald',
  true
)
ON CONFLICT (id) DO NOTHING;
