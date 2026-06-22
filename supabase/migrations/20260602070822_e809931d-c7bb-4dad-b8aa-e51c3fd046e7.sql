
CREATE OR REPLACE FUNCTION public.compute_tier(_total NUMERIC, _count INT)
RETURNS public.customer_tier LANGUAGE SQL IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _total >= 300000 OR _count >= 20 THEN 'platinum'::public.customer_tier
    WHEN _total >= 100000 THEN 'gold'::public.customer_tier
    WHEN _total >= 30000 THEN 'silver'::public.customer_tier
    ELSE 'bronze'::public.customer_tier
  END
$$;
