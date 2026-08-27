REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.is_master() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_master() TO authenticated;

REVOKE ALL ON FUNCTION public.can_access(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access(text) TO authenticated;

REVOKE ALL ON FUNCTION public.can_access_any(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_any(text[]) TO authenticated;

REVOKE ALL ON FUNCTION public.bootstrap_current_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_current_user() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_set_modules(uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_modules(uuid, text[]) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_set_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, public.app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;