-- Fix child-table RLS (unqualified member_id in WITH CHECK).
-- Allow claiming members.owner_id when still null and email matches JWT.
-- Optional products.pdf_url + flags table for reports.

alter table public.products add column if not exists pdf_url text;

-- Claim unowned profile linked to same email as authenticated user
drop policy if exists "members_claim_unowned_email_match" on public.members;
create policy "members_claim_unowned_email_match"
  on public.members for update to authenticated
  using (
    owner_id is null
    and email is not null
    and lower(trim(email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
  )
  with check (owner_id = auth.uid());

-- products
drop policy if exists "products_insert_owner" on public.products;
create policy "products_insert_owner"
  on public.products for insert to authenticated
  with check (
    exists (
      select 1 from public.members m
      where m.id = member_id and m.owner_id = auth.uid()
    )
  );

drop policy if exists "products_update_owner" on public.products;
create policy "products_update_owner"
  on public.products for update to authenticated
  using (
    exists (select 1 from public.members m where m.id = products.member_id and m.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.members m where m.id = products.member_id and m.owner_id = auth.uid())
  );

drop policy if exists "products_delete_owner" on public.products;
create policy "products_delete_owner"
  on public.products for delete to authenticated using (
    exists (select 1 from public.members m where m.id = products.member_id and m.owner_id = auth.uid())
  );

-- events
drop policy if exists "events_insert_owner" on public.events;
create policy "events_insert_owner"
  on public.events for insert to authenticated
  with check (
    exists (
      select 1 from public.members m
      where m.id = member_id and m.owner_id = auth.uid()
    )
  );

drop policy if exists "events_update_owner" on public.events;
create policy "events_update_owner"
  on public.events for update to authenticated
  using (
    exists (select 1 from public.members m where m.id = events.member_id and m.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.members m where m.id = events.member_id and m.owner_id = auth.uid())
  );

drop policy if exists "events_delete_owner" on public.events;
create policy "events_delete_owner"
  on public.events for delete to authenticated using (
    exists (select 1 from public.members m where m.id = events.member_id and m.owner_id = auth.uid())
  );

-- profile_team
drop policy if exists "profile_team_insert_owner" on public.profile_team;
create policy "profile_team_insert_owner"
  on public.profile_team for insert to authenticated
  with check (
    exists (
      select 1 from public.members m
      where m.id = member_id and m.owner_id = auth.uid()
    )
  );

drop policy if exists "profile_team_update_owner" on public.profile_team;
create policy "profile_team_update_owner"
  on public.profile_team for update to authenticated
  using (
    exists (
      select 1 from public.members m where m.id = profile_team.member_id and m.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.members m where m.id = profile_team.member_id and m.owner_id = auth.uid()
    )
  );

drop policy if exists "profile_team_delete_owner" on public.profile_team;
create policy "profile_team_delete_owner"
  on public.profile_team for delete to authenticated using (
    exists (
      select 1 from public.members m where m.id = profile_team.member_id and m.owner_id = auth.uid()
    )
  );

-- flags (public profile reports)
create table if not exists public.flags (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  reason text,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists idx_flags_member_id on public.flags (member_id);
create index if not exists idx_flags_reporter_id on public.flags (reporter_id);

alter table public.flags enable row level security;

drop policy if exists "flags_insert_authenticated" on public.flags;
create policy "flags_insert_authenticated"
  on public.flags for insert to authenticated
  with check (reporter_id = auth.uid());

drop policy if exists "flags_select_own" on public.flags;
create policy "flags_select_own"
  on public.flags for select to authenticated
  using (reporter_id = auth.uid());
