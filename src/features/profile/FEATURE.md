# Feature: Profile (Personal Website)
Status: In Progress
Files: src/features/profile/index.js, src/components/ShareSheet.js, src/components/QRCode.js
Database: members table, bookings table
Notes: World class personal website profile with 7 tabs, share sheet, QR download, follow action, Join Us form, and Elite booking flow.

## TICKET-004

- Gallery tab lightbox uses **index** navigation with ‹ › controls, image counter, and close control.
- **popstate**: extra history entry + listener so Android hardware back does not immediately leave the profile page.
- Public QR URL for modal lives in **QRCode.js** (`/u/…`).

## TICKET-003

- Contact Call / WhatsApp: logged-in viewers see alerts when phone or WhatsApp visibility is private (no tel/wa navigation).
- Header action labeled **📲 Save Contact** (opens QR modal).
- **QRCode.js**: modal copy explains saving contact via QR for a friend’s phone.

## TICKET-006

- **Contact** (About tab): Call / WhatsApp use **`isContactAllowed`** with **`user?.plan || "free"`**; alerts use **`getContactMessage`** for blocked phone / WA. **`openWa`** shows the same message when WhatsApp is not allowed. Rules align with **MemberCard** + **`src/lib/contactVisibility.js`**.

Avatar edit (owner): uploads to Storage bucket **avatars** with object key `{memberId}-{timestamp}.{ext}`; **members.avatar_url** is updated after upload. Storage policies should use **member_id_from_avatar_path** (see `supabase/migrations/20260506120000_storage_avatars.sql` and `docs/BUGS.md` BUG-007).

Run in Supabase SQL editor:
create table if not exists join_requests (
  id uuid default gen_random_uuid() primary key,
  member_id uuid references members(id),
  name text,
  wa text,
  city text,
  experience text,
  created_at timestamptz default now()
);
