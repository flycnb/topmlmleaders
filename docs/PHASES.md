# 📊 PHASES — TopMLMLeaders.com Build Plan

Last updated: May 2026

---

## CURRENT PHASE: 1 — Project Setup

---

## PHASE 1 — Project Setup & Structure
**Goal:** Clean folder structure, rules, base files
**Status:** 🔲 Todo

Tasks:
- [ ] Create folder structure
- [ ] Create .cursor-rules
- [ ] Create docs/ files
- [ ] Setup src/lib/supabaseClient.js with PKCE
- [ ] Setup public/index.html with Inter font + safe area
- [ ] Setup src/index.css with reset + CSS variables
- [ ] Setup src/App.css with animations
- [ ] Create empty FEATURE.md in each feature folder
- [ ] npm run build passes

**Acceptance:** Build passes, folder structure correct, no old code remaining.

---

## PHASE 2 — Home Page + Search + Member Cards
**Goal:** World class home page with master search and beautiful member cards
**Status:** 🔲 Todo

Tasks:
- [ ] Home page layout (header, search, grid, bottom nav)
- [ ] Master search box (single intelligent search)
- [ ] Auto-detect city/country by IP (ipapi.co)
- [ ] Filter chips (All, City, Country, Company, Role, Experience)
- [ ] Member cards (premium design)
- [ ] Infinite scroll (12 per load)
- [ ] Sort: Elite → Pro → Free → by followers
- [ ] Load real data from Supabase members table
- [ ] Leaderboard tab
- [ ] Opportunity Board tab
- [ ] Plans tab (static, no payment yet)
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
**Status:** 🔲 Todo

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
**Status:** 🔲 Todo

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
**Status:** 🔲 Todo

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
**Status:** 🔲 Todo

Tasks:
- [ ] Stats row (Followers, Messages, Bookmarks, Alerts) — clickable
- [ ] Overview tab (activity feed, profile summary)
- [ ] Profile tab (edit all fields, upload photo, YouTube, QR)
- [ ] Messages tab (conversation list)
- [ ] Bookmarks tab (search + list + remove)
- [ ] Bookings tab (incoming + outgoing)
- [ ] Settings tab (verify badge, upgrade plan)
- [ ] Refer & Earn tab
- [ ] All data from real Supabase — no fake data

**Acceptance:**
1. Stats show real numbers
2. Profile save works
3. Photo upload works
4. Bookmarks searchable
5. No fake/hardcoded data anywhere

---

## PHASE 7 — AI Search Assistant
**Goal:** AI brain that understands natural language search
**Status:** 🔲 Todo

Tasks:
- [ ] AI button (🧠) next to search
- [ ] Slide-down AI panel
- [ ] Text input
- [ ] Voice input (Web Speech API)
- [ ] Call Claude API with search query
- [ ] Parse JSON response → apply filters
- [ ] Show "AI filtered results for: [query]"
- [ ] Admin setting to control AI (provider + availability)

**Acceptance:**
1. "Find diamond leaders in Mumbai" returns correct results
2. Voice input works on Chrome
3. Admin can turn AI off
4. Graceful fallback if API fails

---

## PHASE 8 — Admin Panel
**Goal:** Full admin control panel
**Status:** 🔲 Todo

Tasks:
- [ ] Access control (admin@topmlmleaders.com only)
- [ ] Dashboard stats
- [ ] Members management (verify, suspend, change plan)
- [ ] Revenue overview
- [ ] Flags review
- [ ] Broadcast messages
- [ ] Coupon code generator
- [ ] Featured members management
- [ ] AI settings control (provider + availability)

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
None yet — fresh start!
