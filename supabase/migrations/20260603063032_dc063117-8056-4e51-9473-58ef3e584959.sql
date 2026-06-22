
-- Hide internal cost columns from anonymous users (column-level privileges).
-- Authenticated users (incl. admins via admin UI) keep access for editing.
REVOKE SELECT (cost_price) ON public.products FROM anon;
REVOKE SELECT (cost_per_meter) ON public.fabrics FROM anon;

-- Also hide fabric cost from regular authenticated users; only service_role
-- and admin-side flows need it, and the fabrics table currently has no
-- non-admin consumer in the app code.
REVOKE SELECT (cost_per_meter) ON public.fabrics FROM authenticated;
GRANT SELECT (cost_per_meter) ON public.fabrics TO service_role;

-- Restrict product_files reads to authenticated users (was: anyone).
DROP POLICY IF EXISTS "anyone read product files" ON public.product_files;
CREATE POLICY "authenticated read current product files"
ON public.product_files
FOR SELECT
TO authenticated
USING (is_current = true OR has_role(auth.uid(), 'admin'::app_role));

-- Restrict storage reads of product-files bucket to authenticated users.
DROP POLICY IF EXISTS "anyone read product files objects" ON storage.objects;
CREATE POLICY "authenticated read product files objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'product-files');
