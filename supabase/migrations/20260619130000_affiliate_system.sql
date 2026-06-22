-- wpall_shop: affiliate program — per-product/category commission, admin approval, monthly bank payout

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE wpall_shop.affiliate_status AS ENUM ('pending', 'active', 'suspended', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE wpall_shop.affiliate_commission_status AS ENUM ('accrued', 'clawed_back', 'in_payout', 'paid');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE wpall_shop.affiliate_payout_status AS ENUM ('draft', 'processing', 'paid', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Commission % on categories & products (NULL = inherit)
-- ---------------------------------------------------------------------------
ALTER TABLE wpall_shop.product_categories
  ADD COLUMN IF NOT EXISTS affiliate_commission_pct numeric(5,2)
    CHECK (affiliate_commission_pct IS NULL OR (affiliate_commission_pct >= 0 AND affiliate_commission_pct <= 100));

ALTER TABLE wpall_shop.products
  ADD COLUMN IF NOT EXISTS affiliate_commission_pct numeric(5,2)
    CHECK (affiliate_commission_pct IS NULL OR (affiliate_commission_pct >= 0 AND affiliate_commission_pct <= 100));

-- ---------------------------------------------------------------------------
-- Order attribution
-- ---------------------------------------------------------------------------
ALTER TABLE wpall_shop.orders
  ADD COLUMN IF NOT EXISTS affiliate_id uuid,
  ADD COLUMN IF NOT EXISTS referral_code text;

-- ---------------------------------------------------------------------------
-- Affiliates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wpall_shop.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code text NOT NULL UNIQUE,
  status wpall_shop.affiliate_status NOT NULL DEFAULT 'pending',
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

CREATE INDEX IF NOT EXISTS idx_affiliates_status ON wpall_shop.affiliates (status);
CREATE INDEX IF NOT EXISTS idx_affiliates_referral_code ON wpall_shop.affiliates (referral_code);

ALTER TABLE wpall_shop.orders
  DROP CONSTRAINT IF EXISTS orders_affiliate_id_fkey;
ALTER TABLE wpall_shop.orders
  ADD CONSTRAINT orders_affiliate_id_fkey
  FOREIGN KEY (affiliate_id) REFERENCES wpall_shop.affiliates(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Bank accounts (for monthly transfer)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wpall_shop.affiliate_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES wpall_shop.affiliates(id) ON DELETE CASCADE,
  bank_code text NOT NULL,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (affiliate_id, account_number)
);

CREATE INDEX IF NOT EXISTS idx_aff_bank_affiliate ON wpall_shop.affiliate_bank_accounts (affiliate_id);

-- ---------------------------------------------------------------------------
-- Commissions (per order line, accrued when order is paid)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wpall_shop.affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES wpall_shop.affiliates(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES wpall_shop.orders(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES wpall_shop.order_items(id) ON DELETE CASCADE,
  product_id uuid REFERENCES wpall_shop.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  line_amount numeric(12,2) NOT NULL,
  commission_pct numeric(5,2) NOT NULL,
  commission_amount numeric(12,2) NOT NULL,
  status wpall_shop.affiliate_commission_status NOT NULL DEFAULT 'accrued',
  payout_line_id uuid,
  accrued_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  clawed_back_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_item_id)
);

CREATE INDEX IF NOT EXISTS idx_aff_comm_affiliate_status ON wpall_shop.affiliate_commissions (affiliate_id, status);
CREATE INDEX IF NOT EXISTS idx_aff_comm_order ON wpall_shop.affiliate_commissions (order_id);
CREATE INDEX IF NOT EXISTS idx_aff_comm_accrued_at ON wpall_shop.affiliate_commissions (accrued_at);

-- ---------------------------------------------------------------------------
-- Monthly payout batches
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wpall_shop.affiliate_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_year int NOT NULL,
  period_month int NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  status wpall_shop.affiliate_payout_status NOT NULL DEFAULT 'draft',
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

CREATE TABLE IF NOT EXISTS wpall_shop.affiliate_payout_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id uuid NOT NULL REFERENCES wpall_shop.affiliate_payouts(id) ON DELETE CASCADE,
  affiliate_id uuid NOT NULL REFERENCES wpall_shop.affiliates(id) ON DELETE CASCADE,
  bank_account_id uuid REFERENCES wpall_shop.affiliate_bank_accounts(id) ON DELETE SET NULL,
  bank_name text,
  account_number text,
  account_name text,
  amount numeric(12,2) NOT NULL,
  commission_count int NOT NULL DEFAULT 0,
  transfer_ref text,
  status wpall_shop.affiliate_payout_status NOT NULL DEFAULT 'draft',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payout_id, affiliate_id)
);

