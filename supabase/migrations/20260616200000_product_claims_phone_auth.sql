-- wpall_shop: product claims (warranty / defect) + phone signup support

-- ---------------------------------------------------------------------------
-- Claim status & issue type
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE wpall_shop.claim_status AS ENUM (
    'submitted', 'reviewing', 'approved', 'rejected', 'processing', 'completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE wpall_shop.claim_issue_type AS ENUM (
    'defect', 'wrong_item', 'missing', 'warranty', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Product claims
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wpall_shop.product_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number text NOT NULL UNIQUE DEFAULT (
    'CLM-' || to_char(now(), 'YYYYMMDD') || '-' ||
    lpad((floor(random() * 10000))::text, 4, '0')
  ),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES wpall_shop.orders(id) ON DELETE SET NULL,
  product_name text NOT NULL DEFAULT '',
  issue_type wpall_shop.claim_issue_type NOT NULL DEFAULT 'defect',
  description text NOT NULL DEFAULT '',
  status wpall_shop.claim_status NOT NULL DEFAULT 'submitted',
  customer_phone text,
  image_paths jsonb NOT NULL DEFAULT '[]'::jsonb,
  admin_note text,
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_product_claims_user_created
  ON wpall_shop.product_claims (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_claims_status
  ON wpall_shop.product_claims (status, created_at DESC);

-- ---------------------------------------------------------------------------
-- Claim comments (customer + admin thread)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wpall_shop.claim_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES wpall_shop.product_claims(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claim_comments_claim
  ON wpall_shop.claim_comments (claim_id, created_at ASC);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE wpall_shop.product_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE wpall_shop.claim_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "claims select own or admin" ON wpall_shop.product_claims;
CREATE POLICY "claims select own or admin"
  ON wpall_shop.product_claims FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR wpall_shop.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "claims insert own" ON wpall_shop.product_claims;
CREATE POLICY "claims insert own"
  ON wpall_shop.product_claims FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "claims update own submitted" ON wpall_shop.product_claims;
CREATE POLICY "claims update own submitted"
  ON wpall_shop.product_claims FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'submitted')
  WITH CHECK (user_id = auth.uid() AND status = 'submitted');

DROP POLICY IF EXISTS "claims update admin" ON wpall_shop.product_claims;
CREATE POLICY "claims update admin"
  ON wpall_shop.product_claims FOR UPDATE TO authenticated
  USING (wpall_shop.has_role(auth.uid(), 'admin'))
  WITH CHECK (wpall_shop.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "claim_comments select" ON wpall_shop.claim_comments;
CREATE POLICY "claim_comments select"
  ON wpall_shop.claim_comments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wpall_shop.product_claims c
      WHERE c.id = claim_id
        AND (c.user_id = auth.uid() OR wpall_shop.has_role(auth.uid(), 'admin'))
    )
  );

DROP POLICY IF EXISTS "claim_comments insert" ON wpall_shop.claim_comments;
CREATE POLICY "claim_comments insert"
  ON wpall_shop.claim_comments FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM wpall_shop.product_claims c
      WHERE c.id = claim_id
        AND (c.user_id = auth.uid() OR wpall_shop.has_role(auth.uid(), 'admin'))
    )
  );

GRANT SELECT, INSERT, UPDATE ON wpall_shop.product_claims TO authenticated;
GRANT SELECT, INSERT ON wpall_shop.claim_comments TO authenticated;

-- ---------------------------------------------------------------------------
-- Phone signup: sync phone into profiles
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION wpall_shop.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpall_shop, public
AS $$
BEGIN
  INSERT INTO wpall_shop.profiles (id, email, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
      'สมาชิก WP ALL'
    ),
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone')
  )
  ON CONFLICT (id) DO UPDATE SET
    phone = COALESCE(EXCLUDED.phone, wpall_shop.profiles.phone);
  INSERT INTO wpall_shop.user_roles (user_id, role) VALUES (NEW.id, 'customer') ON CONFLICT DO NOTHING;
  INSERT INTO wpall_shop.wallets (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- Re-attach trigger if on auth.users (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION wpall_shop.handle_new_user();

-- Storage bucket for claim evidence (public read via signed URLs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'claim-media',
  'claim-media',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "claim media upload own folder" ON storage.objects;
CREATE POLICY "claim media upload own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'claim-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "claim media read own or admin" ON storage.objects;
CREATE POLICY "claim media read own or admin"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'claim-media'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR wpall_shop.has_role(auth.uid(), 'admin')
    )
  );

DROP POLICY IF EXISTS "claim media update own" ON storage.objects;
CREATE POLICY "claim media update own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'claim-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
