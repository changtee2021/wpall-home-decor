-- wpall_shop: canonical company contact email info@wpallin1.com

UPDATE wpall_shop.site_settings
SET email = 'info@wpallin1.com', updated_at = now()
WHERE key = 'main'
  AND (email IS NULL OR email <> 'info@wpallin1.com');

-- Legacy public schema (if present from early migrations)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'site_settings'
  ) THEN
    UPDATE public.site_settings
    SET email = 'info@wpallin1.com', updated_at = now()
    WHERE key = 'main'
      AND (email IS NULL OR email <> 'info@wpallin1.com');
  END IF;
END $$;
