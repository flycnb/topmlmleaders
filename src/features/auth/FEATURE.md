# Feature: Auth
Status: In Progress
Files: src/features/auth/index.js, src/features/auth/useAuth.js
Database: users table, auth.users (Supabase built-in)
Notes: Google OAuth modal and PKCE session hook wired globally via App. Auth-required gates now route through modal.
