-- Refer & Earn: member plan expiry + milestone flags; users can see rows they referred (for counts).

alter table public.members add column if not exists plan_expires_at timestamptz;
alter table public.members add column if not exists referral_bonus_5_applied boolean not null default false;
alter table public.members add column if not exists referral_bonus_10_applied boolean not null default false;

create index if not exists idx_users_referred_by on public.users (referred_by);

-- Referrers must read referred users' rows to count referrals (lightweight MVP).
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
on public.users
for select
to authenticated
using (
  id = auth.uid()
  or referred_by = auth.uid()::text
);
