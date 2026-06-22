-- Fix Thai text stored as UTF-8 bytes misread as Latin-1 (mojibake à¸...)
-- Root cause: consolidated bootstrap SQL was saved with corrupted encoding.
SET search_path TO wpall_home_decor, public;

CREATE OR REPLACE FUNCTION wpall_home_decor.fix_utf8_mojibake(t text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF t IS NULL OR t = '' THEN
    RETURN t;
  END IF;
  IF t LIKE '%à¸%' OR t LIKE '%à¹%' THEN
    BEGIN
      RETURN convert_from(convert_to(t, 'LATIN1'), 'UTF8');
    EXCEPTION WHEN OTHERS THEN
      RETURN t;
    END;
  END IF;
  RETURN t;
END;
$$;

-- Site settings
UPDATE wpall_home_decor.site_settings SET
  tagline = wpall_home_decor.fix_utf8_mojibake(tagline),
  address = wpall_home_decor.fix_utf8_mojibake(address),
  about_html = wpall_home_decor.fix_utf8_mojibake(about_html),
  contact_note = wpall_home_decor.fix_utf8_mojibake(contact_note)
WHERE key = 'main';

-- Storefront content
UPDATE wpall_home_decor.promo_cards SET
  title = wpall_home_decor.fix_utf8_mojibake(title),
  subtitle = wpall_home_decor.fix_utf8_mojibake(subtitle)
WHERE title LIKE '%à¸%' OR title LIKE '%à¹%' OR subtitle LIKE '%à¸%' OR subtitle LIKE '%à¹%';

UPDATE wpall_home_decor.service_icons SET
  label = wpall_home_decor.fix_utf8_mojibake(label)
WHERE label LIKE '%à¸%' OR label LIKE '%à¹%';

UPDATE wpall_home_decor.tracks SET
  name = wpall_home_decor.fix_utf8_mojibake(name)
WHERE name LIKE '%à¸%' OR name LIKE '%à¹%';

UPDATE wpall_home_decor.accessories SET
  name = wpall_home_decor.fix_utf8_mojibake(name)
WHERE name LIKE '%à¸%' OR name LIKE '%à¹%';

UPDATE wpall_home_decor.product_categories SET
  name = wpall_home_decor.fix_utf8_mojibake(name)
WHERE name LIKE '%à¸%' OR name LIKE '%à¹%';

UPDATE wpall_home_decor.products SET
  name = wpall_home_decor.fix_utf8_mojibake(name),
  description = wpall_home_decor.fix_utf8_mojibake(description),
  unit = wpall_home_decor.fix_utf8_mojibake(unit)
WHERE name LIKE '%à¸%' OR name LIKE '%à¹%'
   OR description LIKE '%à¸%' OR description LIKE '%à¹%'
   OR unit LIKE '%à¸%' OR unit LIKE '%à¹%';

UPDATE wpall_home_decor.banners SET
  title = wpall_home_decor.fix_utf8_mojibake(title)
WHERE title LIKE '%à¸%' OR title LIKE '%à¹%';

UPDATE wpall_home_decor.coupons SET
  description = wpall_home_decor.fix_utf8_mojibake(description)
WHERE description LIKE '%à¸%' OR description LIKE '%à¹%';

UPDATE wpall_home_decor.notifications SET
  title = wpall_home_decor.fix_utf8_mojibake(title),
  body = wpall_home_decor.fix_utf8_mojibake(body)
WHERE title LIKE '%à¸%' OR title LIKE '%à¹%' OR body LIKE '%à¸%' OR body LIKE '%à¹%';

UPDATE wpall_home_decor.wallet_transactions SET
  note = wpall_home_decor.fix_utf8_mojibake(note)
WHERE note LIKE '%à¸%' OR note LIKE '%à¹%';

-- Fix default + trigger strings in functions
ALTER TABLE wpall_home_decor.products ALTER COLUMN unit SET DEFAULT 'ชิ้น';

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

-- pay_with_wallet: fix Thai payment note
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
            'ชำระออเดอร์ ' || v_order.order_number)
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
REVOKE EXECUTE ON FUNCTION wpall_home_decor.pay_with_wallet(uuid) FROM anon;

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

DROP FUNCTION IF EXISTS wpall_home_decor.fix_utf8_mojibake(text);
