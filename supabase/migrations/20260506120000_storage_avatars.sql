-- =============================================================================
-- Avatars storage helper (runs as normal migration user)
--
-- Creating buckets and Storage RLS on `storage.objects` requires ownership of
-- that table. In hosted Supabase, SQL Editor often cannot ALTER / CREATE POLICY
-- on storage.objects → use the Storage UI or Storage API with the service role.
--
-- SETUP — pick one:
--
-- (1) Dashboard (fastest)
--     • Storage → New bucket → Name: avatars → Public bucket ON → Create
--     • Policies → New policy → use templates or paste the expressions below
--       under “Definitions” using bucket_id = avatars and object path = name
--
-- (2) Storage API (service role — server / CI only, never expose secret to web)
--     const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
--     await admin.storage.createBucket('avatars', {
--       public: true,
--       fileSizeLimit: 5242880,
--       allowedMimeTypes: ['image/jpeg','image/png','image/webp','image/gif'],
--     })
--     Then add the same policies in Dashboard (Storage → avatars → Policies).
--
-- Policy logic (client uploads: `{member_id}-{timestamp}.ext`):
--   • SELECT  — allow public (or anon + authenticated) for bucket_id = 'avatars'
--   • INSERT  — authenticated, WITH CHECK same as insert_owner below
--   • UPDATE  — authenticated, USING + WITH CHECK same as update_owner below
--   • DELETE  — authenticated, USING same as delete_owner below
--
-- If the policy editor lets you reference this function, use:
--   public.member_id_from_avatar_path(name)
-- Otherwise inline the UUID prefix as:
--   (substring(name from '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'))::uuid
--
-- insert_owner WITH CHECK:
--   bucket_id = 'avatars'
--   AND public.member_id_from_avatar_path(name) IS NOT NULL
--   AND EXISTS (
--     SELECT 1 FROM public.members m
--     WHERE m.id = public.member_id_from_avatar_path(name)
--       AND m.owner_id = auth.uid()
--   )
--
-- update_owner USING / WITH CHECK and delete_owner USING: same EXISTS block as
-- insert_owner, with bucket_id = 'avatars'.
-- =============================================================================

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

grant execute on function public.member_id_from_avatar_path(text) to public;

comment on function public.member_id_from_avatar_path(text) is
  'Parses member UUID from avatar object key `{uuid}-{timestamp}.ext` for Storage policies.';
