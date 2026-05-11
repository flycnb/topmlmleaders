-- messages.sender_id references members(id); resolve auth owner for conversation + slug lookups.

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
