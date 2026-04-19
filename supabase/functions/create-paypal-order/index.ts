/**
 * Edge Function: create-paypal-order
 * Securely creates PayPal orders server-side.
 * PayPal credentials are stored as secrets, never exposed to the client.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// PayPal API base URLs
const PAYPAL_API_BASE =
  Deno.env.get("PAYPAL_MODE") === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_SECRET");

  if (!clientId || !secret) {
    throw new Error("PayPal credentials not configured");
  }

  const auth = btoa(`${clientId}:${secret}`);
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`PayPal auth failed: ${res.status}`);
  }

  const data = await res.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT - authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Parse and validate request body
    const body = await req.json();
    const { amount, currency = "USD", description = "Donation to Sirat", return_url, cancel_url } = body;

    if (!amount || isNaN(Number(amount)) || Number(amount) < 1 || Number(amount) > 500) {
      return new Response(
        JSON.stringify({ error: "Invalid amount (must be between 1 and 500)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();

    // Create PayPal order with return/cancel URLs
    const orderRes = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: Number(amount).toFixed(2),
            },
            description,
          },
        ],
        application_context: {
          return_url: return_url || "https://sirat-path.lovable.app/donate?status=success",
          cancel_url: cancel_url || "https://sirat-path.lovable.app/donate?status=cancelled",
          brand_name: "Sirat - صِراط",
          user_action: "PAY_NOW",
        },
      }),
    });

    if (!orderRes.ok) {
      const err = await orderRes.text();
      console.error("PayPal order creation failed:", err);
      throw new Error("Failed to create PayPal order");
    }

    const order = await orderRes.json();

    // Extract approval URL
    const approvalUrl = order.links?.find((l: any) => l.rel === "approve")?.href;

    // Record donation in database with service role for unrestricted insert
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await adminClient.from("donations").insert({
      user_id: userId,
      paypal_order_id: order.id,
      amount: Number(amount),
      currency,
      status: "pending",
      metadata: { description },
    });

    // Log security event for large donations
    if (Number(amount) >= 1000) {
      await adminClient.from("security_logs").insert({
        user_id: userId,
        event_type: "large_donation",
        description: `Large donation: ${amount} ${currency}`,
        metadata: { amount, currency, order_id: order.id },
      });
    }

    return new Response(
      JSON.stringify({ orderId: order.id, status: order.status, approvalUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
