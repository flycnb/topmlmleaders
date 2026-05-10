import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const DEFAULT_SETTINGS = {
  provider: "claude",
  available_to: "loggedin",
};

const SUPABASE_URL = (process.env.REACT_APP_SUPABASE_URL || "https://qbhhgspznslxykmrkacx.supabase.co").replace(/\/$/, "");
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || "";

/** Full round-trip ceiling (Safari-compatible; does not rely only on SDK internals). */
const AI_FETCH_DEADLINE_MS = 65000;

/** Prevent hanging forever on stalled JSON streams (Safari has seen rare stalls). */
const RESPONSE_JSON_DEADLINE_MS = 45000;

/** Strip ```json ... ``` fences Claude sometimes adds despite instructions. */
function stripMarkdownJsonFence(raw) {
  let s = String(raw || "").trim();
  const fenced = s.match(/^```(?:json)?\s*([\s\S]*?)```$/im);
  if (fenced) s = fenced[1].trim();
  return s;
}

/**
 * First balanced `{ ... }` only — avoids greedy `\{[\s\S]*\}` swallowing extra text
 * or matching the wrong object when the model echoes API-shaped blobs.
 */
function extractFirstBalancedJsonObject(s) {
  const str = String(s || "");
  const start = str.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < str.length; i++) {
    const c = str[i];
    if (c === "{") depth += 1;
    else if (c === "}") {
      depth -= 1;
      if (depth === 0) return str.slice(start, i + 1);
    }
  }
  return null;
}

function parseAiJson(raw) {
  const stripped = stripMarkdownJsonFence(raw);
  try {
    return JSON.parse(stripped);
  } catch {
    const balanced = extractFirstBalancedJsonObject(stripped);
    if (balanced) {
      try {
        return JSON.parse(balanced);
      } catch {
        /* fall through */
      }
    }
    return {};
  }
}

/** Drop Anthropic/API leakage; keep only directory filter keys. */
function filterShapeOnly(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
  const allowed = ["name", "city", "country", "company", "role", "min_years_exp", "plan"];
  const out = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) out[key] = obj[key];
  }
  return out;
}

function extractAnthropicStyleTextBlocks(content) {
  if (!Array.isArray(content)) return "";
  return content
    .filter((b) => b && typeof b === "object" && !Array.isArray(b) && b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("");
}

/**
 * Edge returns `{ ok, text }`; if anything upstream leaked an Anthropic-shaped JSON into the body,
 * recover assistant text from `content[]` instead of treating `model` as a filter field.
 */
function extractAssistantTextFromEdgePayload(data) {
  if (!data || typeof data !== "object") return "";
  if (typeof data.text === "string" && data.text.trim()) return data.text.trim();
  if (data.filters && typeof data.filters === "object") {
    try {
      return JSON.stringify(data.filters);
    } catch {
      return "";
    }
  }
  const fromContent = extractAnthropicStyleTextBlocks(data.content);
  if (fromContent.trim()) return fromContent.trim();
  return "";
}

/**
 * Edge Function contract: `{ ok: true, text: string }` or `{ ok: false, error: string }`.
 * If a proxy leaks raw Anthropic JSON, recover `content[].text` instead of failing.
 */
function normalizeEdgeSuccessEnvelope(parsed) {
  if (!parsed || typeof parsed !== "object") {
    return { success: false, message: "Unexpected response from AI service." };
  }
  const p = /** @type {Record<string, unknown>} */ (parsed);

  if (p.ok === false && p.error != null) {
    return { success: false, message: String(p.error) };
  }

  if (p.ok === true && typeof p.text === "string") {
    return { success: true, data: p };
  }

  const content = p.content;
  if (Array.isArray(content)) {
    const extracted = extractAnthropicStyleTextBlocks(content).trim();
    if (extracted) {
      return { success: true, data: { ok: true, text: extracted } };
    }
  }

  return {
    success: false,
    message: "AI service returned an unexpected format. Redeploy the ai-search Edge Function.",
  };
}

function sanitizeFilters(obj) {
  if (!obj || typeof obj !== "object") return null;
  /** Ignore mistaken `role: "assistant"` / model echoes */
  const roleVal =
    typeof obj.role === "string" && obj.role.trim()
      ? obj.role.trim()
      : "";
  const badRole = /^assistant$/i.test(roleVal) || /^user$/i.test(roleVal);

  const shape = {};
  if (typeof obj.name === "string" && obj.name.trim()) shape.name = obj.name.trim();
  if (typeof obj.city === "string" && obj.city.trim()) shape.city = obj.city.trim();
  if (typeof obj.country === "string" && obj.country.trim()) shape.country = obj.country.trim();
  if (typeof obj.company === "string" && obj.company.trim()) shape.company = obj.company.trim();
  if (!badRole && roleVal) shape.role = roleVal;
  if (obj.min_years_exp != null && obj.min_years_exp !== "") {
    const years = Number(obj.min_years_exp);
    if (!Number.isNaN(years)) shape.min_years_exp = years;
  }
  if (typeof obj.plan === "string" && ["free", "pro", "elite", "company"].includes(obj.plan)) {
    shape.plan = obj.plan;
  }
  return Object.keys(shape).length ? shape : null;
}

function withDeadline(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error(label)), ms);
    promise.then(
      (v) => {
        window.clearTimeout(t);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(t);
        reject(e);
      }
    );
  });
}

