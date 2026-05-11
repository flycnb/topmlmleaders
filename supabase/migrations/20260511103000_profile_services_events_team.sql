-- Profile tabs: products (services), events, profile_team — RLS + plan limits.

alter table public.products add column if not exists description text;

alter table public.events add column if not exists location text;
alter table public.events add column if not exists description text;

create table if not exists public.profile_team (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  name text not null default '',
  role text not null default '',
  photo_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profile_team_member on public.profile_team (member_id, sort_order);

drop trigger if exists trg_profile_team_set_updated_at on public.profile_team;
create trigger trg_profile_team_set_updated_at
before update on public.profile_team
for each row execute function public.set_updated_at();

-- Plan limits before insert (free / pro / elite+company unlimited)
create or replace function public.enforce_products_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  plan_val text;
  cnt int;
  cap int;
begin
  select coalesce(lower(trim(m.plan)), 'free') into plan_val
  from public.members m where m.id = new.member_id;
  if plan_val in ('elite', 'company') then return new; end if;
  cap := case plan_val when 'pro' then 10 else 3 end;
  select count(*)::int into cnt from public.products where member_id = new.member_id;
  if cnt >= cap then raise exception 'Product limit reached for your plan.'; end if;
  return new;
end;
$$;

drop trigger if exists trg_products_plan_limit on public.products;
create trigger trg_products_plan_limit before insert on public.products
for each row execute function public.enforce_products_plan_limit();

create or replace function public.enforce_events_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  plan_val text;
  cnt int;
  cap int;
begin
  select coalesce(lower(trim(m.plan)), 'free') into plan_val
  from public.members m where m.id = new.member_id;
  if plan_val in ('elite', 'company') then return new; end if;
  cap := case plan_val when 'pro' then 5 else 1 end;
  select count(*)::int into cnt from public.events where member_id = new.member_id;
  if cnt >= cap then raise exception 'Event limit reached for your plan.'; end if;
  return new;
end;
$$;

drop trigger if exists trg_events_plan_limit on public.events;
create trigger trg_events_plan_limit before insert on public.events
for each row execute function public.enforce_events_plan_limit();

create or replace function public.enforce_profile_team_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  plan_val text;
  cnt int;
  cap int;
begin
  select coalesce(lower(trim(m.plan)), 'free') into plan_val
  from public.members m where m.id = new.member_id;
  if plan_val in ('elite', 'company') then return new; end if;
  cap := case plan_val when 'pro' then 10 else 3 end;
  select count(*)::int into cnt from public.profile_team where member_id = new.member_id;
  if cnt >= cap then raise exception 'Team roster limit reached for your plan.'; end if;
  return new;
end;
$$;

drop trigger if exists trg_profile_team_plan_limit on public.profile_team;
create trigger trg_profile_team_plan_limit before insert on public.profile_team
for each row execute function public.enforce_profile_team_plan_limit();

-- RLS
alter table public.products enable row level security;
alter table public.events enable row level security;
alter table public.profile_team enable row level security;

drop policy if exists "products_select_public" on public.products;
create policy "products_select_public"
  on public.products for select to anon, authenticated using (true);

drop policy if exists "products_insert_owner" on public.products;
create policy "products_insert_owner"
  on public.products for insert to authenticated with check (
    exists (
      select 1 from public.members m
      where m.id = products.member_id and m.owner_id = auth.uid()
    )
  );

drop policy if exists "products_update_owner" on public.products;
create policy "products_update_owner"
  on public.products for update to authenticated
  using (exists (select 1 from public.members m where m.id = products.member_id and m.owner_id = auth.uid()))
  with check (exists (select 1 from public.members m where m.id = products.member_id and m.owner_id = auth.uid()));

drop policy if exists "products_delete_owner" on public.products;
create policy "products_delete_owner"
  on public.products for delete to authenticated using (
    exists (select 1 from public.members m where m.id = products.member_id and m.owner_id = auth.uid())
  );

drop policy if exists "events_select_public" on public.events;
create policy "events_select_public"
  on public.events for select to anon, authenticated using (true);

drop policy if exists "events_insert_owner" on public.events;
create policy "events_insert_owner"
  on public.events for insert to authenticated with check (
    exists (select 1 from public.members m where m.id = events.member_id and m.owner_id = auth.uid())
  );

drop policy if exists "events_update_owner" on public.events;
create policy "events_update_owner"
  on public.events for update to authenticated
  using (exists (select 1 from public.members m where m.id = events.member_id and m.owner_id = auth.uid()))
  with check (exists (select 1 from public.members m where m.id = events.member_id and m.owner_id = auth.uid()));

drop policy if exists "events_delete_owner" on public.events;
create policy "events_delete_owner"
  on public.events for delete to authenticated using (
    exists (select 1 from public.members m where m.id = events.member_id and m.owner_id = auth.uid())
  );

drop policy if exists "profile_team_select_public" on public.profile_team;
create policy "profile_team_select_public"
  on public.profile_team for select to anon, authenticated using (true);

drop policy if exists "profile_team_insert_owner" on public.profile_team;
create policy "profile_team_insert_owner"
  on public.profile_team for insert to authenticated with check (
    exists (
      select 1 from public.members m
      where m.id = profile_team.member_id and m.owner_id = auth.uid()
    )
  );

drop policy if exists "profile_team_update_owner" on public.profile_team;
create policy "profile_team_update_owner"
  on public.profile_team for update to authenticated
  using (exists (select 1 from public.members m where m.id = profile_team.member_id and m.owner_id = auth.uid()))
  with check (
    exists (select 1 from public.members m where m.id = profile_team.member_id and m.owner_id = auth.uid())
  );

drop policy if exists "profile_team_delete_owner" on public.profile_team;
create policy "profile_team_delete_owner"
  on public.profile_team for delete to authenticated using (
    exists (
      select 1 from public.members m where m.id = profile_team.member_id and m.owner_id = auth.uid()
    )
  );
