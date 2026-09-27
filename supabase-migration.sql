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

-- 2.9 Inventory Reservations Table (15-Minute Atomic Stock Hold)
CREATE TABLE IF NOT EXISTS public.inventory_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hold_id UUID NOT NULL,
  store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'consumed', 'released', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.10 Idempotency Keys Table (Prevents Double Fulfillment on Retried Webhooks)
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'safepay_webhook',
  request_payload JSONB,
  response_status TEXT NOT NULL DEFAULT 'processing' CHECK (response_status IN ('processing', 'completed', 'failed')),
  order_id TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_idempotency_key_scope UNIQUE(key, scope)
);

-- 2.11 Order Events Table (Immutable Order Transition & Audit Trail)
CREATE TABLE IF NOT EXISTS public.order_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- e.g. 'order_created', 'status_changed', 'payment_status_changed', 'payment_proof_submitted', 'safepay_webhook_paid'
  from_status TEXT,
  to_status TEXT,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('admin', 'system', 'customer')),
  actor_id TEXT, -- admin auth UID, 'system', or customer access token / IP / session
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2.12 AUTOMATED UPDATED_AT TIMESTAMP TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_updated_at_admins ON public.admins;
CREATE TRIGGER trg_set_updated_at_admins
  BEFORE UPDATE ON public.admins
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at_stores ON public.stores;
CREATE TRIGGER trg_set_updated_at_stores
  BEFORE UPDATE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at_categories ON public.categories;
CREATE TRIGGER trg_set_updated_at_categories
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at_products ON public.products;
CREATE TRIGGER trg_set_updated_at_products
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at_offers ON public.offers;
CREATE TRIGGER trg_set_updated_at_offers
  BEFORE UPDATE ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at_payment_methods ON public.payment_methods;
CREATE TRIGGER trg_set_updated_at_payment_methods
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at_orders ON public.orders;
CREATE TRIGGER trg_set_updated_at_orders
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at_store_private_settings ON public.store_private_settings;
CREATE TRIGGER trg_set_updated_at_store_private_settings
  BEFORE UPDATE ON public.store_private_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at_inventory_reservations ON public.inventory_reservations;
CREATE TRIGGER trg_set_updated_at_inventory_reservations
  BEFORE UPDATE ON public.inventory_reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at_idempotency_keys ON public.idempotency_keys;
