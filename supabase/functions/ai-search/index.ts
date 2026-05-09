import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SYSTEM_PROMPT = `You are a search assistant for TopMLMLeaders.com, a global MLM leaders directory.
Extract search filters from the user query and return ONLY a valid JSON object.
No explanation, no markdown, just raw JSON.
Available fields: { name, city, country, company, role, min_years_exp, plan }
plan values: free, pro, elite, company
Example output: {"city":"Mumbai","min_years_exp":5}
If no filters found: return {}`;

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function extractText(data: Record<string, unknown>): string {
  const content = data?.content;
  if (!Array.isArray(content)) return "{}";
  const parts = content
    .filter(
      (block): block is { type: string; text?: string } =>
        Boolean(block && typeof block === "object" && block !== null && (block as { type?: string }).type === "text")
    )
    .map((block) => (typeof block.text === "string" ? block.text : ""))
    .join("");
  return parts || "{}";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }

  const query = String(body.query ?? "").trim();
  if (!query) {
    return new Response(JSON.stringify({ ok: false, error: "Missing query" }), {
      status: 400,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ ok: false, error: "Server AI not configured (ANTHROPIC_API_KEY)" }),
      {
        status: 500,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      }
    );
  }

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
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
        messages: [{ role: "user", content: query }],
      }),
    });

    const data = (await anthropicRes.json()) as Record<string, unknown>;

    if (!anthropicRes.ok) {
      const msg =
        (data?.error as { message?: string } | undefined)?.message ||
        (typeof data?.message === "string" ? data.message : null) ||
        "Anthropic request failed";
      return new Response(JSON.stringify({ ok: false, error: msg }), {
        status: 502,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    const text = extractText(data);
    return new Response(JSON.stringify({ ok: true, text }), {
      status: 200,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Proxy internal error" }), {
      status: 500,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }
});
