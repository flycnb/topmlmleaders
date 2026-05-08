TICKET #001 — Project Setup & Structure
========================================
Read .cursor-rules completely before starting.
Read docs/BRAIN.md completely before starting.

GOAL:
Set up the complete folder structure and base files for TopMLMLeaders.com v2.
Delete ALL old code. Start 100% fresh. Keep only: vercel.json, .gitignore, supabase/schema.sql, package.json (only add qrcode.react).

FILES TO DELETE COMPLETELY:
- src/App.js (delete all content, rewrite from scratch)
- src/App.css (delete all content, rewrite)
- src/index.css (delete all content, rewrite)
- src/hooks/useAuth.js
- src/hooks/useChat.js  
- src/hooks/useFollow.js
- src/hooks/useNotifications.js
- src/Auth.js (delete entirely)
- Any other old files in src/ not in the new structure

FILES TO CREATE:

1. public/index.html
- Title: TopMLMLeaders.com — AI Powered MLM Directory
- Meta description: Find and connect with top MLM leaders worldwide
- viewport: width=device-width, initial-scale=1, viewport-fit=cover
- theme-color: #6C63FF
- Import Inter font from Google Fonts (weights 400,600,700,800)
- Open Graph tags

2. src/index.css
- CSS reset (margin 0, padding 0, box-sizing border-box)
- CSS variables:
  --color-primary: #6C63FF
  --color-success: #10B981
  --color-danger: #EF4444
  --color-warning: #F59E0B
  --color-bg: #F7F8FC
  --color-card: #FFFFFF
  --color-text: #1A1A2E
  --color-muted: #6B7280
  --color-border: rgba(0,0,0,0.08)
  --radius-card: 20px
  --radius-btn: 999px
  --shadow-card: 0 8px 32px rgba(0,0,0,0.08)
  --safe-bottom: env(safe-area-inset-bottom, 0px)
- body: font-family Inter, background var(--color-bg)
- * { box-sizing: border-box }
- Safe area helper classes:
  .safe-bottom { padding-bottom: var(--safe-bottom) }
  .pb-safe { padding-bottom: calc(16px + var(--safe-bottom)) }

3. src/App.css
- Keyframe animations:
  @keyframes fadeIn { from opacity 0 to opacity 1 }
  @keyframes slideUp { from transform translateY(20px) opacity 0 to translateY(0) opacity 1 }
  @keyframes pulse { 0% transform scale(1) 50% scale(1.05) 100% scale(1) }
  @keyframes spin { to transform rotate(360deg) }
- Helper classes:
  .fade-in { animation: fadeIn 0.3s ease }
  .slide-up { animation: slideUp 0.3s ease }
  .spinner { animation: spin 1s linear infinite }
- Scrollbar hiding for mobile: 
  .no-scrollbar::-webkit-scrollbar { display: none }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none }

4. src/lib/supabaseClient.js
- Import createClient from @supabase/supabase-js
- URL: process.env.REACT_APP_SUPABASE_URL || 'https://qbhhgspznslxykmrkacx.supabase.co'
- Key: process.env.REACT_APP_SUPABASE_ANON_KEY
- Config: { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } }
- Named export: export const supabase

5. src/features/auth/FEATURE.md
```
# Feature: Auth
Status: Todo
Files: src/features/auth/index.js, src/features/auth/useAuth.js
Database: users table, auth.users (Supabase built-in)
Notes: Google OAuth only, PKCE flow required for Chrome
```

6. src/features/search/FEATURE.md
```
# Feature: Search
Status: Todo
Files: src/features/search/index.js, src/features/search/SearchBox.js
Database: members table
Notes: Single master search box, AI assistant integration
```

7. src/features/profile/FEATURE.md
```
# Feature: Profile (Personal Website)
Status: Todo
Files: src/features/profile/index.js
Database: members table, bookings table
Notes: Member's personal website page. World class UI.
```

8. src/features/chat/FEATURE.md
```
# Feature: Chat
Status: Todo
Files: src/features/chat/index.js, src/features/chat/useChat.js
Database: conversations, messages tables
Notes: Realtime WhatsApp-style. Single tick sent, double tick read.
```

9. src/features/follow/FEATURE.md
```
# Feature: Follow
Status: Todo
Files: src/features/follow/useFollow.js
Database: follows table, members(follower_count)
Notes: Optimistic UI update. Auth required.
```

10. src/features/dashboard/FEATURE.md
```
# Feature: Dashboard
Status: Todo
Files: src/features/dashboard/index.js
Database: members, bookings, bookmarks, conversations, notifications
Notes: Member control panel. No fake data allowed.
```

11. src/features/admin/FEATURE.md
```
# Feature: Admin
Status: Todo
Files: src/features/admin/index.js
Database: all tables
Notes: Only admin@topmlmleaders.com. Dark theme.
```

12. src/features/ai-search/FEATURE.md
```
# Feature: AI Search
Status: Todo
Files: src/features/ai-search/index.js, src/features/ai-search/useAI.js
Database: ai_settings table
Notes: Claude API. Text + voice input. Admin controlled.
```

13. src/features/bookmarks/FEATURE.md
```
# Feature: Bookmarks
Status: Todo
Files: src/features/bookmarks/useBookmarks.js
Database: bookmarks table
Notes: Optimistic UI. Auth required. Searchable in dashboard.
```

14. src/features/flags/FEATURE.md
```
# Feature: Flags
Status: Todo
Files: src/features/flags/FlagModal.js
Database: flags table
Notes: Reason dropdown + optional description. Auth required.
```

15. src/features/notifications/FEATURE.md
```
# Feature: Notifications
Status: Todo
Files: src/features/notifications/useNotifications.js
Database: notifications table
Notes: Realtime. Follow + message triggers only (Phase 1).
```

16. src/features/bookings/FEATURE.md
```
# Feature: Bookings
Status: Todo
Files: src/features/bookings/index.js
Database: bookings table
Notes: Elite members only. Shows in dashboard.
```

17. src/App.js — ROUTING ONLY, MAX 100 LINES
- Import React, useState
- Import supabase from lib/supabaseClient
- Simple state: currentScreen (home/profile/dashboard/admin)
- Render correct screen based on state
- NO business logic here
- NO components defined here
- Just routing

AFTER ALL FILES CREATED:
- Run: npm install qrcode.react
- Run: npm run build
- Build must pass with ZERO errors
- Update docs/PHASES.md — mark Phase 1 tasks as complete
- Commit: "TICKET-001: Project setup v2 - clean structure"
- Push to main
- Stop and wait for approval

DO NOT:
- Write any feature code yet (no search, no cards, no profile)
- Keep any old code from previous version
- Add any npm packages except qrcode.react
- Touch vercel.json, .gitignore, supabase/schema.sql
- Start Phase 2 without approval
