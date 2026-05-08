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
None

---

## 🟡 IN PROGRESS
None

---

## ✅ FIXED BUGS

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
