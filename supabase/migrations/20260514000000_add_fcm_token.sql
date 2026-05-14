-- Add FCM token storage to users table
alter table public.users
  add column if not exists fcm_token text;

-- Allow users to update their own FCM token
drop policy if exists "users_update_own_fcm"
  on public.users;
create policy "users_update_own_fcm"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
