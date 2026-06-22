-- Synced from wp-group-erp — see 20260619120100_wpall_shop_performance_indexes.sql
CREATE INDEX IF NOT EXISTS orders_user_id_created_at_idx ON wpall_shop.orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON wpall_shop.orders (status);
CREATE INDEX IF NOT EXISTS notifications_user_read_created_idx ON wpall_shop.notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS cart_items_cart_id_idx ON wpall_shop.cart_items (cart_id);
CREATE INDEX IF NOT EXISTS reviews_product_id_idx ON wpall_shop.reviews (product_id);
CREATE INDEX IF NOT EXISTS topup_requests_user_status_idx ON wpall_shop.topup_requests (user_id, status);
CREATE INDEX IF NOT EXISTS favorites_user_id_idx ON wpall_shop.favorites (user_id);
CREATE INDEX IF NOT EXISTS user_coupons_user_id_idx ON wpall_shop.user_coupons (user_id);
CREATE INDEX IF NOT EXISTS addresses_user_default_idx ON wpall_shop.addresses (user_id, is_default);

CREATE OR REPLACE FUNCTION wpall_shop.prune_old_notifications(_days integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_shop
AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM wpall_shop.notifications
  WHERE is_read = true
    AND created_at < now() - make_interval(days => _days);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION wpall_shop.prune_old_notifications(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION wpall_shop.prune_old_notifications(integer) TO service_role;
