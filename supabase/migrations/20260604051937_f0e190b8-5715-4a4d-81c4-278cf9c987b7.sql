CREATE OR REPLACE FUNCTION public.guard_topup_user_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  -- Non-admin customers may NOT change financial/identity fields after insert.
  NEW.amount := OLD.amount;
  NEW.method := OLD.method;
  NEW.slip_url := OLD.slip_url;
  NEW.reference_note := OLD.reference_note;
  NEW.approved_at := OLD.approved_at;
  NEW.approved_by := OLD.approved_by;
  NEW.user_id := OLD.user_id;
  NEW.rejected_reason := OLD.rejected_reason;
  -- Customers may only cancel a pending topup.
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('pending','cancelled') THEN
    RAISE EXCEPTION 'Customers may only cancel a pending topup';
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_guard_topup_user_update ON public.topup_requests;
CREATE TRIGGER trg_guard_topup_user_update
  BEFORE UPDATE ON public.topup_requests
  FOR EACH ROW EXECUTE FUNCTION public.guard_topup_user_update();