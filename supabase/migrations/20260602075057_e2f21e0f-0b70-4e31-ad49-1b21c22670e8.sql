
-- Helper updated_at function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- ============ 1) CATEGORIES ============
CREATE TABLE public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.product_kind NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  parent_id uuid REFERENCES public.product_categories(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_pc_slug ON public.product_categories(COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);
CREATE INDEX idx_pc_kind ON public.product_categories(kind);
CREATE INDEX idx_pc_parent ON public.product_categories(parent_id);

GRANT SELECT ON public.product_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_categories TO authenticated;
GRANT ALL ON public.product_categories TO service_role;

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read categories" ON public.product_categories
  FOR SELECT TO anon, authenticated USING (is_active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage categories" ON public.product_categories
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.products ADD COLUMN category_id uuid REFERENCES public.product_categories(id) ON DELETE SET NULL;
CREATE INDEX idx_products_category_id ON public.products(category_id);

CREATE TRIGGER trg_pc_updated BEFORE UPDATE ON public.product_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ 2) AUDIT LOG ============
CREATE TABLE public.product_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid,
  product_name text,
  user_id uuid,
  user_email text,
  action text NOT NULL,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pal_product ON public.product_audit_logs(product_id, created_at DESC);
CREATE INDEX idx_pal_created ON public.product_audit_logs(created_at DESC);

GRANT SELECT ON public.product_audit_logs TO authenticated;
GRANT ALL ON public.product_audit_logs TO service_role;

ALTER TABLE public.product_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read audit logs" ON public.product_audit_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.log_product_change()
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
    INSERT INTO public.product_audit_logs(product_id, product_name, user_id, user_email, action, changes)
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
    INSERT INTO public.product_audit_logs(product_id, product_name, user_id, user_email, action, changes)
    VALUES (NEW.id, NEW.name, v_uid, v_email, v_action, v_changes);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.product_audit_logs(product_id, product_name, user_id, user_email, action, changes)
    VALUES (OLD.id, OLD.name, v_uid, v_email, 'delete', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_products_audit
AFTER INSERT OR UPDATE OR DELETE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.log_product_change();

-- ============ 3) PRODUCT FILES ============
CREATE TABLE public.product_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
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
CREATE INDEX idx_pf_product ON public.product_files(product_id);
CREATE INDEX idx_pf_current ON public.product_files(product_id, title, is_current);

GRANT SELECT ON public.product_files TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_files TO authenticated;
GRANT ALL ON public.product_files TO service_role;

ALTER TABLE public.product_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read product files" ON public.product_files
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage product files" ON public.product_files
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ 4) TIER PRICES ============
CREATE TABLE public.product_tier_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.product_categories(id) ON DELETE CASCADE,
  tier public.customer_tier NOT NULL,
  price_type text NOT NULL DEFAULT 'fixed',
  value numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((product_id IS NOT NULL) <> (category_id IS NOT NULL)),
  CHECK (price_type IN ('fixed','discount_pct'))
);
CREATE UNIQUE INDEX uq_tier_product ON public.product_tier_prices(product_id, tier) WHERE product_id IS NOT NULL;
CREATE UNIQUE INDEX uq_tier_category ON public.product_tier_prices(category_id, tier) WHERE category_id IS NOT NULL;

GRANT SELECT ON public.product_tier_prices TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_tier_prices TO authenticated;
GRANT ALL ON public.product_tier_prices TO service_role;

ALTER TABLE public.product_tier_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read tier prices" ON public.product_tier_prices
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage tier prices" ON public.product_tier_prices
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.resolve_product_price(_product_id uuid, _tier public.customer_tier)
RETURNS numeric LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  v_base numeric; v_cat uuid; v_pt text; v_val numeric;
BEGIN
  SELECT COALESCE(NULLIF(sale_price,0), base_price), category_id INTO v_base, v_cat
  FROM public.products WHERE id = _product_id;
  IF v_base IS NULL THEN RETURN 0; END IF;
  SELECT price_type, value INTO v_pt, v_val
  FROM public.product_tier_prices WHERE product_id = _product_id AND tier = _tier LIMIT 1;
  IF v_pt IS NULL AND v_cat IS NOT NULL THEN
    SELECT price_type, value INTO v_pt, v_val
    FROM public.product_tier_prices WHERE category_id = v_cat AND tier = _tier LIMIT 1;
  END IF;
  IF v_pt = 'fixed' THEN RETURN v_val; END IF;
  IF v_pt = 'discount_pct' THEN RETURN ROUND(v_base * (1 - v_val/100.0), 2); END IF;
  RETURN v_base;
END $$;

CREATE TRIGGER trg_ptp_updated BEFORE UPDATE ON public.product_tier_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
