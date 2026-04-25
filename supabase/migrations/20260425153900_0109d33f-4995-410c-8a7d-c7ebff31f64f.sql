-- Lock down user_roles: no client writes allowed at all.
-- The auto_assign_admin trigger uses SECURITY DEFINER and bypasses RLS, so it still works.
CREATE POLICY "Deny client insert on user_roles"
ON public.user_roles
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "Deny client update on user_roles"
ON public.user_roles
FOR UPDATE
TO authenticated, anon
USING (false);

CREATE POLICY "Deny client delete on user_roles"
ON public.user_roles
FOR DELETE
TO authenticated, anon
USING (false);

-- Lock down user_badges writes. award_badge() SECURITY DEFINER function bypasses RLS.
CREATE POLICY "Deny client insert on user_badges"
ON public.user_badges
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "Deny client update on user_badges"
ON public.user_badges
FOR UPDATE
TO authenticated, anon
USING (false);

CREATE POLICY "Deny client delete on user_badges"
ON public.user_badges
FOR DELETE
TO authenticated, anon
USING (false);

-- Lock down rate_limit_attempts entirely from clients.
CREATE POLICY "Deny client select on rate_limit_attempts"
ON public.rate_limit_attempts
FOR SELECT
TO authenticated, anon
USING (false);

CREATE POLICY "Deny client insert on rate_limit_attempts"
ON public.rate_limit_attempts
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "Deny client update on rate_limit_attempts"
ON public.rate_limit_attempts
FOR UPDATE
TO authenticated, anon
USING (false);

CREATE POLICY "Deny client delete on rate_limit_attempts"
ON public.rate_limit_attempts
FOR DELETE
TO authenticated, anon
USING (false);