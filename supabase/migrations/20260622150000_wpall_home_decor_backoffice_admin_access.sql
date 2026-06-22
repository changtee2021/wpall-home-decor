-- Allow wp-backoffice staff (backoffice.admin) to manage wpall_home_decor via existing RLS policies.
CREATE OR REPLACE FUNCTION wpall_home_decor.has_role(_user_id uuid, _role wpall_home_decor.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = wpall_home_decor, backoffice, public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM wpall_home_decor.user_roles
      WHERE user_id = _user_id AND role = _role
    )
    OR (
      _role = 'admin'::wpall_home_decor.app_role
      AND EXISTS (
        SELECT 1
        FROM backoffice.user_roles
        WHERE user_id = _user_id AND role = 'admin'::backoffice.app_role
      )
    );
$$;

GRANT EXECUTE ON FUNCTION wpall_home_decor.has_role(uuid, wpall_home_decor.app_role) TO authenticated, service_role;
