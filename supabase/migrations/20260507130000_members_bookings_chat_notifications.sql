-- 1) Members RLS (public read; owner-only write)
-- 2) Bookings RLS
-- 3) Conversations = two auth.users IDs (sorted); clear legacy rows
-- 4) Notification triggers (follow, message, booking); remove permissive insert policy

-- ---------- Legacy conversation rows (member ids mixed with auth ids) ----------
delete from public.messages;
delete from public.conversations;

alter table public.conversations
  drop constraint if exists conversations_member1_id_fkey,
  drop constraint if exists conversations_member2_id_fkey;

alter table public.conversations
  add constraint conversations_member1_auth_fk
    foreign key (member1_id) references auth.users (id) on delete cascade;

alter table public.conversations
  add constraint conversations_member2_auth_fk
    foreign key (member2_id) references auth.users (id) on delete cascade;

create unique index if not exists idx_conversations_pair_unique
  on public.conversations (member1_id, member2_id);

-- ---------- Members RLS ----------
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

-- ---------- Bookings RLS ----------
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

-- ---------- Notifications: remove open spam insert ----------
drop policy if exists "notifications_insert_authenticated" on public.notifications;

-- ---------- Trigger: follow ----------
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
  v_init := upper(left(coalesce(v_name, 'U'), 2));

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

-- ---------- Trigger: message ----------
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
begin
  select
    case when c.member1_id = new.sender_id then c.member2_id else c.member1_id end
  into v_other
  from public.conversations c
  where c.id = new.conversation_id;

  if v_other is null or v_other = new.sender_id then
    return new;
  end if;

  select m.slug into v_slug
  from public.members m
  where m.owner_id = new.sender_id
  limit 1;

  v_from := coalesce(new.sender_name, 'Someone');

  insert into public.notifications (
    user_id, type, from_name, from_initials, from_color, text, link, read
  ) values (
    v_other,
    'message',
    v_from,
    upper(left(v_from, 2)),
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

-- ---------- Trigger: booking ----------
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
    upper(left(v_booker, 2)),
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
