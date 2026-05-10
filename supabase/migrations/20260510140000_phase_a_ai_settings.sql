-- Phase A — ai_settings singleton (AI gate). Safe to re-run.

create table if not exists public.ai_settings (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'claude',
  available_to text not null default 'all',
  updated_at timestamptz not null default now()
);

insert into public.ai_settings (provider, available_to)
select 'claude', 'all'
where not exists (select 1 from public.ai_settings limit 1);

drop trigger if exists trg_ai_settings_set_updated_at on public.ai_settings;
create trigger trg_ai_settings_set_updated_at
before update on public.ai_settings
for each row execute function public.set_updated_at();
