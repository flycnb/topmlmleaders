import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

type NotificationRow = {
  id?: string;
  user_id?: string;
  type?: string;
  text?: string | null;
  link?: string | null;
  from_name?: string | null;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function pemToPkcs8Bytes(pem: string): Uint8Array {
  const normalized = pem.replace(/\r\n/g, "\n");
  const body = normalized
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\n/g, "")
    .trim();
  const b64 = body.replace(/\s+/g, "");
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++)
    out[i] = binary.charCodeAt(i);
  return out;
}

function base64UrlEncode(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function textEncoder(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

async function importRsaPrivateKeyFromPem(pem: string): Promise<CryptoKey> {
  const keyData = pemToPkcs8Bytes(pem);
  return crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function signJwtRs256(payload: Record<string, unknown>, privateKey: CryptoKey): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const partial = `${base64UrlEncode(textEncoder(JSON.stringify(header)))}.${base64UrlEncode(
    textEncoder(JSON.stringify(payload)),
  )}`;
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    textEncoder(partial),
  );
  return `${partial}.${base64UrlEncode(sig)}`;
}

let cachedAccessToken: { token: string; expMs: number } | null = null;

async function getGoogleAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedAccessToken && now < cachedAccessToken.expMs - 60_000) {
    return cachedAccessToken.token;
  }

  const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
  const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL");
  let privateKey = Deno.env.get("FIREBASE_PRIVATE_KEY");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY"
    );
  }
  privateKey = privateKey.trim();
  if (
    (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
    (privateKey.startsWith("'") && privateKey.endsWith("'"))
  ) {
    privateKey = privateKey.slice(1, -1).trim();
  }
  privateKey = privateKey.replace(/\\n/g, "\n");

  const key = await importRsaPrivateKeyFromPem(privateKey);
  const iat = Math.floor(now / 1000);
  const exp = iat + 3600;
  const assertion = await signJwtRs256(
    {
      iss: clientEmail,
      sub: clientEmail,
      aud: GOOGLE_TOKEN_URL,
      iat,
      exp,
      scope: FCM_SCOPE,
    },
    key,
  );

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const tok = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !tok.access_token) {
    throw new Error(`OAuth token error: ${tok.error ?? res.status} ${JSON.stringify(tok)}`);
  }
  const expiresIn = typeof tok.expires_in === "number" ? tok.expires_in : 3600;
  cachedAccessToken = { token: tok.access_token, expMs: now + expiresIn * 1000 };
  return tok.access_token;
}

function absoluteUrlFromLink(link: string | null | undefined): string {
  const base = Deno.env.get("PUBLIC_SITE_URL") ?? "https://topmlmleaders.com";
  const raw = String(link || "").trim() || "/";
  if (/^https?:\/\//i.test(raw)) return raw;
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  return `${base.replace(/\/+$/, "")}${path}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  let payload: { type?: string; table?: string; record?: NotificationRow };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON" }, 400);
  }

  const rec = payload.record;
  if (!rec?.user_id) {
    return jsonResponse({ ok: true, skipped: true, reason: "no user_id" });
  }

  const t = String(rec.type || "");
  if (t !== "follow" && t !== "message") {
    return jsonResponse({ ok: true, skipped: true, reason: "type not push-enabled" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ ok: false, error: "Missing Supabase server env" }, 500);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userRow, error: userErr } = await admin
    .from("users")
    .select("fcm_token")
    .eq("id", rec.user_id)
    .maybeSingle();

  if (userErr) {
    return jsonResponse({ ok: false, error: userErr.message }, 500);
  }

  const fcmToken = userRow?.fcm_token?.trim();
  if (!fcmToken) {
    return jsonResponse({ ok: true, skipped: true, reason: "no fcm_token" });
  }

  const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
  if (!projectId) {
    return jsonResponse({ ok: false, error: "Missing FIREBASE_PROJECT_ID" }, 500);
  }

  const title = "TopMLMLeaders";
  const bodyText = String(rec.text || "").trim() || (t === "follow" ? "You have a new follower" : "New message");
  const clickUrl = absoluteUrlFromLink(rec.link);

  const accessToken = await getGoogleAccessToken();
  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  const message = {
    token: fcmToken,
    notification: { title, body: bodyText },
    data: {
      type: t,
      url: clickUrl,
      notificationId: rec.id ? String(rec.id) : "",
    },
    webpush: {
      fcm_options: { link: clickUrl },
    },
  };

  const fcmRes = await fetch(fcmUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });

  const fcmJson = (await fcmRes.json()) as Record<string, unknown>;

  if (!fcmRes.ok) {
    const errObj = fcmJson?.error as { code?: number; message?: string; status?: string } | undefined;
    const msg = errObj?.message ?? JSON.stringify(fcmJson);
    const status = errObj?.status ?? "";
    if (status === "NOT_FOUND" || status === "UNREGISTERED" || /UNREGISTERED|NOT_FOUND/i.test(msg)) {
      await admin.from("users").update({ fcm_token: null }).eq("id", rec.user_id);
    }
    return jsonResponse({ ok: false, fcm: fcmJson }, 502);
  }

  return jsonResponse({ ok: true, name: fcmJson?.name ?? null });
});
