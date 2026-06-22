-- Synced from wp-group-erp — see 20260619120000_wpall_shop_security_hardening.sql

-- wpall_shop security hardening: order status guard, stock RPC ownership, customer cancel RPC

CREATE OR REPLACE FUNCTION wpall_shop.guard_order_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_shop
AS $$
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF wpall_shop.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

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

DROP TRIGGER IF EXISTS trg_guard_order_status ON wpall_shop.orders;
CREATE TRIGGER trg_guard_order_status
  BEFORE UPDATE OF status ON wpall_shop.orders
  FOR EACH ROW
  EXECUTE FUNCTION wpall_shop.guard_order_status_transition();

DROP POLICY IF EXISTS "update orders (admin or owner pending)" ON wpall_shop.orders;
DROP POLICY IF EXISTS "update orders admin" ON wpall_shop.orders;
DROP POLICY IF EXISTS "update orders owner cancel" ON wpall_shop.orders;

CREATE POLICY "update orders admin" ON wpall_shop.orders
  FOR UPDATE TO authenticated
  USING (wpall_shop.has_role(auth.uid(), 'admin'))
  WITH CHECK (wpall_shop.has_role(auth.uid(), 'admin'));

CREATE POLICY "update orders owner cancel" ON wpall_shop.orders
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status IN ('draft', 'pending_payment'))
  WITH CHECK (user_id = auth.uid() AND status = 'cancelled');

CREATE OR REPLACE FUNCTION wpall_shop.customer_cancel_order(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_shop
AS $$
DECLARE
  v_order wpall_shop.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM wpall_shop.orders WHERE id = _order_id FOR UPDATE;
  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.user_id <> auth.uid() AND NOT wpall_shop.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF v_order.status NOT IN ('draft', 'pending_payment') THEN
    RAISE EXCEPTION 'Order cannot be cancelled in status %', v_order.status;
  END IF;

  PERFORM wpall_shop.release_order_stock(_order_id);

  UPDATE wpall_shop.orders
  SET status = 'cancelled', updated_at = now()
  WHERE id = _order_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION wpall_shop.customer_cancel_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION wpall_shop.customer_cancel_order(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION wpall_shop.assert_order_caller(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_shop
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF wpall_shop.has_role(auth.uid(), 'admin') THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM wpall_shop.orders
    WHERE id = _order_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION wpall_shop.reserve_order_stock(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_shop
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
  PERFORM wpall_shop.assert_order_caller(_order_id);

  IF EXISTS (SELECT 1 FROM wpall_shop.orders WHERE id = _order_id AND stock_reserved) THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true);
  END IF;

  FOR v_item IN SELECT * FROM wpall_shop.order_items WHERE order_id = _order_id LOOP
    IF v_item.product_id IS NOT NULL THEN
      SELECT id, stock, kind INTO v_product FROM wpall_shop.products WHERE id = v_item.product_id FOR UPDATE;
      IF v_product.id IS NOT NULL AND v_product.stock IS NOT NULL THEN
        IF v_product.stock > 0 AND v_product.stock < v_item.qty THEN
          RAISE EXCEPTION 'สินค้า % สต๊อกไม่พอ (เหลือ %)', v_item.product_name, v_product.stock;
        END IF;
        IF v_product.stock > 0 THEN
          UPDATE wpall_shop.products SET stock = stock - v_item.qty, updated_at = now()
          WHERE id = v_product.id;
        END IF;
      END IF;
    END IF;

    v_width := COALESCE((v_item.config->>'widthCm')::numeric, (v_item.config->>'width_cm')::numeric, 0);
    v_height := COALESCE((v_item.config->>'heightCm')::numeric, (v_item.config->>'height_cm')::numeric, 0);
    v_fullness := COALESCE((v_item.config->>'fullness')::numeric, 2.5);
    v_meters := (v_width * v_height / 10000.0) * v_fullness * v_item.qty;

    IF (v_item.config->>'fabricId') IS NOT NULL AND (v_item.config->>'fabricId') <> '' THEN
      SELECT id, stock_meters INTO v_fabric FROM wpall_shop.fabrics
      WHERE id = (v_item.config->>'fabricId')::uuid FOR UPDATE;
      IF v_fabric.id IS NOT NULL AND v_fabric.stock_meters > 0 THEN
        IF v_fabric.stock_meters < v_meters THEN
          RAISE EXCEPTION 'ผ้า % สต๊อกไม่พอ', v_item.config->>'fabricId';
        END IF;
        UPDATE wpall_shop.fabrics SET stock_meters = stock_meters - v_meters, updated_at = now()
        WHERE id = v_fabric.id;
      END IF;
    END IF;
  END LOOP;

  UPDATE wpall_shop.orders SET stock_reserved = true, updated_at = now() WHERE id = _order_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION wpall_shop.release_order_stock(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_shop
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
  PERFORM wpall_shop.assert_order_caller(_order_id);

  IF NOT EXISTS (SELECT 1 FROM wpall_shop.orders WHERE id = _order_id AND stock_reserved) THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true);
  END IF;

  FOR v_item IN SELECT * FROM wpall_shop.order_items WHERE order_id = _order_id LOOP
    IF v_item.product_id IS NOT NULL THEN
      SELECT id, stock INTO v_product FROM wpall_shop.products WHERE id = v_item.product_id;
      IF v_product.id IS NOT NULL AND v_product.stock IS NOT NULL AND v_product.stock >= 0 THEN
        UPDATE wpall_shop.products SET stock = stock + v_item.qty, updated_at = now()
        WHERE id = v_product.id;
      END IF;
    END IF;

    v_width := COALESCE((v_item.config->>'widthCm')::numeric, (v_item.config->>'width_cm')::numeric, 0);
    v_height := COALESCE((v_item.config->>'heightCm')::numeric, (v_item.config->>'height_cm')::numeric, 0);
    v_fullness := COALESCE((v_item.config->>'fullness')::numeric, 2.5);
    v_meters := (v_width * v_height / 10000.0) * v_fullness * v_item.qty;

    IF (v_item.config->>'fabricId') IS NOT NULL AND (v_item.config->>'fabricId') <> '' THEN
      SELECT id INTO v_fabric FROM wpall_shop.fabrics WHERE id = (v_item.config->>'fabricId')::uuid;
      IF v_fabric.id IS NOT NULL THEN
        UPDATE wpall_shop.fabrics SET stock_meters = stock_meters + v_meters, updated_at = now()
        WHERE id = v_fabric.id;
      END IF;
    END IF;
  END LOOP;

  UPDATE wpall_shop.orders SET stock_reserved = false, updated_at = now() WHERE id = _order_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION wpall_shop.assert_order_caller(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION wpall_shop.assert_order_caller(uuid) TO service_role;
