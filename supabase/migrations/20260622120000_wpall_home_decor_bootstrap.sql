-- wpall_home_decor: greenfield shop schema (standalone from wpall_shop)
-- App: wpall-home-decor | ERP: erpzxusskbtdxvqadwxv

CREATE SCHEMA IF NOT EXISTS wpall_home_decor;
GRANT USAGE ON SCHEMA wpall_home_decor TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA wpall_home_decor GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA wpall_home_decor GRANT ALL ON TABLES TO service_role;

-- Consolidated ERP migration for schema: wpall_home_decor
-- Source: ..\..\wpallin1-salepage\supabase\migrations (18 files)
SET search_path TO wpall_home_decor, public;

-- === 20260602070742_5cabf50b-ab51-4acb-8c5a-6ea22e2bf1cb.sql ===
-- ============ ENUMS ============
CREATE TYPE wpall_home_decor.app_role AS ENUM ('customer', 'admin');
CREATE TYPE wpall_home_decor.customer_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum', 'vip');
CREATE TYPE wpall_home_decor.order_status AS ENUM ('draft', 'pending_payment', 'paid', 'producing', 'shipped', 'done', 'cancelled');

-- ============ PROFILES ============
CREATE TABLE wpall_home_decor.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  address TEXT,
  email TEXT,
  tier wpall_home_decor.customer_tier NOT NULL DEFAULT 'bronze',
  tier_override wpall_home_decor.customer_tier,
  total_spent NUMERIC(12,2) NOT NULL DEFAULT 0,
  order_count INT NOT NULL DEFAULT 0,
  last_order_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON wpall_home_decor.profiles TO authenticated;
GRANT ALL ON wpall_home_decor.profiles TO service_role;
ALTER TABLE wpall_home_decor.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE wpall_home_decor.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role wpall_home_decor.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON wpall_home_decor.user_roles TO authenticated;
GRANT ALL ON wpall_home_decor.user_roles TO service_role;
ALTER TABLE wpall_home_decor.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION wpall_home_decor.has_role(_user_id UUID, _role wpall_home_decor.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM wpall_home_decor.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ============ PRODUCTS ============
CREATE TABLE wpall_home_decor.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  curtain_type TEXT NOT NULL,
  default_fabric_id UUID,
  default_track_type TEXT,
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  labor_per_panel NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  bg_class TEXT,
  badge TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON wpall_home_decor.products TO anon, authenticated;
GRANT ALL ON wpall_home_decor.products TO service_role;
ALTER TABLE wpall_home_decor.products ENABLE ROW LEVEL SECURITY;

-- ============ FABRICS ============
CREATE TABLE wpall_home_decor.fabrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  price_per_meter NUMERIC(10,2) NOT NULL,
  cost_per_meter NUMERIC(10,2) NOT NULL DEFAULT 0,
  roll_width_cm INT NOT NULL DEFAULT 280,
  swatch TEXT,
  stock_meters NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON wpall_home_decor.fabrics TO anon, authenticated;
GRANT ALL ON wpall_home_decor.fabrics TO service_role;
ALTER TABLE wpall_home_decor.fabrics ENABLE ROW LEVEL SECURITY;

-- ============ ORDERS ============
CREATE TABLE wpall_home_decor.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL DEFAULT ('WP-' || to_char(now(), 'YYYYMMDD') || '-' || lpad((floor(random()*10000))::text, 4, '0')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status wpall_home_decor.order_status NOT NULL DEFAULT 'pending_payment',
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON wpall_home_decor.orders TO authenticated;
GRANT ALL ON wpall_home_decor.orders TO service_role;
ALTER TABLE wpall_home_decor.orders ENABLE ROW LEVEL SECURITY;

-- ============ ORDER ITEMS ============
CREATE TABLE wpall_home_decor.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES wpall_home_decor.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES wpall_home_decor.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  qty INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  line_total NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON wpall_home_decor.order_items TO authenticated;
GRANT ALL ON wpall_home_decor.order_items TO service_role;
ALTER TABLE wpall_home_decor.order_items ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============
-- profiles: self + admin
CREATE POLICY "self read profile" ON wpall_home_decor.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR wpall_home_decor.has_role(auth.uid(), 'admin'));
CREATE POLICY "self update profile" ON wpall_home_decor.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR wpall_home_decor.has_role(auth.uid(), 'admin'));
CREATE POLICY "self insert profile" ON wpall_home_decor.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- user_roles: self read; admin manages via service_role only
CREATE POLICY "read own roles" ON wpall_home_decor.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR wpall_home_decor.has_role(auth.uid(), 'admin'));

-- products: public read active; admin manage
CREATE POLICY "anyone read active products" ON wpall_home_decor.products FOR SELECT TO anon, authenticated USING (is_active = true OR wpall_home_decor.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage products" ON wpall_home_decor.products FOR ALL TO authenticated USING (wpall_home_decor.has_role(auth.uid(), 'admin')) WITH CHECK (wpall_home_decor.has_role(auth.uid(), 'admin'));

-- fabrics: public read active; admin manage
CREATE POLICY "anyone read fabrics" ON wpall_home_decor.fabrics FOR SELECT TO anon, authenticated USING (is_active = true OR wpall_home_decor.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage fabrics" ON wpall_home_decor.fabrics FOR ALL TO authenticated USING (wpall_home_decor.has_role(auth.uid(), 'admin')) WITH CHECK (wpall_home_decor.has_role(auth.uid(), 'admin'));

-- orders: own + admin
CREATE POLICY "read own orders" ON wpall_home_decor.orders FOR SELECT TO authenticated USING (user_id = auth.uid() OR wpall_home_decor.has_role(auth.uid(), 'admin'));
CREATE POLICY "create own orders" ON wpall_home_decor.orders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "update orders (admin or owner pending)" ON wpall_home_decor.orders FOR UPDATE TO authenticated USING (wpall_home_decor.has_role(auth.uid(), 'admin') OR (user_id = auth.uid() AND status IN ('draft','pending_payment')));

-- order_items: own (via order) + admin
CREATE POLICY "read own order items" ON wpall_home_decor.order_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM wpall_home_decor.orders o WHERE o.id = order_items.order_id AND (o.user_id = auth.uid() OR wpall_home_decor.has_role(auth.uid(), 'admin')))
);
CREATE POLICY "insert own order items" ON wpall_home_decor.order_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM wpall_home_decor.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid())
);

-- ============ TIER COMPUTATION ============
CREATE OR REPLACE FUNCTION wpall_home_decor.compute_tier(_total NUMERIC, _count INT)
RETURNS wpall_home_decor.customer_tier LANGUAGE SQL IMMUTABLE AS $$
  SELECT CASE
    WHEN _total >= 300000 OR _count >= 20 THEN 'platinum'::wpall_home_decor.customer_tier
    WHEN _total >= 100000 THEN 'gold'::wpall_home_decor.customer_tier
    WHEN _total >= 30000 THEN 'silver'::wpall_home_decor.customer_tier
    ELSE 'bronze'::wpall_home_decor.customer_tier
  END
$$;

CREATE OR REPLACE FUNCTION wpall_home_decor.recalc_tier(_user_id UUID)
RETURNS VOID LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total NUMERIC := 0;
  v_count INT := 0;
  v_last TIMESTAMPTZ;
  v_override wpall_home_decor.customer_tier;
BEGIN
  SELECT COALESCE(SUM(grand_total),0), COUNT(*), MAX(created_at)
    INTO v_total, v_count, v_last
  FROM wpall_home_decor.orders WHERE user_id = _user_id AND status IN ('paid','producing','shipped','done');

  SELECT tier_override INTO v_override FROM wpall_home_decor.profiles WHERE id = _user_id;

  UPDATE wpall_home_decor.profiles SET
    total_spent = v_total,
    order_count = v_count,
    last_order_at = v_last,
    tier = COALESCE(v_override, wpall_home_decor.compute_tier(v_total, v_count)),
    updated_at = now()
  WHERE id = _user_id;
END $$;

CREATE OR REPLACE FUNCTION wpall_home_decor.on_order_status_change()
RETURNS TRIGGER LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('paid','producing','shipped','done') OR OLD.status IN ('paid','producing','shipped','done') THEN
    PERFORM wpall_home_decor.recalc_tier(NEW.user_id);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_order_status_tier
  AFTER INSERT OR UPDATE OF status ON wpall_home_decor.orders
  FOR EACH ROW EXECUTE FUNCTION wpall_home_decor.on_order_status_change();

-- ============ AUTO PROFILE + ROLE ============
CREATE OR REPLACE FUNCTION wpall_home_decor.handle_new_user()
RETURNS TRIGGER LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO wpall_home_decor.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO wpall_home_decor.user_roles (user_id, role) VALUES (NEW.id, 'customer')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION wpall_home_decor.handle_new_user();

