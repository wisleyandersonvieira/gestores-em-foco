create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  file_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint privacy_requests_type_check check (request_type in ('export', 'account_deletion')),
  constraint privacy_requests_status_check check (status in ('pending', 'processing', 'completed', 'rejected', 'canceled'))
);

create index if not exists privacy_requests_user_requested_idx
on public.privacy_requests(user_id, requested_at desc);

create index if not exists privacy_requests_active_idx
on public.privacy_requests(user_id, request_type, status)
where status in ('pending', 'processing');

drop trigger if exists set_privacy_requests_updated_at on public.privacy_requests;
create trigger set_privacy_requests_updated_at before update on public.privacy_requests
  for each row execute function public.set_updated_at();

alter table public.privacy_requests enable row level security;

drop policy if exists "Users can view own privacy requests" on public.privacy_requests;
drop policy if exists "Users can create own privacy requests" on public.privacy_requests;
drop policy if exists "Users can cancel own pending privacy requests" on public.privacy_requests;
drop policy if exists "Admins can manage privacy requests" on public.privacy_requests;

create policy "Users can view own privacy requests"
on public.privacy_requests
for select
using (auth.uid() = user_id);

create policy "Users can create own privacy requests"
on public.privacy_requests
for insert
with check (auth.uid() = user_id);

create policy "Users can cancel own pending privacy requests"
on public.privacy_requests
for update
using (
  auth.uid() = user_id
  and status in ('pending', 'processing')
)
with check (
  auth.uid() = user_id
  and status = 'canceled'
);

create policy "Admins can manage privacy requests"
on public.privacy_requests
for all
using (public.is_admin())
with check (public.is_admin());
