-- Hide fabric cost price from non-admin users via column-level revoke
REVOKE SELECT (cost_per_meter) ON public.fabrics FROM authenticated;
REVOKE SELECT (cost_per_meter) ON public.fabrics FROM anon;
-- service_role retains full access; admin can still read via service_role/admin code paths