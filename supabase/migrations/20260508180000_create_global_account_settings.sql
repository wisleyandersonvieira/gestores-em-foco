create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  full_name text,
  phone text,
  company_name text,
  role text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  platform_emails boolean not null default true,
  billing_emails boolean not null default true,
  product_news boolean not null default true,
  security_alerts boolean not null default true,
  in_app_notifications boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  theme text not null default 'light',
  density text not null default 'default',
  language text not null default 'pt-BR',
  timezone text not null default 'America/Sao_Paulo',
  currency text not null default 'BRL',
  date_format text not null default 'DD/MM/YYYY',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_theme_check check (theme in ('light', 'dark', 'system')),
  constraint user_preferences_density_check check (density in ('compact', 'default', 'comfortable')),
  constraint user_preferences_language_check check (language in ('pt-BR', 'en-US')),
  constraint user_preferences_currency_check check (currency in ('BRL', 'USD')),
  constraint user_preferences_timezone_check check (timezone in ('America/Sao_Paulo', 'America/New_York', 'America/Chicago', 'America/Los_Angeles')),
  constraint user_preferences_date_format_check check (date_format in ('DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'))
);

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  message text not null,
  type text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_requests_subject_not_blank check (length(trim(subject)) > 0),
  constraint support_requests_message_not_blank check (length(trim(message)) > 0),
  constraint support_requests_type_check check (type in ('duvida', 'problema', 'sugestao', 'financeiro'))
);

create index if not exists support_requests_user_created_idx on public.support_requests(user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
drop trigger if exists set_user_notification_preferences_updated_at on public.user_notification_preferences;
drop trigger if exists set_user_preferences_updated_at on public.user_preferences;
drop trigger if exists set_support_requests_updated_at on public.support_requests;

create trigger set_user_profiles_updated_at before update on public.user_profiles
  for each row execute function public.set_updated_at();
create trigger set_user_notification_preferences_updated_at before update on public.user_notification_preferences
  for each row execute function public.set_updated_at();
create trigger set_user_preferences_updated_at before update on public.user_preferences
  for each row execute function public.set_updated_at();
create trigger set_support_requests_updated_at before update on public.support_requests
  for each row execute function public.set_updated_at();

alter table public.user_profiles enable row level security;
alter table public.user_notification_preferences enable row level security;
alter table public.user_preferences enable row level security;
alter table public.support_requests enable row level security;

drop policy if exists "Users can view their own global profile" on public.user_profiles;
drop policy if exists "Users can create their own global profile" on public.user_profiles;
drop policy if exists "Users can update their own global profile" on public.user_profiles;
drop policy if exists "Users can delete their own global profile" on public.user_profiles;

drop policy if exists "Users can view their own notification preferences" on public.user_notification_preferences;
drop policy if exists "Users can create their own notification preferences" on public.user_notification_preferences;
drop policy if exists "Users can update their own notification preferences" on public.user_notification_preferences;
drop policy if exists "Users can delete their own notification preferences" on public.user_notification_preferences;

drop policy if exists "Users can view their own preferences" on public.user_preferences;
drop policy if exists "Users can create their own preferences" on public.user_preferences;
drop policy if exists "Users can update their own preferences" on public.user_preferences;
drop policy if exists "Users can delete their own preferences" on public.user_preferences;

drop policy if exists "Users can view their own support requests" on public.support_requests;
drop policy if exists "Users can create their own support requests" on public.support_requests;
drop policy if exists "Users can update their own support requests" on public.support_requests;
drop policy if exists "Users can delete their own support requests" on public.support_requests;
drop policy if exists "Admins can manage support requests" on public.support_requests;

create policy "Users can view their own global profile" on public.user_profiles
  for select using (auth.uid() = user_id);
create policy "Users can create their own global profile" on public.user_profiles
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own global profile" on public.user_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own global profile" on public.user_profiles
  for delete using (auth.uid() = user_id);

create policy "Users can view their own notification preferences" on public.user_notification_preferences
  for select using (auth.uid() = user_id);
create policy "Users can create their own notification preferences" on public.user_notification_preferences
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own notification preferences" on public.user_notification_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own notification preferences" on public.user_notification_preferences
  for delete using (auth.uid() = user_id);

create policy "Users can view their own preferences" on public.user_preferences
  for select using (auth.uid() = user_id);
create policy "Users can create their own preferences" on public.user_preferences
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own preferences" on public.user_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own preferences" on public.user_preferences
  for delete using (auth.uid() = user_id);

create policy "Users can view their own support requests" on public.support_requests
  for select using (auth.uid() = user_id);
create policy "Users can create their own support requests" on public.support_requests
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own support requests" on public.support_requests
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own support requests" on public.support_requests
  for delete using (auth.uid() = user_id);
create policy "Admins can manage support requests" on public.support_requests
  for all using (public.is_admin()) with check (public.is_admin());
