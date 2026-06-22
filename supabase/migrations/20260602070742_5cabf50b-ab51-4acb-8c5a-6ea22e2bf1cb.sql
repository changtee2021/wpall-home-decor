
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('customer', 'admin');
CREATE TYPE public.customer_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum', 'vip');
CREATE TYPE public.order_status AS ENUM ('draft', 'pending_payment', 'paid', 'producing', 'shipped', 'done', 'cancelled');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  address TEXT,
  email TEXT,
  tier public.customer_tier NOT NULL DEFAULT 'bronze',
  tier_override public.customer_tier,
  total_spent NUMERIC(12,2) NOT NULL DEFAULT 0,
  order_count INT NOT NULL DEFAULT 0,
  last_order_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ============ PRODUCTS ============
CREATE TABLE public.products (
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
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- ============ FABRICS ============
CREATE TABLE public.fabrics (
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
GRANT SELECT ON public.fabrics TO anon, authenticated;
GRANT ALL ON public.fabrics TO service_role;
ALTER TABLE public.fabrics ENABLE ROW LEVEL SECURITY;

-- ============ ORDERS ============
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL DEFAULT ('WP-' || to_char(now(), 'YYYYMMDD') || '-' || lpad((floor(random()*10000))::text, 4, '0')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.order_status NOT NULL DEFAULT 'pending_payment',
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
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- ============ ORDER ITEMS ============
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  qty INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  line_total NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============
-- profiles: self + admin
CREATE POLICY "self read profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "self update profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "self insert profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- user_roles: self read; admin manages via service_role only
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- products: public read active; admin manage
CREATE POLICY "anyone read active products" ON public.products FOR SELECT TO anon, authenticated USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage products" ON public.products FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- fabrics: public read active; admin manage
CREATE POLICY "anyone read fabrics" ON public.fabrics FOR SELECT TO anon, authenticated USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage fabrics" ON public.fabrics FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- orders: own + admin
CREATE POLICY "read own orders" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "create own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "update orders (admin or owner pending)" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR (user_id = auth.uid() AND status IN ('draft','pending_payment')));

-- order_items: own (via order) + admin
CREATE POLICY "read own order items" ON public.order_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND (o.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);
CREATE POLICY "insert own order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid())
);

-- ============ TIER COMPUTATION ============
CREATE OR REPLACE FUNCTION public.compute_tier(_total NUMERIC, _count INT)
RETURNS public.customer_tier LANGUAGE SQL IMMUTABLE AS $$
  SELECT CASE
    WHEN _total >= 300000 OR _count >= 20 THEN 'platinum'::public.customer_tier
    WHEN _total >= 100000 THEN 'gold'::public.customer_tier
    WHEN _total >= 30000 THEN 'silver'::public.customer_tier
    ELSE 'bronze'::public.customer_tier
  END
$$;

CREATE OR REPLACE FUNCTION public.recalc_tier(_user_id UUID)
RETURNS VOID LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total NUMERIC := 0;
  v_count INT := 0;
  v_last TIMESTAMPTZ;
  v_override public.customer_tier;
BEGIN
  SELECT COALESCE(SUM(grand_total),0), COUNT(*), MAX(created_at)
    INTO v_total, v_count, v_last
  FROM public.orders WHERE user_id = _user_id AND status IN ('paid','producing','shipped','done');

  SELECT tier_override INTO v_override FROM public.profiles WHERE id = _user_id;

  UPDATE public.profiles SET
    total_spent = v_total,
    order_count = v_count,
    last_order_at = v_last,
    tier = COALESCE(v_override, public.compute_tier(v_total, v_count)),
    updated_at = now()
  WHERE id = _user_id;
END $$;

CREATE OR REPLACE FUNCTION public.on_order_status_change()
RETURNS TRIGGER LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('paid','producing','shipped','done') OR OLD.status IN ('paid','producing','shipped','done') THEN
    PERFORM public.recalc_tier(NEW.user_id);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_order_status_tier
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.on_order_status_change();

-- ============ AUTO PROFILE + ROLE ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