ALTER TABLE wpall_shop.affiliate_commissions
  DROP CONSTRAINT IF EXISTS affiliate_commissions_payout_line_id_fkey;
ALTER TABLE wpall_shop.affiliate_commissions
  ADD CONSTRAINT affiliate_commissions_payout_line_id_fkey
  FOREIGN KEY (payout_line_id) REFERENCES wpall_shop.affiliate_payout_lines(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Default config in site_settings
-- ---------------------------------------------------------------------------
INSERT INTO wpall_shop.site_settings (key, brand_name, value)
VALUES (
  'affiliate_config',
  'Affiliate',
  '{"default_commission_pct": 5, "cookie_days": 30, "enabled": true}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION wpall_shop.gen_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = wpall_shop
AS $$
DECLARE
  v_code text;
  v_try int := 0;
BEGIN
  LOOP
    v_code := 'WP-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM wpall_shop.affiliates WHERE referral_code = v_code);
    v_try := v_try + 1;
    IF v_try > 20 THEN RAISE EXCEPTION 'Could not generate referral code'; END IF;
  END LOOP;
  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION wpall_shop.get_affiliate_default_pct()
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = wpall_shop
AS $$
  SELECT COALESCE(
    (SELECT (value->>'default_commission_pct')::numeric FROM wpall_shop.site_settings WHERE key = 'affiliate_config'),
    5::numeric
  );
$$;

CREATE OR REPLACE FUNCTION wpall_shop.resolve_commission_pct(_product_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path = wpall_shop
AS $$
DECLARE
  v_product_pct numeric;
  v_cat_pct numeric;
  v_cat_id uuid;
BEGIN
  IF _product_id IS NULL THEN
    RETURN wpall_shop.get_affiliate_default_pct();
  END IF;

  SELECT affiliate_commission_pct, category_id
    INTO v_product_pct, v_cat_id
  FROM wpall_shop.products WHERE id = _product_id;

  IF v_product_pct IS NOT NULL THEN RETURN v_product_pct; END IF;

  IF v_cat_id IS NOT NULL THEN
    SELECT affiliate_commission_pct INTO v_cat_pct
    FROM wpall_shop.product_categories WHERE id = v_cat_id;
    IF v_cat_pct IS NOT NULL THEN RETURN v_cat_pct; END IF;
  END IF;

  RETURN wpall_shop.get_affiliate_default_pct();
END;
$$;

-- ---------------------------------------------------------------------------
-- Apply / admin review
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION wpall_shop.apply_for_affiliate()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_shop
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row wpall_shop.affiliates%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_row FROM wpall_shop.affiliates WHERE user_id = v_uid;
  IF v_row.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'id', v_row.id,
      'referral_code', v_row.referral_code,
      'status', v_row.status
    );
  END IF;

  INSERT INTO wpall_shop.affiliates (user_id, referral_code, status, accepted_terms_at)
  VALUES (v_uid, wpall_shop.gen_referral_code(), 'pending', now())
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_row.id,
    'referral_code', v_row.referral_code,
    'status', v_row.status
  );
END;
$$;

CREATE OR REPLACE FUNCTION wpall_shop.admin_review_affiliate(
  _affiliate_id uuid,
  _approve boolean,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_shop
AS $$
DECLARE
  v_row wpall_shop.affiliates%ROWTYPE;
BEGIN
  IF NOT wpall_shop.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;

  SELECT * INTO v_row FROM wpall_shop.affiliates WHERE id = _affiliate_id FOR UPDATE;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'Affiliate not found'; END IF;

  IF _approve THEN
    UPDATE wpall_shop.affiliates SET
      status = 'active',
      approved_at = now(),
      approved_by = auth.uid(),
      rejected_reason = NULL,
      updated_at = now()
    WHERE id = _affiliate_id
    RETURNING * INTO v_row;
  ELSE
    UPDATE wpall_shop.affiliates SET
      status = 'rejected',
      rejected_reason = COALESCE(_reason, 'ไม่ผ่านการอนุมัติ'),
      updated_at = now()
    WHERE id = _affiliate_id
    RETURNING * INTO v_row;
  END IF;

  RETURN jsonb_build_object('ok', true, 'status', v_row.status);
END;
$$;

CREATE OR REPLACE FUNCTION wpall_shop.admin_suspend_affiliate(
  _affiliate_id uuid,
  _suspend boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_shop
AS $$
BEGIN
  IF NOT wpall_shop.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;

  UPDATE wpall_shop.affiliates SET
    status = CASE WHEN _suspend THEN 'suspended'::wpall_shop.affiliate_status ELSE 'active'::wpall_shop.affiliate_status END,
    updated_at = now()
  WHERE id = _affiliate_id AND status IN ('active', 'suspended');

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- Accrue commissions when order is paid (after customer payment received)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION wpall_shop.accrue_affiliate_commissions(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_shop
AS $$
DECLARE
  v_order wpall_shop.orders%ROWTYPE;
  v_item record;
  v_pct numeric;
  v_base numeric;
  v_comm numeric;
  v_total numeric := 0;
  v_count int := 0;
BEGIN
  SELECT * INTO v_order FROM wpall_shop.orders WHERE id = _order_id;
  IF v_order.id IS NULL OR v_order.affiliate_id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true);
  END IF;

  IF EXISTS (
    SELECT 1 FROM wpall_shop.affiliate_commissions WHERE order_id = _order_id LIMIT 1
  ) THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'reason', 'already_accrued');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM wpall_shop.affiliates
    WHERE id = v_order.affiliate_id AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'reason', 'affiliate_not_active');
  END IF;

  IF v_order.user_id = (SELECT user_id FROM wpall_shop.affiliates WHERE id = v_order.affiliate_id) THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'reason', 'self_referral');
  END IF;

  FOR v_item IN
    SELECT oi.* FROM wpall_shop.order_items oi WHERE oi.order_id = _order_id
  LOOP
    v_pct := wpall_shop.resolve_commission_pct(v_item.product_id);
    IF v_pct <= 0 THEN CONTINUE; END IF;

    v_base := v_item.line_total;
    IF v_order.subtotal > 0 AND v_order.discount > 0 THEN
      v_base := v_item.line_total - (v_order.discount * v_item.line_total / v_order.subtotal);
    END IF;
    v_base := GREATEST(v_base, 0);
    v_comm := round(v_base * v_pct / 100.0, 2);
    IF v_comm <= 0 THEN CONTINUE; END IF;

    INSERT INTO wpall_shop.affiliate_commissions (
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
    UPDATE wpall_shop.affiliates SET
      total_orders = total_orders + 1,
      total_commission_accrued = total_commission_accrued + v_total,
      updated_at = now()
    WHERE id = v_order.affiliate_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'count', v_count, 'total', v_total);
