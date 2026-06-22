-- 1) promo_cards
CREATE TABLE public.promo_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  tone text NOT NULL DEFAULT 'teal',
  link_url text NOT NULL DEFAULT '/products',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.promo_cards TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.promo_cards TO authenticated;
GRANT ALL ON public.promo_cards TO service_role;
ALTER TABLE public.promo_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read active promo_cards" ON public.promo_cards FOR SELECT TO anon, authenticated USING (is_active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage promo_cards" ON public.promo_cards FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER set_promo_cards_updated_at BEFORE UPDATE ON public.promo_cards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) service_icons
CREATE TABLE public.service_icons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  icon text NOT NULL DEFAULT 'Sparkles',
  link_url text NOT NULL DEFAULT '/products',
  tone text NOT NULL DEFAULT 'teal',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.service_icons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.service_icons TO authenticated;
GRANT ALL ON public.service_icons TO service_role;
ALTER TABLE public.service_icons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read active service_icons" ON public.service_icons FOR SELECT TO anon, authenticated USING (is_active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage service_icons" ON public.service_icons FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER set_service_icons_updated_at BEFORE UPDATE ON public.service_icons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) site_settings
CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  brand_name text NOT NULL DEFAULT 'WP ALL',
  tagline text,
  phone text,
  email text,
  address text,
  facebook_url text,
  line_url text,
  instagram_url text,
  tiktok_url text,
  about_html text,
  contact_note text,
  logo_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read site_settings" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage site_settings" ON public.site_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER set_site_settings_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) tracks
CREATE TABLE public.tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'show',
  price_per_meter numeric NOT NULL DEFAULT 0,
  cost_per_meter numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tracks TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tracks TO authenticated;
GRANT ALL ON public.tracks TO service_role;
REVOKE SELECT (cost_per_meter) ON public.tracks FROM anon, authenticated;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read active tracks" ON public.tracks FOR SELECT TO anon, authenticated USING (is_active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage tracks" ON public.tracks FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER set_tracks_updated_at BEFORE UPDATE ON public.tracks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5) accessories
CREATE TABLE public.accessories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  cost numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.accessories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.accessories TO authenticated;
GRANT ALL ON public.accessories TO service_role;
REVOKE SELECT (cost) ON public.accessories FROM anon, authenticated;
ALTER TABLE public.accessories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read active accessories" ON public.accessories FOR SELECT TO anon, authenticated USING (is_active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage accessories" ON public.accessories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER set_accessories_updated_at BEFORE UPDATE ON public.accessories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SEED
INSERT INTO public.site_settings (key, brand_name, tagline, phone, email, address, facebook_url, line_url, about_html, contact_note)
VALUES ('main', 'WP ALL', 'ม่าน มู่ลี่ ของแต่งบ้าน ครบจบที่เดียว',
  '02-123-4567', 'hello@wpall.co.th',
  '123 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110',
  'https://facebook.com/wpall', 'https://line.me/R/ti/p/@wpall',
  'WP ALL ผู้ผลิตและจำหน่ายผ้าม่าน มู่ลี่ ของแต่งบ้านครบวงจร ออกแบบ วัด ผลิต ติดตั้งถึงบ้าน ประสบการณ์ 15+ ปี โรงงานเอง คุณภาพระดับโรงแรม ราคาตรงจากผู้ผลิต',
  'เปิดบริการ จ-ส 9:00-18:00 ปิดวันอาทิตย์');

INSERT INTO public.promo_cards (title, subtitle, tone, link_url, sort_order) VALUES
  ('จับคู่ลดสุดคุ้ม', 'ม่าน + ราง รับส่วนลดเพิ่ม 15%', 'cream', '/products', 1),
  ('WP จัดให้', 'ของดีราคาเด็ด เฉพาะสัปดาห์นี้', 'teal', '/products', 2),
  ('โปรแรง', 'กดเพื่อดูโปรโมชั่นทั้งหมด', 'orange', '/products', 3),
  ('สมาชิกใหม่', 'รับคูปองรวม 600 บาท', 'blue', '/signup', 4);

INSERT INTO public.service_icons (label, icon, link_url, tone, sort_order) VALUES
  ('วัดหน้าต่างฟรี', 'Ruler', '/products', 'teal', 1),
  ('ติดตั้งถึงบ้าน', 'Wrench', '/products', 'orange', 2),
  ('คำนวณราคา', 'Calculator', '/products', 'teal', 3),
  ('คูปองของฉัน', 'Ticket', '/account/coupons', 'orange', 4),
  ('โปรแรง', 'Flame', '/products', 'orange', 5),
  ('แนะนำสุดฮิต', 'Sparkles', '/products', 'teal', 6),
  ('ข่าวสาร', 'Newspaper', '/', 'teal', 7);

INSERT INTO public.tracks (code, name, type, price_per_meter, cost_per_meter, sort_order) VALUES
  ('TR-SHOW', 'รางโชว์อลูมิเนียม', 'show', 350, 200, 1),
  ('TR-CONC', 'รางเอ็มซ่อน', 'concealed', 220, 120, 2),
  ('TR-MOTOR', 'รางมอเตอร์ไฟฟ้า', 'motorized', 1800, 1100, 3);

INSERT INTO public.accessories (name, price, cost, sort_order) VALUES
  ('ตะขอเกี่ยวม่าน (ชุด)', 120, 60, 1),
  ('สายดึงม่าน', 80, 35, 2),
  ('ตัวรองพื้นกันลม', 150, 80, 3),
  ('รีโมทควบคุม', 1200, 700, 4);

INSERT INTO public.fabrics (code, name, color, price_per_meter, cost_per_meter, roll_width_cm, swatch)
SELECT * FROM (VALUES
  ('VL-101', 'Velvet Lux', 'Sage Green', 480::numeric, 280::numeric, 280, '#9ab59a'),
  ('VL-102', 'Velvet Lux', 'Dusty Pink', 480::numeric, 280::numeric, 280, '#d9a9a9'),
  ('LN-203', 'Linen Natural', 'Cream', 320::numeric, 180::numeric, 300, '#efe6d4'),
  ('BO-410', 'Blackout Premium', 'Charcoal', 620::numeric, 360::numeric, 280, '#3a3a3a'),
  ('SK-501', 'Silk Shine', 'Champagne', 780::numeric, 460::numeric, 280, '#e8d9b0'),
  ('CT-302', 'Cotton Plain', 'Sky', 280::numeric, 150::numeric, 300, '#bcd6e5')
) AS s(code, name, color, price_per_meter, cost_per_meter, roll_width_cm, swatch)
WHERE NOT EXISTS (SELECT 1 FROM public.fabrics f WHERE f.code = s.code);