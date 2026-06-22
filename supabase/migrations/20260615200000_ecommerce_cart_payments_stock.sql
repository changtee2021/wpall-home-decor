-- WP ALL e-commerce: carts, payment slips, coupons at checkout, stock, backoffice sync

-- Forwarded status for backoffice webhook
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'forwarded' AFTER 'paid';

CREATE TYPE public.payment_slip_status AS ENUM ('pending', 'approved', 'rejected');

-- ============ CARTS ============
CREATE TABLE IF NOT EXISTS public.carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT carts_user_or_session CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS carts_user_id_unique ON public.carts(user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS carts_session_id_unique ON public.carts(session_id)
  WHERE session_id IS NOT NULL AND user_id IS NULL;

CREATE TABLE IF NOT EXISTS public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  qty integer NOT NULL DEFAULT 1 CHECK (qty > 0 AND qty <= 999),
  unit_price numeric NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  line_total numeric NOT NULL DEFAULT 0 CHECK (line_total >= 0),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cart_items_cart_id_idx ON public.cart_items(cart_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.carts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT ALL ON public.carts TO service_role;
GRANT ALL ON public.cart_items TO service_role;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own cart" ON public.carts FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "own cart items" ON public.cart_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_id AND (c.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_id AND (c.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE TRIGGER trg_carts_updated BEFORE UPDATE ON public.carts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ ORDERS EXTENSIONS ============
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES public.coupons(id),
  ADD COLUMN IF NOT EXISTS shipping_address_id uuid REFERENCES public.addresses(id),
  ADD COLUMN IF NOT EXISTS shipping_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_reserved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS backoffice_forwarded_at timestamptz,
  ADD COLUMN IF NOT EXISTS backoffice_forward_error text,
  ADD COLUMN IF NOT EXISTS backoffice_refs jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ============ PAYMENT SLIPS ============
CREATE TABLE IF NOT EXISTS public.payment_slips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  slip_url text NOT NULL,
  status public.payment_slip_status NOT NULL DEFAULT 'pending',
  rejected_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_slips_order_id_idx ON public.payment_slips(order_id);
CREATE INDEX IF NOT EXISTS payment_slips_status_idx ON public.payment_slips(status);

GRANT SELECT, INSERT ON public.payment_slips TO authenticated;
GRANT UPDATE ON public.payment_slips TO authenticated;
GRANT ALL ON public.payment_slips TO service_role;
ALTER TABLE public.payment_slips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own payment slips read" ON public.payment_slips FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "create own payment slip" ON public.payment_slips FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin update payment slips" ON public.payment_slips FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ STORAGE: payment-slips bucket ============
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-slips', 'payment-slips', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "user upload payment slip" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-slips' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "user read payment slip" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-slips'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
  );

-- ============ STOCK: reserve / release ============
CREATE OR REPLACE FUNCTION public.reserve_order_stock(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  IF EXISTS (SELECT 1 FROM public.orders WHERE id = _order_id AND stock_reserved) THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true);
  END IF;

  FOR v_item IN SELECT * FROM public.order_items WHERE order_id = _order_id LOOP
    IF v_item.product_id IS NOT NULL THEN
      SELECT id, stock, kind INTO v_product FROM public.products WHERE id = v_item.product_id FOR UPDATE;
      IF v_product.id IS NOT NULL AND v_product.stock IS NOT NULL THEN
        IF v_product.stock > 0 AND v_product.stock < v_item.qty THEN
          RAISE EXCEPTION 'สินค้า % สต๊อกไม่พอ (เหลือ %)', v_item.product_name, v_product.stock;
        END IF;
        IF v_product.stock > 0 THEN
          UPDATE public.products SET stock = stock - v_item.qty, updated_at = now()
          WHERE id = v_product.id;
        END IF;
      END IF;
    END IF;

    v_width := COALESCE((v_item.config->>'widthCm')::numeric, (v_item.config->>'width_cm')::numeric, 0);
    v_height := COALESCE((v_item.config->>'heightCm')::numeric, (v_item.config->>'height_cm')::numeric, 0);
    v_fullness := COALESCE((v_item.config->>'fullness')::numeric, 2.5);
    v_meters := (v_width * v_height / 10000.0) * v_fullness * v_item.qty;

    IF (v_item.config->>'fabricId') IS NOT NULL AND (v_item.config->>'fabricId') <> '' THEN
      SELECT id, stock_meters INTO v_fabric FROM public.fabrics
      WHERE id = (v_item.config->>'fabricId')::uuid FOR UPDATE;
      IF v_fabric.id IS NOT NULL AND v_fabric.stock_meters > 0 THEN
        IF v_fabric.stock_meters < v_meters THEN
          RAISE EXCEPTION 'ผ้า % สต๊อกไม่พอ', v_item.config->>'fabricId';
        END IF;
        UPDATE public.fabrics SET stock_meters = stock_meters - v_meters, updated_at = now()
        WHERE id = v_fabric.id;
      END IF;
    END IF;
  END LOOP;

  UPDATE public.orders SET stock_reserved = true, updated_at = now() WHERE id = _order_id;
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.release_order_stock(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  IF NOT EXISTS (SELECT 1 FROM public.orders WHERE id = _order_id AND stock_reserved) THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true);
  END IF;

  FOR v_item IN SELECT * FROM public.order_items WHERE order_id = _order_id LOOP
    IF v_item.product_id IS NOT NULL THEN
      SELECT id, stock INTO v_product FROM public.products WHERE id = v_item.product_id;
      IF v_product.id IS NOT NULL AND v_product.stock IS NOT NULL AND v_product.stock >= 0 THEN
        UPDATE public.products SET stock = stock + v_item.qty, updated_at = now()
        WHERE id = v_product.id;
      END IF;
    END IF;

    v_width := COALESCE((v_item.config->>'widthCm')::numeric, (v_item.config->>'width_cm')::numeric, 0);
    v_height := COALESCE((v_item.config->>'heightCm')::numeric, (v_item.config->>'height_cm')::numeric, 0);
    v_fullness := COALESCE((v_item.config->>'fullness')::numeric, 2.5);
    v_meters := (v_width * v_height / 10000.0) * v_fullness * v_item.qty;

    IF (v_item.config->>'fabricId') IS NOT NULL AND (v_item.config->>'fabricId') <> '' THEN
      SELECT id INTO v_fabric FROM public.fabrics WHERE id = (v_item.config->>'fabricId')::uuid;
      IF v_fabric.id IS NOT NULL THEN
        UPDATE public.fabrics SET stock_meters = stock_meters + v_meters, updated_at = now()
        WHERE id = v_fabric.id;
      END IF;
    END IF;
  END LOOP;

  UPDATE public.orders SET stock_reserved = false, updated_at = now() WHERE id = _order_id;
  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE EXECUTE ON FUNCTION public.reserve_order_stock(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.release_order_stock(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_order_stock(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_order_stock(uuid) TO authenticated, service_role;

-- ============ COUPON REDEMPTION ============
CREATE OR REPLACE FUNCTION public.redeem_coupon_for_order(_user_coupon_id uuid, _order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_uc public.user_coupons%ROWTYPE;
  v_coupon public.coupons%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_discount numeric := 0;
  v_subtotal numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.user_id <> v_uid THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF v_order.status <> 'pending_payment' THEN RAISE EXCEPTION 'Order is not pending payment'; END IF;

  SELECT * INTO v_uc FROM public.user_coupons WHERE id = _user_coupon_id AND user_id = v_uid FOR UPDATE;
  IF v_uc.id IS NULL THEN RAISE EXCEPTION 'Coupon not found'; END IF;
  IF v_uc.used_at IS NOT NULL THEN RAISE EXCEPTION 'Coupon already used'; END IF;

  SELECT * INTO v_coupon FROM public.coupons WHERE id = v_uc.coupon_id;
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

  UPDATE public.user_coupons SET used_at = now(), order_id = _order_id WHERE id = _user_coupon_id;
  UPDATE public.coupons SET used_count = used_count + 1 WHERE id = v_coupon.id;

  UPDATE public.orders SET
    coupon_id = v_coupon.id,
    discount = v_order.discount + v_discount,
    grand_total = GREATEST(0, v_order.subtotal - (v_order.discount + v_discount) + v_order.vat_amount),
    updated_at = now()
  WHERE id = _order_id;

  RETURN jsonb_build_object('ok', true, 'discount', v_discount, 'coupon_id', v_coupon.id);
END $$;

GRANT EXECUTE ON FUNCTION public.redeem_coupon_for_order(uuid, uuid) TO authenticated;

-- ============ CONFIRM PAYMENT (admin) ============
CREATE OR REPLACE FUNCTION public.confirm_order_payment(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.status <> 'pending_payment' THEN RAISE EXCEPTION 'Order is not pending payment'; END IF;

  UPDATE public.orders SET
    status = 'paid',
    paid_at = now(),
    updated_at = now()
  WHERE id = _order_id;

  UPDATE public.payment_slips SET
    status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = now()
  WHERE order_id = _order_id AND status = 'pending';

  RETURN jsonb_build_object('ok', true, 'order_id', _order_id);
END $$;

GRANT EXECUTE ON FUNCTION public.confirm_order_payment(uuid) TO authenticated;

-- Update pay_with_wallet to set payment_method explicitly (already does)
-- Reject payment slip on order cancel helper
CREATE OR REPLACE FUNCTION public.reject_payment_slip(_slip_id uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.payment_slips SET
    status = 'rejected',
    rejected_reason = COALESCE(_reason, 'ปฏิเสธโดยแอดมิน'),
    reviewed_by = auth.uid(),
    reviewed_at = now()
  WHERE id = _slip_id AND status = 'pending';
  RETURN jsonb_build_object('ok', true);
END $$;

GRANT EXECUTE ON FUNCTION public.reject_payment_slip(uuid, text) TO authenticated;