-- === 20260602070801_ee3e25fd-3f66-4945-8d1d-0d26226ffe03.sql ===
REVOKE EXECUTE ON FUNCTION wpall_home_decor.has_role(UUID, wpall_home_decor.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION wpall_home_decor.compute_tier(NUMERIC, INT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION wpall_home_decor.recalc_tier(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION wpall_home_decor.on_order_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION wpall_home_decor.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION wpall_home_decor.has_role(UUID, wpall_home_decor.app_role) TO authenticated, service_role;

-- === 20260602070822_e809931d-c7bb-4dad-b8aa-e51c3fd046e7.sql ===
CREATE OR REPLACE FUNCTION wpall_home_decor.compute_tier(_total NUMERIC, _count INT)
RETURNS wpall_home_decor.customer_tier LANGUAGE SQL IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _total >= 300000 OR _count >= 20 THEN 'platinum'::wpall_home_decor.customer_tier
    WHEN _total >= 100000 THEN 'gold'::wpall_home_decor.customer_tier
    WHEN _total >= 30000 THEN 'silver'::wpall_home_decor.customer_tier
    ELSE 'bronze'::wpall_home_decor.customer_tier
  END
$$;

-- === 20260602073639_cd767dda-a132-496d-a145-ec97884e856b.sql ===
-- Enum
DO $$ BEGIN
  CREATE TYPE wpall_home_decor.product_kind AS ENUM ('curtain','wood_blind','aluminum_blind','dim_blind','ready_curtain','accessory','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Columns
ALTER TABLE wpall_home_decor.products
  ADD COLUMN IF NOT EXISTS kind wpall_home_decor.product_kind NOT NULL DEFAULT 'curtain',
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'ชิ้น',
  ADD COLUMN IF NOT EXISTS stock numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sale_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS images jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique ON wpall_home_decor.products(sku) WHERE sku IS NOT NULL;

ALTER TABLE wpall_home_decor.products ALTER COLUMN curtain_type DROP NOT NULL;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images','product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "whd product-images public read" ON storage.objects;
CREATE POLICY "whd product-images public read"
  ON storage.objects
FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "whd product-images admin write" ON storage.objects;
CREATE POLICY "whd product-images admin write"
  ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND wpall_home_decor.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "whd product-images admin update" ON storage.objects;
CREATE POLICY "whd product-images admin update"
  ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'product-images' AND wpall_home_decor.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "whd product-images admin delete" ON storage.objects;
CREATE POLICY "whd product-images admin delete"
  ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND wpall_home_decor.has_role(auth.uid(),'admin'));

-- === 20260602075057_e2f21e0f-0b70-4e31-ad49-1b21c22670e8.sql ===
-- Helper updated_at function
CREATE OR REPLACE FUNCTION wpall_home_decor.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- ============ 1) CATEGORIES ============
CREATE TABLE wpall_home_decor.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind wpall_home_decor.product_kind NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  parent_id uuid REFERENCES wpall_home_decor.product_categories(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_pc_slug ON wpall_home_decor.product_categories(COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);
CREATE INDEX idx_pc_kind ON wpall_home_decor.product_categories(kind);
CREATE INDEX idx_pc_parent ON wpall_home_decor.product_categories(parent_id);

GRANT SELECT ON wpall_home_decor.product_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON wpall_home_decor.product_categories TO authenticated;
GRANT ALL ON wpall_home_decor.product_categories TO service_role;

ALTER TABLE wpall_home_decor.product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read categories" ON wpall_home_decor.product_categories
  FOR SELECT TO anon, authenticated USING (is_active = true OR wpall_home_decor.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage categories" ON wpall_home_decor.product_categories
  FOR ALL TO authenticated USING (wpall_home_decor.has_role(auth.uid(),'admin')) WITH CHECK (wpall_home_decor.has_role(auth.uid(),'admin'));

ALTER TABLE wpall_home_decor.products ADD COLUMN category_id uuid REFERENCES wpall_home_decor.product_categories(id) ON DELETE SET NULL;
CREATE INDEX idx_products_category_id ON wpall_home_decor.products(category_id);

CREATE TRIGGER trg_pc_updated BEFORE UPDATE ON wpall_home_decor.product_categories
  FOR EACH ROW EXECUTE FUNCTION wpall_home_decor.set_updated_at();

-- ============ 2) AUDIT LOG ============
CREATE TABLE wpall_home_decor.product_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid,
  product_name text,
  user_id uuid,
  user_email text,
  action text NOT NULL,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pal_product ON wpall_home_decor.product_audit_logs(product_id, created_at DESC);
CREATE INDEX idx_pal_created ON wpall_home_decor.product_audit_logs(created_at DESC);

GRANT SELECT ON wpall_home_decor.product_audit_logs TO authenticated;
GRANT ALL ON wpall_home_decor.product_audit_logs TO service_role;

ALTER TABLE wpall_home_decor.product_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read audit logs" ON wpall_home_decor.product_audit_logs
  FOR SELECT TO authenticated USING (wpall_home_decor.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION wpall_home_decor.log_product_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_changes jsonb := '{}'::jsonb;
  v_action text;
  k text;
  o jsonb; n jsonb;
  v_changed_count int := 0;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO wpall_home_decor.product_audit_logs(product_id, product_name, user_id, user_email, action, changes)
    VALUES (NEW.id, NEW.name, v_uid, v_email, 'create',
            jsonb_build_object('name', NEW.name, 'kind', NEW.kind, 'sale_price', NEW.sale_price));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    o := to_jsonb(OLD); n := to_jsonb(NEW);
    FOR k IN SELECT jsonb_object_keys(n) LOOP
      IF k = 'updated_at' THEN CONTINUE; END IF;
      IF (o->k) IS DISTINCT FROM (n->k) THEN
        v_changes := v_changes || jsonb_build_object(k, jsonb_build_object('old', o->k, 'new', n->k));
        v_changed_count := v_changed_count + 1;
      END IF;
    END LOOP;
    IF v_changed_count = 0 THEN RETURN NEW; END IF;
    v_action := CASE WHEN v_changed_count = 1 AND v_changes ? 'is_active' THEN 'toggle_active' ELSE 'update' END;
    INSERT INTO wpall_home_decor.product_audit_logs(product_id, product_name, user_id, user_email, action, changes)
    VALUES (NEW.id, NEW.name, v_uid, v_email, v_action, v_changes);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO wpall_home_decor.product_audit_logs(product_id, product_name, user_id, user_email, action, changes)
    VALUES (OLD.id, OLD.name, v_uid, v_email, 'delete', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_products_audit
AFTER INSERT OR UPDATE OR DELETE ON wpall_home_decor.products
FOR EACH ROW EXECUTE FUNCTION wpall_home_decor.log_product_change();

-- ============ 3) PRODUCT FILES ============
CREATE TABLE wpall_home_decor.product_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES wpall_home_decor.products(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'other',
  title text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  file_path text NOT NULL,
  mime_type text,
  size_bytes bigint NOT NULL DEFAULT 0,
  is_current boolean NOT NULL DEFAULT true,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pf_product ON wpall_home_decor.product_files(product_id);
CREATE INDEX idx_pf_current ON wpall_home_decor.product_files(product_id, title, is_current);

GRANT SELECT ON wpall_home_decor.product_files TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON wpall_home_decor.product_files TO authenticated;
GRANT ALL ON wpall_home_decor.product_files TO service_role;

ALTER TABLE wpall_home_decor.product_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read product files" ON wpall_home_decor.product_files
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage product files" ON wpall_home_decor.product_files
  FOR ALL TO authenticated USING (wpall_home_decor.has_role(auth.uid(),'admin')) WITH CHECK (wpall_home_decor.has_role(auth.uid(),'admin'));

-- ============ 4) TIER PRICES ============
CREATE TABLE wpall_home_decor.product_tier_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES wpall_home_decor.products(id) ON DELETE CASCADE,
  category_id uuid REFERENCES wpall_home_decor.product_categories(id) ON DELETE CASCADE,
  tier wpall_home_decor.customer_tier NOT NULL,
  price_type text NOT NULL DEFAULT 'fixed',
  value numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((product_id IS NOT NULL) <> (category_id IS NOT NULL)),
  CHECK (price_type IN ('fixed','discount_pct'))
);
CREATE UNIQUE INDEX uq_tier_product ON wpall_home_decor.product_tier_prices(product_id, tier) WHERE product_id IS NOT NULL;
CREATE UNIQUE INDEX uq_tier_category ON wpall_home_decor.product_tier_prices(category_id, tier) WHERE category_id IS NOT NULL;

GRANT SELECT ON wpall_home_decor.product_tier_prices TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON wpall_home_decor.product_tier_prices TO authenticated;
GRANT ALL ON wpall_home_decor.product_tier_prices TO service_role;

ALTER TABLE wpall_home_decor.product_tier_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read tier prices" ON wpall_home_decor.product_tier_prices
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage tier prices" ON wpall_home_decor.product_tier_prices
  FOR ALL TO authenticated USING (wpall_home_decor.has_role(auth.uid(),'admin')) WITH CHECK (wpall_home_decor.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION wpall_home_decor.resolve_product_price(_product_id uuid, _tier wpall_home_decor.customer_tier)
RETURNS numeric LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  v_base numeric; v_cat uuid; v_pt text; v_val numeric;
BEGIN
  SELECT COALESCE(NULLIF(sale_price,0), base_price), category_id INTO v_base, v_cat
  FROM wpall_home_decor.products WHERE id = _product_id;
  IF v_base IS NULL THEN RETURN 0; END IF;
  SELECT price_type, value INTO v_pt, v_val
  FROM wpall_home_decor.product_tier_prices WHERE product_id = _product_id AND tier = _tier LIMIT 1;
  IF v_pt IS NULL AND v_cat IS NOT NULL THEN
    SELECT price_type, value INTO v_pt, v_val
    FROM wpall_home_decor.product_tier_prices WHERE category_id = v_cat AND tier = _tier LIMIT 1;
  END IF;
  IF v_pt = 'fixed' THEN RETURN v_val; END IF;
  IF v_pt = 'discount_pct' THEN RETURN ROUND(v_base * (1 - v_val/100.0), 2); END IF;
  RETURN v_base;
END $$;

CREATE TRIGGER trg_ptp_updated BEFORE UPDATE ON wpall_home_decor.product_tier_prices
  FOR EACH ROW EXECUTE FUNCTION wpall_home_decor.set_updated_at();

-- === 20260602075129_8a680eaf-d147-4591-a5ad-697a0bb4a210.sql ===
DROP POLICY IF EXISTS "whd anyone read product files objects" ON storage.objects;
CREATE POLICY "whd anyone read product files objects"
  ON storage.objects
  FOR SELECT USING (bucket_id = 'product-files');
DROP POLICY IF EXISTS "whd admin upload product files" ON storage.objects;
CREATE POLICY "whd admin upload product files"
  ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-files' AND wpall_home_decor.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "whd admin update product files" ON storage.objects;
CREATE POLICY "whd admin update product files"
  ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'product-files' AND wpall_home_decor.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "whd admin delete product files" ON storage.objects;
CREATE POLICY "whd admin delete product files"
  ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'product-files' AND wpall_home_decor.has_role(auth.uid(),'admin'));

-- === 20260602123143_1e2236da-4b7e-42a8-88ab-6f583a9af666.sql ===
-- ============= ENUMS =============
CREATE TYPE wpall_home_decor.wallet_tx_type AS ENUM ('topup','payment','refund','adjust');
CREATE TYPE wpall_home_decor.topup_status AS ENUM ('pending','approved','rejected','cancelled');
CREATE TYPE wpall_home_decor.topup_method AS ENUM ('bank_transfer','promptpay','credit_card');
CREATE TYPE wpall_home_decor.coupon_type AS ENUM ('percent','fixed','free_shipping');

-- ============= WALLETS =============
CREATE TABLE wpall_home_decor.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance numeric NOT NULL DEFAULT 0,
  total_topup numeric NOT NULL DEFAULT 0,
  total_spent numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON wpall_home_decor.wallets TO authenticated;
GRANT ALL ON wpall_home_decor.wallets TO service_role;
ALTER TABLE wpall_home_decor.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wallet read" ON wpall_home_decor.wallets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR wpall_home_decor.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update wallet" ON wpall_home_decor.wallets FOR UPDATE TO authenticated
  USING (wpall_home_decor.has_role(auth.uid(),'admin')) WITH CHECK (wpall_home_decor.has_role(auth.uid(),'admin'));

-- ============= WALLET TRANSACTIONS =============
CREATE TABLE wpall_home_decor.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES wpall_home_decor.wallets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  type wpall_home_decor.wallet_tx_type NOT NULL,
  amount numeric NOT NULL,
  balance_after numeric NOT NULL,
  reference_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON wpall_home_decor.wallet_transactions TO authenticated;
GRANT ALL ON wpall_home_decor.wallet_transactions TO service_role;
ALTER TABLE wpall_home_decor.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tx read" ON wpall_home_decor.wallet_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR wpall_home_decor.has_role(auth.uid(),'admin'));

-- ============= TOPUP REQUESTS =============
CREATE TABLE wpall_home_decor.topup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  method wpall_home_decor.topup_method NOT NULL DEFAULT 'bank_transfer',
  slip_url text,
  reference_note text,
  status wpall_home_decor.topup_status NOT NULL DEFAULT 'pending',
  rejected_reason text,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON wpall_home_decor.topup_requests TO authenticated;
GRANT ALL ON wpall_home_decor.topup_requests TO service_role;
ALTER TABLE wpall_home_decor.topup_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own topup read" ON wpall_home_decor.topup_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR wpall_home_decor.has_role(auth.uid(),'admin'));
CREATE POLICY "create own topup" ON wpall_home_decor.topup_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "update topup admin or own pending" ON wpall_home_decor.topup_requests FOR UPDATE TO authenticated
  USING (wpall_home_decor.has_role(auth.uid(),'admin') OR (user_id = auth.uid() AND status = 'pending'))
  WITH CHECK (wpall_home_decor.has_role(auth.uid(),'admin') OR (user_id = auth.uid() AND status IN ('pending','cancelled')));

-- ============= AUTO CREATE WALLET ON SIGNUP (extend handle_new_user) =============
CREATE OR REPLACE FUNCTION wpall_home_decor.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO wpall_home_decor.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO wpall_home_decor.user_roles (user_id, role) VALUES (NEW.id, 'customer') ON CONFLICT DO NOTHING;
  INSERT INTO wpall_home_decor.wallets (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

-- Backfill wallets for existing users
INSERT INTO wpall_home_decor.wallets (user_id)
SELECT id FROM wpall_home_decor.profiles WHERE id NOT IN (SELECT user_id FROM wpall_home_decor.wallets)
ON CONFLICT DO NOTHING;

-- ============= TOPUP APPROVAL TRIGGER =============
CREATE OR REPLACE FUNCTION wpall_home_decor.handle_topup_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_wallet_id uuid;
  v_new_balance numeric;
BEGIN
  IF NEW.status = 'approved' AND OLD.status <> 'approved' THEN
    SELECT id INTO v_wallet_id FROM wpall_home_decor.wallets WHERE user_id = NEW.user_id FOR UPDATE;
    IF v_wallet_id IS NULL THEN
      INSERT INTO wpall_home_decor.wallets (user_id, balance) VALUES (NEW.user_id, 0) RETURNING id INTO v_wallet_id;
    END IF;
    UPDATE wpall_home_decor.wallets
      SET balance = balance + NEW.amount,
          total_topup = total_topup + NEW.amount,
          updated_at = now()
      WHERE id = v_wallet_id
      RETURNING balance INTO v_new_balance;
    INSERT INTO wpall_home_decor.wallet_transactions (wallet_id, user_id, type, amount, balance_after, reference_id, note)
      VALUES (v_wallet_id, NEW.user_id, 'topup', NEW.amount, v_new_balance, NEW.id, 'เติมเงิน #'||substring(NEW.id::text,1,8));
    NEW.approved_at := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_topup_approval BEFORE UPDATE ON wpall_home_decor.topup_requests
  FOR EACH ROW EXECUTE FUNCTION wpall_home_decor.handle_topup_approval();

-- ============= ADDRESSES =============
CREATE TABLE wpall_home_decor.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recipient_name text NOT NULL,
  phone text NOT NULL,
  line1 text NOT NULL,
  line2 text,
  district text,
  province text NOT NULL,
  postal_code text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON wpall_home_decor.addresses TO authenticated;
GRANT ALL ON wpall_home_decor.addresses TO service_role;
ALTER TABLE wpall_home_decor.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own addresses" ON wpall_home_decor.addresses FOR ALL TO authenticated
  USING (user_id = auth.uid() OR wpall_home_decor.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR wpall_home_decor.has_role(auth.uid(),'admin'));

-- ============= FAVORITES =============
CREATE TABLE wpall_home_decor.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
GRANT SELECT, INSERT, DELETE ON wpall_home_decor.favorites TO authenticated;
GRANT ALL ON wpall_home_decor.favorites TO service_role;
ALTER TABLE wpall_home_decor.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own favorites" ON wpall_home_decor.favorites FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============= COUPONS =============
CREATE TABLE wpall_home_decor.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  type wpall_home_decor.coupon_type NOT NULL DEFAULT 'percent',
  value numeric NOT NULL DEFAULT 0,
  min_order numeric NOT NULL DEFAULT 0,
  max_discount numeric,
  usage_limit integer,
  used_count integer NOT NULL DEFAULT 0,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON wpall_home_decor.coupons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON wpall_home_decor.coupons TO authenticated;
GRANT ALL ON wpall_home_decor.coupons TO service_role;
ALTER TABLE wpall_home_decor.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read active coupons" ON wpall_home_decor.coupons FOR SELECT TO anon, authenticated
  USING (is_active OR wpall_home_decor.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage coupons" ON wpall_home_decor.coupons FOR ALL TO authenticated
  USING (wpall_home_decor.has_role(auth.uid(),'admin')) WITH CHECK (wpall_home_decor.has_role(auth.uid(),'admin'));

CREATE TABLE wpall_home_decor.user_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  coupon_id uuid NOT NULL REFERENCES wpall_home_decor.coupons(id) ON DELETE CASCADE,
  used_at timestamptz,
  order_id uuid,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, coupon_id)
);
GRANT SELECT, INSERT, UPDATE ON wpall_home_decor.user_coupons TO authenticated;
GRANT ALL ON wpall_home_decor.user_coupons TO service_role;
ALTER TABLE wpall_home_decor.user_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own user_coupons" ON wpall_home_decor.user_coupons FOR ALL TO authenticated
  USING (user_id = auth.uid() OR wpall_home_decor.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR wpall_home_decor.has_role(auth.uid(),'admin'));

-- ============= NOTIFICATIONS =============
CREATE TABLE wpall_home_decor.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  category text NOT NULL DEFAULT 'system',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON wpall_home_decor.notifications TO authenticated;
GRANT ALL ON wpall_home_decor.notifications TO service_role;
ALTER TABLE wpall_home_decor.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON wpall_home_decor.notifications FOR ALL TO authenticated
  USING (user_id = auth.uid() OR wpall_home_decor.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR wpall_home_decor.has_role(auth.uid(),'admin'));

-- ============= REVIEWS =============
CREATE TABLE wpall_home_decor.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  user_id uuid NOT NULL,
  order_id uuid,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_approved boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON wpall_home_decor.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON wpall_home_decor.reviews TO authenticated;
GRANT ALL ON wpall_home_decor.reviews TO service_role;
ALTER TABLE wpall_home_decor.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read approved reviews" ON wpall_home_decor.reviews FOR SELECT TO anon, authenticated
  USING (is_approved OR user_id = auth.uid() OR wpall_home_decor.has_role(auth.uid(),'admin'));
CREATE POLICY "create own review" ON wpall_home_decor.reviews FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "update own review or admin" ON wpall_home_decor.reviews FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR wpall_home_decor.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR wpall_home_decor.has_role(auth.uid(),'admin'));
CREATE POLICY "delete admin" ON wpall_home_decor.reviews FOR DELETE TO authenticated
  USING (wpall_home_decor.has_role(auth.uid(),'admin'));

-- ============= FLASH SALES =============
CREATE TABLE wpall_home_decor.flash_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON wpall_home_decor.flash_sales TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON wpall_home_decor.flash_sales TO authenticated;
GRANT ALL ON wpall_home_decor.flash_sales TO service_role;
ALTER TABLE wpall_home_decor.flash_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read flash_sales" ON wpall_home_decor.flash_sales FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage flash_sales" ON wpall_home_decor.flash_sales FOR ALL TO authenticated
  USING (wpall_home_decor.has_role(auth.uid(),'admin')) WITH CHECK (wpall_home_decor.has_role(auth.uid(),'admin'));

CREATE TABLE wpall_home_decor.flash_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flash_sale_id uuid NOT NULL REFERENCES wpall_home_decor.flash_sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  sale_price numeric NOT NULL,
  stock_limit integer,
  sold_count integer NOT NULL DEFAULT 0,
  UNIQUE (flash_sale_id, product_id)
);
GRANT SELECT ON wpall_home_decor.flash_sale_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON wpall_home_decor.flash_sale_items TO authenticated;
GRANT ALL ON wpall_home_decor.flash_sale_items TO service_role;
ALTER TABLE wpall_home_decor.flash_sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read flash_sale_items" ON wpall_home_decor.flash_sale_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage flash_sale_items" ON wpall_home_decor.flash_sale_items FOR ALL TO authenticated
  USING (wpall_home_decor.has_role(auth.uid(),'admin')) WITH CHECK (wpall_home_decor.has_role(auth.uid(),'admin'));

-- ============= BANNERS =============
CREATE TABLE wpall_home_decor.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  image_url text NOT NULL,
  link_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON wpall_home_decor.banners TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON wpall_home_decor.banners TO authenticated;
GRANT ALL ON wpall_home_decor.banners TO service_role;
ALTER TABLE wpall_home_decor.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read banners" ON wpall_home_decor.banners FOR SELECT TO anon, authenticated
  USING (is_active OR wpall_home_decor.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage banners" ON wpall_home_decor.banners FOR ALL TO authenticated
  USING (wpall_home_decor.has_role(auth.uid(),'admin')) WITH CHECK (wpall_home_decor.has_role(auth.uid(),'admin'));

-- ============= UPDATED_AT TRIGGERS =============
CREATE TRIGGER trg_wallets_updated BEFORE UPDATE ON wpall_home_decor.wallets FOR EACH ROW EXECUTE FUNCTION wpall_home_decor.set_updated_at();
CREATE TRIGGER trg_addresses_updated BEFORE UPDATE ON wpall_home_decor.addresses FOR EACH ROW EXECUTE FUNCTION wpall_home_decor.set_updated_at();

-- === 20260602123210_92109346-de2d-484f-a0cb-2f7135e52121.sql ===
REVOKE EXECUTE ON FUNCTION wpall_home_decor.handle_topup_approval() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION wpall_home_decor.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION wpall_home_decor.log_product_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION wpall_home_decor.on_order_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION wpall_home_decor.recalc_tier(uuid) FROM PUBLIC, anon, authenticated;

-- === 20260602123248_25fec2b7-d610-459d-98e5-ad65b86e62b0.sql ===
-- topup-slips: private bucket
CREATE POLICY "whd user upload own slip"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='topup-slips' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "whd user read own slip"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='topup-slips' AND (auth.uid()::text = (storage.foldername(name))[1] OR wpall_home_decor.has_role(auth.uid(),'admin')));
CREATE POLICY "whd user delete own slip"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='topup-slips' AND auth.uid()::text = (storage.foldername(name))[1]);

