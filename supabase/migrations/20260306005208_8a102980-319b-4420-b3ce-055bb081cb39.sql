CREATE POLICY "Public can read user roles"
ON public.cat_user_roles
FOR SELECT
USING (true);