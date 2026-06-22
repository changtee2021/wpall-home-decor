
-- ============= ENUMS =============
CREATE TYPE public.wallet_tx_type AS ENUM ('topup','payment','refund','adjust');
CREATE TYPE public.topup_status AS ENUM ('pending','approved','rejected','cancelled');
CREATE TYPE public.topup_method AS ENUM ('bank_transfer','promptpay','credit_card');
CREATE TYPE public.coupon_type AS ENUM ('percent','fixed','free_shipping');

-- ============= WALLETS =============
CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance numeric NOT NULL DEFAULT 0,
  total_topup numeric NOT NULL DEFAULT 0,
  total_spent numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wallet read" ON public.wallets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update wallet" ON public.wallets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============= WALLET TRANSACTIONS =============
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  type public.wallet_tx_type NOT NULL,
  amount numeric NOT NULL,
  balance_after numeric NOT NULL,
  reference_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tx read" ON public.wallet_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ============= TOPUP REQUESTS =============
CREATE TABLE public.topup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  method public.topup_method NOT NULL DEFAULT 'bank_transfer',
  slip_url text,
  reference_note text,
  status public.topup_status NOT NULL DEFAULT 'pending',
  rejected_reason text,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.topup_requests TO authenticated;
GRANT ALL ON public.topup_requests TO service_role;
ALTER TABLE public.topup_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own topup read" ON public.topup_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "create own topup" ON public.topup_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "update topup admin or own pending" ON public.topup_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR (user_id = auth.uid() AND status = 'pending'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR (user_id = auth.uid() AND status IN ('pending','cancelled')));

-- ============= AUTO CREATE WALLET ON SIGNUP (extend handle_new_user) =============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer') ON CONFLICT DO NOTHING;
  INSERT INTO public.wallets (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

-- Backfill wallets for existing users
INSERT INTO public.wallets (user_id)
SELECT id FROM public.profiles WHERE id NOT IN (SELECT user_id FROM public.wallets)
ON CONFLICT DO NOTHING;

-- ============= TOPUP APPROVAL TRIGGER =============
CREATE OR REPLACE FUNCTION public.handle_topup_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_wallet_id uuid;
  v_new_balance numeric;
BEGIN
  IF NEW.status = 'approved' AND OLD.status <> 'approved' THEN
    SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = NEW.user_id FOR UPDATE;
    IF v_wallet_id IS NULL THEN
      INSERT INTO public.wallets (user_id, balance) VALUES (NEW.user_id, 0) RETURNING id INTO v_wallet_id;
    END IF;
    UPDATE public.wallets
      SET balance = balance + NEW.amount,
          total_topup = total_topup + NEW.amount,
          updated_at = now()
      WHERE id = v_wallet_id
      RETURNING balance INTO v_new_balance;
    INSERT INTO public.wallet_transactions (wallet_id, user_id, type, amount, balance_after, reference_id, note)
      VALUES (v_wallet_id, NEW.user_id, 'topup', NEW.amount, v_new_balance, NEW.id, 'เติมเงิน #'||substring(NEW.id::text,1,8));
    NEW.approved_at := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_topup_approval BEFORE UPDATE ON public.topup_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_topup_approval();

-- ============= ADDRESSES =============
CREATE TABLE public.addresses (
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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT ALL ON public.addresses TO service_role;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own addresses" ON public.addresses FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ============= FAVORITES =============
CREATE TABLE public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own favorites" ON public.favorites FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============= COUPONS =============
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  type public.coupon_type NOT NULL DEFAULT 'percent',
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
GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read active coupons" ON public.coupons FOR SELECT TO anon, authenticated
  USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage coupons" ON public.coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.user_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  used_at timestamptz,
  order_id uuid,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, coupon_id)
);
GRANT SELECT, INSERT, UPDATE ON public.user_coupons TO authenticated;
GRANT ALL ON public.user_coupons TO service_role;
ALTER TABLE public.user_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own user_coupons" ON public.user_coupons FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ============= NOTIFICATIONS =============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  category text NOT NULL DEFAULT 'system',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ============= REVIEWS =============
CREATE TABLE public.reviews (
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
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read approved reviews" ON public.reviews FOR SELECT TO anon, authenticated
  USING (is_approved OR user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "create own review" ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "update own review or admin" ON public.reviews FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "delete admin" ON public.reviews FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- ============= FLASH SALES =============
CREATE TABLE public.flash_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.flash_sales TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.flash_sales TO authenticated;
GRANT ALL ON public.flash_sales TO service_role;
ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read flash_sales" ON public.flash_sales FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage flash_sales" ON public.flash_sales FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.flash_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flash_sale_id uuid NOT NULL REFERENCES public.flash_sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  sale_price numeric NOT NULL,
  stock_limit integer,
  sold_count integer NOT NULL DEFAULT 0,
  UNIQUE (flash_sale_id, product_id)
);
GRANT SELECT ON public.flash_sale_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.flash_sale_items TO authenticated;
GRANT ALL ON public.flash_sale_items TO service_role;
ALTER TABLE public.flash_sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read flash_sale_items" ON public.flash_sale_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage flash_sale_items" ON public.flash_sale_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============= BANNERS =============
CREATE TABLE public.banners (
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
GRANT SELECT ON public.banners TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read banners" ON public.banners FOR SELECT TO anon, authenticated
  USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage banners" ON public.banners FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============= UPDATED_AT TRIGGERS =============
CREATE TRIGGER trg_wallets_updated BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_addresses_updated BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
