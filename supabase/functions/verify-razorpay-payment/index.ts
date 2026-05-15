import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json",
    },
  });
}

async function verifySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const message = `${orderId}|${paymentId}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return expected === signature;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const razorpaySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;

  const userClient = createClient(supabaseUrl,
    authHeader.replace("Bearer ", ""), {
    auth: { persistSession: false },
  });

  const { data: { user }, error: userError } =
    await userClient.auth.getUser();
  if (userError || !user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  let body: {
    razorpay_payment_id?: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const {
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
  } = body;

  if (!razorpay_payment_id ||
      !razorpay_order_id ||
      !razorpay_signature) {
    return jsonResponse({
      error: "Missing payment details",
    }, 400);
  }

  const valid = await verifySignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    razorpaySecret,
  );

  if (!valid) {
    return jsonResponse({
      error: "Invalid payment signature",
    }, 400);
  }

  const { data: payment } = await admin
    .from("payments")
    .select("*")
    .eq("razorpay_order_id", razorpay_order_id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!payment) {
    return jsonResponse({ error: "Payment not found" }, 404);
  }

  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  await admin.from("members").update({
    plan: payment.plan,
    plan_expires_at: expiresAt.toISOString(),
  }).eq("id", payment.member_id);

  await admin.from("payments").update({
    razorpay_payment_id,
    status: "captured",
    updated_at: new Date().toISOString(),
  }).eq("razorpay_order_id", razorpay_order_id);

  if (payment.coupon_code) {
    await admin.from("coupons")
      .update({
        used_count: admin.rpc("increment_coupon_uses", {
          coupon_code: payment.coupon_code,
        }),
      })
      .eq("code", payment.coupon_code);
  }

  return jsonResponse({
    ok: true,
    plan: payment.plan,
  });
});
