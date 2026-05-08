# 🧠 BRAIN FILE — TopMLMLeaders.com
# Read this first. This is the complete project context.
# If you are a new Claude instance — read every line before doing anything.

---

## 👤 PRODUCT OWNER
**Rajnish Kumar**
- Company: Digi Dream Ltd
- Email: digidreamltd@gmail.com
- Location: Mumbai, India
- Non-technical founder — needs clear simple instructions
- Works via Claude (Architect) + Cursor (Coder)

---

## 🏗️ TEAM STRUCTURE
| Role | Who | Does What |
|------|-----|-----------|
| Product Owner | Rajnish | Decides what to build, tests, approves |
| Architect | Claude AI (this chat) | Reviews code, writes tickets, quality control |
| Coder | Cursor AI | Writes code, fixes bugs, pushes to GitHub |

---

## 🌐 PROJECT
**Name:** TopMLMLeaders.com
**Tagline:** AI Powered Search · Connect · Grow Worldwide
**Vision:** Global MLM industry directory — like LinkedIn for MLM
**Status:** In active development

---

## 🔧 TECH STACK
| Item | Detail |
|------|--------|
| Frontend | React (Create React App) |
| Styling | Inline styles only, no UI libraries |
| Backend | Supabase |
| Auth | Google OAuth only (PKCE flow) |
| Storage | Supabase Storage (avatars bucket) |
| Realtime | Supabase Realtime channels |
| Payments | Razorpay |
| AI Search | Claude API (claude-sonnet-4-20250514) |
| QR Code | qrcode.react library |
| Deployment | Vercel (auto-deploy on push to main) |
| Repo | https://github.com/flycnb/topmlmleaders |

---

## 🔑 CREDENTIALS (Supabase)
- **Project URL:** https://qbhhgspznslxykmrkacx.supabase.co
- **Anon Key:** In Vercel env as REACT_APP_SUPABASE_ANON_KEY
- **Storage bucket:** avatars (public)
- **Google OAuth:** Configured and working in Safari
- **PKCE flow:** Required for Chrome compatibility

---

## 📁 FOLDER STRUCTURE
```
topmlmleaders/
├── .cursor-rules          ← Cursor reads this automatically
├── public/
│   └── index.html         ← Meta, Inter font, safe area
├── src/
│   ├── App.js             ← Routing only, max 100 lines
│   ├── App.css            ← Global styles, CSS variables
│   ├── index.css          ← Reset, safe area, animations
│   ├── lib/
│   │   └── supabaseClient.js
│   ├── features/
│   │   ├── auth/          ← Login, Google OAuth, session
│   │   ├── search/        ← Master search, AI assistant
│   │   ├── profile/       ← Member personal website
│   │   ├── chat/          ← Realtime messaging
│   │   ├── follow/        ← Follow/unfollow system
│   │   ├── dashboard/     ← Member dashboard
│   │   ├── admin/         ← Admin panel
│   │   ├── ai-search/     ← AI brain search
│   │   ├── bookmarks/     ← Save profiles
│   │   ├── flags/         ← Report members
│   │   ├── notifications/ ← Alerts system
│   │   └── bookings/      ← Slot bookings
│   ├── components/        ← Shared UI components
│   │   ├── MemberCard.js
│   │   ├── Avatar.js
│   │   ├── BottomNav.js
│   │   ├── ShareSheet.js
│   │   ├── FlagModal.js
│   │   └── QRCode.js
│   └── pages/
│       ├── Home.js
│       ├── Profile.js
│       ├── Dashboard.js
│       ├── Leaderboard.js
│       ├── Board.js
│       ├── Plans.js
│       └── Admin.js
├── docs/
│   ├── BRAIN.md           ← This file (full context)
│   ├── PHASES.md          ← Build phases and status
│   ├── BUGS.md            ← Bug queue
│   └── PRODUCT.md         ← Full product specification
└── supabase/
    └── schema.sql         ← Full database schema
```

---

## 🗄️ DATABASE TABLES

### members
```sql
id uuid PK
name text
email text
owner_id uuid → auth.users
city text
area text
pin text
country text
company text
role text
years_exp int
rating numeric
phone text
phone_visibility (public/private/pro/elite)
wa text
wa_visibility (public/private/pro/elite)
photo_initials text
avatar_url text
youtube_url text
color text
description text
social_fb bool
social_ig bool
social_yt bool
social_li bool
slug text unique
likes int
verified bool
plan (free/pro/elite/company)
badges jsonb
joined_date text
team_size text
earnings text
follower_count int
following_count int
created_at timestamptz
updated_at timestamptz
```

### users
```sql
id uuid PK → auth.users
name text
email text
plan text
referral_code text
referred_by text
created_at timestamptz
```

### follows
```sql
id uuid PK
follower_id uuid → users
following_id uuid → members
created_at timestamptz
UNIQUE(follower_id, following_id)
```

### conversations
```sql
id uuid PK
member1_id uuid → auth.users (smaller UUID)
member2_id uuid → auth.users (larger UUID)
last_message text
last_message_time timestamptz
created_at timestamptz
UNIQUE(member1_id, member2_id)
```

### messages
```sql
id uuid PK
conversation_id uuid → conversations
sender_id uuid → auth.users
text text
read bool default false
created_at timestamptz
```

### notifications
```sql
id uuid PK
user_id uuid → users
type (follow/message)
from_name text
text text
read bool default false
link text
created_at timestamptz
```

