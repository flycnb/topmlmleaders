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
### BUG-001 — Logout button intermittent
- **Reported:** May 2026
- **Actual:** Logout button is sometimes not clickable.

### BUG-002 — Profile page not loading after login
- **Reported:** May 2026
- **Actual:** Profile page shows error after login.

### BUG-004 — Logout button intermittent in Safari
- **Reported:** May 2026
- **Actual:** Logout button sometimes works and sometimes does not in Safari.
- **Notes:** Likely same root cause as BUG-001 Chrome logout issue.

---

## 🟡 IN PROGRESS
None

---

## ✅ FIXED BUGS

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
- **Files changed:** (filled after fix)
- **Verified:** Yes/No
```
