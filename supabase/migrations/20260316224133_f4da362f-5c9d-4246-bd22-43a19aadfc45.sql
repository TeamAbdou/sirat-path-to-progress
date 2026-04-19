-- Remove the permissive INSERT policy that allows any authenticated user to insert
DROP POLICY "Authenticated users can insert security logs" ON public.security_logs;

-- Add CHECK constraint to restrict event_type values
ALTER TABLE public.security_logs ADD CONSTRAINT valid_event_type CHECK (event_type IN ('login_success', 'login_failed', 'logout', 'signup', 'password_reset_request', 'password_changed', 'oauth_login', 'admin_settings_changed', 'suspicious_activity', 'rate_limit_exceeded'));