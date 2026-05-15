import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const PLAN_AMOUNTS: Record<string, number> = {
  pro: 149900,
  elite: 399900,
  company: 799900,
};

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
  const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID")!;
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

  let body: { plan?: string; couponCode?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const plan = String(body.plan || "").toLowerCase();
  if (!PLAN_AMOUNTS[plan]) {
    return jsonResponse({ error: "Invalid plan" }, 400);
  }

  const { data: member } = await admin
    .from("members")
    .select("id, plan")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!member) {
    return jsonResponse({
      error: "Member profile not found",
    }, 404);
  }

  let amount = PLAN_AMOUNTS[plan];
  let discount = 0;
  let couponCode = "";

  if (body.couponCode) {
    const { data: coupon } = await admin
      .from("coupons")
      .select("*")
      .eq("code", body.couponCode.toUpperCase())
      .eq("active", true)
      .maybeSingle();

    if (coupon) {
      const now = new Date();
      const expired = coupon.expires_at &&
        new Date(coupon.expires_at) < now;
      const maxed = coupon.max_uses &&
        coupon.used_count >= coupon.max_uses;

      if (!expired && !maxed) {
        if (coupon.discount_type === "percent") {
          discount = Math.floor(
            amount * coupon.discount_value / 100,
          );
        } else {
          discount = coupon.discount_value * 100;
        }
        amount = Math.max(100, amount - discount);
        couponCode = coupon.code;
      }
    }
  }

  const receipt = `${plan}-${user.id}-${Date.now()}`;
  const credentials = btoa(`${razorpayKeyId}:${razorpaySecret}`);

  const orderRes = await fetch(
    "https://api.razorpay.com/v1/orders",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${credentials}`,
      },
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt,
        notes: {
          plan,
          user_id: user.id,
          member_id: member.id,
          coupon_code: couponCode,
        },
      }),
    },
  );

  const order = await orderRes.json();
  if (!orderRes.ok) {
    return jsonResponse({
      error: "Order creation failed",
      detail: order,
    }, 502);
  }

  await admin.from("payments").insert({
    member_id: member.id,
    owner_id: user.id,
    razorpay_order_id: order.id,
    plan,
    amount,
    currency: "INR",
    status: "created",
    coupon_code: couponCode || null,
    discount: discount / 100,
  });

  return jsonResponse({
    order_id: order.id,
    amount: order.amount,
    currency: order.currency,
    key_id: razorpayKeyId,
    plan,
  });
});
