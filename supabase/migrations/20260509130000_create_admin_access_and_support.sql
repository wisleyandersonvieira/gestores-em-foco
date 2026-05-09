create table if not exists public.site_access_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  path text,
  page_title text,
  product_slug text,
  referrer text,
  user_agent text,
  ip_hash text,
  session_id text,
  access_type text not null default 'page_view',
  created_at timestamptz not null default now()
);

create index if not exists site_access_logs_created_idx on public.site_access_logs(created_at desc);
create index if not exists site_access_logs_user_created_idx on public.site_access_logs(user_id, created_at desc);
create index if not exists site_access_logs_product_created_idx on public.site_access_logs(product_slug, created_at desc);

alter table public.site_access_logs enable row level security;

drop policy if exists "Anyone can create site access logs" on public.site_access_logs;
drop policy if exists "Admins can view site access logs" on public.site_access_logs;

create policy "Anyone can create site access logs"
on public.site_access_logs
for insert
with check (true);

create policy "Admins can view site access logs"
on public.site_access_logs
for select
using (public.is_admin());

alter table public.support_requests
add column if not exists product_slug text,
add column if not exists priority text not null default 'normal',
add column if not exists admin_notes text,
add column if not exists solved_at timestamptz,
add column if not exists solved_by uuid references auth.users(id) on delete set null;

alter table public.support_requests
drop constraint if exists support_requests_status_check;

alter table public.support_requests
add constraint support_requests_status_check
check (status in ('open', 'in_progress', 'solved', 'closed'));

alter table public.support_requests
drop constraint if exists support_requests_priority_check;

alter table public.support_requests
add constraint support_requests_priority_check
check (priority in ('low', 'normal', 'high', 'urgent'));

drop policy if exists "Users can update their own support requests" on public.support_requests;
drop policy if exists "Users can delete their own support requests" on public.support_requests;
