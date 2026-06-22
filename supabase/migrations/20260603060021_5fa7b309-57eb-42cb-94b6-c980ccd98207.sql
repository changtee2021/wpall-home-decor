
-- has_role is referenced inside RLS USING expressions, so authenticated needs EXECUTE.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, anon;
-- resolve_product_price may be called by client for pricing previews
GRANT EXECUTE ON FUNCTION public.resolve_product_price(uuid, customer_tier) TO authenticated;
