-- Revoke anon role from set_user_context to prevent identity spoofing
REVOKE EXECUTE ON FUNCTION public.set_user_context(text) FROM anon;

-- Also revoke anon from admin-only RPCs as defense-in-depth
REVOKE EXECUTE ON FUNCTION public.toggle_name_visibility(uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.toggle_name_visibility(uuid, boolean, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.toggle_name_locked_in(text, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.toggle_name_locked_in(text, boolean, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.toggle_name_locked_in(uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.toggle_name_hidden(text, boolean, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_current_user_name() FROM anon;
REVOKE EXECUTE ON FUNCTION public.change_user_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.change_user_role(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_user_complete(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_security_summary(integer) FROM anon;