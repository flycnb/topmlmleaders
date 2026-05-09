# 📊 PHASES — TopMLMLeaders.com Build Plan

Last updated: May 2026 (TICKET-010: Leaderboard, Opportunity Board, Plans pages)

---

## CURRENT PHASE: 8 — Admin Panel

---

## PHASE 1 — Project Setup & Structure
**Goal:** Clean folder structure, rules, base files
**Status:** ✅ Complete

Tasks:
- [x] Create folder structure
- [x] Create .cursor-rules
- [x] Create docs/ files
- [x] Setup src/lib/supabaseClient.js with PKCE
- [x] Setup public/index.html with Inter font + safe area
- [x] Setup src/index.css with reset + CSS variables
- [x] Setup src/App.css with animations
- [x] Create empty FEATURE.md in each feature folder
- [x] npm run build passes

**Acceptance:** Build passes, folder structure correct, no old code remaining.

---

## PHASE 2 — Home Page + Search + Member Cards
**Goal:** World class home page with master search and beautiful member cards
**Status:** 🟡 In Progress

Tasks:
- [ ] Home page layout (header, search, grid, bottom nav)
- [ ] Master search box (single intelligent search)
- [ ] Auto-detect city/country by IP (ipapi.co)
- [ ] Filter chips (All, City, Country, Company, Role, Experience)
- [ ] Member cards (premium design)
- [ ] Infinite scroll (12 per load)
- [ ] Sort: Elite → Pro → Free → by followers
- [ ] Load real data from Supabase members table
- [x] Leaderboard tab (TICKET-010)
- [x] Opportunity Board tab (TICKET-010)
- [x] Plans tab (static pricing + coupon check; Razorpay placeholder — TICKET-010)
- [ ] Me tab (login prompt)
- [ ] Bottom navigation

**Acceptance:** 
1. Search works with single word and combinations
2. Cards show real Supabase data
3. Infinite scroll loads 12 more on scroll
4. Mobile looks perfect on iPhone

---

## PHASE 3 — Member Profile Page (Personal Website)
**Goal:** World class member profile that works as their personal website
**Status:** 🟡 In Progress

Tasks:
- [ ] Profile header (cover, avatar, stats, follow button)
- [ ] Sticky tab navigation
- [ ] About tab (bio, contact, social, YouTube, rating)
- [ ] Gallery tab
- [ ] Services tab
- [ ] Events tab
- [ ] Join Us tab (contact form)
- [ ] Team tab
- [ ] Book tab (Elite only)
- [ ] Privacy rules for phone/WA visibility
- [ ] QR code download (PNG)
- [ ] Share sheet modal
- [ ] URL routing (slug-based)

**Acceptance:**
1. Profile loads from Supabase
2. Hidden fields completely invisible (not locked)
3. WA icon connects directly, number never shown
4. QR downloads as PNG
5. Mobile looks world class

---

## PHASE 4 — Auth + Follow + Bookmark + Flag
**Goal:** Google login + all social features working correctly
**Status:** 🟡 In Progress

Tasks:
- [ ] Google OAuth with PKCE (works in Chrome AND Safari)
- [ ] Session persists after browser close
- [ ] Upsert to users table on login
- [ ] Follow/unfollow with optimistic UI
- [ ] Follow saves to follows table
- [ ] Follow counter updates instantly
- [ ] Bookmark saves to bookmarks table
- [ ] Flag modal with reason form
- [ ] Flag saves to flags table
- [ ] All require login → show auth modal if not logged in

**Acceptance:**
1. Google login works in Chrome
2. Google login works in Safari
3. Follow counter updates without page refresh
4. Bookmark persists after page refresh
5. Flag form submits to Supabase

---

## PHASE 5 — Chat + Notifications
**Goal:** WhatsApp-style realtime chat + notifications
**Status:** 🟡 In Progress

Tasks:
- [ ] Chat modal (WhatsApp style)
- [ ] Realtime messages (Supabase channel)
- [ ] Single tick sent, double tick read
- [ ] Online/offline status
- [ ] Block member option
- [ ] Notifications bell with unread count
- [ ] Notification on follow
- [ ] Notification on message
- [ ] Mark all read
- [ ] Realtime notification updates

**Acceptance:**
1. Messages appear in realtime without refresh
2. Read receipts update correctly
3. Notification count decreases when read
4. Block prevents further messages

---

## PHASE 6 — Member Dashboard
**Goal:** Complete member control panel
**Status:** 🟡 In Progress

Tasks:
- [x] Stats row (Followers, Messages, Bookmarks, Alerts) — clickable
- [x] Overview tab (activity feed, profile summary)
- [x] Profile tab (edit all fields, upload photo, YouTube, QR)
- [x] Messages tab (conversation list)
- [x] Bookmarks tab (search + list + remove)
- [x] Bookings tab (incoming + outgoing)
- [x] Settings tab (verify badge, upgrade plan)
- [x] Refer & Earn tab
- [x] All data from real Supabase — no fake data

**Acceptance:**
1. Stats show real numbers
2. Profile save works
3. Photo upload works
4. Bookmarks searchable
5. No fake/hardcoded data anywhere

---

## PHASE 7 — AI Search Assistant
**Goal:** AI brain that understands natural language search
**Status:** ✅ Complete

Tasks:
- [x] AI button (🧠) next to search (hidden when unavailable)
- [x] Slide-down AI panel
- [x] Text input
- [x] Voice input (Web Speech API)
- [x] Call Claude API with search query
- [x] Parse JSON response → apply filters
- [x] Show "🧠 AI filtered: [query]" banner + clear
- [x] Admin setting to control AI (provider + availability) via `ai_settings`

**Acceptance:**
1. "Find diamond leaders in Mumbai" returns correct results
2. Voice input works on Chrome
3. Admin can turn AI off
4. Graceful fallback if API fails / key missing / empty filters message

---

## PHASE 8 — Admin Panel
**Goal:** Full admin control panel
**Status:** 🟡 In Progress

Tasks:
- [x] Access control (admin@topmlmleaders.com only)
- [x] Dashboard stats
- [x] Members management (verify, suspend, change plan)
- [x] Revenue overview
- [x] Flags review
- [x] Broadcast messages
- [x] Coupon code generator
- [ ] Featured members management
- [x] AI settings control (provider + availability)

**Acceptance:**
1. Only admin email can access
2. Coupon codes save to Supabase
3. Verify badge updates members table
4. AI settings update ai_settings table

---

## PHASE 9 — Payments (Razorpay)
**Goal:** Working subscription payments
**Status:** 🔲 Todo

Tasks:
- [ ] Razorpay integration
- [ ] Plan upgrade flow
- [ ] Coupon code validation
- [ ] Payment success → update member plan
- [ ] Payment failure handling

---

## PHASE 10 — Polish + Performance
**Goal:** Production ready, fast, beautiful
**Status:** 🔲 Todo

Tasks:
- [ ] SEO meta tags per member profile
- [ ] Performance optimization
- [ ] Error boundaries
- [ ] Loading skeletons
- [ ] Onboarding flow (3-step, optional)
- [ ] Final mobile testing on iPhone + Android
- [ ] Final cross-browser testing

---

## COMPLETED PHASES
- Phase 1 — Project Setup & Structure
- Phase 7 — AI Search Assistant
