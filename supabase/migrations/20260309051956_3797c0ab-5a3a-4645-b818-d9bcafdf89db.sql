
-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add encrypted_value column to admin_settings
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS encrypted_value text;

-- Create rate_limit_attempts table for tracking failed auth attempts
CREATE TABLE IF NOT EXISTS public.rate_limit_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  attempt_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier_type ON public.rate_limit_attempts(identifier, attempt_type, created_at);

ALTER TABLE public.rate_limit_attempts ENABLE ROW LEVEL SECURITY;

-- Create donations table for tracking payments
CREATE TABLE IF NOT EXISTS public.donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  paypal_order_id text,
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'USD',
  status text DEFAULT 'pending',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own donations" ON public.donations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own donations" ON public.donations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all donations" ON public.donations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all donations" ON public.donations
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Function to clean up old rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limit_attempts WHERE created_at < now() - interval '1 hour';
$$;

-- Function to check rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _identifier text,
  _attempt_type text,
  _max_attempts int DEFAULT 5,
  _window_minutes int DEFAULT 15
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) < _max_attempts
  FROM public.rate_limit_attempts
  WHERE identifier = _identifier
    AND attempt_type = _attempt_type
    AND created_at > now() - (_window_minutes || ' minutes')::interval;
$$;

-- Function to record a rate limit attempt
CREATE OR REPLACE FUNCTION public.record_rate_limit_attempt(
  _identifier text,
  _attempt_type text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.rate_limit_attempts (identifier, attempt_type)
  VALUES (_identifier, _attempt_type);
$$;
