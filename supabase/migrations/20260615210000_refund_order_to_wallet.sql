-- Phase 4: refund to wallet (wpall_shop schema)
CREATE OR REPLACE FUNCTION wpall_shop.refund_order_to_wallet(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_shop
AS $$
DECLARE
  v_order wpall_shop.orders%ROWTYPE;
  v_wallet wpall_shop.wallets%ROWTYPE;
  v_new_balance numeric;
BEGIN
  IF NOT wpall_shop.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;

  SELECT * INTO v_order FROM wpall_shop.orders WHERE id = _order_id FOR UPDATE;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.status NOT IN ('paid', 'pending_payment', 'forwarded', 'producing') THEN
    RAISE EXCEPTION 'Order cannot be refunded';
  END IF;

  SELECT * INTO v_wallet FROM wpall_shop.wallets WHERE user_id = v_order.user_id FOR UPDATE;
  IF v_wallet.id IS NULL THEN RAISE EXCEPTION 'Wallet not found'; END IF;

  UPDATE wpall_shop.wallets
    SET balance = balance + v_order.grand_total, updated_at = now()
    WHERE id = v_wallet.id
    RETURNING balance INTO v_new_balance;

  INSERT INTO wpall_shop.wallet_transactions (wallet_id, user_id, type, amount, balance_after, reference_id, note)
    VALUES (v_wallet.id, v_order.user_id, 'refund', v_order.grand_total, v_new_balance, v_order.id,
            'คืนเงินออเดอร์ ' || v_order.order_number);

  PERFORM wpall_shop.release_order_stock(_order_id);

  UPDATE wpall_shop.orders SET status = 'cancelled', updated_at = now() WHERE id = _order_id;

  RETURN jsonb_build_object('ok', true, 'balance', v_new_balance);
END $$;

GRANT EXECUTE ON FUNCTION wpall_shop.refund_order_to_wallet(uuid) TO authenticated;
