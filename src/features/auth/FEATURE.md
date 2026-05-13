# Feature: Auth
Status: In Progress
Files: src/features/auth/index.js, src/features/auth/useAuth.js
Database: users table, auth.users (Supabase built-in)
Notes: Google OAuth modal and PKCE session hook wired globally via App. Auth-required gates now route through modal.

## TICKET-006

- **`syncPublicUserRow`**: `public.users` upsert sends `id`, `name`, `email` only (no `plan` field) so a paid plan in `users` is not overwritten on every sign-in.
- After that upsert, the hook loads **`members.plan`** for `owner_id = auth user` and calls **`setPlan`** when present so `user.plan` matches the directory row.