-- review-images: read public, write self
CREATE POLICY "whd anyone read review images"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id='review-images');
CREATE POLICY "whd user upload own review img"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='review-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "whd user delete own review img"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='review-images' AND (auth.uid()::text = (storage.foldername(name))[1] OR wpall_home_decor.has_role(auth.uid(),'admin')));

-- banners: read public, admin write
CREATE POLICY "whd anyone read banners"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id='banners');
CREATE POLICY "whd admin manage banner files"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id='banners' AND wpall_home_decor.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id='banners' AND wpall_home_decor.has_role(auth.uid(),'admin'));

-- === 20260602125846_d99e15aa-49e2-4fbb-a102-8150bb1c816b.sql ===
-- 1. add payment fields to orders
ALTER TABLE wpall_home_decor.orders
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_ref uuid,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- 2. pay an order using wallet balance
CREATE OR REPLACE FUNCTION wpall_home_decor.pay_with_wallet(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_order wpall_home_decor.orders%ROWTYPE;
  v_wallet wpall_home_decor.wallets%ROWTYPE;
  v_new_balance numeric;
  v_tx_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_order FROM wpall_home_decor.orders WHERE id = _order_id FOR UPDATE;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.user_id <> v_uid THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF v_order.status <> 'pending_payment' THEN RAISE EXCEPTION 'Order is not pending payment'; END IF;

  SELECT * INTO v_wallet FROM wpall_home_decor.wallets WHERE user_id = v_uid FOR UPDATE;
  IF v_wallet.id IS NULL THEN
    INSERT INTO wpall_home_decor.wallets (user_id) VALUES (v_uid) RETURNING * INTO v_wallet;
  END IF;
  IF v_wallet.balance < v_order.grand_total THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  UPDATE wpall_home_decor.wallets
    SET balance = balance - v_order.grand_total,
        total_spent = total_spent + v_order.grand_total,
        updated_at = now()
    WHERE id = v_wallet.id
    RETURNING balance INTO v_new_balance;

  INSERT INTO wpall_home_decor.wallet_transactions (wallet_id, user_id, type, amount, balance_after, reference_id, note)
    VALUES (v_wallet.id, v_uid, 'payment', -v_order.grand_total, v_new_balance, v_order.id,
            'ชำระค่าออเดอร์ ' || v_order.order_number)
    RETURNING id INTO v_tx_id;

  UPDATE wpall_home_decor.orders
    SET status = 'paid',
        payment_method = 'wallet',
        payment_ref = v_tx_id,
        paid_at = now(),
        updated_at = now()
    WHERE id = v_order.id;

  RETURN jsonb_build_object('ok', true, 'balance', v_new_balance, 'tx_id', v_tx_id);
END $$;

GRANT EXECUTE ON FUNCTION wpall_home_decor.pay_with_wallet(uuid) TO authenticated;

-- 3. admin adjust wallet
CREATE OR REPLACE FUNCTION wpall_home_decor.admin_adjust_wallet(_user_id uuid, _amount numeric, _note text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet wpall_home_decor.wallets%ROWTYPE;
  v_new_balance numeric;
BEGIN
  IF NOT wpall_home_decor.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT * INTO v_wallet FROM wpall_home_decor.wallets WHERE user_id = _user_id FOR UPDATE;
  IF v_wallet.id IS NULL THEN
    INSERT INTO wpall_home_decor.wallets (user_id) VALUES (_user_id) RETURNING * INTO v_wallet;
  END IF;
  UPDATE wpall_home_decor.wallets
    SET balance = balance + _amount, updated_at = now()
    WHERE id = v_wallet.id
    RETURNING balance INTO v_new_balance;
  INSERT INTO wpall_home_decor.wallet_transactions (wallet_id, user_id, type, amount, balance_after, note)
    VALUES (v_wallet.id, _user_id, 'adjust', _amount, v_new_balance,
            COALESCE(_note, 'ปรับยอดโดยแอดมิน'));
  RETURN jsonb_build_object('ok', true, 'balance', v_new_balance);
END $$;

GRANT EXECUTE ON FUNCTION wpall_home_decor.admin_adjust_wallet(uuid, numeric, text) TO authenticated;

-- 4. claim coupon helper
CREATE OR REPLACE FUNCTION wpall_home_decor.claim_coupon(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_coupon wpall_home_decor.coupons%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_coupon FROM wpall_home_decor.coupons WHERE upper(code) = upper(_code) AND is_active;
  IF v_coupon.id IS NULL THEN RAISE EXCEPTION 'Coupon not found'; END IF;
  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
    RAISE EXCEPTION 'Coupon expired';
  END IF;
  IF v_coupon.usage_limit IS NOT NULL AND v_coupon.used_count >= v_coupon.usage_limit THEN
    RAISE EXCEPTION 'Coupon usage limit reached';
  END IF;
  IF EXISTS (SELECT 1 FROM wpall_home_decor.user_coupons WHERE user_id = v_uid AND coupon_id = v_coupon.id) THEN
    RAISE EXCEPTION 'Coupon already claimed';
  END IF;
  INSERT INTO wpall_home_decor.user_coupons (user_id, coupon_id) VALUES (v_uid, v_coupon.id);
  RETURN jsonb_build_object('ok', true, 'coupon_id', v_coupon.id, 'title', v_coupon.title);
END $$;

GRANT EXECUTE ON FUNCTION wpall_home_decor.claim_coupon(text) TO authenticated;

-- === 20260603055945_270dbd47-45f4-4328-8ab8-33451173616e.sql ===
-- 1) Coupons: restrict read to authenticated
DROP POLICY IF EXISTS "anyone read active coupons" ON wpall_home_decor.coupons;
CREATE POLICY "authenticated read active coupons"
  ON wpall_home_decor.coupons FOR SELECT TO authenticated
  USING (is_active OR wpall_home_decor.has_role(auth.uid(), 'admin'));
REVOKE SELECT ON wpall_home_decor.coupons FROM anon;

-- 2) Profiles: prevent customers from changing tier/tier_override
CREATE OR REPLACE FUNCTION wpall_home_decor.prevent_profile_tier_self_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF wpall_home_decor.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.tier IS DISTINCT FROM OLD.tier THEN
    NEW.tier := OLD.tier;
  END IF;
  IF NEW.tier_override IS DISTINCT FROM OLD.tier_override THEN
    NEW.tier_override := OLD.tier_override;
  END IF;
  IF NEW.total_spent IS DISTINCT FROM OLD.total_spent THEN
    NEW.total_spent := OLD.total_spent;
  END IF;
  IF NEW.order_count IS DISTINCT FROM OLD.order_count THEN
    NEW.order_count := OLD.order_count;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_prevent_profile_tier_self_update ON wpall_home_decor.profiles;
CREATE TRIGGER trg_prevent_profile_tier_self_update
  BEFORE UPDATE ON wpall_home_decor.profiles
  FOR EACH ROW EXECUTE FUNCTION wpall_home_decor.prevent_profile_tier_self_update();

-- 3) Topup requests: prevent customers from changing sensitive columns
CREATE OR REPLACE FUNCTION wpall_home_decor.guard_topup_user_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF wpall_home_decor.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  -- Non-admin can only modify slip_url, reference_note, and cancel status
  NEW.amount := OLD.amount;
  NEW.method := OLD.method;
  NEW.approved_at := OLD.approved_at;
  NEW.approved_by := OLD.approved_by;
  NEW.user_id := OLD.user_id;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('pending','cancelled') THEN
    RAISE EXCEPTION 'Customers may only cancel a pending topup';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_topup_user_update ON wpall_home_decor.topup_requests;
CREATE TRIGGER trg_guard_topup_user_update
  BEFORE UPDATE ON wpall_home_decor.topup_requests
  FOR EACH ROW EXECUTE FUNCTION wpall_home_decor.guard_topup_user_update();

-- 4) order_items: explicit admin-only UPDATE/DELETE
CREATE POLICY "admin update order_items"
  ON wpall_home_decor.order_items FOR UPDATE TO authenticated
  USING (wpall_home_decor.has_role(auth.uid(), 'admin'))
  WITH CHECK (wpall_home_decor.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete order_items"
  ON wpall_home_decor.order_items FOR DELETE TO authenticated
  USING (wpall_home_decor.has_role(auth.uid(), 'admin'));

-- 5) Storage: drop broad listing policy on public product-images bucket
-- (Public file URLs continue to work via the public bucket CDN)
DROP POLICY IF EXISTS "whd product-images public read" ON storage.objects;