END;
$$;

CREATE OR REPLACE FUNCTION wpall_shop.clawback_affiliate_commissions(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_shop
AS $$
DECLARE
  v_total numeric := 0;
  v_aff_id uuid;
BEGIN
  SELECT COALESCE(sum(commission_amount), 0), min(affiliate_id)
    INTO v_total, v_aff_id
  FROM wpall_shop.affiliate_commissions
  WHERE order_id = _order_id AND status = 'accrued';

  UPDATE wpall_shop.affiliate_commissions SET
    status = 'clawed_back',
    clawed_back_at = now()
  WHERE order_id = _order_id AND status = 'accrued';

  IF v_total > 0 AND v_aff_id IS NOT NULL THEN
    UPDATE wpall_shop.affiliates SET
      total_commission_accrued = GREATEST(total_commission_accrued - v_total, 0),
      updated_at = now()
    WHERE id = v_aff_id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION wpall_shop.on_order_affiliate_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_shop
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status IN ('paid', 'forwarded')
       AND OLD.status NOT IN ('paid', 'forwarded', 'producing', 'shipped', 'done')
    THEN
      PERFORM wpall_shop.accrue_affiliate_commissions(NEW.id);
    END IF;

    IF NEW.status = 'cancelled'
       AND OLD.status IN ('paid', 'forwarded', 'producing', 'shipped', 'pending_payment')
    THEN
      PERFORM wpall_shop.clawback_affiliate_commissions(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_affiliate_commission ON wpall_shop.orders;
CREATE TRIGGER trg_order_affiliate_commission
  AFTER UPDATE OF status ON wpall_shop.orders
  FOR EACH ROW
  EXECUTE FUNCTION wpall_shop.on_order_affiliate_commission();

-- ---------------------------------------------------------------------------
-- Monthly payout batch (admin creates after accounting)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION wpall_shop.create_affiliate_payout_batch(
  _year int,
  _month int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_shop
AS $$
DECLARE
  v_payout wpall_shop.affiliate_payouts%ROWTYPE;
  v_aff record;
  v_line_id uuid;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_total numeric := 0;
  v_comm_count int := 0;
  v_aff_count int := 0;
  v_bank wpall_shop.affiliate_bank_accounts%ROWTYPE;
BEGIN
  IF NOT wpall_shop.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;

  v_period_start := make_timestamptz(_year, _month, 1, 0, 0, 0, 'Asia/Bangkok');
  v_period_end := v_period_start + interval '1 month';

  INSERT INTO wpall_shop.affiliate_payouts (period_year, period_month, status, created_by)
  VALUES (_year, _month, 'draft', auth.uid())
  ON CONFLICT (period_year, period_month) DO NOTHING
  RETURNING * INTO v_payout;

  IF v_payout.id IS NULL THEN
    SELECT * INTO v_payout FROM wpall_shop.affiliate_payouts
    WHERE period_year = _year AND period_month = _month;
    IF v_payout.status = 'paid' THEN
      RAISE EXCEPTION 'Payout for this period is already paid';
    END IF;
    UPDATE wpall_shop.affiliate_commissions SET status = 'accrued', payout_line_id = NULL
    WHERE payout_line_id IN (
      SELECT id FROM wpall_shop.affiliate_payout_lines WHERE payout_id = v_payout.id
    );
    DELETE FROM wpall_shop.affiliate_payout_lines WHERE payout_id = v_payout.id;
  END IF;

  FOR v_aff IN
    SELECT
      c.affiliate_id,
      sum(c.commission_amount) AS amount,
      count(*)::int AS cnt
    FROM wpall_shop.affiliate_commissions c
    JOIN wpall_shop.orders o ON o.id = c.order_id
    WHERE c.status = 'accrued'
      AND o.paid_at >= v_period_start
      AND o.paid_at < v_period_end
    GROUP BY c.affiliate_id
    HAVING sum(c.commission_amount) > 0
  LOOP
    SELECT * INTO v_bank
    FROM wpall_shop.affiliate_bank_accounts
    WHERE affiliate_id = v_aff.affiliate_id AND is_default = true
    LIMIT 1;

    IF v_bank.id IS NULL THEN
      SELECT * INTO v_bank
      FROM wpall_shop.affiliate_bank_accounts
      WHERE affiliate_id = v_aff.affiliate_id
      ORDER BY created_at DESC
      LIMIT 1;
    END IF;

    INSERT INTO wpall_shop.affiliate_payout_lines (
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

    UPDATE wpall_shop.affiliate_commissions SET
      status = 'in_payout',
      payout_line_id = v_line_id
    WHERE affiliate_id = v_aff.affiliate_id
      AND status = 'accrued'
      AND order_id IN (
        SELECT o.id FROM wpall_shop.orders o
        WHERE o.paid_at >= v_period_start AND o.paid_at < v_period_end
      );

    v_total := v_total + v_aff.amount;
    v_comm_count := v_comm_count + v_aff.cnt;
    v_aff_count := v_aff_count + 1;
  END LOOP;

  UPDATE wpall_shop.affiliate_payouts SET
    total_amount = v_total,
    commission_count = v_comm_count,
    affiliate_count = v_aff_count,
    status = CASE WHEN v_aff_count > 0 THEN 'processing'::wpall_shop.affiliate_payout_status ELSE 'draft'::wpall_shop.affiliate_payout_status END,
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

CREATE OR REPLACE FUNCTION wpall_shop.mark_affiliate_payout_paid(
  _payout_id uuid,
  _transfer_ref text DEFAULT NULL,
  _note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_shop
AS $$
DECLARE
  v_line record;
BEGIN
  IF NOT wpall_shop.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;

  FOR v_line IN
    SELECT id, affiliate_id, amount FROM wpall_shop.affiliate_payout_lines
    WHERE payout_id = _payout_id AND status <> 'paid'
  LOOP
    UPDATE wpall_shop.affiliate_commissions SET
      status = 'paid',
      paid_at = now()
  WHERE payout_line_id = v_line.id AND status = 'in_payout';

    UPDATE wpall_shop.affiliates SET
      total_commission_paid = total_commission_paid + v_line.amount,
      updated_at = now()
    WHERE id = v_line.affiliate_id;

    UPDATE wpall_shop.affiliate_payout_lines SET
      status = 'paid',
      transfer_ref = _transfer_ref,
      paid_at = now()
    WHERE id = v_line.id;
  END LOOP;

  UPDATE wpall_shop.affiliate_payouts SET
    status = 'paid',
    company_transfer_ref = _transfer_ref,
    company_transfer_note = _note,
    paid_at = now(),
    updated_at = now()
  WHERE id = _payout_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION wpall_shop.mark_affiliate_payout_line_paid(
  _line_id uuid,
  _transfer_ref text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_shop
AS $$
DECLARE
  v_line wpall_shop.affiliate_payout_lines%ROWTYPE;
BEGIN
  IF NOT wpall_shop.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;

  SELECT * INTO v_line FROM wpall_shop.affiliate_payout_lines WHERE id = _line_id FOR UPDATE;
  IF v_line.id IS NULL THEN RAISE EXCEPTION 'Payout line not found'; END IF;
  IF v_line.status = 'paid' THEN RETURN jsonb_build_object('ok', true); END IF;

  UPDATE wpall_shop.affiliate_commissions SET status = 'paid', paid_at = now()
  WHERE payout_line_id = v_line.id AND status = 'in_payout';

  UPDATE wpall_shop.affiliates SET
    total_commission_paid = total_commission_paid + v_line.amount,
    updated_at = now()
  WHERE id = v_line.affiliate_id;

  UPDATE wpall_shop.affiliate_payout_lines SET
    status = 'paid',
    transfer_ref = _transfer_ref,
    paid_at = now()
  WHERE id = _line_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Upsert bank account (affiliate self-service)
CREATE OR REPLACE FUNCTION wpall_shop.upsert_affiliate_bank_account(
  _bank_code text,
  _bank_name text,
  _account_number text,
  _account_name text,
  _is_default boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_shop
AS $$
DECLARE
  v_aff wpall_shop.affiliates%ROWTYPE;
  v_row wpall_shop.affiliate_bank_accounts%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_aff FROM wpall_shop.affiliates WHERE user_id = auth.uid();
  IF v_aff.id IS NULL THEN RAISE EXCEPTION 'Not an affiliate'; END IF;
  IF v_aff.status <> 'active' THEN RAISE EXCEPTION 'Affiliate is not active'; END IF;

  IF _is_default THEN
    UPDATE wpall_shop.affiliate_bank_accounts SET is_default = false WHERE affiliate_id = v_aff.id;
  END IF;

  INSERT INTO wpall_shop.affiliate_bank_accounts (
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
ALTER TABLE wpall_shop.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE wpall_shop.affiliate_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wpall_shop.affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wpall_shop.affiliate_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wpall_shop.affiliate_payout_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "affiliate read own" ON wpall_shop.affiliates
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR wpall_shop.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin manage affiliates" ON wpall_shop.affiliates
  FOR ALL TO authenticated
  USING (wpall_shop.has_role(auth.uid(), 'admin'))
  WITH CHECK (wpall_shop.has_role(auth.uid(), 'admin'));

CREATE POLICY "affiliate bank read own" ON wpall_shop.affiliate_bank_accounts
  FOR SELECT TO authenticated
  USING (
    affiliate_id IN (SELECT id FROM wpall_shop.affiliates WHERE user_id = auth.uid())
    OR wpall_shop.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "affiliate bank admin all" ON wpall_shop.affiliate_bank_accounts
  FOR ALL TO authenticated
  USING (wpall_shop.has_role(auth.uid(), 'admin'))
  WITH CHECK (wpall_shop.has_role(auth.uid(), 'admin'));

CREATE POLICY "affiliate commission read" ON wpall_shop.affiliate_commissions
  FOR SELECT TO authenticated
  USING (
    affiliate_id IN (SELECT id FROM wpall_shop.affiliates WHERE user_id = auth.uid())
    OR wpall_shop.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "admin manage commissions" ON wpall_shop.affiliate_commissions
  FOR ALL TO authenticated
  USING (wpall_shop.has_role(auth.uid(), 'admin'))
  WITH CHECK (wpall_shop.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin payouts" ON wpall_shop.affiliate_payouts
  FOR ALL TO authenticated
  USING (wpall_shop.has_role(auth.uid(), 'admin'))
  WITH CHECK (wpall_shop.has_role(auth.uid(), 'admin'));

CREATE POLICY "affiliate read payout lines" ON wpall_shop.affiliate_payout_lines
  FOR SELECT TO authenticated
  USING (
    affiliate_id IN (SELECT id FROM wpall_shop.affiliates WHERE user_id = auth.uid())
    OR wpall_shop.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "admin manage payout lines" ON wpall_shop.affiliate_payout_lines
  FOR ALL TO authenticated
  USING (wpall_shop.has_role(auth.uid(), 'admin'))
  WITH CHECK (wpall_shop.has_role(auth.uid(), 'admin'));

-- Public lookup active referral code (for validation at checkout)
CREATE OR REPLACE FUNCTION wpall_shop.lookup_referral_code(_code text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = wpall_shop
AS $$
  SELECT jsonb_build_object(
    'ok', true,
    'affiliate_id', a.id,
    'referral_code', a.referral_code
  )
  FROM wpall_shop.affiliates a
  WHERE upper(a.referral_code) = upper(trim(_code))
    AND a.status = 'active'
  LIMIT 1;
$$;

-- Grants
GRANT SELECT, INSERT, UPDATE ON wpall_shop.affiliates TO authenticated;
GRANT SELECT ON wpall_shop.affiliate_bank_accounts TO authenticated;
GRANT SELECT ON wpall_shop.affiliate_commissions TO authenticated;
GRANT SELECT ON wpall_shop.affiliate_payouts TO authenticated;
GRANT SELECT ON wpall_shop.affiliate_payout_lines TO authenticated;
GRANT ALL ON wpall_shop.affiliates TO service_role;
GRANT ALL ON wpall_shop.affiliate_bank_accounts TO service_role;
GRANT ALL ON wpall_shop.affiliate_commissions TO service_role;
GRANT ALL ON wpall_shop.affiliate_payouts TO service_role;
GRANT ALL ON wpall_shop.affiliate_payout_lines TO service_role;

GRANT EXECUTE ON FUNCTION wpall_shop.apply_for_affiliate() TO authenticated;
GRANT EXECUTE ON FUNCTION wpall_shop.admin_review_affiliate(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION wpall_shop.admin_suspend_affiliate(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION wpall_shop.create_affiliate_payout_batch(int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION wpall_shop.mark_affiliate_payout_paid(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION wpall_shop.mark_affiliate_payout_line_paid(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION wpall_shop.upsert_affiliate_bank_account(text, text, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION wpall_shop.lookup_referral_code(text) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION wpall_shop.gen_referral_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION wpall_shop.get_affiliate_default_pct() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION wpall_shop.resolve_commission_pct(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION wpall_shop.accrue_affiliate_commissions(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION wpall_shop.clawback_affiliate_commissions(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION wpall_shop.on_order_affiliate_commission() FROM PUBLIC, anon, authenticated;
