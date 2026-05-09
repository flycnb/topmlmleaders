# Feature: AI Search
**Status:** Complete (TICKET-009 — May 2026)

## Files
- `src/features/ai-search/index.js` — AI panel UI (voice, Ask, animations)
- `src/features/ai-search/useAI.js` — `ai_settings` gate, Claude API → JSON filters, state
- Wired from `src/pages/Home.js`

## Database
`ai_settings` table: `provider` (`off` \| `claude` \| `gemini`), `available_to` (`all` \| `loggedin` \| `paid`)

Defaults when no row: `provider: claude`, `available_to: loggedin`

## Environment
- `REACT_APP_ANTHROPIC_API_KEY` — required for Claude from the browser (Vercel / local `.env`)

## Notes
- Gemini: shows **“Gemini coming soon”** in panel (no API call).
- Paid gate uses `user.plan` from auth (`pro` / `elite` / `company`).
- Voice uses Web Speech API when available; mic hidden otherwise.
