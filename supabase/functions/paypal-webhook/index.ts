/**
 * Edge Function: paypal-webhook
 * Receives and validates PayPal webhook events.
 * Verifies signature to prevent spoofed events.
 * Public endpoint - no JWT required, but validates PayPal signature.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PAYPAL_API_BASE =
  Deno.env.get("PAYPAL_MODE") === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_SECRET");
  if (!clientId || !secret) throw new Error("PayPal credentials not configured");

  const auth = btoa(`${clientId}:${secret}`);
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

async function verifyWebhookSignature(
  headers: Headers,
  body: string
): Promise<boolean> {
  const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID");
  if (!webhookId) {
    console.error("PAYPAL_WEBHOOK_ID not configured");
    return false;
  }

  try {
    const accessToken = await getPayPalAccessToken();
    const verifyRes = await fetch(
      `${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auth_algo: headers.get("paypal-auth-algo") || "",
          cert_url: headers.get("paypal-cert-url") || "",
          transmission_id: headers.get("paypal-transmission-id") || "",
          transmission_sig: headers.get("paypal-transmission-sig") || "",
          transmission_time: headers.get("paypal-transmission-time") || "",
          webhook_id: webhookId,
          webhook_event: JSON.parse(body),
        }),
      }
    );

    if (!verifyRes.ok) return false;
    const result = await verifyRes.json();
    return result.verification_status === "SUCCESS";
  } catch (err) {
    console.error("Webhook verification error:", err);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.text();

    // Verify PayPal webhook signature
    const isValid = await verifyWebhookSignature(req.headers, body);
    if (!isValid) {
      console.error("Invalid webhook signature");
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const event = JSON.parse(body);
    const eventType = event.event_type;

    // Use service role for database operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Log the webhook event
    await supabase.from("security_logs").insert({
      event_type: "paypal_webhook",
      description: `PayPal webhook: ${eventType}`,
      metadata: { event_type: eventType, resource_id: event.resource?.id },
    });

    // Handle payment capture completed
    if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
      const capture = event.resource;
      const orderId = capture?.supplementary_data?.related_ids?.order_id;

      if (orderId) {
        await supabase
          .from("donations")
          .update({
            status: "completed",
            updated_at: new Date().toISOString(),
            metadata: {
              capture_id: capture.id,
              payer_email: capture.payer?.email_address,
              gross_amount: capture.amount?.value,
            },
          })
          .eq("paypal_order_id", orderId);
      }
    }

    // Handle payment denied/refunded
    if (
      eventType === "PAYMENT.CAPTURE.DENIED" ||
      eventType === "PAYMENT.CAPTURE.REFUNDED"
    ) {
      const capture = event.resource;
      const orderId = capture?.supplementary_data?.related_ids?.order_id;
      const status = eventType.includes("DENIED") ? "failed" : "refunded";

      if (orderId) {
        await supabase
          .from("donations")
          .update({ status, updated_at: new Date().toISOString() })
          .eq("paypal_order_id", orderId);
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
