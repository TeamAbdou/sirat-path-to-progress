/**
 * Edge Function: check-rate-limit
 * Checks and records rate limit attempts for authentication endpoints.
 * Rules:
 *   - Login: 5 attempts per 15 minutes
 *   - OTP/TOTP: 3 attempts per 10 minutes
 *   - Password reset: 3 attempts per 15 minutes
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LIMITS: Record<string, { maxAttempts: number; windowMinutes: number }> = {
  login: { maxAttempts: 5, windowMinutes: 15 },
  otp: { maxAttempts: 3, windowMinutes: 10 },
  password_reset: { maxAttempts: 3, windowMinutes: 15 },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { identifier, attemptType, action } = await req.json();

    if (!identifier || !attemptType) {
      return new Response(
        JSON.stringify({ error: "Missing identifier or attemptType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const limit = LIMITS[attemptType] || { maxAttempts: 5, windowMinutes: 15 };

    // Use service role to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // For "record" action, require JWT authentication to prevent DoS
    if (action === "record") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const anonClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const token = authHeader.replace("Bearer ", "");
      const { error: claimsError } = await anonClient.auth.getClaims(token);
      if (claimsError) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Clean up old records periodically
    await supabase.rpc("cleanup_old_rate_limits");

    if (action === "check") {
      // Check if rate limited
      const { data } = await supabase.rpc("check_rate_limit", {
        _identifier: identifier,
        _attempt_type: attemptType,
        _max_attempts: limit.maxAttempts,
        _window_minutes: limit.windowMinutes,
      });

      const allowed = data === true;

      if (!allowed) {
        // Log rate limit exceeded
        await supabase.from("security_logs").insert({
          event_type: "rate_limit_exceeded",
          description: `Rate limit exceeded for ${attemptType}: ${identifier}`,
          metadata: { identifier, attempt_type: attemptType },
        });
      }

      return new Response(
        JSON.stringify({ allowed, remainingMinutes: allowed ? 0 : limit.windowMinutes }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "record") {
      // Record a failed attempt
      await supabase.rpc("record_rate_limit_attempt", {
        _identifier: identifier,
        _attempt_type: attemptType,
      });

      return new Response(
        JSON.stringify({ recorded: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'check' or 'record'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Rate limit error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
