-- Phase A — Opportunity Board (matches src/pages/Board.js). Safe to re-run.

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  member_id uuid references public.members (id) on delete set null,
  type text,
  title text,
  description text,
  city text,
  country text,
  wa text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_opportunities_created_at on public.opportunities (created_at desc);
create index if not exists idx_opportunities_active_created on public.opportunities (active, created_at desc);
