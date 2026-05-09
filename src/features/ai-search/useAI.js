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

function parseAiJson(raw) {
  const trimmed = String(raw || "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* fall through */
      }
    }
    return {};
  }
}

function sanitizeFilters(obj) {
  if (!obj || typeof obj !== "object") return null;
  const shape = {};
  if (typeof obj.name === "string" && obj.name.trim()) shape.name = obj.name.trim();
  if (typeof obj.city === "string" && obj.city.trim()) shape.city = obj.city.trim();
  if (typeof obj.country === "string" && obj.country.trim()) shape.country = obj.country.trim();
  if (typeof obj.company === "string" && obj.company.trim()) shape.company = obj.company.trim();
  if (typeof obj.role === "string" && obj.role.trim()) shape.role = obj.role.trim();
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
      const text = await withDeadline(response.text(), RESPONSE_JSON_DEADLINE_MS, "text-timeout");
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { ok: false, error: text?.slice?.(0, 200) || `HTTP ${response.status}` };
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

    /** @type {Record<string, unknown>} */
    const data = /** @type {Record<string, unknown>} */ (parsed);
    if (data.ok === false && data.error != null) {
      return { ok: false, message: String(data.error), data: null };
    }

    return { ok: true, message: "", data };
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
      const { data, error } = await supabase.from("ai_settings").select("provider, available_to").limit(1).maybeSingle();
      if (!active) return;
      if (error || !data) {
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
        const text = typeof data.text === "string" ? data.text : "{}";

        const parsed = sanitizeFilters(parseAiJson(text));
        if (!parsed || Object.keys(parsed).length === 0) {
          setFilters(null);
          setBannerQuery("");
          setAssistantNote("No filters found. Try mentioning city, role, company, or years of experience.");
          return;
        }
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
