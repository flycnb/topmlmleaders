# Feature: Dashboard
Status: In Progress
Files: src/features/dashboard/index.js
Database: members, bookings, bookmarks, conversations, notifications, verification_requests
Notes: Member control panel with live stats, editable profile, bookings, settings, and referral panel. No fake data allowed.

Media tab: gallery uploads go to Storage bucket **gallery** at path `{memberId}/{timestamp}.{ext}`; URLs are stored in **members.gallery_urls** (jsonb). Requires matching Storage RLS on **storage.objects** (see `docs/BUGS.md` BUG-007).

## TICKET-003

- Media tab gallery thumbnails use **4:3** aspect ratio (was square).