function userMayUseAi(settings, user) {
  const provider = settings?.provider || DEFAULT_SETTINGS.provider;
  if (provider === "off") return false;

  const mode = settings?.available_to || DEFAULT_SETTINGS.available_to;
  if (mode === "all") return true;
  if (!user?.id) return false;
  if (mode === "loggedin") return true;
  if (mode === "paid") {
    const plan = user.plan || "free";
    return plan === "pro" || plan === "elite" || plan === "company";
  }
  return false;
}

/**
 * Direct Edge Function POST — avoids SDK edge cases where Safari left fetch invocations pending.
 */
async function postAiSearch(query, accessToken) {
  const url = `${SUPABASE_URL}/functions/v1/ai-search`;

  const headers = {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
  };

  const controller = new AbortController();
  const kill = window.setTimeout(() => controller.abort(), AI_FETCH_DEADLINE_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      credentials: "omit",
      headers,
      body: JSON.stringify({ query }),
      signal: controller.signal,
    });

    const contentType = (response.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();

    /** @type {unknown} */
    let parsed;
    if (contentType.includes("application/json")) {
      parsed = await withDeadline(response.json(), RESPONSE_JSON_DEADLINE_MS, "json-timeout");
    } else {
      const textBody = await withDeadline(response.text(), RESPONSE_JSON_DEADLINE_MS, "text-timeout");
      try {
        parsed = JSON.parse(textBody);
      } catch {
        /**
         * Was surfacing raw body (e.g. `model: claude-sonnet-…`) as assistantNote because
         * `{ ok: false, error: text.slice(...) }` tripped the success-path error handler.
         */
        return {
          ok: false,
          message:
            "AI service returned non-JSON. Confirm the ai-search Edge Function is deployed and returns JSON.",
          data: null,
        };
      }
    }

    if (!response.ok) {
      const errPayload =
        parsed && typeof parsed === "object" && parsed !== null && "error" in parsed ? String(parsed.error) : "";
      return {
        ok: false,
        message: errPayload || `Request failed (${response.status})`,
        data: null,
      };
    }

    if (!parsed || typeof parsed !== "object") {
      return { ok: false, message: "Unexpected response from AI service.", data: null };
    }

    const normalized = normalizeEdgeSuccessEnvelope(parsed);
    if (!normalized.success) {
      return { ok: false, message: normalized.message, data: null };
    }

    return { ok: true, message: "", data: normalized.data };
  } catch (e) {
    const aborted =
      controller.signal.aborted ||
      (typeof e === "object" && e !== null && "name" in e && (e).name === "AbortError");
    if (aborted || (e instanceof Error && (e.message === "json-timeout" || e.message === "text-timeout"))) {
      return { ok: false, message: "Request timed out. Try again.", data: null };
    }
    return { ok: false, message: e instanceof Error ? e.message : "Network error.", data: null };
  } finally {
    window.clearTimeout(kill);
  }
}

