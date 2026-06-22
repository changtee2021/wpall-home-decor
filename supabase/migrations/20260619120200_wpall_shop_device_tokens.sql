-- Synced from wp-group-erp — see 20260619120200_wpall_shop_device_tokens.sql
CREATE TABLE IF NOT EXISTS wpall_shop.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS device_tokens_user_id_idx ON wpall_shop.device_tokens (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON wpall_shop.device_tokens TO authenticated;
GRANT ALL ON wpall_shop.device_tokens TO service_role;

ALTER TABLE wpall_shop.device_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own device tokens" ON wpall_shop.device_tokens;
CREATE POLICY "own device tokens" ON wpall_shop.device_tokens
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE wpall_shop.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
