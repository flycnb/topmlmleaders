# ai-search Edge Function

Invokes Anthropic Messages API to turn natural-language queries into JSON directory filters.

## TICKET-002 (2026)

- **Issue:** AI Search returned 502 because Anthropic rejected an invalid model id.
- **Fix:** Use model `claude-sonnet-4-6` (was `claude-sonnet-4-20250514`).
- **Deploy:** Redeploy this function in Supabase Dashboard → Edge Functions → ai-search after pulling.