### bookings
```sql
id uuid PK
member_id uuid → members
booker_id uuid → users
booker_name text
slot_day text
slot_time text
slot_type text
status (pending/confirmed/cancelled)
created_at timestamptz
```

### bookmarks
```sql
id uuid PK
user_id uuid → users
member_id uuid → members
created_at timestamptz
UNIQUE(user_id, member_id)
```

### flags
```sql
id uuid PK
reporter_id uuid → users
member_id uuid → members
reason text
description text
created_at timestamptz
```

### coupons
```sql
id uuid PK
code text unique
discount_type (percent/fixed)
discount_value numeric
max_uses int
used_count int default 0
expires_at timestamptz
active bool default true
created_at timestamptz
```

### ai_settings
```sql
id uuid PK
provider (claude/gemini/off)
available_to (all/loggedin/paid)
updated_at timestamptz
```

---

## 👥 USER TYPES & PLANS

| Plan | Price | Key Features |
|------|-------|-------------|
| Free | ₹0 | Basic profile, search, chat, follow |
| Pro | ₹1,499/yr | Custom URL, verified badge, gallery, events |
| Elite | ₹3,999/yr | Pro + booking slots, top search priority |
| Company | ₹7,999/yr | Company page, featured, analytics |

**Search priority:** Elite → Pro → Free, then by follower_count

---

## 🎨 DESIGN SYSTEM

```css
Primary:     #6C63FF (deep violet)
Success:     #10B981 (emerald)
Danger:      #EF4444 (rose)
Warning:     #F59E0B (amber)
Background:  #F7F8FC (light grey)
Card:        #FFFFFF
Text:        #1A1A2E
Muted:       #6B7280
Border:      rgba(0,0,0,0.08)

Font: Inter (Google Fonts)
Border radius cards: 20px
Border radius buttons CTA: 999px (pill)
Border radius buttons secondary: 12px
Shadow cards: 0 8px 32px rgba(0,0,0,0.08)
```

**Mobile first. iPhone safe area on all bottom navs.**

---

## 🔐 PRIVACY RULES
- Phone/WA visibility: Public / Private / Pro & above / Elite & above
- If not allowed → field completely hidden (never shown as locked)
- WA = icon only, click → wa.me/[number] directly, number never shown

---

## 📱 SCREENS

1. **Home** — Master search + member cards grid + bottom nav
2. **Profile** — Member personal website (world class UI)
3. **Leaderboard** — Top leaders by followers
4. **Board** — Opportunity board
5. **Plans** — Subscription plans + Razorpay
6. **Me Tab** — Login or account summary
7. **Dashboard** — Member control panel
8. **Admin** — Admin panel (admin@topmlmleaders.com only)
9. **Chat Modal** — Realtime WhatsApp-style chat
10. **Flag Modal** — Report member form
11. **Share Sheet** — Share profile options
12. **Auth Modal** — Google login only

---

## 🧠 AI SEARCH
- 🧠 button next to search box
- Text + voice input (Web Speech API)
- Calls Claude API → returns JSON filters
- Auto-applies filters to search results
- Admin controls: provider (Claude/Gemini/Off) + who can use it

---

## 📋 WORKING SYSTEM

### How we work:
1. Rajnish decides what to build/fix
2. Claude writes precise Cursor ticket
3. Rajnish pastes ticket to Cursor
4. Cursor codes ONLY what ticket says
5. Cursor runs npm run build
6. Cursor updates FEATURE.md + BUGS.md
7. Cursor commits and pushes
8. Rajnish shows Claude the result
9. Claude approves or rejects
10. Repeat

### Ticket format (always use this):
```
TICKET #XXX
Goal: [what should happen]
Files allowed: [exact files only]
Acceptance tests:
  1. [exact check]
  2. [exact check]
  3. [exact check]
Do: [specific instructions]
Don't: [what not to touch]
After done: npm run build → update FEATURE.md → commit → push → stop and wait
```

---

## 📊 BUILD PHASES

| Phase | Features | Status |
|-------|----------|--------|
| 1 | Folder structure + .cursor-rules + base files | 🔲 Todo |
| 2 | Home page + Master search + Member cards | 🔲 Todo |
| 3 | Member profile page (personal website) | 🔲 Todo |
| 4 | Google Auth + Follow + Bookmark + Flag | 🔲 Todo |
| 5 | Chat + Notifications | 🔲 Todo |
| 6 | Member Dashboard | 🔲 Todo |
| 7 | AI Search Assistant | 🔲 Todo |
| 8 | Admin Panel | 🔲 Todo |
| 9 | Payments (Razorpay) | 🔲 Todo |
| 10 | QR Code + Polish + Performance | 🔲 Todo |

---

## ⚠️ KNOWN ISSUES (from previous version)
- Chrome Google OAuth not persisting session (PKCE fixes this)
- Follow button needs auth check before toggle
- Bookmarks not saving to Supabase
- Dashboard showing fake data

All will be rebuilt correctly in new structure.

---

## 📞 IF YOU ARE A NEW CLAUDE INSTANCE
1. Read this entire file
2. Read docs/PHASES.md for current status
3. Read docs/BUGS.md for active bugs
4. Ask Rajnish: "What do you want to work on today?"
5. Write a ticket. Do NOT write code yourself.
6. Let Cursor do the coding.

**You are the Architect. Think, plan, review. Never code directly.**
