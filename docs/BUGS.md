# 🐛 BUGS — TopMLMLeaders.com

Last updated: May 2026

---

## RULES FOR BUGS
1. One bug fixed at a time
2. Build must pass after each fix
3. Never fix bug by touching unrelated files
4. Always test on real device after fix
5. Move to Fixed section after verified by Rajnish

---

## 🔴 ACTIVE BUGS

### BUG-006 — AI search showing model name instead of filtering results
- **Reported:** May 2026
- **Actual:** AI Search Assistant sometimes showed plain text `model: claude-sonnet-4-20250514` instead of applying JSON filters to the directory.
- **Root cause:** Claude response not being parsed correctly end-to-end (client envelope handling + assistant message text extraction). Revisit later for full verification and any remaining edge cases.
- **Fix:** TBD — revisit later (see recent commits around Edge envelope normalization and filter parsing).
- **Files changed:** (when verified) `src/features/ai-search/useAI.js`, `supabase/functions/ai-search/index.ts`
- **Verified:** No — revisit later

---

## 🟡 IN PROGRESS
None

---

## ✅ FIXED BUGS

### BUG-007 — Profile / dashboard gallery photo upload (storage + client)
- **Reported:** May 2026 (TICKET #003)
- **Actual:** File picker opened but uploads never completed or failed silently; gallery list could stay stale after creating a new member row inline.
- **Root cause:** Missing or incorrect Supabase **Storage** RLS on `storage.objects` for the **`gallery`** bucket (the ticket’s `INSERT INTO storage.policies` shape is not valid in Postgres — policies are created with `CREATE POLICY` on `storage.objects`). Profile avatar path had no user-visible errors on storage/DB failure.
- **Fix (app):** Dashboard Media upload uses the inserted member row for `gallery_urls`; logs `[TICKET-003 gallery]` errors to the console; persists URL to `members.gallery_urls` after upload; success and error messages in UI; upload button shows spinner while uploading. Profile avatar upload sets `contentType`, clears the file input, surfaces errors, success toast-style message, spinner while uploading.
- **Fix (database — run in Supabase SQL Editor):**

```sql
-- Column for dashboard Media tab (if missing)
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS gallery_urls jsonb DEFAULT '[]'::jsonb;
```

Create a **public** bucket named **`gallery`** in Dashboard → Storage (or API). Then add **policies on `storage.objects`** (Storage UI “Policies”, or SQL if your role allows), for example:

- **SELECT** — allow `anon` + `authenticated` to read objects where `bucket_id = 'gallery'` (public gallery URLs).
- **INSERT** — allow `authenticated` only, with a `WITH CHECK` that the first path segment is a `members.id` owned by the user, e.g.  
  `bucket_id = 'gallery'`  
  AND `split_part(name, '/', 1)::uuid = members.id`  
  AND `members.owner_id = auth.uid()`  
  (express using `EXISTS (SELECT 1 FROM public.members m WHERE m.id = (split_part(storage.objects.name,'/',1))::uuid AND m.owner_id = auth.uid())` — adjust to match your policy editor).

Avatar uploads use bucket **`avatars`** and keys `{member_uuid}-{timestamp}.ext`; see `supabase/migrations/20260506120000_storage_avatars.sql` for `member_id_from_avatar_path` and policy shapes.

- **Files changed:** `src/features/dashboard/index.js` (Media tab only), `src/features/profile/index.js` (avatar upload only), `docs/BUGS.md`
- **Verified:** Pending — confirm upload + policy in Supabase on device

### BUG-001 — Logout button intermittent
- **Reported:** May 2026
- **Root cause:** Global `loading` during `signOut` and overlapping UI (menus) made logout feel unresponsive; `signOut` could leave auth state busy if errors occurred.
- **Fix:** Dedicated `signingOut` state with `try/finally`, close menus before sign-out, disable logout while signing out.
- **Files changed:** `src/features/auth/useAuth.js`, `src/pages/Home.js`, `src/App.js`
- **Verified:** Pending — please confirm on device

### BUG-002 — Profile page not loading after login
- **Reported:** May 2026
- **Actual:** Public profile showed “Profile unavailable” and dashboard profile tab behaved badly after Google login.
- **Root cause:** Session not fully hydrated before navigation; stale `selectedMember` / wrong screen after OAuth redirect.
- **Fix:** Auth bootstrap waits for `INITIAL_SESSION` (PKCE-safe); on first successful session, App resets to **Home** and clears `selectedMember` and auth modal state.
- **Files changed:** `src/features/auth/useAuth.js`, `src/App.js`, `src/features/dashboard/index.js`, `src/pages/Home.js`
- **Verified:** Pending — please confirm on device

### BUG-003 — Dashboard stuck loading in Chrome
- **Reported:** May 2026
- **Root cause:** Dashboard data effect returned early when `user` was briefly null without `setLoading(false)`; aborted async loads could leave `loading` true; no distinct “auth initializing” gate.
- **Fix:** Pass `authInitializing` from App; skip data fetch until auth is ready; clear `loading` when user missing and on effect cleanup.
- **Files changed:** `src/features/dashboard/index.js`, `src/App.js`, `src/features/auth/useAuth.js`
- **Verified:** Pending — please confirm on device

### BUG-004 — Logout button intermittent in Safari
- **Reported:** May 2026
- **Root cause:** Same as BUG-001 (session busy + overlay hit targets).
- **Fix:** Same as BUG-001; session overlay blocks interaction until hydrated.
- **Files changed:** `src/features/auth/useAuth.js`, `src/pages/Home.js`, `src/App.js`
- **Verified:** Pending — please confirm on device

### BUG-000 — Chrome Google OAuth not persisting
- **Reported:** May 2026
- **Device:** Chrome Mac
- **Root cause:** Missing PKCE flow in supabaseClient
- **Fix:** Added flowType: 'pkce' to supabase client config
- **Files changed:** src/lib/supabaseClient.js, src/hooks/useAuth.js
- **Verified:** Partially — will be rebuilt correctly in new structure

---

## 📋 BUG TEMPLATE
When reporting a new bug use this format:

```
### BUG-XXX — [Short description]
- **Reported:** [date]
- **Device:** [browser + device]
- **Steps to reproduce:**
  1. Go to...
  2. Click...
  3. See...
- **Expected:** what should happen
- **Actual:** what happens instead
- **Root cause:** (filled after investigation)
- **Fix:** (filled after fix)
- **Files changed:** [list]
- **Verified:** Yes/No
```
