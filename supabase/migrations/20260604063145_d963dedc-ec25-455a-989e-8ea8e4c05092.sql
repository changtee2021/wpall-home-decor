
-- 1) Revoke cost columns from public/customer roles
REVOKE SELECT (cost_price) ON public.products FROM anon, authenticated;
REVOKE SELECT (cost_per_meter) ON public.tracks FROM anon, authenticated;
REVOKE SELECT (cost) ON public.accessories FROM anon, authenticated;
GRANT SELECT (cost_price) ON public.products TO service_role;
GRANT SELECT (cost_per_meter) ON public.tracks TO service_role;
GRANT SELECT (cost) ON public.accessories TO service_role;

-- 2) Admin-only security-definer accessors that return full rows including cost
CREATE OR REPLACE FUNCTION public.admin_list_tracks()
RETURNS SETOF public.tracks
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.tracks
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY sort_order;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_accessories()
RETURNS SETOF public.accessories
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.accessories
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY sort_order;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_product(_id uuid)
RETURNS SETOF public.products
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.products
  WHERE id = _id AND public.has_role(auth.uid(), 'admin');
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_tracks() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_accessories() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_product(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_tracks() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_accessories() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_product(uuid) TO authenticated;

-- 3) Prevent customers from self-approving their own reviews
CREATE OR REPLACE FUNCTION public.guard_review_self_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  -- Non-admins may never flip is_approved to true, and cannot change it after creation.
  NEW.is_approved := OLD.is_approved;
  RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION public.guard_review_self_approval() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_review_self_approval ON public.reviews;
CREATE TRIGGER trg_guard_review_self_approval
BEFORE UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.guard_review_self_approval();

-- Also force inserts by non-admins to start unapproved (moderation queue)
CREATE OR REPLACE FUNCTION public.guard_review_insert_default()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.is_approved := false;
  END IF;
  RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION public.guard_review_insert_default() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_review_insert_default ON public.reviews;
CREATE TRIGGER trg_guard_review_insert_default
BEFORE INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.guard_review_insert_default();
