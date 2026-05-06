-- Public avatars bucket + RLS aligned with client keys: `{member_id}-{timestamp}.ext`

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = coalesce(storage.buckets.file_size_limit, excluded.file_size_limit),
  allowed_mime_types = coalesce(storage.buckets.allowed_mime_types, excluded.allowed_mime_types);

create or replace function public.member_id_from_avatar_path(path text)
returns uuid
language sql
immutable
as $$
  select case
    when path is null then null::uuid
    else (
      substring(path from '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})')
    )::uuid
  end;
$$;

alter table storage.objects enable row level security;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
on storage.objects
for select
to public
using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_owner" on storage.objects;
create policy "avatars_insert_owner"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and public.member_id_from_avatar_path(name) is not null
  and exists (
    select 1
    from public.members m
    where m.id = public.member_id_from_avatar_path(name)
      and m.owner_id = auth.uid()
  )
);

drop policy if exists "avatars_update_owner" on storage.objects;
create policy "avatars_update_owner"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and public.member_id_from_avatar_path(name) is not null
  and exists (
    select 1
    from public.members m
    where m.id = public.member_id_from_avatar_path(name)
      and m.owner_id = auth.uid()
  )
)
with check (
  bucket_id = 'avatars'
  and public.member_id_from_avatar_path(name) is not null
  and exists (
    select 1
    from public.members m
    where m.id = public.member_id_from_avatar_path(name)
      and m.owner_id = auth.uid()
  )
);

drop policy if exists "avatars_delete_owner" on storage.objects;
create policy "avatars_delete_owner"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and public.member_id_from_avatar_path(name) is not null
  and exists (
    select 1
    from public.members m
    where m.id = public.member_id_from_avatar_path(name)
      and m.owner_id = auth.uid()
  )
);