export function useAI(user) {
  const [provider, setProvider] = useState("claude");
  const [availableTo, setAvailableTo] = useState(DEFAULT_SETTINGS.available_to);
  const [filters, setFilters] = useState(null);
  const [bannerQuery, setBannerQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [assistantNote, setAssistantNote] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const { data } = await supabase.from("ai_settings").select("provider, available_to").limit(1).maybeSingle();
      if (!active) return;
      if (!data) {
        setProvider(DEFAULT_SETTINGS.provider);
        setAvailableTo(DEFAULT_SETTINGS.available_to);
        return;
      }
      setProvider(data.provider || DEFAULT_SETTINGS.provider);
      setAvailableTo(data.available_to || DEFAULT_SETTINGS.available_to);
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const settingsMemo = useMemo(
    () => ({ provider, available_to: availableTo }),
    [provider, availableTo]
  );

  const available = useMemo(
    () => userMayUseAi(settingsMemo, user),
    [settingsMemo, user]
  );

  const clearAiFilters = useCallback(() => {
    setFilters(null);
    setBannerQuery("");
    setAssistantNote("");
  }, []);

  const ask = useCallback(
    async (userQuery) => {
      const trimmed = String(userQuery || "").trim();
      setAssistantNote("");

      if (!trimmed) {
        setAssistantNote("Please describe who you're looking for");
        return;
      }

      if (!available) return;

      const prov = settingsMemo.provider || "claude";
      if (prov === "off") return;

      if (prov === "gemini") {
        setAssistantNote("Gemini coming soon");
        return;
      }

      if (prov !== "claude") {
        setAssistantNote("AI provider unavailable");
        return;
      }

      if (!SUPABASE_ANON_KEY.trim() || SUPABASE_ANON_KEY === "missing-anon-key-local-dev") {
        setAssistantNote("App misconfigured (missing REACT_APP_SUPABASE_ANON_KEY).");
        return;
      }

      setLoading(true);
      try {
        let accessToken = null;
        try {
          const sessionResult = await withDeadline(supabase.auth.getSession(), 5000, "session-timeout");
          accessToken = sessionResult?.data?.session?.access_token ?? null;
        } catch {
          accessToken = null;
        }

        const result = await postAiSearch(trimmed, accessToken);
        if (!result.ok || !result.data) {
          setAssistantNote(result.message || "AI request failed. Try again.");
          return;
        }

        const data = result.data;
        const assistantRaw = extractAssistantTextFromEdgePayload(data);
        if (!assistantRaw) {
          setFilters(null);
          setBannerQuery("");
          setAssistantNote("AI returned no filter text. Try again or rephrase.");
          return;
        }

        const rawObj = parseAiJson(assistantRaw);
        const parsed = sanitizeFilters(filterShapeOnly(rawObj));
        if (!parsed || Object.keys(parsed).length === 0) {
          setFilters(null);
          setBannerQuery("");
          setAssistantNote("No filters found. Try mentioning city, role, company, or years of experience.");
          return;
        }
        setAssistantNote("");
        setFilters(parsed);
        setBannerQuery(trimmed);
      } catch (err) {
        setAssistantNote(err instanceof Error ? err.message : "Network error.");
      } finally {
        setLoading(false);
      }
    },
    [available, settingsMemo.provider]
  );

  return { ask, loading, available, filters, clearAiFilters, bannerQuery, assistantNote };
}