CREATE TRIGGER trg_set_updated_at_idempotency_keys
  BEFORE UPDATE ON public.idempotency_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

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
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_hold_id ON public.inventory_reservations(hold_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_order_id ON public.inventory_reservations(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_lookup ON public.inventory_reservations(product_id, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_key_scope ON public.idempotency_keys(key, scope);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_order_id ON public.idempotency_keys(order_id);
CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON public.order_events(order_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_order_events_store_id ON public.order_events(store_id, created_at DESC);

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
    SELECT 1 FROM public.admins a
    WHERE a.admin_uid = auth.uid()
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
ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

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
    (NOT EXISTS (SELECT 1 FROM public.admins))
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
  WITH CHECK (
    payment_status IN ('unpaid', 'pending_verification', 'payment_submitted')
    AND order_status = 'pending'
    AND total >= 0
    AND subtotal >= 0
  );

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

-- 5.9 Inventory Reservations RLS (Direct access admin & service_role only; shoppers use RPCs)
DROP POLICY IF EXISTS "Admins manage inventory reservations" ON public.inventory_reservations;
CREATE POLICY "Admins manage inventory reservations" ON public.inventory_reservations
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Service role manages inventory reservations" ON public.inventory_reservations;
CREATE POLICY "Service role manages inventory reservations" ON public.inventory_reservations
  FOR ALL TO service_role
  USING (true);

-- 5.10 Idempotency Keys RLS (Exclusively Service Role, Admin read-only inspection)
DROP POLICY IF EXISTS "Admins read idempotency keys" ON public.idempotency_keys;
CREATE POLICY "Admins read idempotency keys" ON public.idempotency_keys
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Service role manages idempotency keys" ON public.idempotency_keys;
CREATE POLICY "Service role manages idempotency keys" ON public.idempotency_keys
  FOR ALL TO service_role
  USING (true);

-- 5.11 Order Events RLS (Admin full view, Customer view via token RPC or admin, Service Role full access)
DROP POLICY IF EXISTS "Admins read order events" ON public.order_events;
CREATE POLICY "Admins read order events" ON public.order_events
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins insert order events" ON public.order_events;
CREATE POLICY "Admins insert order events" ON public.order_events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Service role manages order events" ON public.order_events;
CREATE POLICY "Service role manages order events" ON public.order_events
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

-- 6.3 Atomic Inventory Reservation & Hold Functions
-- 6.3.1 Create time-limited stock hold (15-min default) preventing concurrent checkout race conditions
CREATE OR REPLACE FUNCTION public.create_inventory_hold(
  p_store_id TEXT,
  p_items JSONB,
  p_order_id TEXT DEFAULT NULL,
  p_duration_minutes INTEGER DEFAULT 15
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_product_id TEXT;
  v_requested_qty INT;
  v_stock INT;
  v_product_name TEXT;
  v_active_holds INT;
  v_available_qty INT;
  v_hold_id UUID := uuid_generate_v4();
  v_expires_at TIMESTAMPTZ := now() + (COALESCE(p_duration_minutes, 15) || ' minutes')::interval;
BEGIN
  -- 1. Expire stale holds past their deadline
  UPDATE public.inventory_reservations
  SET status = 'expired', updated_at = now()
  WHERE status = 'active' AND expires_at <= now();

  -- 2. Sort items by product_id to lock in deterministic order (prevents deadlocks)
  FOR v_item IN
    SELECT 
      (elem->>'productId')::TEXT as product_id,
      COALESCE((elem->>'quantity')::INT, 1) as quantity
    FROM jsonb_array_elements(p_items) elem
    ORDER BY (elem->>'productId')::TEXT ASC
  LOOP
    v_product_id := v_item.product_id;
    v_requested_qty := v_item.quantity;

    IF v_product_id IS NULL OR v_requested_qty <= 0 THEN
      CONTINUE;
    END IF;

    -- Pessimistic row-level lock
    SELECT stock, name INTO v_stock, v_product_name
    FROM public.products
    WHERE id = v_product_id AND store_id = p_store_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'PRODUCT_NOT_FOUND',
        'message', 'Product with ID ' || v_product_id || ' does not exist.'
      );
    END IF;

    -- Calculate active reservations for this product
    SELECT COALESCE(SUM(quantity), 0) INTO v_active_holds
    FROM public.inventory_reservations
    WHERE product_id = v_product_id
      AND status = 'active'
      AND expires_at > now();

    v_available_qty := v_stock - v_active_holds;

    IF v_available_qty < v_requested_qty THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'INSUFFICIENT_STOCK',
        'productId', v_product_id,
        'productName', v_product_name,
        'available', GREATEST(0, v_available_qty),
        'requested', v_requested_qty,
        'message', 'Only ' || GREATEST(0, v_available_qty) || ' unit(s) of "' || v_product_name || '" are currently available (others are currently in checkout).'
      );
    END IF;
  END LOOP;

  -- 3. If all items have sufficient available stock, create reservations
  FOR v_item IN
    SELECT 
      (elem->>'productId')::TEXT as product_id,
      COALESCE((elem->>'quantity')::INT, 1) as quantity
    FROM jsonb_array_elements(p_items) elem
  LOOP
    IF v_item.product_id IS NOT NULL AND v_item.quantity > 0 THEN
      INSERT INTO public.inventory_reservations (
        hold_id,
        store_id,
        order_id,
        product_id,
        quantity,
        status,
        expires_at
      ) VALUES (
        v_hold_id,
        p_store_id,
        p_order_id,
        v_item.product_id,
        v_item.quantity,
        'active',
        v_expires_at
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'holdId', v_hold_id,
    'expiresAt', v_expires_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_inventory_hold(TEXT, JSONB, TEXT, INTEGER) TO anon, authenticated, service_role;

-- 6.3.2 Release inventory hold (called when checkout cancelled or timed out)
CREATE OR REPLACE FUNCTION public.release_inventory_hold(
  p_hold_id UUID DEFAULT NULL,
  p_order_id TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  IF p_hold_id IS NULL AND p_order_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Hold ID or Order ID must be provided.');
  END IF;

  UPDATE public.inventory_reservations
  SET status = 'released', updated_at = now()
  WHERE status = 'active'
    AND (
      (p_hold_id IS NOT NULL AND hold_id = p_hold_id)
      OR
      (p_order_id IS NOT NULL AND order_id = p_order_id)
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'releasedCount', v_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_inventory_hold(UUID, TEXT) TO anon, authenticated, service_role;

-- 6.3.3 Consume inventory hold (called when order is confirmed / paid to permanently decrement stock)
CREATE OR REPLACE FUNCTION public.consume_inventory_hold(
  p_hold_id UUID DEFAULT NULL,
  p_order_id TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res RECORD;
  v_count INT := 0;
BEGIN
  IF p_hold_id IS NULL AND p_order_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Hold ID or Order ID must be provided.');
  END IF;

  FOR v_res IN
    SELECT id, product_id, quantity
    FROM public.inventory_reservations
    WHERE status = 'active'
      AND (
        (p_hold_id IS NOT NULL AND hold_id = p_hold_id)
        OR
        (p_order_id IS NOT NULL AND order_id = p_order_id)
      )
    FOR UPDATE
  LOOP
    -- Deduct physical stock
    UPDATE public.products
    SET stock = GREATEST(0, stock - v_res.quantity),
        updated_at = now()
    WHERE id = v_res.product_id;

    -- Mark reservation consumed
    UPDATE public.inventory_reservations
    SET status = 'consumed',
        updated_at = now()
    WHERE id = v_res.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'consumedCount', v_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_inventory_hold(UUID, TEXT) TO anon, authenticated, service_role;

-- 6.3.4 Helper: Get available stock (physical stock minus active reservations)
CREATE OR REPLACE FUNCTION public.get_product_available_stock(
  p_product_id TEXT
)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT GREATEST(0, p.stock - COALESCE(
    (SELECT SUM(r.quantity)
     FROM public.inventory_reservations r
     WHERE r.product_id = p.id
       AND r.status = 'active'
       AND r.expires_at > now()
    ), 0)::INT
  )
  FROM public.products p
  WHERE p.id = p_product_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_product_available_stock(TEXT) TO anon, authenticated;

-- 6.4 Order Audit Trail (Events) Functions
-- 6.4.1 Append an audit event to an order
CREATE OR REPLACE FUNCTION public.log_order_event(
  p_order_id TEXT,
  p_store_id TEXT,
  p_event_type TEXT,
  p_from_status TEXT DEFAULT NULL,
  p_to_status TEXT DEFAULT NULL,
  p_actor_type TEXT DEFAULT 'system',
  p_actor_id TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID := uuid_generate_v4();
BEGIN
  INSERT INTO public.order_events (
    id,
    order_id,
    store_id,
    event_type,
    from_status,
    to_status,
    actor_type,
    actor_id,
    notes,
    metadata,
    created_at
  ) VALUES (
    v_event_id,
    p_order_id,
    p_store_id,
    p_event_type,
    p_from_status,
    p_to_status,
    COALESCE(p_actor_type, 'system'),
    p_actor_id,
    p_notes,
    COALESCE(p_metadata, '{}'::jsonb),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'eventId', v_event_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_order_event(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated, service_role;

-- 6.4.2 Fetch order event audit trail (Admin or Customer with valid token)
CREATE OR REPLACE FUNCTION public.get_order_events(
  p_order_id TEXT,
  p_access_token UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  order_id TEXT,
  store_id TEXT,
  event_type TEXT,
  from_status TEXT,
  to_status TEXT,
  actor_type TEXT,
  actor_id TEXT,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow if admin OR if correct access token matches order
  IF public.is_admin() OR EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = p_order_id AND orders.access_token = p_access_token
  ) THEN
    RETURN QUERY
    SELECT 
      e.id,
      e.order_id,
      e.store_id,
      e.event_type,
      e.from_status,
      e.to_status,
      e.actor_type,
      e.actor_id,
      e.notes,
      e.metadata,
      e.created_at
    FROM public.order_events e
    WHERE e.order_id = p_order_id
    ORDER BY e.created_at ASC;
  ELSE
    RAISE EXCEPTION 'Unauthorized to view events for order %', p_order_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_events(TEXT, UUID) TO anon, authenticated, service_role;

-- ============================================================================
-- 7. SUPABASE STORAGE BUCKETS & POLICIES (Hardened with Size & Type Limits)
-- ============================================================================

-- Create storage buckets if they do not exist with size limits (5MB for assets, 10MB for receipts)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  (
    'product-images',
    'product-images',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
  ),
  (
    'store-assets',
    'store-assets',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
  ),
  (
    'payment-receipts',
    'payment-receipts',
    true,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  )
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 7.1 Product Images & Store Assets Storage Policies
-- Public can read all product images, store assets, and payment receipts
DROP POLICY IF EXISTS "Product images are publicly accessible" ON storage.objects;
CREATE POLICY "Product images are publicly accessible" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id IN ('product-images', 'store-assets', 'payment-receipts'));

-- Admins can upload, update, and delete product images and store assets
DROP POLICY IF EXISTS "Admins can manage product images" ON storage.objects;
CREATE POLICY "Admins can manage product images" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id IN ('product-images', 'store-assets') AND public.is_admin())
  WITH CHECK (bucket_id IN ('product-images', 'store-assets') AND public.is_admin());

-- 7.2 Payment Receipts Storage Policies
-- Customers/Guests can upload payment receipts (constrained by bucket mime type & size limit)
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
