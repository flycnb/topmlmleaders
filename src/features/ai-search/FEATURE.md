# Feature: AI Search
**Status:** Complete (TICKET-009 — May 2026)

## Files
- `src/features/ai-search/index.js` — AI panel UI (voice, Ask, animations)
- `src/features/ai-search/useAI.js` — `ai_settings` gate, Claude API → JSON filters, state
- Wired from `src/pages/Home.js`

## Database
`ai_settings` table: `provider` (`off` \| `claude` \| `gemini`), `available_to` (`all` \| `loggedin` \| `paid`)

Defaults when no row: `provider: claude`, `available_to: loggedin`

## Environment / deploy
- **Anthropic:** set **`ANTHROPIC_API_KEY`** as a Supabase secret (`supabase secrets set …`), not in the React bundle.
- **Edge Function JWT:** `supabase/config.toml` sets **`[functions.ai-search] verify_jwt = false`** so the SPA can invoke with the anon **`apikey`** reliably. Redeploy after changing config:
  - `supabase functions deploy ai-search --project-ref <ref>`
- **Client timeout:** `useAI` passes `timeout` on `functions.invoke` (~62s) so the Ask button cannot spin forever.

## Notes
- Gemini: shows **“Gemini coming soon”** in panel (no API call).
- Paid gate uses `user.plan` from auth (`pro` / `elite` / `company`).
- Voice uses Web Speech API when available; mic hidden otherwise.
