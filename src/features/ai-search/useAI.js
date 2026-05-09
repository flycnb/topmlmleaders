import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const DEFAULT_SETTINGS = {
  provider: "claude",
  available_to: "loggedin",
};

const SYSTEM_PROMPT = `You are a search assistant for TopMLMLeaders.com, a global MLM leaders directory.
Extract search filters from the user query and return ONLY a valid JSON object.
No explanation, no markdown, just raw JSON.
Available fields: { name, city, country, company, role, min_years_exp, plan }
plan values: free, pro, elite, company
Example output: {"city":"Mumbai","min_years_exp":5}
If no filters found: return {}`;

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

      const apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY;
      if (!apiKey) {
        setAssistantNote("AI is not configured. Add REACT_APP_ANTHROPIC_API_KEY.");
        return;
      }

      setLoading(true);
      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 500,
            system: SYSTEM_PROMPT,
            messages: [{ role: "user", content: trimmed }],
          }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const msg =
            data?.error?.message ||
            (typeof data === "string" ? data : "") ||
            "AI request failed. Try again.";
          setAssistantNote(msg);
          return;
        }

        const text =
          Array.isArray(data?.content)
            ? data.content
                .filter((block) => block?.type === "text" && typeof block.text === "string")
                .map((block) => block.text)
                .join("") || "{}"
            : "{}";

        const parsed = sanitizeFilters(parseAiJson(text));
        if (!parsed || Object.keys(parsed).length === 0) {
          setFilters(null);
          setBannerQuery("");
          setAssistantNote("No filters found. Try mentioning city, role, company, or years of experience.");
          return;
        }
        setFilters(parsed);
        setBannerQuery(trimmed);
      } catch {
        setAssistantNote("Network error. Check connection or try later.");
      } finally {
        setLoading(false);
      }
    },
    [available, settingsMemo.provider]
  );

  return { ask, loading, available, filters, clearAiFilters, bannerQuery, assistantNote };
}
