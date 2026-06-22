
-- 1) Coupons: restrict read to authenticated
DROP POLICY IF EXISTS "anyone read active coupons" ON public.coupons;
CREATE POLICY "authenticated read active coupons"
  ON public.coupons FOR SELECT TO authenticated
  USING (is_active OR public.has_role(auth.uid(), 'admin'));
REVOKE SELECT ON public.coupons FROM anon;

-- 2) Profiles: prevent customers from changing tier/tier_override
CREATE OR REPLACE FUNCTION public.prevent_profile_tier_self_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.tier IS DISTINCT FROM OLD.tier THEN
    NEW.tier := OLD.tier;
  END IF;
  IF NEW.tier_override IS DISTINCT FROM OLD.tier_override THEN
    NEW.tier_override := OLD.tier_override;
  END IF;
  IF NEW.total_spent IS DISTINCT FROM OLD.total_spent THEN
    NEW.total_spent := OLD.total_spent;
  END IF;
  IF NEW.order_count IS DISTINCT FROM OLD.order_count THEN
    NEW.order_count := OLD.order_count;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_prevent_profile_tier_self_update ON public.profiles;
CREATE TRIGGER trg_prevent_profile_tier_self_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_tier_self_update();

-- 3) Topup requests: prevent customers from changing sensitive columns
CREATE OR REPLACE FUNCTION public.guard_topup_user_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  -- Non-admin can only modify slip_url, reference_note, and cancel status
  NEW.amount := OLD.amount;
  NEW.method := OLD.method;
  NEW.approved_at := OLD.approved_at;
  NEW.approved_by := OLD.approved_by;
  NEW.user_id := OLD.user_id;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('pending','cancelled') THEN
    RAISE EXCEPTION 'Customers may only cancel a pending topup';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_topup_user_update ON public.topup_requests;
CREATE TRIGGER trg_guard_topup_user_update
  BEFORE UPDATE ON public.topup_requests
  FOR EACH ROW EXECUTE FUNCTION public.guard_topup_user_update();

-- 4) order_items: explicit admin-only UPDATE/DELETE
CREATE POLICY "admin update order_items"
  ON public.order_items FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete order_items"
  ON public.order_items FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5) Storage: drop broad listing policy on public product-images bucket
-- (Public file URLs continue to work via the public bucket CDN)
DROP POLICY IF EXISTS "product-images public read" ON storage.objects;

-- 6) Lock down SECURITY DEFINER helpers from direct API calls;
-- keep EXECUTE only for the user-facing RPCs the app calls intentionally.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_tier(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_tier(numeric, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_order_status_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_topup_approval() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_product_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_tier_self_update() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_topup_user_update() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_adjust_wallet(uuid, numeric, text) FROM anon;
-- pay_with_wallet, claim_coupon: keep EXECUTE for authenticated (called by app)
REVOKE EXECUTE ON FUNCTION public.pay_with_wallet(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_coupon(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resolve_product_price(uuid, customer_tier) FROM anon;
