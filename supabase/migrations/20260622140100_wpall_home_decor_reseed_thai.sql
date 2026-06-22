-- Re-seed wpall_home_decor Thai storefront text (bootstrap seed was double-encoded).
SET search_path TO wpall_home_decor, public;

UPDATE wpall_home_decor.site_settings SET
  tagline = 'ม่าน มู่ลี่ ของแต่งบ้าน ครบจบที่เดียว',
  address = '123 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110',
  about_html = 'WP ALL ผู้ผลิตและจำหน่ายผ้าม่าน มู่ลี่ ของแต่งบ้านครบวงจร ออกแบบ วัด ผลิต ติดตั้งถึงบ้าน ประสบการณ์ 15+ ปี โรงงานเอง คุณภาพระดับโรงแรม ราคาตรงจากผู้ผลิต',
  contact_note = 'เปิดบริการ จ-ส 9:00-18:00 ปิดวันอาทิตย์'
WHERE key = 'main';

DELETE FROM wpall_home_decor.promo_cards;
INSERT INTO wpall_home_decor.promo_cards (title, subtitle, tone, link_url, sort_order) VALUES
  ('จับคู่ลดสุดคุ้ม', 'ม่าน + ราง รับส่วนลดเพิ่ม 15%', 'cream', '/products', 1),
  ('WP จัดให้', 'ของดีราคาเด็ด เฉพาะสัปดาห์นี้', 'teal', '/products', 2),
  ('โปรแรง', 'กดเพื่อดูโปรโมชั่นทั้งหมด', 'orange', '/products', 3),
  ('สมาชิกใหม่', 'รับคูปองรวม 600 บาท', 'blue', '/signup', 4);

DELETE FROM wpall_home_decor.service_icons;
INSERT INTO wpall_home_decor.service_icons (label, icon, link_url, tone, sort_order) VALUES
  ('วัดหน้าต่างฟรี', 'Ruler', '/products', 'teal', 1),
  ('ติดตั้งถึงบ้าน', 'Wrench', '/products', 'orange', 2),
  ('คำนวณราคา', 'Calculator', '/products', 'teal', 3),
  ('คูปองของฉัน', 'Ticket', '/account/coupons', 'orange', 4),
  ('โปรแรง', 'Flame', '/products', 'orange', 5),
  ('แนะนำสุดฮิต', 'Sparkles', '/products', 'teal', 6),
  ('ข่าวสาร', 'Newspaper', '/', 'teal', 7);

UPDATE wpall_home_decor.tracks SET name = 'รางโชว์อลูมิเนียม' WHERE code = 'TR-SHOW';
UPDATE wpall_home_decor.tracks SET name = 'รางเอ็มซ่อน' WHERE code = 'TR-CONC';
UPDATE wpall_home_decor.tracks SET name = 'รางมอเตอร์ไฟฟ้า' WHERE code = 'TR-MOTOR';

UPDATE wpall_home_decor.accessories SET name = 'ตะขอเกี่ยวม่าน (ชุด)' WHERE sort_order = 1;
UPDATE wpall_home_decor.accessories SET name = 'สายดึงม่าน' WHERE sort_order = 2;
UPDATE wpall_home_decor.accessories SET name = 'ตัวรองพื้นกันลม' WHERE sort_order = 3;
UPDATE wpall_home_decor.accessories SET name = 'รีโมทควบคุม' WHERE sort_order = 4;

-- Fix any category/product names still showing mojibake (latin1-byte layer)
CREATE OR REPLACE FUNCTION wpall_home_decor.fix_thai_mojibake(t text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  b bytea;
  i int;
  out bytea := ''::bytea;
  cp int;
BEGIN
  IF t IS NULL OR t = '' THEN RETURN t; END IF;
  IF t !~ '[à¸à¹]' AND t !~ '[\u0E00-\u0E7F]' THEN RETURN t; END IF;
  IF t ~ '[\u0E00-\u0E7F]' AND t !~ 'à' THEN RETURN t; END IF;
  FOR i IN 0..length(t)-1 LOOP
    cp := ascii(substr(t, i+1, 1));
    IF cp > 255 THEN RETURN t; END IF;
    out := out || set_byte('\x00'::bytea, 0, cp);
  END LOOP;
  BEGIN
    RETURN convert_from(out, 'UTF8');
  EXCEPTION WHEN OTHERS THEN
    RETURN t;
  END;
END;
$$;

UPDATE wpall_home_decor.product_categories SET name = wpall_home_decor.fix_thai_mojibake(name)
WHERE name LIKE '%à%';

UPDATE wpall_home_decor.products SET
  name = wpall_home_decor.fix_thai_mojibake(name),
  description = wpall_home_decor.fix_thai_mojibake(description),
  unit = wpall_home_decor.fix_thai_mojibake(unit)
WHERE name LIKE '%à%' OR description LIKE '%à%' OR unit LIKE '%à%';

DROP FUNCTION wpall_home_decor.fix_thai_mojibake(text);
