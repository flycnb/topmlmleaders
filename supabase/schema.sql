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
  created_at timestamptz default now()
);

alter table public.events add column if not exists member_id uuid references public.members(id) on delete cascade;
alter table public.events add column if not exists title text;
alter table public.events add column if not exists date text;
alter table public.events add column if not exists time text;
alter table public.events add column if not exists mode text;
alter table public.events add column if not exists seats integer default 0;
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
  price text,
  category text,
  created_at timestamptz default now()
);

alter table public.products add column if not exists member_id uuid references public.members(id) on delete cascade;
alter table public.products add column if not exists name text;
alter table public.products add column if not exists price text;
alter table public.products add column if not exists category text;
alter table public.products add column if not exists created_at timestamptz default now();

update public.products set
  created_at = coalesce(created_at, now());

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
  sender_id = auth.uid()
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
create policy "notifications_insert_authenticated"
on public.notifications
for insert
to authenticated
with check (true);

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

commit;
