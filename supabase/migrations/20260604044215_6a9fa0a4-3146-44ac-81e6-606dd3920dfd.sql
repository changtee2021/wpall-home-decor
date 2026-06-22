
-- Attribute groups (e.g. Wood Finish, Ladder Tape)
CREATE TABLE public.attribute_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  display_type text NOT NULL DEFAULT 'color_swatch' CHECK (display_type IN ('color_swatch','image_button','dropdown')),
  description text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.attribute_groups TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.attribute_groups TO authenticated;
GRANT ALL ON public.attribute_groups TO service_role;
ALTER TABLE public.attribute_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read active attribute_groups" ON public.attribute_groups
  FOR SELECT TO anon, authenticated USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage attribute_groups" ON public.attribute_groups
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_attribute_groups_updated BEFORE UPDATE ON public.attribute_groups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Attribute options inside groups
CREATE TABLE public.attribute_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.attribute_groups(id) ON DELETE CASCADE,
  label text NOT NULL,
  swatch_color text,
  image_url text,
  price_delta numeric NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_attribute_options_group ON public.attribute_options(group_id);
GRANT SELECT ON public.attribute_options TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.attribute_options TO authenticated;
GRANT ALL ON public.attribute_options TO service_role;
ALTER TABLE public.attribute_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read active attribute_options" ON public.attribute_options
  FOR SELECT TO anon, authenticated USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage attribute_options" ON public.attribute_options
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_attribute_options_updated BEFORE UPDATE ON public.attribute_options FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Hotspots placed on a product image
CREATE TABLE public.product_hotspots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  attribute_group_id uuid NOT NULL REFERENCES public.attribute_groups(id) ON DELETE CASCADE,
  pin_label text NOT NULL,
  coord_x numeric NOT NULL CHECK (coord_x >= 0 AND coord_x <= 100),
  coord_y numeric NOT NULL CHECK (coord_y >= 0 AND coord_y <= 100),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_hotspots_product ON public.product_hotspots(product_id);
GRANT SELECT ON public.product_hotspots TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_hotspots TO authenticated;
GRANT ALL ON public.product_hotspots TO service_role;
ALTER TABLE public.product_hotspots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read product_hotspots" ON public.product_hotspots
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage product_hotspots" ON public.product_hotspots
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_product_hotspots_updated BEFORE UPDATE ON public.product_hotspots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
