-- TopMLMLeaders.com - Clean, idempotent schema + seed
-- Safe to run on a fresh Supabase project or rerun on existing one.

begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- MEMBERS
-- =========================================================
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  city text,
  area text,
  pin text,
  country text,
  company text,
  role text,
  rating numeric(3,2) default 0,
  phone text,
  wa text,
  photo_initials text,
  avatar_url text,
  youtube_url text,
  color text default '#7F77DD',
  description text,
  social_fb text,
  social_ig text,
  social_yt text,
  social_li text,
  slug text,
  likes integer default 0,
  verified boolean default false,
  plan text default 'free',
  badges jsonb default '[]'::jsonb,
  joined_date text,
  team_size text,
  earnings text,
  follower_count integer default 0,
  following_count integer default 0,
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.members add column if not exists name text;
alter table public.members add column if not exists email text;
alter table public.members add column if not exists city text;
alter table public.members add column if not exists area text;
alter table public.members add column if not exists pin text;
alter table public.members add column if not exists country text;
alter table public.members add column if not exists company text;
alter table public.members add column if not exists role text;
alter table public.members add column if not exists rating numeric(3,2) default 0;
alter table public.members add column if not exists phone text;
alter table public.members add column if not exists wa text;
alter table public.members add column if not exists photo_initials text;
alter table public.members add column if not exists avatar_url text;
alter table public.members add column if not exists youtube_url text;
alter table public.members add column if not exists color text default '#7F77DD';
alter table public.members add column if not exists description text;
alter table public.members add column if not exists social_fb text;
alter table public.members add column if not exists social_ig text;
alter table public.members add column if not exists social_yt text;
alter table public.members add column if not exists social_li text;
alter table public.members add column if not exists slug text;
alter table public.members add column if not exists likes integer default 0;
alter table public.members add column if not exists verified boolean default false;
alter table public.members add column if not exists plan text default 'free';
alter table public.members add column if not exists badges jsonb default '[]'::jsonb;
alter table public.members add column if not exists joined_date text;
alter table public.members add column if not exists team_size text;
alter table public.members add column if not exists earnings text;
alter table public.members add column if not exists follower_count integer default 0;
alter table public.members add column if not exists following_count integer default 0;
alter table public.members add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.members add column if not exists created_at timestamptz default now();
alter table public.members add column if not exists updated_at timestamptz default now();

create index if not exists idx_members_owner on public.members(owner_id);

-- Link existing rows to signup users where emails match (idempotent).
update public.members m
set owner_id = u.id
from auth.users u
where m.owner_id is null
  and m.email is not null
  and lower(trim(m.email)) = lower(trim(u.email));

update public.members set
  rating = coalesce(rating, 0),
  color = coalesce(color, '#7F77DD'),
  likes = coalesce(likes, 0),
  verified = coalesce(verified, false),
  plan = coalesce(plan, 'free'),
  badges = coalesce(badges, '[]'::jsonb),
  follower_count = coalesce(follower_count, 0),
  following_count = coalesce(following_count, 0),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'members_plan_check'
      and conrelid = 'public.members'::regclass
  ) then
    alter table public.members
      add constraint members_plan_check
      check (plan in ('free', 'pro', 'elite', 'company'));
  end if;
end $$;

create unique index if not exists idx_members_slug_unique on public.members(slug);
create index if not exists idx_members_slug on public.members(slug);
create index if not exists idx_members_followers on public.members(follower_count desc);

drop trigger if exists trg_members_set_updated_at on public.members;
create trigger trg_members_set_updated_at
before update on public.members
for each row execute function public.set_updated_at();

-- =========================================================
-- USERS
-- =========================================================
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  plan text default 'free',
  referral_code text,
  referred_by text,
  created_at timestamptz default now()
);

alter table public.users add column if not exists name text;
alter table public.users add column if not exists email text;
alter table public.users add column if not exists plan text default 'free';
alter table public.users add column if not exists referral_code text;
alter table public.users add column if not exists referred_by text;
alter table public.users add column if not exists created_at timestamptz default now();

update public.users set
  plan = coalesce(plan, 'free'),
  created_at = coalesce(created_at, now());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_plan_check'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_plan_check
      check (plan in ('free', 'pro', 'elite', 'company'));
  end if;
end $$;

create unique index if not exists idx_users_email_unique on public.users(email);
create unique index if not exists idx_users_referral_code_unique on public.users(referral_code);

