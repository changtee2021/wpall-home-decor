
-- Enum
DO $$ BEGIN
  CREATE TYPE public.product_kind AS ENUM ('curtain','wood_blind','aluminum_blind','dim_blind','ready_curtain','accessory','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Columns
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS kind public.product_kind NOT NULL DEFAULT 'curtain',
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'ชิ้น',
  ADD COLUMN IF NOT EXISTS stock numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sale_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS images jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique ON public.products(sku) WHERE sku IS NOT NULL;

ALTER TABLE public.products ALTER COLUMN curtain_type DROP NOT NULL;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images','product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "product-images public read" ON storage.objects;
CREATE POLICY "product-images public read" ON storage.objects
FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product-images admin write" ON storage.objects;
CREATE POLICY "product-images admin write" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "product-images admin update" ON storage.objects;
CREATE POLICY "product-images admin update" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'product-images' AND public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "product-images admin delete" ON storage.objects;
CREATE POLICY "product-images admin delete" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND public.has_role(auth.uid(),'admin'));
