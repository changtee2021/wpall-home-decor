-- Set company contact email to info@wpallin1.com (ERP wpall_shop + local public)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'wpall_shop' AND table_name = 'site_settings'
  ) THEN
    UPDATE wpall_shop.site_settings
    SET email = 'info@wpallin1.com', updated_at = now()
    WHERE key = 'main';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'site_settings'
  ) THEN
    UPDATE public.site_settings
    SET email = 'info@wpallin1.com', updated_at = now()
    WHERE key = 'main';
  END IF;
END $$;