-- =========================================================
-- BOOKINGS
-- =========================================================
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  booker_id uuid references public.users(id) on delete set null,
  booker_name text,
  slot_day text,
  slot_time text,
  slot_type text,
  status text default 'pending',
  created_at timestamptz default now()
);

alter table public.bookings add column if not exists member_id uuid references public.members(id) on delete cascade;
alter table public.bookings add column if not exists booker_id uuid references public.users(id) on delete set null;
alter table public.bookings add column if not exists booker_name text;
alter table public.bookings add column if not exists slot_day text;
alter table public.bookings add column if not exists slot_time text;
alter table public.bookings add column if not exists slot_type text;
alter table public.bookings add column if not exists status text default 'pending';
alter table public.bookings add column if not exists created_at timestamptz default now();

update public.bookings set
  status = coalesce(status, 'pending'),
  created_at = coalesce(created_at, now());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_status_check'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_status_check
      check (status in ('pending', 'confirmed', 'cancelled'));
  end if;
end $$;

create index if not exists idx_bookings_member_id on public.bookings(member_id);

-- =========================================================
-- FOLLOWS
-- =========================================================
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.users(id) on delete cascade,
  following_id uuid not null references public.members(id) on delete cascade,
  created_at timestamptz default now()
);

alter table public.follows add column if not exists follower_id uuid references public.users(id) on delete cascade;
alter table public.follows add column if not exists following_id uuid references public.members(id) on delete cascade;
alter table public.follows add column if not exists created_at timestamptz default now();

create unique index if not exists idx_follows_unique_pair on public.follows(follower_id, following_id);
create index if not exists idx_follows_following_id on public.follows(following_id);

-- =========================================================
-- CONVERSATIONS
-- =========================================================
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  member1_id uuid not null,
  member2_id uuid not null,
  last_message text,
  last_message_time timestamptz,
  unread_count_m1 integer default 0,
  unread_count_m2 integer default 0,
  created_at timestamptz default now()
);

alter table public.conversations add column if not exists member1_id uuid;
alter table public.conversations add column if not exists member2_id uuid;
alter table public.conversations add column if not exists last_message text;
alter table public.conversations add column if not exists last_message_time timestamptz;
alter table public.conversations add column if not exists unread_count_m1 integer default 0;
alter table public.conversations add column if not exists unread_count_m2 integer default 0;
alter table public.conversations add column if not exists created_at timestamptz default now();

update public.conversations set
  unread_count_m1 = coalesce(unread_count_m1, 0),
  unread_count_m2 = coalesce(unread_count_m2, 0),
  created_at = coalesce(created_at, now());

-- =========================================================
-- MESSAGES
-- =========================================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null,
  sender_name text,
  sender_initials text,
  sender_color text,
  text text,
  read boolean default false,
  created_at timestamptz default now()
);

alter table public.messages add column if not exists conversation_id uuid references public.conversations(id) on delete cascade;
alter table public.messages add column if not exists sender_id uuid;
alter table public.messages add column if not exists sender_name text;
alter table public.messages add column if not exists sender_initials text;
alter table public.messages add column if not exists sender_color text;
alter table public.messages add column if not exists text text;
alter table public.messages add column if not exists read boolean default false;
alter table public.messages add column if not exists created_at timestamptz default now();

update public.messages set
  read = coalesce(read, false),
  created_at = coalesce(created_at, now());

create index if not exists idx_messages_conversation_id on public.messages(conversation_id, created_at desc);

-- =========================================================
-- EVENTS
-- =========================================================
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  title text,
  date text,
  time text,
  mode text,
  seats integer default 0,
  location text,
  description text,
  created_at timestamptz default now()
);

alter table public.events add column if not exists member_id uuid references public.members(id) on delete cascade;
alter table public.events add column if not exists title text;
alter table public.events add column if not exists date text;
alter table public.events add column if not exists time text;
alter table public.events add column if not exists mode text;
alter table public.events add column if not exists seats integer default 0;
alter table public.events add column if not exists location text;
alter table public.events add column if not exists description text;
alter table public.events add column if not exists created_at timestamptz default now();

update public.events set
  seats = coalesce(seats, 0),
  created_at = coalesce(created_at, now());

-- =========================================================
-- PRODUCTS
-- =========================================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  name text,
  description text,
  price text,
  category text,
  created_at timestamptz default now()
);

