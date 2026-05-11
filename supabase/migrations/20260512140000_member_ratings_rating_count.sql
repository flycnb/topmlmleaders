-- Per-user ratings + aggregate stats on public.members (rating, rating_count).

alter table public.members add column if not exists rating_count integer not null default 0;

create table if not exists public.member_ratings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  rater_id uuid not null references auth.users (id) on delete cascade,
  stars smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_ratings_stars_check check (stars >= 1 and stars <= 5),
  constraint member_ratings_unique_pair unique (member_id, rater_id)
);

create index if not exists idx_member_ratings_member_id on public.member_ratings (member_id);

create or replace function public.refresh_member_rating_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
begin
  if tg_op = 'DELETE' then
    target := old.member_id;
  else
    target := new.member_id;
  end if;

  update public.members m
  set
    rating = coalesce(
      (select round(avg(mr.stars)::numeric, 2) from public.member_ratings mr where mr.member_id = target),
      0
    ),
    rating_count = coalesce(
      (select count(*)::integer from public.member_ratings mr where mr.member_id = target),
      0
    ),
    updated_at = now()
  where m.id = target;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_member_ratings_refresh_stats on public.member_ratings;
create trigger trg_member_ratings_refresh_stats
after insert or update or delete on public.member_ratings
for each row execute function public.refresh_member_rating_stats();

alter table public.member_ratings enable row level security;

drop policy if exists "member_ratings_select" on public.member_ratings;
create policy "member_ratings_select"
on public.member_ratings
for select
to authenticated
using (
  rater_id = auth.uid()
  or exists (select 1 from public.members m where m.id = member_id and m.owner_id = auth.uid())
);

drop policy if exists "member_ratings_insert" on public.member_ratings;
create policy "member_ratings_insert"
on public.member_ratings
for insert
to authenticated
with check (
  rater_id = auth.uid()
  and stars between 1 and 5
  and exists (select 1 from public.members m where m.id = member_id)
  and (select m.owner_id from public.members m where m.id = member_id limit 1) is distinct from auth.uid()
);

drop policy if exists "member_ratings_update_own" on public.member_ratings;
create policy "member_ratings_update_own"
on public.member_ratings
for update
to authenticated
using (rater_id = auth.uid())
with check (rater_id = auth.uid() and stars between 1 and 5);

drop policy if exists "member_ratings_delete_own" on public.member_ratings;
create policy "member_ratings_delete_own"
on public.member_ratings
for delete
to authenticated
using (rater_id = auth.uid());
