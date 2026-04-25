CREATE POLICY "Deny client insert on security_logs"
ON public.security_logs
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "Deny client update on security_logs"
ON public.security_logs
FOR UPDATE
TO authenticated, anon
USING (false);

CREATE POLICY "Deny client delete on security_logs"
ON public.security_logs
FOR DELETE
TO authenticated, anon
USING (false);