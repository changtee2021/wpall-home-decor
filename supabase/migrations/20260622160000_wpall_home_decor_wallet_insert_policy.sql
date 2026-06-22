-- Allow users to create their own wallet row if signup trigger missed it.
SET search_path TO wpall_home_decor, public;

DROP POLICY IF EXISTS "own wallet insert" ON wpall_home_decor.wallets;
CREATE POLICY "own wallet insert" ON wpall_home_decor.wallets
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Ensure passawut gmail account has wallet + profile (manual recovery)
INSERT INTO wpall_home_decor.wallets (user_id)
SELECT id FROM auth.users WHERE email = 'passawut.a.plus@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO wpall_home_decor.user_roles (user_id, role)
SELECT id, 'customer' FROM auth.users WHERE email = 'passawut.a.plus@gmail.com'
ON CONFLICT DO NOTHING;
