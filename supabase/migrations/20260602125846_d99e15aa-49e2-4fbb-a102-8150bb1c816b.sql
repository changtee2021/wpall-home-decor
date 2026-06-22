
-- 1. add payment fields to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_ref uuid,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- 2. pay an order using wallet balance
CREATE OR REPLACE FUNCTION public.pay_with_wallet(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_order public.orders%ROWTYPE;
  v_wallet public.wallets%ROWTYPE;
  v_new_balance numeric;
  v_tx_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.user_id <> v_uid THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF v_order.status <> 'pending_payment' THEN RAISE EXCEPTION 'Order is not pending payment'; END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_uid FOR UPDATE;
  IF v_wallet.id IS NULL THEN
    INSERT INTO public.wallets (user_id) VALUES (v_uid) RETURNING * INTO v_wallet;
  END IF;
  IF v_wallet.balance < v_order.grand_total THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  UPDATE public.wallets
    SET balance = balance - v_order.grand_total,
        total_spent = total_spent + v_order.grand_total,
        updated_at = now()
    WHERE id = v_wallet.id
    RETURNING balance INTO v_new_balance;

  INSERT INTO public.wallet_transactions (wallet_id, user_id, type, amount, balance_after, reference_id, note)
    VALUES (v_wallet.id, v_uid, 'payment', -v_order.grand_total, v_new_balance, v_order.id,
            'ชำระค่าออเดอร์ ' || v_order.order_number)
    RETURNING id INTO v_tx_id;

  UPDATE public.orders
    SET status = 'paid',
        payment_method = 'wallet',
        payment_ref = v_tx_id,
        paid_at = now(),
        updated_at = now()
    WHERE id = v_order.id;

  RETURN jsonb_build_object('ok', true, 'balance', v_new_balance, 'tx_id', v_tx_id);
END $$;

GRANT EXECUTE ON FUNCTION public.pay_with_wallet(uuid) TO authenticated;

-- 3. admin adjust wallet
CREATE OR REPLACE FUNCTION public.admin_adjust_wallet(_user_id uuid, _amount numeric, _note text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.wallets%ROWTYPE;
  v_new_balance numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
  IF v_wallet.id IS NULL THEN
    INSERT INTO public.wallets (user_id) VALUES (_user_id) RETURNING * INTO v_wallet;
  END IF;
  UPDATE public.wallets
    SET balance = balance + _amount, updated_at = now()
    WHERE id = v_wallet.id
    RETURNING balance INTO v_new_balance;
  INSERT INTO public.wallet_transactions (wallet_id, user_id, type, amount, balance_after, note)
    VALUES (v_wallet.id, _user_id, 'adjust', _amount, v_new_balance,
            COALESCE(_note, 'ปรับยอดโดยแอดมิน'));
  RETURN jsonb_build_object('ok', true, 'balance', v_new_balance);
END $$;

GRANT EXECUTE ON FUNCTION public.admin_adjust_wallet(uuid, numeric, text) TO authenticated;

-- 4. claim coupon helper
CREATE OR REPLACE FUNCTION public.claim_coupon(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_coupon public.coupons%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_coupon FROM public.coupons WHERE upper(code) = upper(_code) AND is_active;
  IF v_coupon.id IS NULL THEN RAISE EXCEPTION 'Coupon not found'; END IF;
  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
    RAISE EXCEPTION 'Coupon expired';
  END IF;
  IF v_coupon.usage_limit IS NOT NULL AND v_coupon.used_count >= v_coupon.usage_limit THEN
    RAISE EXCEPTION 'Coupon usage limit reached';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_coupons WHERE user_id = v_uid AND coupon_id = v_coupon.id) THEN
    RAISE EXCEPTION 'Coupon already claimed';
  END IF;
  INSERT INTO public.user_coupons (user_id, coupon_id) VALUES (v_uid, v_coupon.id);
  RETURN jsonb_build_object('ok', true, 'coupon_id', v_coupon.id, 'title', v_coupon.title);
END $$;

GRANT EXECUTE ON FUNCTION public.claim_coupon(text) TO authenticated;
