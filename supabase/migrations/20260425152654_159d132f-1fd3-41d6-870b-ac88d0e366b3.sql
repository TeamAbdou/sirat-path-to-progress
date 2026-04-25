-- 1) Fix PRIVILEGE_ESCALATION on user_badges:
--    Remove client-side INSERT policy and award badges only via SECURITY DEFINER function.
DROP POLICY IF EXISTS "Users can insert own badges" ON public.user_badges;

CREATE OR REPLACE FUNCTION public.award_badge(_badge_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Whitelist of valid badge ids (must match client BADGES list)
  IF _badge_id NOT IN (
    'badge_day1',
    'badge_5steps',
    'badge_week_stable',
    'badge_7days_purity',
    'badge_month_purity',
    'badge_return_spiritual'
  ) THEN
    RAISE EXCEPTION 'Invalid badge id';
  END IF;

  INSERT INTO public.user_badges (user_id, badge_id)
  VALUES (_uid, _badge_id)
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.award_badge(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_badge(text) TO authenticated;

-- 2) Fix DEFINER_OR_RPC_BYPASS on rate-limit functions:
--    Restrict execution to service_role only; client must not invoke directly.
REVOKE EXECUTE ON FUNCTION public.record_rate_limit_attempt(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_rate_limit_attempt(text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.record_rate_limit_attempt(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_rate_limit_attempt(text, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.cleanup_old_rate_limits() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_rate_limits() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_rate_limits() FROM anon;
GRANT EXECUTE ON FUNCTION public.cleanup_old_rate_limits() TO service_role;

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) TO service_role;

-- 3) Document RLS on rate_limit_attempts:
--    Table is intentionally accessed only via SECURITY DEFINER functions (now service_role only).
--    No client policies needed; RLS-enabled with no policies = deny-all to clients (correct).
COMMENT ON TABLE public.rate_limit_attempts IS
  'Rate-limit ledger. Accessed only via SECURITY DEFINER functions invoked from edge functions using the service role. No client-side RLS policies by design (deny-all to authenticated/anon).';