alter table public.products add column if not exists member_id uuid references public.members(id) on delete cascade;
alter table public.products add column if not exists name text;
alter table public.products add column if not exists description text;
alter table public.products add column if not exists price text;
alter table public.products add column if not exists category text;
alter table public.products add column if not exists pdf_url text;
alter table public.products add column if not exists created_at timestamptz default now();

update public.products set
  created_at = coalesce(created_at, now());

-- =========================================================
-- PROFILE TEAM (public profile Team tab)
-- =========================================================
create table if not exists public.profile_team (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  name text not null default '',
  role text not null default '',
  photo_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profile_team add column if not exists member_id uuid references public.members(id) on delete cascade;
alter table public.profile_team add column if not exists name text;
alter table public.profile_team add column if not exists role text;
alter table public.profile_team add column if not exists photo_url text;
alter table public.profile_team add column if not exists sort_order integer default 0;
alter table public.profile_team add column if not exists created_at timestamptz default now();
alter table public.profile_team add column if not exists updated_at timestamptz default now();

create index if not exists idx_profile_team_member on public.profile_team(member_id, sort_order);

drop trigger if exists trg_profile_team_set_updated_at on public.profile_team;
create trigger trg_profile_team_set_updated_at
before update on public.profile_team
for each row execute function public.set_updated_at();

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
  select coalesce(lower(trim(m.plan)), 'free') into plan_val from public.members m where m.id = new.member_id;
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
  select coalesce(lower(trim(m.plan)), 'free') into plan_val from public.members m where m.id = new.member_id;
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
  select coalesce(lower(trim(m.plan)), 'free') into plan_val from public.members m where m.id = new.member_id;
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

alter table public.products enable row level security;
alter table public.events enable row level security;
alter table public.profile_team enable row level security;

drop policy if exists "products_select_public" on public.products;
create policy "products_select_public"
  on public.products for select to anon, authenticated using (true);

drop policy if exists "products_insert_owner" on public.products;
create policy "products_insert_owner"
  on public.products for insert to authenticated with check (
    exists (select 1 from public.members m where m.id = member_id and m.owner_id = auth.uid())
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
    exists (select 1 from public.members m where m.id = member_id and m.owner_id = auth.uid())
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
    exists (select 1 from public.members m where m.id = member_id and m.owner_id = auth.uid())
  );

drop policy if exists "profile_team_update_owner" on public.profile_team;
create policy "profile_team_update_owner"
  on public.profile_team for update to authenticated
  using (exists (select 1 from public.members m where m.id = profile_team.member_id and m.owner_id = auth.uid()))
  with check (exists (select 1 from public.members m where m.id = profile_team.member_id and m.owner_id = auth.uid()));

drop policy if exists "profile_team_delete_owner" on public.profile_team;
create policy "profile_team_delete_owner"
  on public.profile_team for delete to authenticated using (
    exists (select 1 from public.members m where m.id = profile_team.member_id and m.owner_id = auth.uid())
  );

-- =========================================================
-- NOTIFICATIONS
-- =========================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text,
  from_name text,
  from_initials text,
  from_color text,
  text text,
  read boolean default false,
  link text,
  created_at timestamptz default now()
);

alter table public.notifications add column if not exists user_id uuid references public.users(id) on delete cascade;
alter table public.notifications add column if not exists type text;
alter table public.notifications add column if not exists from_name text;
alter table public.notifications add column if not exists from_initials text;
alter table public.notifications add column if not exists from_color text;
alter table public.notifications add column if not exists text text;
alter table public.notifications add column if not exists read boolean default false;
alter table public.notifications add column if not exists link text;
alter table public.notifications add column if not exists created_at timestamptz default now();

update public.notifications set
  read = coalesce(read, false),
  created_at = coalesce(created_at, now());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_type_check'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
      add constraint notifications_type_check
      check (type in ('follow', 'message', 'booking', 'like'));
  end if;
end $$;

create index if not exists idx_notifications_user_id on public.notifications(user_id, created_at desc);

-- =========================================================
-- RLS POLICIES
-- =========================================================
create or replace function public.is_conversation_participant(conv_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.conversations c
    where c.id = conv_id
      and (c.member1_id = auth.uid() or c.member2_id = auth.uid())
  );
$$;

alter table public.users enable row level security;
alter table public.follows enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
on public.users
for select
to authenticated
using (id = auth.uid());

drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own"
on public.users
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
on public.users
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "follows_read_authenticated" on public.follows;
create policy "follows_read_authenticated"
on public.follows
for select
to authenticated
using (true);

drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_insert_own"
on public.follows
for insert
to authenticated
with check (follower_id = auth.uid());

drop policy if exists "follows_delete_own" on public.follows;
create policy "follows_delete_own"
on public.follows
for delete
to authenticated
using (follower_id = auth.uid());

drop policy if exists "conversations_select_participant" on public.conversations;
create policy "conversations_select_participant"
on public.conversations
for select
to authenticated
using (member1_id = auth.uid() or member2_id = auth.uid());

drop policy if exists "conversations_insert_participant" on public.conversations;
create policy "conversations_insert_participant"
on public.conversations
for insert
to authenticated
with check (member1_id = auth.uid() or member2_id = auth.uid());

drop policy if exists "conversations_update_participant" on public.conversations;
create policy "conversations_update_participant"
on public.conversations
for update
to authenticated
using (member1_id = auth.uid() or member2_id = auth.uid())
with check (member1_id = auth.uid() or member2_id = auth.uid());

drop policy if exists "messages_select_participant" on public.messages;
create policy "messages_select_participant"
on public.messages
for select
to authenticated
using (public.is_conversation_participant(conversation_id));

drop policy if exists "messages_insert_sender" on public.messages;
create policy "messages_insert_sender"
on public.messages
for insert
to authenticated
with check (
  exists (
    select 1 from public.members m
    where m.id = sender_id and m.owner_id = auth.uid()
  )
  and public.is_conversation_participant(conversation_id)
);

drop policy if exists "messages_update_participant" on public.messages;
create policy "messages_update_participant"
on public.messages
for update
to authenticated
using (public.is_conversation_participant(conversation_id))
with check (public.is_conversation_participant(conversation_id));

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "notifications_insert_authenticated" on public.notifications;

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- =========================================================
-- SEED: 6 SAMPLE MEMBERS (upsert by slug)
-- =========================================================
insert into public.members (
  name, email, city, area, pin, country, company, role, rating, phone, wa, photo_initials, color,
  description, social_fb, social_ig, social_yt, social_li, slug, likes, verified, plan, badges,
  joined_date, team_size, earnings, follower_count, following_count
)
values
(
  'Rajnish Kumar','rajnish@topmlmleaders.com','Mumbai','Andheri','400053','India','Herbalife','Diamond Leader',4.8,'private','919876500001','RK','#7F77DD',
  '15 years in MLM. Top recruiter India 2023. Team of 5000+. Specializes in health & wellness products.',
  'https://facebook.com/rajnish','https://instagram.com/rajnish','https://youtube.com/@rajnish','https://linkedin.com/in/rajnish',
  'rajnish',310,true,'elite','["🏆 Diamond","⭐ Top Recruiter 2023","🌟 5000+ Team","💎 8 Year Leader"]'::jsonb,
  'Jan 2020','5,000+','₹2L+/mo',1240,210
),
(
  'Priya Sharma','priya.sharma@topmlmleaders.com','Delhi','Dwarka','110075','India','Amway','Platinum Director',4.5,'+91-98100-00001','919810000001','PS','#D4537E',
  'Amway top seller Delhi NCR. Women empowerment advocate. 10 years experience.',
  'https://facebook.com/priya','https://instagram.com/priya',null,'https://linkedin.com/in/priya',
  'priya-sharma',201,true,'pro','["💎 Platinum","👑 Women Leader","🏅 Top 10 India"]'::jsonb,
  'Mar 2018','2,000+','₹80K+/mo',890,140
),
(
  'Sunita Verma','sunita.verma@topmlmleaders.com','Pune','Kothrud','411038','India','Modicare','Star Director',4.9,'private','919552000003','SV','#BA7517',
  'Modicare No.1 Pune. Trainer & motivational speaker. Women leader of the year 2023.',
  'https://facebook.com/sunita','https://instagram.com/sunita','https://youtube.com/@sunita','https://linkedin.com/in/sunita',
  'sunita-verma',540,true,'elite','["⭐ Star Director","👑 Women of Year 2023","🏆 No.1 Pune"]'::jsonb,
  'Aug 2017','8,000+','₹3L+/mo',2030,330
),
(
  'Ravi Mehta','ravi.mehta@topmlmleaders.com','Bangalore','Koramangala','560034','India','Mi Lifestyle','Crown Ambassador',4.6,'+91-98440-00004','919844000004','RM','#185FA5',
  'Crown Ambassador. Tech-savvy MLM trainer. South India head. Digital marketing expert.',
  'https://facebook.com/ravi','https://instagram.com/ravi','https://youtube.com/@ravi','https://linkedin.com/in/ravi',
  'ravi-mehta',423,true,'elite','["👑 Crown Ambassador","🚀 12000+ Team","💻 Digital Expert"]'::jsonb,
  'Feb 2016','12,000+','₹5L+/mo',1780,420
),
(
  'Amit Patel','amit.patel@topmlmleaders.com','Ahmedabad','Navrangpura','380009','India','Forever Living','Senior Manager',4.2,'+91-97140-00002','919714000002','AP','#1D9E75',
  'Health & wellness leader. 8 yrs with Forever Living. Gujarat top performer.',
  'https://facebook.com/amit',null,'https://youtube.com/@amit',null,
  'amit-patel',98,false,'free','["🌿 Senior Manager","🏆 Gujarat Top"]'::jsonb,
  'Jun 2019','800+','₹45K+/mo',560,90
),
(
  'Deepa Nair','deepa.nair@topmlmleaders.com','Chennai','T. Nagar','600017','India','Vestige','Director',4.3,'private','private','DN','#993C1D',
  'Vestige Director Tamil Nadu. 6 years. Bilingual trainer. South India women leader.',
  'https://facebook.com/deepa',null,null,'https://linkedin.com/in/deepa',
  'deepa-nair',134,false,'free','["🌺 Director","🗣️ Bilingual Trainer"]'::jsonb,
  'Oct 2021','1,200+','₹60K+/mo',670,110
)
on conflict (slug) do update
set
  name = excluded.name,
  email = excluded.email,
  city = excluded.city,
  area = excluded.area,
  pin = excluded.pin,
  country = excluded.country,
  company = excluded.company,
  role = excluded.role,
  rating = excluded.rating,
  phone = excluded.phone,
  wa = excluded.wa,
  photo_initials = excluded.photo_initials,
  color = excluded.color,
  description = excluded.description,
  social_fb = excluded.social_fb,
  social_ig = excluded.social_ig,
  social_yt = excluded.social_yt,
  social_li = excluded.social_li,
  likes = excluded.likes,
  verified = excluded.verified,
  plan = excluded.plan,
  badges = excluded.badges,
  joined_date = excluded.joined_date,
  team_size = excluded.team_size,
  earnings = excluded.earnings,
  follower_count = excluded.follower_count,
  following_count = excluded.following_count,
  updated_at = now();

