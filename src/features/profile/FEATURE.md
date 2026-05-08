# Feature: Profile (Personal Website)
Status: In Progress
Files: src/features/profile/index.js, src/components/ShareSheet.js, src/components/QRCode.js
Database: members table, bookings table
Notes: World class personal website profile with 7 tabs, share sheet, QR download, follow action, Join Us form, and Elite booking flow.

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