-- 6) Lock down SECURITY DEFINER helpers from direct API calls;
-- keep EXECUTE only for the user-facing RPCs the app calls intentionally.
REVOKE EXECUTE ON FUNCTION wpall_home_decor.has_role(uuid, app_role) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION wpall_home_decor.recalc_tier(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION wpall_home_decor.compute_tier(numeric, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION wpall_home_decor.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION wpall_home_decor.on_order_status_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION wpall_home_decor.handle_topup_approval() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION wpall_home_decor.log_product_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION wpall_home_decor.set_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION wpall_home_decor.prevent_profile_tier_self_update() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION wpall_home_decor.guard_topup_user_update() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION wpall_home_decor.admin_adjust_wallet(uuid, numeric, text) FROM anon;
-- pay_with_wallet, claim_coupon: keep EXECUTE for authenticated (called by app)
REVOKE EXECUTE ON FUNCTION wpall_home_decor.pay_with_wallet(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION wpall_home_decor.claim_coupon(text) FROM anon;
REVOKE EXECUTE ON FUNCTION wpall_home_decor.resolve_product_price(uuid, customer_tier) FROM anon;

-- === 20260603060021_5fa7b309-57eb-42cb-94b6-c980ccd98207.sql ===
-- has_role is referenced inside RLS USING expressions, so authenticated needs EXECUTE.
GRANT EXECUTE ON FUNCTION wpall_home_decor.has_role(uuid, app_role) TO authenticated, anon;
-- resolve_product_price may be called by client for pricing previews
GRANT EXECUTE ON FUNCTION wpall_home_decor.resolve_product_price(uuid, customer_tier) TO authenticated;

-- === 20260603063032_dc063117-8056-4e51-9473-58ef3e584959.sql ===
-- Hide internal cost columns from anonymous users (column-level privileges).
-- Authenticated users (incl. admins via admin UI) keep access for editing.
REVOKE SELECT (cost_price) ON wpall_home_decor.products FROM anon;
REVOKE SELECT (cost_per_meter) ON wpall_home_decor.fabrics FROM anon;

-- Also hide fabric cost from regular authenticated users; only service_role
-- and admin-side flows need it, and the fabrics table currently has no
-- non-admin consumer in the app code.
REVOKE SELECT (cost_per_meter) ON wpall_home_decor.fabrics FROM authenticated;
GRANT SELECT (cost_per_meter) ON wpall_home_decor.fabrics TO service_role;

-- Restrict product_files reads to authenticated users (was: anyone).
DROP POLICY IF EXISTS "anyone read product files" ON wpall_home_decor.product_files;
CREATE POLICY "authenticated read current product files"
ON wpall_home_decor.product_files
FOR SELECT
TO authenticated
USING (is_current = true OR has_role(auth.uid(), 'admin'::app_role));

-- Restrict storage reads of product-files bucket to authenticated users.
DROP POLICY IF EXISTS "whd anyone read product files objects" ON storage.objects;
CREATE POLICY "whd authenticated read product files objects"
  ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'product-files');

-- === 20260604044215_6a9fa0a4-3146-44ac-81e6-606dd3920dfd.sql ===
-- Attribute groups (e.g. Wood Finish, Ladder Tape)
CREATE TABLE wpall_home_decor.attribute_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  display_type text NOT NULL DEFAULT 'color_swatch' CHECK (display_type IN ('color_swatch','image_button','dropdown')),
  description text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON wpall_home_decor.attribute_groups TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON wpall_home_decor.attribute_groups TO authenticated;
GRANT ALL ON wpall_home_decor.attribute_groups TO service_role;
ALTER TABLE wpall_home_decor.attribute_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read active attribute_groups" ON wpall_home_decor.attribute_groups
  FOR SELECT TO anon, authenticated USING (is_active OR wpall_home_decor.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage attribute_groups" ON wpall_home_decor.attribute_groups
  FOR ALL TO authenticated USING (wpall_home_decor.has_role(auth.uid(),'admin')) WITH CHECK (wpall_home_decor.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_attribute_groups_updated BEFORE UPDATE ON wpall_home_decor.attribute_groups FOR EACH ROW EXECUTE FUNCTION wpall_home_decor.set_updated_at();

-- Attribute options inside groups
CREATE TABLE wpall_home_decor.attribute_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES wpall_home_decor.attribute_groups(id) ON DELETE CASCADE,
  label text NOT NULL,
  swatch_color text,
  image_url text,
  price_delta numeric NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_attribute_options_group ON wpall_home_decor.attribute_options(group_id);
GRANT SELECT ON wpall_home_decor.attribute_options TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON wpall_home_decor.attribute_options TO authenticated;
GRANT ALL ON wpall_home_decor.attribute_options TO service_role;
ALTER TABLE wpall_home_decor.attribute_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read active attribute_options" ON wpall_home_decor.attribute_options
  FOR SELECT TO anon, authenticated USING (is_active OR wpall_home_decor.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage attribute_options" ON wpall_home_decor.attribute_options
  FOR ALL TO authenticated USING (wpall_home_decor.has_role(auth.uid(),'admin')) WITH CHECK (wpall_home_decor.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_attribute_options_updated BEFORE UPDATE ON wpall_home_decor.attribute_options FOR EACH ROW EXECUTE FUNCTION wpall_home_decor.set_updated_at();

-- Hotspots placed on a product image
CREATE TABLE wpall_home_decor.product_hotspots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES wpall_home_decor.products(id) ON DELETE CASCADE,
  attribute_group_id uuid NOT NULL REFERENCES wpall_home_decor.attribute_groups(id) ON DELETE CASCADE,
  pin_label text NOT NULL,
  coord_x numeric NOT NULL CHECK (coord_x >= 0 AND coord_x <= 100),
  coord_y numeric NOT NULL CHECK (coord_y >= 0 AND coord_y <= 100),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_hotspots_product ON wpall_home_decor.product_hotspots(product_id);
GRANT SELECT ON wpall_home_decor.product_hotspots TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON wpall_home_decor.product_hotspots TO authenticated;
GRANT ALL ON wpall_home_decor.product_hotspots TO service_role;
ALTER TABLE wpall_home_decor.product_hotspots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read product_hotspots" ON wpall_home_decor.product_hotspots
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage product_hotspots" ON wpall_home_decor.product_hotspots
  FOR ALL TO authenticated USING (wpall_home_decor.has_role(auth.uid(),'admin')) WITH CHECK (wpall_home_decor.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_product_hotspots_updated BEFORE UPDATE ON wpall_home_decor.product_hotspots FOR EACH ROW EXECUTE FUNCTION wpall_home_decor.set_updated_at();

-- === 20260604051937_f0e190b8-5715-4a4d-81c4-278cf9c987b7.sql ===
CREATE OR REPLACE FUNCTION wpall_home_decor.guard_topup_user_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF wpall_home_decor.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  -- Non-admin customers may NOT change financial/identity fields after insert.
  NEW.amount := OLD.amount;
  NEW.method := OLD.method;
  NEW.slip_url := OLD.slip_url;
  NEW.reference_note := OLD.reference_note;
  NEW.approved_at := OLD.approved_at;
  NEW.approved_by := OLD.approved_by;
  NEW.user_id := OLD.user_id;
  NEW.rejected_reason := OLD.rejected_reason;
  -- Customers may only cancel a pending topup.
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('pending','cancelled') THEN
    RAISE EXCEPTION 'Customers may only cancel a pending topup';
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_guard_topup_user_update ON wpall_home_decor.topup_requests;
CREATE TRIGGER trg_guard_topup_user_update
  BEFORE UPDATE ON wpall_home_decor.topup_requests
  FOR EACH ROW EXECUTE FUNCTION wpall_home_decor.guard_topup_user_update();

-- === 20260604055825_c4b4ed01-857e-4a30-93e6-94d634abd437.sql ===
-- Hide fabric cost price from non-admin users via column-level revoke
REVOKE SELECT (cost_per_meter) ON wpall_home_decor.fabrics FROM authenticated;
REVOKE SELECT (cost_per_meter) ON wpall_home_decor.fabrics FROM anon;
-- service_role retains full access; admin can still read via service_role/admin code paths

-- === 20260604061131_914e4a12-a8b5-42e5-a660-dc8145d01b5e.sql ===
-- 1) promo_cards
CREATE TABLE wpall_home_decor.promo_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  tone text NOT NULL DEFAULT 'teal',
  link_url text NOT NULL DEFAULT '/products',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON wpall_home_decor.promo_cards TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON wpall_home_decor.promo_cards TO authenticated;
GRANT ALL ON wpall_home_decor.promo_cards TO service_role;
ALTER TABLE wpall_home_decor.promo_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read active promo_cards" ON wpall_home_decor.promo_cards FOR SELECT TO anon, authenticated USING (is_active OR wpall_home_decor.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage promo_cards" ON wpall_home_decor.promo_cards FOR ALL TO authenticated USING (wpall_home_decor.has_role(auth.uid(), 'admin')) WITH CHECK (wpall_home_decor.has_role(auth.uid(), 'admin'));
CREATE TRIGGER set_promo_cards_updated_at BEFORE UPDATE ON wpall_home_decor.promo_cards FOR EACH ROW EXECUTE FUNCTION wpall_home_decor.set_updated_at();

-- 2) service_icons
CREATE TABLE wpall_home_decor.service_icons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  icon text NOT NULL DEFAULT 'Sparkles',
  link_url text NOT NULL DEFAULT '/products',
  tone text NOT NULL DEFAULT 'teal',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON wpall_home_decor.service_icons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON wpall_home_decor.service_icons TO authenticated;
GRANT ALL ON wpall_home_decor.service_icons TO service_role;
ALTER TABLE wpall_home_decor.service_icons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read active service_icons" ON wpall_home_decor.service_icons FOR SELECT TO anon, authenticated USING (is_active OR wpall_home_decor.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage service_icons" ON wpall_home_decor.service_icons FOR ALL TO authenticated USING (wpall_home_decor.has_role(auth.uid(), 'admin')) WITH CHECK (wpall_home_decor.has_role(auth.uid(), 'admin'));
CREATE TRIGGER set_service_icons_updated_at BEFORE UPDATE ON wpall_home_decor.service_icons FOR EACH ROW EXECUTE FUNCTION wpall_home_decor.set_updated_at();

-- 3) site_settings
CREATE TABLE wpall_home_decor.site_settings (
  key text PRIMARY KEY,
  brand_name text NOT NULL DEFAULT 'WP ALL',
  tagline text,
  phone text,
  email text,
  address text,
  facebook_url text,
  line_url text,
  instagram_url text,
  tiktok_url text,
  about_html text,
  contact_note text,
  logo_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON wpall_home_decor.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON wpall_home_decor.site_settings TO authenticated;
GRANT ALL ON wpall_home_decor.site_settings TO service_role;
ALTER TABLE wpall_home_decor.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read site_settings" ON wpall_home_decor.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage site_settings" ON wpall_home_decor.site_settings FOR ALL TO authenticated USING (wpall_home_decor.has_role(auth.uid(), 'admin')) WITH CHECK (wpall_home_decor.has_role(auth.uid(), 'admin'));
CREATE TRIGGER set_site_settings_updated_at BEFORE UPDATE ON wpall_home_decor.site_settings FOR EACH ROW EXECUTE FUNCTION wpall_home_decor.set_updated_at();

-- 4) tracks
CREATE TABLE wpall_home_decor.tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'show',
  price_per_meter numeric NOT NULL DEFAULT 0,
  cost_per_meter numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON wpall_home_decor.tracks TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON wpall_home_decor.tracks TO authenticated;
GRANT ALL ON wpall_home_decor.tracks TO service_role;
REVOKE SELECT (cost_per_meter) ON wpall_home_decor.tracks FROM anon, authenticated;
ALTER TABLE wpall_home_decor.tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read active tracks" ON wpall_home_decor.tracks FOR SELECT TO anon, authenticated USING (is_active OR wpall_home_decor.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage tracks" ON wpall_home_decor.tracks FOR ALL TO authenticated USING (wpall_home_decor.has_role(auth.uid(), 'admin')) WITH CHECK (wpall_home_decor.has_role(auth.uid(), 'admin'));
CREATE TRIGGER set_tracks_updated_at BEFORE UPDATE ON wpall_home_decor.tracks FOR EACH ROW EXECUTE FUNCTION wpall_home_decor.set_updated_at();

-- 5) accessories
CREATE TABLE wpall_home_decor.accessories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  cost numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON wpall_home_decor.accessories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON wpall_home_decor.accessories TO authenticated;
GRANT ALL ON wpall_home_decor.accessories TO service_role;
REVOKE SELECT (cost) ON wpall_home_decor.accessories FROM anon, authenticated;
ALTER TABLE wpall_home_decor.accessories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read active accessories" ON wpall_home_decor.accessories FOR SELECT TO anon, authenticated USING (is_active OR wpall_home_decor.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage accessories" ON wpall_home_decor.accessories FOR ALL TO authenticated USING (wpall_home_decor.has_role(auth.uid(), 'admin')) WITH CHECK (wpall_home_decor.has_role(auth.uid(), 'admin'));
CREATE TRIGGER set_accessories_updated_at BEFORE UPDATE ON wpall_home_decor.accessories FOR EACH ROW EXECUTE FUNCTION wpall_home_decor.set_updated_at();

-- SEED
INSERT INTO wpall_home_decor.site_settings (key, brand_name, tagline, phone, email, address, facebook_url, line_url, about_html, contact_note)
VALUES ('main', 'WP ALL', 'ม่าน มู่ลี่ ของแต่งบ้าน ครบจบที่เดียว',
  '02-123-4567', 'hello@wpall.co.th',
  '123 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110',
  'https://facebook.com/wpall', 'https://line.me/R/ti/p/@wpall',
  'WP ALL ผู้ผลิตและจำหน่ายผ้าม่าน มู่ลี่ ของแต่งบ้านครบวงจร ออกแบบ วัด ผลิต ติดตั้งถึงบ้าน ประสบการณ์ 15+ ปี โรงงานเอง คุณภาพระดับโรงแรม ราคาตรงจากผู้ผลิต',
  'เปิดบริการ จ-ส 9:00-18:00 ปิดวันอาทิตย์');

INSERT INTO wpall_home_decor.promo_cards (title, subtitle, tone, link_url, sort_order) VALUES
  ('จับคู่ลดสุดคุ้ม', 'ม่าน + ราง รับส่วนลดเพิ่ม 15%', 'cream', '/products', 1),
  ('WP จัดให้', 'ของดีราคาเด็ด เฉพาะสัปดาห์นี้', 'teal', '/products', 2),
  ('โปรแรง', 'กดเพื่อดูโปรโมชั่นทั้งหมด', 'orange', '/products', 3),
  ('สมาชิกใหม่', 'รับคูปองรวม 600 บาท', 'blue', '/signup', 4);

INSERT INTO wpall_home_decor.service_icons (label, icon, link_url, tone, sort_order) VALUES
  ('วัดหน้าต่างฟรี', 'Ruler', '/products', 'teal', 1),
  ('ติดตั้งถึงบ้าน', 'Wrench', '/products', 'orange', 2),
  ('คำนวณราคา', 'Calculator', '/products', 'teal', 3),
  ('คูปองของฉัน', 'Ticket', '/account/coupons', 'orange', 4),
  ('โปรแรง', 'Flame', '/products', 'orange', 5),
  ('แนะนำสุดฮิต', 'Sparkles', '/products', 'teal', 6),
  ('ข่าวสาร', 'Newspaper', '/', 'teal', 7);

INSERT INTO wpall_home_decor.tracks (code, name, type, price_per_meter, cost_per_meter, sort_order) VALUES
  ('TR-SHOW', 'รางโชว์อลูมิเนียม', 'show', 350, 200, 1),
  ('TR-CONC', 'รางเอ็มซ่อน', 'concealed', 220, 120, 2),
  ('TR-MOTOR', 'รางมอเตอร์ไฟฟ้า', 'motorized', 1800, 1100, 3);

INSERT INTO wpall_home_decor.accessories (name, price, cost, sort_order) VALUES
  ('ตะขอเกี่ยวม่าน (ชุด)', 120, 60, 1),
  ('สายดึงม่าน', 80, 35, 2),
  ('ตัวรองพื้นกันลม', 150, 80, 3),
  ('รีโมทควบคุม', 1200, 700, 4);

INSERT INTO wpall_home_decor.fabrics (code, name, color, price_per_meter, cost_per_meter, roll_width_cm, swatch)
SELECT * FROM (VALUES
  ('VL-101', 'Velvet Lux', 'Sage Green', 480::numeric, 280::numeric, 280, '#9ab59a'),
  ('VL-102', 'Velvet Lux', 'Dusty Pink', 480::numeric, 280::numeric, 280, '#d9a9a9'),
  ('LN-203', 'Linen Natural', 'Cream', 320::numeric, 180::numeric, 300, '#efe6d4'),
  ('BO-410', 'Blackout Premium', 'Charcoal', 620::numeric, 360::numeric, 280, '#3a3a3a'),
  ('SK-501', 'Silk Shine', 'Champagne', 780::numeric, 460::numeric, 280, '#e8d9b0'),
  ('CT-302', 'Cotton Plain', 'Sky', 280::numeric, 150::numeric, 300, '#bcd6e5')
) AS s(code, name, color, price_per_meter, cost_per_meter, roll_width_cm, swatch)
WHERE NOT EXISTS (SELECT 1 FROM wpall_home_decor.fabrics f WHERE f.code = s.code);

-- === 20260604063145_d963dedc-ec25-455a-989e-8ea8e4c05092.sql ===
-- 1) Revoke cost columns from public/customer roles
REVOKE SELECT (cost_price) ON wpall_home_decor.products FROM anon, authenticated;
REVOKE SELECT (cost_per_meter) ON wpall_home_decor.tracks FROM anon, authenticated;
REVOKE SELECT (cost) ON wpall_home_decor.accessories FROM anon, authenticated;
GRANT SELECT (cost_price) ON wpall_home_decor.products TO service_role;
GRANT SELECT (cost_per_meter) ON wpall_home_decor.tracks TO service_role;
GRANT SELECT (cost) ON wpall_home_decor.accessories TO service_role;

-- 2) Admin-only security-definer accessors that return full rows including cost
CREATE OR REPLACE FUNCTION wpall_home_decor.admin_list_tracks()
RETURNS SETOF wpall_home_decor.tracks
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM wpall_home_decor.tracks
  WHERE wpall_home_decor.has_role(auth.uid(), 'admin')
  ORDER BY sort_order;
$$;

CREATE OR REPLACE FUNCTION wpall_home_decor.admin_list_accessories()
RETURNS SETOF wpall_home_decor.accessories
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM wpall_home_decor.accessories
  WHERE wpall_home_decor.has_role(auth.uid(), 'admin')
  ORDER BY sort_order;
$$;

CREATE OR REPLACE FUNCTION wpall_home_decor.admin_get_product(_id uuid)
RETURNS SETOF wpall_home_decor.products
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM wpall_home_decor.products
  WHERE id = _id AND wpall_home_decor.has_role(auth.uid(), 'admin');
$$;

REVOKE EXECUTE ON FUNCTION wpall_home_decor.admin_list_tracks() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION wpall_home_decor.admin_list_accessories() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION wpall_home_decor.admin_get_product(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION wpall_home_decor.admin_list_tracks() TO authenticated;
GRANT EXECUTE ON FUNCTION wpall_home_decor.admin_list_accessories() TO authenticated;
GRANT EXECUTE ON FUNCTION wpall_home_decor.admin_get_product(uuid) TO authenticated;

-- 3) Prevent customers from self-approving their own reviews
CREATE OR REPLACE FUNCTION wpall_home_decor.guard_review_self_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF wpall_home_decor.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  -- Non-admins may never flip is_approved to true, and cannot change it after creation.
  NEW.is_approved := OLD.is_approved;
  RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION wpall_home_decor.guard_review_self_approval() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_review_self_approval ON wpall_home_decor.reviews;
CREATE TRIGGER trg_guard_review_self_approval
BEFORE UPDATE ON wpall_home_decor.reviews
FOR EACH ROW EXECUTE FUNCTION wpall_home_decor.guard_review_self_approval();

-- Also force inserts by non-admins to start unapproved (moderation queue)
CREATE OR REPLACE FUNCTION wpall_home_decor.guard_review_insert_default()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT wpall_home_decor.has_role(auth.uid(), 'admin') THEN
    NEW.is_approved := false;
  END IF;
  RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION wpall_home_decor.guard_review_insert_default() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_review_insert_default ON wpall_home_decor.reviews;
CREATE TRIGGER trg_guard_review_insert_default
BEFORE INSERT ON wpall_home_decor.reviews
FOR EACH ROW EXECUTE FUNCTION wpall_home_decor.guard_review_insert_default();




-- from 20260615200000_wpall_shop_ecommerce_cart_payments_stock.sql

-- WP ALL e-commerce: carts, payment slips, coupons at checkout, stock, backoffice sync

-- Forwarded status for backoffice webhook
ALTER TYPE wpall_home_decor.order_status ADD VALUE IF NOT EXISTS 'forwarded' AFTER 'paid';

CREATE TYPE wpall_home_decor.payment_slip_status AS ENUM ('pending', 'approved', 'rejected');

-- ============ CARTS ============
CREATE TABLE IF NOT EXISTS wpall_home_decor.carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT carts_user_or_session CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS carts_user_id_unique ON wpall_home_decor.carts(user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS carts_session_id_unique ON wpall_home_decor.carts(session_id)
  WHERE session_id IS NOT NULL AND user_id IS NULL;

CREATE TABLE IF NOT EXISTS wpall_home_decor.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES wpall_home_decor.carts(id) ON DELETE CASCADE,
  product_id uuid REFERENCES wpall_home_decor.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  qty integer NOT NULL DEFAULT 1 CHECK (qty > 0 AND qty <= 999),
  unit_price numeric NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  line_total numeric NOT NULL DEFAULT 0 CHECK (line_total >= 0),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cart_items_cart_id_idx ON wpall_home_decor.cart_items(cart_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON wpall_home_decor.carts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON wpall_home_decor.cart_items TO authenticated;
GRANT ALL ON wpall_home_decor.carts TO service_role;
GRANT ALL ON wpall_home_decor.cart_items TO service_role;
ALTER TABLE wpall_home_decor.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wpall_home_decor.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own cart" ON wpall_home_decor.carts FOR ALL TO authenticated
  USING (user_id = auth.uid() OR wpall_home_decor.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR wpall_home_decor.has_role(auth.uid(), 'admin'));

CREATE POLICY "own cart items" ON wpall_home_decor.cart_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wpall_home_decor.carts c
      WHERE c.id = cart_id AND (c.user_id = auth.uid() OR wpall_home_decor.has_role(auth.uid(), 'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wpall_home_decor.carts c
      WHERE c.id = cart_id AND (c.user_id = auth.uid() OR wpall_home_decor.has_role(auth.uid(), 'admin'))
    )
  );

CREATE TRIGGER trg_carts_updated BEFORE UPDATE ON wpall_home_decor.carts
  FOR EACH ROW EXECUTE FUNCTION wpall_home_decor.set_updated_at();

-- ============ ORDERS EXTENSIONS ============
ALTER TABLE wpall_home_decor.orders
  ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES wpall_home_decor.coupons(id),
  ADD COLUMN IF NOT EXISTS shipping_address_id uuid REFERENCES wpall_home_decor.addresses(id),
  ADD COLUMN IF NOT EXISTS shipping_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_reserved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS backoffice_forwarded_at timestamptz,
  ADD COLUMN IF NOT EXISTS backoffice_forward_error text,
  ADD COLUMN IF NOT EXISTS backoffice_refs jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ============ PAYMENT SLIPS ============
CREATE TABLE IF NOT EXISTS wpall_home_decor.payment_slips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES wpall_home_decor.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  slip_url text NOT NULL,
  status wpall_home_decor.payment_slip_status NOT NULL DEFAULT 'pending',
  rejected_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_slips_order_id_idx ON wpall_home_decor.payment_slips(order_id);
CREATE INDEX IF NOT EXISTS payment_slips_status_idx ON wpall_home_decor.payment_slips(status);

GRANT SELECT, INSERT ON wpall_home_decor.payment_slips TO authenticated;
GRANT UPDATE ON wpall_home_decor.payment_slips TO authenticated;
GRANT ALL ON wpall_home_decor.payment_slips TO service_role;
ALTER TABLE wpall_home_decor.payment_slips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own payment slips read" ON wpall_home_decor.payment_slips FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR wpall_home_decor.has_role(auth.uid(), 'admin'));
CREATE POLICY "create own payment slip" ON wpall_home_decor.payment_slips FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin update payment slips" ON wpall_home_decor.payment_slips FOR UPDATE TO authenticated
  USING (wpall_home_decor.has_role(auth.uid(), 'admin'))
  WITH CHECK (wpall_home_decor.has_role(auth.uid(), 'admin'));

-- ============ STORAGE: payment-slips bucket ============
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-slips', 'payment-slips', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "whd user upload payment slip" ON storage.objects; CREATE POLICY "whd user upload payment slip"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-slips' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "whd user read payment slip" ON storage.objects; CREATE POLICY "whd user read payment slip"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-slips'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR wpall_home_decor.has_role(auth.uid(), 'admin'))
  );

-- ============ STOCK: reserve / release ============
CREATE OR REPLACE FUNCTION wpall_home_decor.reserve_order_stock(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_home_decor
AS $$
DECLARE
  v_item record;
  v_product record;
  v_fabric record;
  v_meters numeric;
  v_width numeric;
  v_height numeric;
  v_fullness numeric;
BEGIN
  IF EXISTS (SELECT 1 FROM wpall_home_decor.orders WHERE id = _order_id AND stock_reserved) THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true);
  END IF;

  FOR v_item IN SELECT * FROM wpall_home_decor.order_items WHERE order_id = _order_id LOOP
    IF v_item.product_id IS NOT NULL THEN
      SELECT id, stock, kind INTO v_product FROM wpall_home_decor.products WHERE id = v_item.product_id FOR UPDATE;
      IF v_product.id IS NOT NULL AND v_product.stock IS NOT NULL THEN
        IF v_product.stock > 0 AND v_product.stock < v_item.qty THEN
          RAISE EXCEPTION 'สินค้า % สต๊อกไม่พอ (เหลือ %)', v_item.product_name, v_product.stock;
        END IF;
        IF v_product.stock > 0 THEN
          UPDATE wpall_home_decor.products SET stock = stock - v_item.qty, updated_at = now()
          WHERE id = v_product.id;
        END IF;
      END IF;
    END IF;

    v_width := COALESCE((v_item.config->>'widthCm')::numeric, (v_item.config->>'width_cm')::numeric, 0);
    v_height := COALESCE((v_item.config->>'heightCm')::numeric, (v_item.config->>'height_cm')::numeric, 0);
    v_fullness := COALESCE((v_item.config->>'fullness')::numeric, 2.5);
    v_meters := (v_width * v_height / 10000.0) * v_fullness * v_item.qty;

    IF (v_item.config->>'fabricId') IS NOT NULL AND (v_item.config->>'fabricId') <> '' THEN
      SELECT id, stock_meters INTO v_fabric FROM wpall_home_decor.fabrics
      WHERE id = (v_item.config->>'fabricId')::uuid FOR UPDATE;
      IF v_fabric.id IS NOT NULL AND v_fabric.stock_meters > 0 THEN
        IF v_fabric.stock_meters < v_meters THEN
          RAISE EXCEPTION 'ผ้า % สต๊อกไม่พอ', v_item.config->>'fabricId';
        END IF;
        UPDATE wpall_home_decor.fabrics SET stock_meters = stock_meters - v_meters, updated_at = now()
        WHERE id = v_fabric.id;
      END IF;
    END IF;
  END LOOP;

  UPDATE wpall_home_decor.orders SET stock_reserved = true, updated_at = now() WHERE id = _order_id;
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION wpall_home_decor.release_order_stock(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_home_decor
AS $$
DECLARE
  v_item record;
  v_product record;
  v_fabric record;
  v_meters numeric;
  v_width numeric;
  v_height numeric;
  v_fullness numeric;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM wpall_home_decor.orders WHERE id = _order_id AND stock_reserved) THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true);
  END IF;

  FOR v_item IN SELECT * FROM wpall_home_decor.order_items WHERE order_id = _order_id LOOP
    IF v_item.product_id IS NOT NULL THEN
      SELECT id, stock INTO v_product FROM wpall_home_decor.products WHERE id = v_item.product_id;
      IF v_product.id IS NOT NULL AND v_product.stock IS NOT NULL AND v_product.stock >= 0 THEN
        UPDATE wpall_home_decor.products SET stock = stock + v_item.qty, updated_at = now()
        WHERE id = v_product.id;
      END IF;
    END IF;

    v_width := COALESCE((v_item.config->>'widthCm')::numeric, (v_item.config->>'width_cm')::numeric, 0);
    v_height := COALESCE((v_item.config->>'heightCm')::numeric, (v_item.config->>'height_cm')::numeric, 0);
    v_fullness := COALESCE((v_item.config->>'fullness')::numeric, 2.5);
    v_meters := (v_width * v_height / 10000.0) * v_fullness * v_item.qty;

    IF (v_item.config->>'fabricId') IS NOT NULL AND (v_item.config->>'fabricId') <> '' THEN
      SELECT id INTO v_fabric FROM wpall_home_decor.fabrics WHERE id = (v_item.config->>'fabricId')::uuid;
      IF v_fabric.id IS NOT NULL THEN
        UPDATE wpall_home_decor.fabrics SET stock_meters = stock_meters + v_meters, updated_at = now()
        WHERE id = v_fabric.id;
      END IF;
    END IF;
  END LOOP;

  UPDATE wpall_home_decor.orders SET stock_reserved = false, updated_at = now() WHERE id = _order_id;
  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE EXECUTE ON FUNCTION wpall_home_decor.reserve_order_stock(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION wpall_home_decor.release_order_stock(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION wpall_home_decor.reserve_order_stock(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION wpall_home_decor.release_order_stock(uuid) TO authenticated, service_role;

-- ============ COUPON REDEMPTION ============
CREATE OR REPLACE FUNCTION wpall_home_decor.redeem_coupon_for_order(_user_coupon_id uuid, _order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_home_decor
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_uc wpall_home_decor.user_coupons%ROWTYPE;
  v_coupon wpall_home_decor.coupons%ROWTYPE;
  v_order wpall_home_decor.orders%ROWTYPE;
  v_discount numeric := 0;
  v_subtotal numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_order FROM wpall_home_decor.orders WHERE id = _order_id FOR UPDATE;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.user_id <> v_uid THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF v_order.status <> 'pending_payment' THEN RAISE EXCEPTION 'Order is not pending payment'; END IF;

  SELECT * INTO v_uc FROM wpall_home_decor.user_coupons WHERE id = _user_coupon_id AND user_id = v_uid FOR UPDATE;
  IF v_uc.id IS NULL THEN RAISE EXCEPTION 'Coupon not found'; END IF;
  IF v_uc.used_at IS NOT NULL THEN RAISE EXCEPTION 'Coupon already used'; END IF;

  SELECT * INTO v_coupon FROM wpall_home_decor.coupons WHERE id = v_uc.coupon_id;
  IF NOT v_coupon.is_active THEN RAISE EXCEPTION 'Coupon inactive'; END IF;
  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
    RAISE EXCEPTION 'Coupon expired';
  END IF;

  v_subtotal := v_order.subtotal;
  IF v_subtotal < v_coupon.min_order THEN
    RAISE EXCEPTION 'Order below minimum for coupon';
  END IF;

  IF v_coupon.type = 'percent' THEN
    v_discount := v_subtotal * (v_coupon.value / 100.0);
    IF v_coupon.max_discount IS NOT NULL THEN
      v_discount := LEAST(v_discount, v_coupon.max_discount);
    END IF;
  ELSIF v_coupon.type = 'fixed' THEN
    v_discount := LEAST(v_coupon.value, v_subtotal);
  ELSIF v_coupon.type = 'free_shipping' THEN
    v_discount := v_order.shipping_fee;
  END IF;

  UPDATE wpall_home_decor.user_coupons SET used_at = now(), order_id = _order_id WHERE id = _user_coupon_id;
  UPDATE wpall_home_decor.coupons SET used_count = used_count + 1 WHERE id = v_coupon.id;

  UPDATE wpall_home_decor.orders SET
    coupon_id = v_coupon.id,
    discount = v_order.discount + v_discount,
    grand_total = GREATEST(0, v_order.subtotal - (v_order.discount + v_discount) + v_order.vat_amount),
    updated_at = now()
  WHERE id = _order_id;

  RETURN jsonb_build_object('ok', true, 'discount', v_discount, 'coupon_id', v_coupon.id);
END $$;

GRANT EXECUTE ON FUNCTION wpall_home_decor.redeem_coupon_for_order(uuid, uuid) TO authenticated;

-- ============ CONFIRM PAYMENT (admin) ============
CREATE OR REPLACE FUNCTION wpall_home_decor.confirm_order_payment(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_home_decor
AS $$
DECLARE
  v_order wpall_home_decor.orders%ROWTYPE;
BEGIN
  IF NOT wpall_home_decor.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO v_order FROM wpall_home_decor.orders WHERE id = _order_id FOR UPDATE;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.status <> 'pending_payment' THEN RAISE EXCEPTION 'Order is not pending payment'; END IF;

  UPDATE wpall_home_decor.orders SET
    status = 'paid',
    paid_at = now(),
    updated_at = now()
  WHERE id = _order_id;

  UPDATE wpall_home_decor.payment_slips SET
    status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = now()
  WHERE order_id = _order_id AND status = 'pending';

  RETURN jsonb_build_object('ok', true, 'order_id', _order_id);
END $$;

GRANT EXECUTE ON FUNCTION wpall_home_decor.confirm_order_payment(uuid) TO authenticated;

-- Update pay_with_wallet to set payment_method explicitly (already does)
-- Reject payment slip on order cancel helper
CREATE OR REPLACE FUNCTION wpall_home_decor.reject_payment_slip(_slip_id uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_home_decor
AS $$
BEGIN
  IF NOT wpall_home_decor.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE wpall_home_decor.payment_slips SET
    status = 'rejected',
    rejected_reason = COALESCE(_reason, 'ปฏิเสธโดยแอดมิน'),
    reviewed_by = auth.uid(),
    reviewed_at = now()
  WHERE id = _slip_id AND status = 'pending';
  RETURN jsonb_build_object('ok', true);
END $$;

GRANT EXECUTE ON FUNCTION wpall_home_decor.reject_payment_slip(uuid, text) TO authenticated;


-- from 20260615210000_refund_order_to_wallet.sql

-- Phase 4: refund to wallet (wpall_home_decor schema)
CREATE OR REPLACE FUNCTION wpall_home_decor.refund_order_to_wallet(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_home_decor
AS $$
DECLARE
  v_order wpall_home_decor.orders%ROWTYPE;
  v_wallet wpall_home_decor.wallets%ROWTYPE;
  v_new_balance numeric;
BEGIN
  IF NOT wpall_home_decor.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;

  SELECT * INTO v_order FROM wpall_home_decor.orders WHERE id = _order_id FOR UPDATE;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.status NOT IN ('paid', 'pending_payment', 'forwarded', 'producing') THEN
    RAISE EXCEPTION 'Order cannot be refunded';
  END IF;

  SELECT * INTO v_wallet FROM wpall_home_decor.wallets WHERE user_id = v_order.user_id FOR UPDATE;
  IF v_wallet.id IS NULL THEN RAISE EXCEPTION 'Wallet not found'; END IF;

  UPDATE wpall_home_decor.wallets
    SET balance = balance + v_order.grand_total, updated_at = now()
    WHERE id = v_wallet.id
    RETURNING balance INTO v_new_balance;

  INSERT INTO wpall_home_decor.wallet_transactions (wallet_id, user_id, type, amount, balance_after, reference_id, note)
    VALUES (v_wallet.id, v_order.user_id, 'refund', v_order.grand_total, v_new_balance, v_order.id,
            'คืนเงินออเดอร์ ' || v_order.order_number);

  PERFORM wpall_home_decor.release_order_stock(_order_id);

  UPDATE wpall_home_decor.orders SET status = 'cancelled', updated_at = now() WHERE id = _order_id;

  RETURN jsonb_build_object('ok', true, 'balance', v_new_balance);
END $$;

GRANT EXECUTE ON FUNCTION wpall_home_decor.refund_order_to_wallet(uuid) TO authenticated;


-- from 20260616180000_wpall_shop_orders_payment_fee.sql

-- wpall_home_decor: order payment fee breakdown

ALTER TABLE wpall_home_decor.orders
  ADD COLUMN IF NOT EXISTS payment_fee numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS base_total numeric(12,2),
  ADD COLUMN IF NOT EXISTS gateway_ref text,
  ADD COLUMN IF NOT EXISTS gateway_transaction_id text;

COMMENT ON COLUMN wpall_home_decor.orders.payment_fee IS 'Surcharge for payment channel (passed to customer when applicable)';
COMMENT ON COLUMN wpall_home_decor.orders.base_total IS 'Subtotal after discount + shipping + VAT, before payment_fee';

UPDATE wpall_home_decor.orders
SET base_total = grand_total - COALESCE(payment_fee, 0)
WHERE base_total IS NULL;


-- from 20260616180100_wpall_shop_site_settings_payment_config.sql

-- wpall_home_decor: payment config in site_settings

ALTER TABLE wpall_home_decor.site_settings
  ADD COLUMN IF NOT EXISTS value jsonb;

INSERT INTO wpall_home_decor.site_settings (key, brand_name, value)
VALUES (
  'payment_info',
  'Payment Info',
  '{"name":"บริษัท ดับบลิวพี เทรดดิ้ง อินเตอร์กรุ๊ป จำกัด","tax_id":"010556405549615","biller_id":"010556405549615","promptpay":"010556405549615","accounts":[{"bank":"ธนาคารกสิกรไทย","account":"167-1-35178-5","type":"ออมทรัพย์"},{"bank":"ธนาคารไทยพาณิชย์","account":"171-4-18448-5","type":"ออมทรัพย์"}],"bank":"ธนาคารกสิกรไทย","account":"167-1-35178-5"}'::jsonb
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

INSERT INTO wpall_home_decor.site_settings (key, brand_name, value)
VALUES (
  'payment_fee_rates',
  'Payment Fee Rates',
  '{"promptpay_direct":0,"wallet":0,"transfer":0,"cod_flat":0,"c2c2p_card":0.0365,"c2c2p_wallet":0.015,"c2c2p_installment":0.05}'::jsonb
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();


-- from 20260616190000_wpall_shop_payment_info_wp_trading.sql

-- wpall_home_decor: WP Trading Intergroup payment details

UPDATE wpall_home_decor.site_settings
SET
  value = '{
    "name": "บริษัท ดับบลิวพี เทรดดิ้ง อินเตอร์กรุ๊ป จำกัด",
    "tax_id": "010556405549615",
    "biller_id": "010556405549615",
    "promptpay": "010556405549615",
    "accounts": [
      {"bank": "ธนาคารกสิกรไทย", "account": "167-1-35178-5", "type": "ออมทรัพย์"},
      {"bank": "ธนาคารไทยพาณิชย์", "account": "171-4-18448-5", "type": "ออมทรัพย์"}
    ],
    "bank": "ธนาคารกสิกรไทย",
    "account": "167-1-35178-5"
  }'::jsonb,
  updated_at = now()
WHERE key = 'payment_info';


-- from 20260616193000_wpall_shop_company_email.sql

-- wpall_home_decor: canonical company contact email info@wpallin1.com

UPDATE wpall_home_decor.site_settings
SET email = 'info@wpallin1.com', updated_at = now()
WHERE key = 'main'
  AND (email IS NULL OR email <> 'info@wpallin1.com');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'site_settings'
  ) THEN
    UPDATE public.site_settings
    SET email = 'info@wpallin1.com', updated_at = now()
    WHERE key = 'main'
      AND (email IS NULL OR email <> 'info@wpallin1.com');
  END IF;
END $$;


-- from 20260616200000_wpall_shop_product_claims.sql

-- Mirror: wpall_home_decor product claims + phone signup

DO $$ BEGIN
  CREATE TYPE wpall_home_decor.claim_status AS ENUM (
    'submitted', 'reviewing', 'approved', 'rejected', 'processing', 'completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE wpall_home_decor.claim_issue_type AS ENUM (
    'defect', 'wrong_item', 'missing', 'warranty', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS wpall_home_decor.product_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number text NOT NULL UNIQUE DEFAULT (
    'CLM-' || to_char(now(), 'YYYYMMDD') || '-' ||
    lpad((floor(random() * 10000))::text, 4, '0')
  ),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES wpall_home_decor.orders(id) ON DELETE SET NULL,
  product_name text NOT NULL DEFAULT '',
  issue_type wpall_home_decor.claim_issue_type NOT NULL DEFAULT 'defect',
  description text NOT NULL DEFAULT '',
  status wpall_home_decor.claim_status NOT NULL DEFAULT 'submitted',
  customer_phone text,
  image_paths jsonb NOT NULL DEFAULT '[]'::jsonb,
  admin_note text,
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_product_claims_user_created
  ON wpall_home_decor.product_claims (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_claims_status
  ON wpall_home_decor.product_claims (status, created_at DESC);

CREATE TABLE IF NOT EXISTS wpall_home_decor.claim_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES wpall_home_decor.product_claims(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claim_comments_claim
  ON wpall_home_decor.claim_comments (claim_id, created_at ASC);

ALTER TABLE wpall_home_decor.product_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE wpall_home_decor.claim_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "claims select own or admin" ON wpall_home_decor.product_claims;
CREATE POLICY "claims select own or admin"
  ON wpall_home_decor.product_claims FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR wpall_home_decor.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "claims insert own" ON wpall_home_decor.product_claims;
CREATE POLICY "claims insert own"
  ON wpall_home_decor.product_claims FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "claims update own submitted" ON wpall_home_decor.product_claims;
CREATE POLICY "claims update own submitted"
  ON wpall_home_decor.product_claims FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'submitted')
  WITH CHECK (user_id = auth.uid() AND status = 'submitted');

DROP POLICY IF EXISTS "claims update admin" ON wpall_home_decor.product_claims;
CREATE POLICY "claims update admin"
  ON wpall_home_decor.product_claims FOR UPDATE TO authenticated
  USING (wpall_home_decor.has_role(auth.uid(), 'admin'))
  WITH CHECK (wpall_home_decor.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "claim_comments select" ON wpall_home_decor.claim_comments;
CREATE POLICY "claim_comments select"
  ON wpall_home_decor.claim_comments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wpall_home_decor.product_claims c
      WHERE c.id = claim_id
        AND (c.user_id = auth.uid() OR wpall_home_decor.has_role(auth.uid(), 'admin'))
    )
  );

DROP POLICY IF EXISTS "claim_comments insert" ON wpall_home_decor.claim_comments;
CREATE POLICY "claim_comments insert"
  ON wpall_home_decor.claim_comments FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM wpall_home_decor.product_claims c
      WHERE c.id = claim_id
        AND (c.user_id = auth.uid() OR wpall_home_decor.has_role(auth.uid(), 'admin'))
    )
  );

GRANT SELECT, INSERT, UPDATE ON wpall_home_decor.product_claims TO authenticated;
GRANT SELECT, INSERT ON wpall_home_decor.claim_comments TO authenticated;

CREATE OR REPLACE FUNCTION wpall_home_decor.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_home_decor, public
AS $$
BEGIN
  INSERT INTO wpall_home_decor.profiles (id, email, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
      'สมาชิก WP ALL'
    ),
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone')
  )
  ON CONFLICT (id) DO UPDATE SET
    phone = COALESCE(EXCLUDED.phone, wpall_home_decor.profiles.phone);
  INSERT INTO wpall_home_decor.user_roles (user_id, role) VALUES (NEW.id, 'customer') ON CONFLICT DO NOTHING;
  INSERT INTO wpall_home_decor.wallets (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION wpall_home_decor.handle_new_user();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'claim-media',
  'claim-media',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "whd claim media upload own folder" ON storage.objects;
CREATE POLICY "whd claim media upload own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'claim-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "whd claim media read own or admin" ON storage.objects;
CREATE POLICY "whd claim media read own or admin"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'claim-media'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR wpall_home_decor.has_role(auth.uid(), 'admin')
    )
  );

DROP POLICY IF EXISTS "whd claim media update own" ON storage.objects;
CREATE POLICY "whd claim media update own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'claim-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- from 20260619120000_wpall_shop_security_hardening.sql

-- wpall_home_decor security hardening: order status guard, stock RPC ownership, customer cancel RPC

-- ============ ORDER STATUS GUARD ============
CREATE OR REPLACE FUNCTION wpall_home_decor.guard_order_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_home_decor
AS $$
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF wpall_home_decor.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Customer may only cancel their own unpaid order
  IF auth.uid() IS NOT NULL
    AND OLD.user_id = auth.uid()
    AND OLD.status IN ('draft', 'pending_payment')
    AND NEW.status = 'cancelled'
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Forbidden order status transition: % -> %', OLD.status, NEW.status;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_order_status ON wpall_home_decor.orders;
CREATE TRIGGER trg_guard_order_status
  BEFORE UPDATE OF status ON wpall_home_decor.orders
  FOR EACH ROW
  EXECUTE FUNCTION wpall_home_decor.guard_order_status_transition();

-- Tighten RLS: replace broad owner UPDATE with cancel-only check
DROP POLICY IF EXISTS "update orders (admin or owner pending)" ON wpall_home_decor.orders;
DROP POLICY IF EXISTS "update orders admin" ON wpall_home_decor.orders;
DROP POLICY IF EXISTS "update orders owner cancel" ON wpall_home_decor.orders;

CREATE POLICY "update orders admin" ON wpall_home_decor.orders
  FOR UPDATE TO authenticated
  USING (wpall_home_decor.has_role(auth.uid(), 'admin'))
  WITH CHECK (wpall_home_decor.has_role(auth.uid(), 'admin'));

CREATE POLICY "update orders owner cancel" ON wpall_home_decor.orders
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status IN ('draft', 'pending_payment'))
  WITH CHECK (user_id = auth.uid() AND status = 'cancelled');

-- ============ CUSTOMER CANCEL RPC (atomic stock release + cancel) ============
CREATE OR REPLACE FUNCTION wpall_home_decor.customer_cancel_order(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_home_decor
AS $$
DECLARE
  v_order wpall_home_decor.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM wpall_home_decor.orders WHERE id = _order_id FOR UPDATE;
  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.user_id <> auth.uid() AND NOT wpall_home_decor.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF v_order.status NOT IN ('draft', 'pending_payment') THEN
    RAISE EXCEPTION 'Order cannot be cancelled in status %', v_order.status;
  END IF;

  PERFORM wpall_home_decor.release_order_stock(_order_id);

  UPDATE wpall_home_decor.orders
  SET status = 'cancelled', updated_at = now()
  WHERE id = _order_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION wpall_home_decor.customer_cancel_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION wpall_home_decor.customer_cancel_order(uuid) TO authenticated, service_role;

-- ============ STOCK RPC OWNERSHIP ============
CREATE OR REPLACE FUNCTION wpall_home_decor.assert_order_caller(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_home_decor
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF wpall_home_decor.has_role(auth.uid(), 'admin') THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM wpall_home_decor.orders
    WHERE id = _order_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION wpall_home_decor.reserve_order_stock(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_home_decor
AS $$
DECLARE
  v_item record;
  v_product record;
  v_fabric record;
  v_meters numeric;
  v_width numeric;
  v_height numeric;
  v_fullness numeric;
BEGIN
  PERFORM wpall_home_decor.assert_order_caller(_order_id);

  IF EXISTS (SELECT 1 FROM wpall_home_decor.orders WHERE id = _order_id AND stock_reserved) THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true);
  END IF;

  FOR v_item IN SELECT * FROM wpall_home_decor.order_items WHERE order_id = _order_id LOOP
    IF v_item.product_id IS NOT NULL THEN
      SELECT id, stock, kind INTO v_product FROM wpall_home_decor.products WHERE id = v_item.product_id FOR UPDATE;
      IF v_product.id IS NOT NULL AND v_product.stock IS NOT NULL THEN
        IF v_product.stock > 0 AND v_product.stock < v_item.qty THEN
          RAISE EXCEPTION 'สินค้า % สต๊อกไม่พอ (เหลือ %)', v_item.product_name, v_product.stock;
        END IF;
        IF v_product.stock > 0 THEN
          UPDATE wpall_home_decor.products SET stock = stock - v_item.qty, updated_at = now()
          WHERE id = v_product.id;
        END IF;
      END IF;
    END IF;

    v_width := COALESCE((v_item.config->>'widthCm')::numeric, (v_item.config->>'width_cm')::numeric, 0);
    v_height := COALESCE((v_item.config->>'heightCm')::numeric, (v_item.config->>'height_cm')::numeric, 0);
    v_fullness := COALESCE((v_item.config->>'fullness')::numeric, 2.5);
    v_meters := (v_width * v_height / 10000.0) * v_fullness * v_item.qty;

    IF (v_item.config->>'fabricId') IS NOT NULL AND (v_item.config->>'fabricId') <> '' THEN
      SELECT id, stock_meters INTO v_fabric FROM wpall_home_decor.fabrics
      WHERE id = (v_item.config->>'fabricId')::uuid FOR UPDATE;
      IF v_fabric.id IS NOT NULL AND v_fabric.stock_meters > 0 THEN
        IF v_fabric.stock_meters < v_meters THEN
          RAISE EXCEPTION 'ผ้า % สต๊อกไม่พอ', v_item.config->>'fabricId';
        END IF;
        UPDATE wpall_home_decor.fabrics SET stock_meters = stock_meters - v_meters, updated_at = now()
        WHERE id = v_fabric.id;
      END IF;
    END IF;
  END LOOP;

  UPDATE wpall_home_decor.orders SET stock_reserved = true, updated_at = now() WHERE id = _order_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION wpall_home_decor.release_order_stock(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_home_decor
AS $$
DECLARE
  v_item record;
  v_product record;
  v_fabric record;
  v_meters numeric;
  v_width numeric;
  v_height numeric;
  v_fullness numeric;
BEGIN
  PERFORM wpall_home_decor.assert_order_caller(_order_id);

  IF NOT EXISTS (SELECT 1 FROM wpall_home_decor.orders WHERE id = _order_id AND stock_reserved) THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true);
  END IF;

  FOR v_item IN SELECT * FROM wpall_home_decor.order_items WHERE order_id = _order_id LOOP
    IF v_item.product_id IS NOT NULL THEN
      SELECT id, stock INTO v_product FROM wpall_home_decor.products WHERE id = v_item.product_id;
      IF v_product.id IS NOT NULL AND v_product.stock IS NOT NULL AND v_product.stock >= 0 THEN
        UPDATE wpall_home_decor.products SET stock = stock + v_item.qty, updated_at = now()
        WHERE id = v_product.id;
      END IF;
    END IF;

    v_width := COALESCE((v_item.config->>'widthCm')::numeric, (v_item.config->>'width_cm')::numeric, 0);
    v_height := COALESCE((v_item.config->>'heightCm')::numeric, (v_item.config->>'height_cm')::numeric, 0);
    v_fullness := COALESCE((v_item.config->>'fullness')::numeric, 2.5);
    v_meters := (v_width * v_height / 10000.0) * v_fullness * v_item.qty;

    IF (v_item.config->>'fabricId') IS NOT NULL AND (v_item.config->>'fabricId') <> '' THEN
      SELECT id INTO v_fabric FROM wpall_home_decor.fabrics WHERE id = (v_item.config->>'fabricId')::uuid;
      IF v_fabric.id IS NOT NULL THEN
        UPDATE wpall_home_decor.fabrics SET stock_meters = stock_meters + v_meters, updated_at = now()
        WHERE id = v_fabric.id;
      END IF;
    END IF;
  END LOOP;

  UPDATE wpall_home_decor.orders SET stock_reserved = false, updated_at = now() WHERE id = _order_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION wpall_home_decor.assert_order_caller(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION wpall_home_decor.assert_order_caller(uuid) TO service_role;


-- from 20260619120100_wpall_shop_performance_indexes.sql

-- wpall_home_decor performance indexes + notification retention helper

CREATE INDEX IF NOT EXISTS orders_user_id_created_at_idx
  ON wpall_home_decor.orders (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS orders_status_idx
  ON wpall_home_decor.orders (status);

CREATE INDEX IF NOT EXISTS notifications_user_read_created_idx
  ON wpall_home_decor.notifications (user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS cart_items_cart_id_idx
  ON wpall_home_decor.cart_items (cart_id);

CREATE INDEX IF NOT EXISTS reviews_product_id_idx
  ON wpall_home_decor.reviews (product_id);

CREATE INDEX IF NOT EXISTS topup_requests_user_status_idx
  ON wpall_home_decor.topup_requests (user_id, status);

CREATE INDEX IF NOT EXISTS favorites_user_id_idx
  ON wpall_home_decor.favorites (user_id);

CREATE INDEX IF NOT EXISTS user_coupons_user_id_idx
  ON wpall_home_decor.user_coupons (user_id);

CREATE INDEX IF NOT EXISTS addresses_user_default_idx
  ON wpall_home_decor.addresses (user_id, is_default);

-- Optional housekeeping: delete read notifications older than 90 days (run via cron)
CREATE OR REPLACE FUNCTION wpall_home_decor.prune_old_notifications(_days integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_home_decor
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT wpall_home_decor.has_role(auth.uid(), 'admin') AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  DELETE FROM wpall_home_decor.notifications
  WHERE is_read = true
    AND created_at < now() - make_interval(days => _days);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION wpall_home_decor.prune_old_notifications(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION wpall_home_decor.prune_old_notifications(integer) TO service_role;

COMMENT ON FUNCTION wpall_home_decor.prune_old_notifications IS
  'Housekeeping: remove read notifications older than N days. Call from service_role cron only.';


-- from 20260619120200_wpall_shop_device_tokens.sql

-- Mobile push notification device tokens (future App Store / Play Store)

CREATE TABLE IF NOT EXISTS wpall_home_decor.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS device_tokens_user_id_idx ON wpall_home_decor.device_tokens (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON wpall_home_decor.device_tokens TO authenticated;
GRANT ALL ON wpall_home_decor.device_tokens TO service_role;

ALTER TABLE wpall_home_decor.device_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own device tokens" ON wpall_home_decor.device_tokens;
CREATE POLICY "own device tokens" ON wpall_home_decor.device_tokens
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Optional avatar on profiles
ALTER TABLE wpall_home_decor.profiles ADD COLUMN IF NOT EXISTS avatar_url text;


-- affiliate system

-- wpall_home_decor: affiliate program — per-product/category commission, admin approval, monthly bank payout

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE wpall_home_decor.affiliate_status AS ENUM ('pending', 'active', 'suspended', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE wpall_home_decor.affiliate_commission_status AS ENUM ('accrued', 'clawed_back', 'in_payout', 'paid');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE wpall_home_decor.affiliate_payout_status AS ENUM ('draft', 'processing', 'paid', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Commission % on categories & products (NULL = inherit)
-- ---------------------------------------------------------------------------
ALTER TABLE wpall_home_decor.product_categories
  ADD COLUMN IF NOT EXISTS affiliate_commission_pct numeric(5,2)
    CHECK (affiliate_commission_pct IS NULL OR (affiliate_commission_pct >= 0 AND affiliate_commission_pct <= 100));

ALTER TABLE wpall_home_decor.products
  ADD COLUMN IF NOT EXISTS affiliate_commission_pct numeric(5,2)
    CHECK (affiliate_commission_pct IS NULL OR (affiliate_commission_pct >= 0 AND affiliate_commission_pct <= 100));

-- ---------------------------------------------------------------------------
-- Order attribution
-- ---------------------------------------------------------------------------
ALTER TABLE wpall_home_decor.orders
  ADD COLUMN IF NOT EXISTS affiliate_id uuid,
  ADD COLUMN IF NOT EXISTS referral_code text;

-- ---------------------------------------------------------------------------
-- Affiliates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wpall_home_decor.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code text NOT NULL UNIQUE,
  status wpall_home_decor.affiliate_status NOT NULL DEFAULT 'pending',
  accepted_terms_at timestamptz,
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rejected_reason text,
  total_orders int NOT NULL DEFAULT 0,
  total_commission_accrued numeric(12,2) NOT NULL DEFAULT 0,
  total_commission_paid numeric(12,2) NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliates_status ON wpall_home_decor.affiliates (status);
CREATE INDEX IF NOT EXISTS idx_affiliates_referral_code ON wpall_home_decor.affiliates (referral_code);

ALTER TABLE wpall_home_decor.orders
  DROP CONSTRAINT IF EXISTS orders_affiliate_id_fkey;
ALTER TABLE wpall_home_decor.orders
  ADD CONSTRAINT orders_affiliate_id_fkey
  FOREIGN KEY (affiliate_id) REFERENCES wpall_home_decor.affiliates(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Bank accounts (for monthly transfer)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wpall_home_decor.affiliate_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES wpall_home_decor.affiliates(id) ON DELETE CASCADE,
  bank_code text NOT NULL,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (affiliate_id, account_number)
);

CREATE INDEX IF NOT EXISTS idx_aff_bank_affiliate ON wpall_home_decor.affiliate_bank_accounts (affiliate_id);

-- ---------------------------------------------------------------------------
-- Commissions (per order line, accrued when order is paid)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wpall_home_decor.affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES wpall_home_decor.affiliates(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES wpall_home_decor.orders(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES wpall_home_decor.order_items(id) ON DELETE CASCADE,
  product_id uuid REFERENCES wpall_home_decor.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  line_amount numeric(12,2) NOT NULL,
  commission_pct numeric(5,2) NOT NULL,
  commission_amount numeric(12,2) NOT NULL,
  status wpall_home_decor.affiliate_commission_status NOT NULL DEFAULT 'accrued',
  payout_line_id uuid,
  accrued_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  clawed_back_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_item_id)
);

CREATE INDEX IF NOT EXISTS idx_aff_comm_affiliate_status ON wpall_home_decor.affiliate_commissions (affiliate_id, status);
CREATE INDEX IF NOT EXISTS idx_aff_comm_order ON wpall_home_decor.affiliate_commissions (order_id);
CREATE INDEX IF NOT EXISTS idx_aff_comm_accrued_at ON wpall_home_decor.affiliate_commissions (accrued_at);

-- ---------------------------------------------------------------------------
-- Monthly payout batches
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wpall_home_decor.affiliate_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_year int NOT NULL,
  period_month int NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  status wpall_home_decor.affiliate_payout_status NOT NULL DEFAULT 'draft',
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  commission_count int NOT NULL DEFAULT 0,
  affiliate_count int NOT NULL DEFAULT 0,
  company_transfer_ref text,
  company_transfer_note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period_year, period_month)
);

CREATE TABLE IF NOT EXISTS wpall_home_decor.affiliate_payout_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id uuid NOT NULL REFERENCES wpall_home_decor.affiliate_payouts(id) ON DELETE CASCADE,
  affiliate_id uuid NOT NULL REFERENCES wpall_home_decor.affiliates(id) ON DELETE CASCADE,
  bank_account_id uuid REFERENCES wpall_home_decor.affiliate_bank_accounts(id) ON DELETE SET NULL,
  bank_name text,
  account_number text,
  account_name text,
  amount numeric(12,2) NOT NULL,
  commission_count int NOT NULL DEFAULT 0,
  transfer_ref text,
  status wpall_home_decor.affiliate_payout_status NOT NULL DEFAULT 'draft',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payout_id, affiliate_id)
);

ALTER TABLE wpall_home_decor.affiliate_commissions
  DROP CONSTRAINT IF EXISTS affiliate_commissions_payout_line_id_fkey;
ALTER TABLE wpall_home_decor.affiliate_commissions
  ADD CONSTRAINT affiliate_commissions_payout_line_id_fkey
  FOREIGN KEY (payout_line_id) REFERENCES wpall_home_decor.affiliate_payout_lines(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Default config in site_settings
-- ---------------------------------------------------------------------------
INSERT INTO wpall_home_decor.site_settings (key, brand_name, value)
VALUES (
  'affiliate_config',
  'Affiliate',
  '{"default_commission_pct": 5, "cookie_days": 30, "enabled": true}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION wpall_home_decor.gen_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = wpall_home_decor
AS $$
DECLARE
  v_code text;
  v_try int := 0;
BEGIN
  LOOP
    v_code := 'WP-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM wpall_home_decor.affiliates WHERE referral_code = v_code);
    v_try := v_try + 1;
    IF v_try > 20 THEN RAISE EXCEPTION 'Could not generate referral code'; END IF;
  END LOOP;
  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION wpall_home_decor.get_affiliate_default_pct()
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = wpall_home_decor
AS $$
  SELECT COALESCE(
    (SELECT (value->>'default_commission_pct')::numeric FROM wpall_home_decor.site_settings WHERE key = 'affiliate_config'),
    5::numeric
  );
$$;

CREATE OR REPLACE FUNCTION wpall_home_decor.resolve_commission_pct(_product_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path = wpall_home_decor
AS $$
DECLARE
  v_product_pct numeric;
  v_cat_pct numeric;
  v_cat_id uuid;
BEGIN
  IF _product_id IS NULL THEN
    RETURN wpall_home_decor.get_affiliate_default_pct();
  END IF;

  SELECT affiliate_commission_pct, category_id
    INTO v_product_pct, v_cat_id
  FROM wpall_home_decor.products WHERE id = _product_id;

  IF v_product_pct IS NOT NULL THEN RETURN v_product_pct; END IF;

  IF v_cat_id IS NOT NULL THEN
    SELECT affiliate_commission_pct INTO v_cat_pct
    FROM wpall_home_decor.product_categories WHERE id = v_cat_id;
    IF v_cat_pct IS NOT NULL THEN RETURN v_cat_pct; END IF;
  END IF;

  RETURN wpall_home_decor.get_affiliate_default_pct();
END;
$$;

-- ---------------------------------------------------------------------------
-- Apply / admin review
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION wpall_home_decor.apply_for_affiliate()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_home_decor
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row wpall_home_decor.affiliates%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_row FROM wpall_home_decor.affiliates WHERE user_id = v_uid;
  IF v_row.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'id', v_row.id,
      'referral_code', v_row.referral_code,
      'status', v_row.status
    );
  END IF;

  INSERT INTO wpall_home_decor.affiliates (user_id, referral_code, status, accepted_terms_at)
  VALUES (v_uid, wpall_home_decor.gen_referral_code(), 'pending', now())
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_row.id,
    'referral_code', v_row.referral_code,
    'status', v_row.status
  );
END;
$$;

CREATE OR REPLACE FUNCTION wpall_home_decor.admin_review_affiliate(
  _affiliate_id uuid,
  _approve boolean,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_home_decor
AS $$
DECLARE
  v_row wpall_home_decor.affiliates%ROWTYPE;
BEGIN
  IF NOT wpall_home_decor.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;

  SELECT * INTO v_row FROM wpall_home_decor.affiliates WHERE id = _affiliate_id FOR UPDATE;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'Affiliate not found'; END IF;

  IF _approve THEN
    UPDATE wpall_home_decor.affiliates SET
      status = 'active',
      approved_at = now(),
      approved_by = auth.uid(),
      rejected_reason = NULL,
      updated_at = now()
    WHERE id = _affiliate_id
    RETURNING * INTO v_row;
  ELSE
    UPDATE wpall_home_decor.affiliates SET
      status = 'rejected',
      rejected_reason = COALESCE(_reason, 'ไม่ผ่านการอนุมัติ'),
      updated_at = now()
    WHERE id = _affiliate_id
    RETURNING * INTO v_row;
  END IF;

  RETURN jsonb_build_object('ok', true, 'status', v_row.status);
END;
$$;

CREATE OR REPLACE FUNCTION wpall_home_decor.admin_suspend_affiliate(
  _affiliate_id uuid,
  _suspend boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_home_decor
AS $$
BEGIN
  IF NOT wpall_home_decor.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;

  UPDATE wpall_home_decor.affiliates SET
    status = CASE WHEN _suspend THEN 'suspended'::wpall_home_decor.affiliate_status ELSE 'active'::wpall_home_decor.affiliate_status END,
    updated_at = now()
  WHERE id = _affiliate_id AND status IN ('active', 'suspended');

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- Accrue commissions when order is paid (after customer payment received)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION wpall_home_decor.accrue_affiliate_commissions(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_home_decor
AS $$
DECLARE
  v_order wpall_home_decor.orders%ROWTYPE;
  v_item record;
  v_pct numeric;
  v_base numeric;
  v_comm numeric;
  v_total numeric := 0;
  v_count int := 0;
BEGIN
  SELECT * INTO v_order FROM wpall_home_decor.orders WHERE id = _order_id;
  IF v_order.id IS NULL OR v_order.affiliate_id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true);
  END IF;

  IF EXISTS (
    SELECT 1 FROM wpall_home_decor.affiliate_commissions WHERE order_id = _order_id LIMIT 1
  ) THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'reason', 'already_accrued');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM wpall_home_decor.affiliates
    WHERE id = v_order.affiliate_id AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'reason', 'affiliate_not_active');
  END IF;

  IF v_order.user_id = (SELECT user_id FROM wpall_home_decor.affiliates WHERE id = v_order.affiliate_id) THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'reason', 'self_referral');
  END IF;

  FOR v_item IN
    SELECT oi.* FROM wpall_home_decor.order_items oi WHERE oi.order_id = _order_id
  LOOP
    v_pct := wpall_home_decor.resolve_commission_pct(v_item.product_id);
    IF v_pct <= 0 THEN CONTINUE; END IF;

    v_base := v_item.line_total;
    IF v_order.subtotal > 0 AND v_order.discount > 0 THEN
      v_base := v_item.line_total - (v_order.discount * v_item.line_total / v_order.subtotal);
    END IF;
    v_base := GREATEST(v_base, 0);
    v_comm := round(v_base * v_pct / 100.0, 2);
    IF v_comm <= 0 THEN CONTINUE; END IF;

    INSERT INTO wpall_home_decor.affiliate_commissions (
      affiliate_id, order_id, order_item_id, product_id, product_name,
      line_amount, commission_pct, commission_amount, status, accrued_at
    ) VALUES (
      v_order.affiliate_id, _order_id, v_item.id, v_item.product_id, v_item.product_name,
      v_base, v_pct, v_comm, 'accrued', COALESCE(v_order.paid_at, now())
    );

    v_total := v_total + v_comm;
    v_count := v_count + 1;
  END LOOP;

  IF v_count > 0 THEN
    UPDATE wpall_home_decor.affiliates SET
      total_orders = total_orders + 1,
      total_commission_accrued = total_commission_accrued + v_total,
      updated_at = now()
    WHERE id = v_order.affiliate_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'count', v_count, 'total', v_total);
END;
$$;

CREATE OR REPLACE FUNCTION wpall_home_decor.clawback_affiliate_commissions(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_home_decor
AS $$
DECLARE
  v_total numeric := 0;
  v_aff_id uuid;
BEGIN
  SELECT COALESCE(sum(commission_amount), 0), min(affiliate_id)
    INTO v_total, v_aff_id
  FROM wpall_home_decor.affiliate_commissions
  WHERE order_id = _order_id AND status = 'accrued';

  UPDATE wpall_home_decor.affiliate_commissions SET
    status = 'clawed_back',
    clawed_back_at = now()
  WHERE order_id = _order_id AND status = 'accrued';

  IF v_total > 0 AND v_aff_id IS NOT NULL THEN
    UPDATE wpall_home_decor.affiliates SET
      total_commission_accrued = GREATEST(total_commission_accrued - v_total, 0),
      updated_at = now()
    WHERE id = v_aff_id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION wpall_home_decor.on_order_affiliate_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_home_decor
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status IN ('paid', 'forwarded')
       AND OLD.status NOT IN ('paid', 'forwarded', 'producing', 'shipped', 'done')
    THEN
      PERFORM wpall_home_decor.accrue_affiliate_commissions(NEW.id);
    END IF;

    IF NEW.status = 'cancelled'
       AND OLD.status IN ('paid', 'forwarded', 'producing', 'shipped', 'pending_payment')
    THEN
      PERFORM wpall_home_decor.clawback_affiliate_commissions(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_affiliate_commission ON wpall_home_decor.orders;
CREATE TRIGGER trg_order_affiliate_commission
  AFTER UPDATE OF status ON wpall_home_decor.orders
  FOR EACH ROW
  EXECUTE FUNCTION wpall_home_decor.on_order_affiliate_commission();

-- ---------------------------------------------------------------------------
-- Monthly payout batch (admin creates after accounting)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION wpall_home_decor.create_affiliate_payout_batch(
  _year int,
  _month int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_home_decor
AS $$
DECLARE
  v_payout wpall_home_decor.affiliate_payouts%ROWTYPE;
  v_aff record;
  v_line_id uuid;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_total numeric := 0;
  v_comm_count int := 0;
  v_aff_count int := 0;
  v_bank wpall_home_decor.affiliate_bank_accounts%ROWTYPE;
BEGIN
  IF NOT wpall_home_decor.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;

  v_period_start := make_timestamptz(_year, _month, 1, 0, 0, 0, 'Asia/Bangkok');
  v_period_end := v_period_start + interval '1 month';

  INSERT INTO wpall_home_decor.affiliate_payouts (period_year, period_month, status, created_by)
  VALUES (_year, _month, 'draft', auth.uid())
  ON CONFLICT (period_year, period_month) DO NOTHING
  RETURNING * INTO v_payout;

  IF v_payout.id IS NULL THEN
    SELECT * INTO v_payout FROM wpall_home_decor.affiliate_payouts
    WHERE period_year = _year AND period_month = _month;
    IF v_payout.status = 'paid' THEN
      RAISE EXCEPTION 'Payout for this period is already paid';
    END IF;
    UPDATE wpall_home_decor.affiliate_commissions SET status = 'accrued', payout_line_id = NULL
    WHERE payout_line_id IN (
      SELECT id FROM wpall_home_decor.affiliate_payout_lines WHERE payout_id = v_payout.id
    );
    DELETE FROM wpall_home_decor.affiliate_payout_lines WHERE payout_id = v_payout.id;
  END IF;

  FOR v_aff IN
    SELECT
      c.affiliate_id,
      sum(c.commission_amount) AS amount,
      count(*)::int AS cnt
    FROM wpall_home_decor.affiliate_commissions c
    JOIN wpall_home_decor.orders o ON o.id = c.order_id
    WHERE c.status = 'accrued'
      AND o.paid_at >= v_period_start
      AND o.paid_at < v_period_end
    GROUP BY c.affiliate_id
    HAVING sum(c.commission_amount) > 0
  LOOP
    SELECT * INTO v_bank
    FROM wpall_home_decor.affiliate_bank_accounts
    WHERE affiliate_id = v_aff.affiliate_id AND is_default = true
    LIMIT 1;

    IF v_bank.id IS NULL THEN
      SELECT * INTO v_bank
      FROM wpall_home_decor.affiliate_bank_accounts
      WHERE affiliate_id = v_aff.affiliate_id
      ORDER BY created_at DESC
      LIMIT 1;
    END IF;

    INSERT INTO wpall_home_decor.affiliate_payout_lines (
      payout_id, affiliate_id, bank_account_id,
      bank_name, account_number, account_name,
      amount, commission_count, status
    ) VALUES (
      v_payout.id, v_aff.affiliate_id, v_bank.id,
      COALESCE(v_bank.bank_name, '—'),
      COALESCE(v_bank.account_number, '—'),
      COALESCE(v_bank.account_name, '—'),
      v_aff.amount, v_aff.cnt, 'draft'
    )
    RETURNING id INTO v_line_id;

    UPDATE wpall_home_decor.affiliate_commissions SET
      status = 'in_payout',
      payout_line_id = v_line_id
    WHERE affiliate_id = v_aff.affiliate_id
      AND status = 'accrued'
      AND order_id IN (
        SELECT o.id FROM wpall_home_decor.orders o
        WHERE o.paid_at >= v_period_start AND o.paid_at < v_period_end
      );

    v_total := v_total + v_aff.amount;
    v_comm_count := v_comm_count + v_aff.cnt;
    v_aff_count := v_aff_count + 1;
  END LOOP;

  UPDATE wpall_home_decor.affiliate_payouts SET
    total_amount = v_total,
    commission_count = v_comm_count,
    affiliate_count = v_aff_count,
    status = CASE WHEN v_aff_count > 0 THEN 'processing'::wpall_home_decor.affiliate_payout_status ELSE 'draft'::wpall_home_decor.affiliate_payout_status END,
    updated_at = now()
  WHERE id = v_payout.id;

  RETURN jsonb_build_object(
    'ok', true,
    'payout_id', v_payout.id,
    'total', v_total,
    'affiliate_count', v_aff_count,
    'commission_count', v_comm_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION wpall_home_decor.mark_affiliate_payout_paid(
  _payout_id uuid,
  _transfer_ref text DEFAULT NULL,
  _note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_home_decor
AS $$
DECLARE
  v_line record;
BEGIN
  IF NOT wpall_home_decor.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;

  FOR v_line IN
    SELECT id, affiliate_id, amount FROM wpall_home_decor.affiliate_payout_lines
    WHERE payout_id = _payout_id AND status <> 'paid'
  LOOP
    UPDATE wpall_home_decor.affiliate_commissions SET
      status = 'paid',
      paid_at = now()
  WHERE payout_line_id = v_line.id AND status = 'in_payout';

    UPDATE wpall_home_decor.affiliates SET
      total_commission_paid = total_commission_paid + v_line.amount,
      updated_at = now()
    WHERE id = v_line.affiliate_id;

    UPDATE wpall_home_decor.affiliate_payout_lines SET
      status = 'paid',
      transfer_ref = _transfer_ref,
      paid_at = now()
    WHERE id = v_line.id;
  END LOOP;

  UPDATE wpall_home_decor.affiliate_payouts SET
    status = 'paid',
    company_transfer_ref = _transfer_ref,
    company_transfer_note = _note,
    paid_at = now(),
    updated_at = now()
  WHERE id = _payout_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION wpall_home_decor.mark_affiliate_payout_line_paid(
  _line_id uuid,
  _transfer_ref text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_home_decor
AS $$
DECLARE
  v_line wpall_home_decor.affiliate_payout_lines%ROWTYPE;
BEGIN
  IF NOT wpall_home_decor.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;

  SELECT * INTO v_line FROM wpall_home_decor.affiliate_payout_lines WHERE id = _line_id FOR UPDATE;
  IF v_line.id IS NULL THEN RAISE EXCEPTION 'Payout line not found'; END IF;
  IF v_line.status = 'paid' THEN RETURN jsonb_build_object('ok', true); END IF;

  UPDATE wpall_home_decor.affiliate_commissions SET status = 'paid', paid_at = now()
  WHERE payout_line_id = v_line.id AND status = 'in_payout';

  UPDATE wpall_home_decor.affiliates SET
    total_commission_paid = total_commission_paid + v_line.amount,
    updated_at = now()
  WHERE id = v_line.affiliate_id;

  UPDATE wpall_home_decor.affiliate_payout_lines SET
    status = 'paid',
    transfer_ref = _transfer_ref,
    paid_at = now()
  WHERE id = _line_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Upsert bank account (affiliate self-service)
CREATE OR REPLACE FUNCTION wpall_home_decor.upsert_affiliate_bank_account(
  _bank_code text,
  _bank_name text,
  _account_number text,
  _account_name text,
  _is_default boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_home_decor
AS $$
DECLARE
  v_aff wpall_home_decor.affiliates%ROWTYPE;
  v_row wpall_home_decor.affiliate_bank_accounts%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_aff FROM wpall_home_decor.affiliates WHERE user_id = auth.uid();
  IF v_aff.id IS NULL THEN RAISE EXCEPTION 'Not an affiliate'; END IF;
  IF v_aff.status <> 'active' THEN RAISE EXCEPTION 'Affiliate is not active'; END IF;

  IF _is_default THEN
    UPDATE wpall_home_decor.affiliate_bank_accounts SET is_default = false WHERE affiliate_id = v_aff.id;
  END IF;

  INSERT INTO wpall_home_decor.affiliate_bank_accounts (
    affiliate_id, bank_code, bank_name, account_number, account_name, is_default
  ) VALUES (
    v_aff.id, _bank_code, _bank_name, trim(_account_number), trim(_account_name), _is_default
  )
  ON CONFLICT (affiliate_id, account_number) DO UPDATE SET
    bank_code = EXCLUDED.bank_code,
    bank_name = EXCLUDED.bank_name,
    account_name = EXCLUDED.account_name,
    is_default = EXCLUDED.is_default,
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('ok', true, 'id', v_row.id);
END;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE wpall_home_decor.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE wpall_home_decor.affiliate_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wpall_home_decor.affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wpall_home_decor.affiliate_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wpall_home_decor.affiliate_payout_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "affiliate read own" ON wpall_home_decor.affiliates
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR wpall_home_decor.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin manage affiliates" ON wpall_home_decor.affiliates
  FOR ALL TO authenticated
  USING (wpall_home_decor.has_role(auth.uid(), 'admin'))
  WITH CHECK (wpall_home_decor.has_role(auth.uid(), 'admin'));

CREATE POLICY "affiliate bank read own" ON wpall_home_decor.affiliate_bank_accounts
  FOR SELECT TO authenticated
  USING (
    affiliate_id IN (SELECT id FROM wpall_home_decor.affiliates WHERE user_id = auth.uid())
    OR wpall_home_decor.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "affiliate bank admin all" ON wpall_home_decor.affiliate_bank_accounts
  FOR ALL TO authenticated
  USING (wpall_home_decor.has_role(auth.uid(), 'admin'))
  WITH CHECK (wpall_home_decor.has_role(auth.uid(), 'admin'));

CREATE POLICY "affiliate commission read" ON wpall_home_decor.affiliate_commissions
  FOR SELECT TO authenticated
  USING (
    affiliate_id IN (SELECT id FROM wpall_home_decor.affiliates WHERE user_id = auth.uid())
    OR wpall_home_decor.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "admin manage commissions" ON wpall_home_decor.affiliate_commissions
  FOR ALL TO authenticated
  USING (wpall_home_decor.has_role(auth.uid(), 'admin'))
  WITH CHECK (wpall_home_decor.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin payouts" ON wpall_home_decor.affiliate_payouts
  FOR ALL TO authenticated
  USING (wpall_home_decor.has_role(auth.uid(), 'admin'))
  WITH CHECK (wpall_home_decor.has_role(auth.uid(), 'admin'));

CREATE POLICY "affiliate read payout lines" ON wpall_home_decor.affiliate_payout_lines
  FOR SELECT TO authenticated
  USING (
    affiliate_id IN (SELECT id FROM wpall_home_decor.affiliates WHERE user_id = auth.uid())
    OR wpall_home_decor.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "admin manage payout lines" ON wpall_home_decor.affiliate_payout_lines
  FOR ALL TO authenticated
  USING (wpall_home_decor.has_role(auth.uid(), 'admin'))
  WITH CHECK (wpall_home_decor.has_role(auth.uid(), 'admin'));

-- Public lookup active referral code (for validation at checkout)
CREATE OR REPLACE FUNCTION wpall_home_decor.lookup_referral_code(_code text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = wpall_home_decor
AS $$
  SELECT jsonb_build_object(
    'ok', true,
    'affiliate_id', a.id,
    'referral_code', a.referral_code
  )
  FROM wpall_home_decor.affiliates a
  WHERE upper(a.referral_code) = upper(trim(_code))
    AND a.status = 'active'
  LIMIT 1;
$$;

-- Grants
GRANT SELECT, INSERT, UPDATE ON wpall_home_decor.affiliates TO authenticated;
GRANT SELECT ON wpall_home_decor.affiliate_bank_accounts TO authenticated;
GRANT SELECT ON wpall_home_decor.affiliate_commissions TO authenticated;
GRANT SELECT ON wpall_home_decor.affiliate_payouts TO authenticated;
GRANT SELECT ON wpall_home_decor.affiliate_payout_lines TO authenticated;
GRANT ALL ON wpall_home_decor.affiliates TO service_role;
GRANT ALL ON wpall_home_decor.affiliate_bank_accounts TO service_role;
GRANT ALL ON wpall_home_decor.affiliate_commissions TO service_role;
GRANT ALL ON wpall_home_decor.affiliate_payouts TO service_role;
GRANT ALL ON wpall_home_decor.affiliate_payout_lines TO service_role;

GRANT EXECUTE ON FUNCTION wpall_home_decor.apply_for_affiliate() TO authenticated;
GRANT EXECUTE ON FUNCTION wpall_home_decor.admin_review_affiliate(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION wpall_home_decor.admin_suspend_affiliate(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION wpall_home_decor.create_affiliate_payout_batch(int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION wpall_home_decor.mark_affiliate_payout_paid(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION wpall_home_decor.mark_affiliate_payout_line_paid(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION wpall_home_decor.upsert_affiliate_bank_account(text, text, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION wpall_home_decor.lookup_referral_code(text) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION wpall_home_decor.gen_referral_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION wpall_home_decor.get_affiliate_default_pct() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION wpall_home_decor.resolve_commission_pct(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION wpall_home_decor.accrue_affiliate_commissions(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION wpall_home_decor.clawback_affiliate_commissions(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION wpall_home_decor.on_order_affiliate_commission() FROM PUBLIC, anon, authenticated;


-- Expose wpall_home_decor to PostgREST
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, graphql_public, portal, infra, backoffice, wsc_customer, wpall_shop, wpall_home_decor, changtee_sale, curtain_tracker, wp_production, wsc_production';
NOTIFY pgrst, 'reload config';

-- Infra app registry seed
INSERT INTO infra.app_registry (slug, display_name, schema_name, company_codes, sort_order)
VALUES (
  'wpall-home-decor',
  'WP ALL Home & Decor',
  'wpall_home_decor',
  ARRAY['WPT'],
  10
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  schema_name = EXCLUDED.schema_name,
  company_codes = EXCLUDED.company_codes,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