-- =========================================================
-- MEMBERS + BOOKINGS RLS, CONVERSATIONS FK (auth.users),
-- SERVER-SIDE NOTIFICATIONS (no client insert)
-- =========================================================
delete from public.messages;
delete from public.conversations;

alter table public.conversations
  drop constraint if exists conversations_member1_auth_fk,
  drop constraint if exists conversations_member2_auth_fk;

alter table public.conversations
  add constraint conversations_member1_auth_fk
    foreign key (member1_id) references auth.users (id) on delete cascade;

alter table public.conversations
  add constraint conversations_member2_auth_fk
    foreign key (member2_id) references auth.users (id) on delete cascade;

create unique index if not exists idx_conversations_pair_unique
  on public.conversations (member1_id, member2_id);

alter table public.members enable row level security;

drop policy if exists "members_select_public" on public.members;
create policy "members_select_public"
  on public.members
  for select
  to anon, authenticated
  using (true);

drop policy if exists "members_insert_owner" on public.members;
create policy "members_insert_owner"
  on public.members
  for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "members_update_owner" on public.members;
create policy "members_update_owner"
  on public.members
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "members_delete_owner" on public.members;
create policy "members_delete_owner"
  on public.members
  for delete
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "members_claim_unowned_email_match" on public.members;
create policy "members_claim_unowned_email_match"
  on public.members for update to authenticated
  using (
    owner_id is null
    and email is not null
    and lower(trim(email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
  )
  with check (owner_id = auth.uid());

-- Profile reports (matches src/features/flags/FlagModal.js)
create table if not exists public.flags (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  reason text,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists idx_flags_member_id on public.flags(member_id);
create index if not exists idx_flags_reporter_id on public.flags(reporter_id);

alter table public.flags enable row level security;

drop policy if exists "flags_insert_authenticated" on public.flags;
create policy "flags_insert_authenticated"
  on public.flags for insert to authenticated
  with check (reporter_id = auth.uid());

drop policy if exists "flags_select_own" on public.flags;
create policy "flags_select_own"
  on public.flags for select to authenticated
  using (reporter_id = auth.uid());

alter table public.bookings enable row level security;

drop policy if exists "bookings_select_related" on public.bookings;
create policy "bookings_select_related"
  on public.bookings
  for select
  to authenticated
  using (
    booker_id = auth.uid()
    or exists (
      select 1 from public.members m
      where m.id = bookings.member_id and m.owner_id = auth.uid()
    )
  );

drop policy if exists "bookings_insert_booker" on public.bookings;
create policy "bookings_insert_booker"
  on public.bookings
  for insert
  to authenticated
  with check (booker_id = auth.uid());

drop policy if exists "bookings_update_member_owner" on public.bookings;
create policy "bookings_update_member_owner"
  on public.bookings
  for update
  to authenticated
  using (
    exists (
      select 1 from public.members m
      where m.id = bookings.member_id and m.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.members m
      where m.id = bookings.member_id and m.owner_id = auth.uid()
    )
  );

create or replace function public.tg_notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_slug text;
  v_name text;
  v_init text;
begin
  select m.owner_id, m.slug into v_owner, v_slug
  from public.members m
  where m.id = new.following_id;

  if v_owner is null or v_owner = new.follower_id then
    return new;
  end if;

  select u.name into v_name from public.users u where u.id = new.follower_id;
  v_init := upper(substr(trim(coalesce(v_name, 'User')) || 'XX', 1, 2));

  insert into public.notifications (
    user_id, type, from_name, from_initials, from_color, text, link, read
  ) values (
    v_owner,
    'follow',
    coalesce(v_name, 'Someone'),
    v_init,
    '#7F77DD',
    coalesce(v_name, 'Someone') || ' followed you',
    '#/m/' || coalesce(v_slug, ''),
    false
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_on_follow on public.follows;
create trigger trg_notify_on_follow
  after insert on public.follows
  for each row execute procedure public.tg_notify_on_follow();

create or replace function public.tg_notify_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_other uuid;
  v_slug text;
  v_from text;
  v_sender_owner uuid;
begin
  select m.owner_id
  into v_sender_owner
  from public.members m
  where m.id = new.sender_id
  limit 1;

  if v_sender_owner is null then
    return new;
  end if;

  select
    case when c.member1_id = v_sender_owner then c.member2_id else c.member1_id end
  into v_other
  from public.conversations c
  where c.id = new.conversation_id;

  if v_other is null or v_other = v_sender_owner then
    return new;
  end if;

  if not exists (select 1 from public.users u where u.id = v_other) then
    return new;
  end if;

  select m.slug into v_slug
  from public.members m
  where m.id = new.sender_id
  limit 1;

  v_from := coalesce(new.sender_name, 'Someone');

  insert into public.notifications (
    user_id, type, from_name, from_initials, from_color, text, link, read
  ) values (
    v_other,
    'message',
    v_from,
    upper(substr(trim(v_from) || 'XX', 1, 2)),
    coalesce(new.sender_color, '#7F77DD'),
    v_from || ' sent you a message',
    '#/m/' || coalesce(v_slug, ''),
    false
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_on_message on public.messages;
create trigger trg_notify_on_message
  after insert on public.messages
  for each row execute procedure public.tg_notify_on_message();

create or replace function public.tg_notify_on_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_slug text;
  v_booker text;
begin
  select m.owner_id into v_owner
  from public.members m
  where m.id = new.member_id;

  if v_owner is null or v_owner = new.booker_id then
    return new;
  end if;

  select m.slug into v_slug from public.members m where m.id = new.member_id limit 1;
  v_booker := coalesce(new.booker_name, 'Someone');

  insert into public.notifications (
    user_id, type, from_name, from_initials, from_color, text, link, read
  ) values (
    v_owner,
    'booking',
    v_booker,
    upper(substr(trim(v_booker) || 'XX', 1, 2)),
    '#EF9F27',
    v_booker || ' booked a slot (' || coalesce(new.slot_time, '') || ')',
    '#/m/' || coalesce(v_slug, ''),
    false
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_on_booking on public.bookings;
create trigger trg_notify_on_booking
  after insert on public.bookings
  for each row execute procedure public.tg_notify_on_booking();

commit;
