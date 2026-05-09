-- Security hardening for SaaS launch readiness.

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null default 'admin',
  created_at timestamptz not null default now(),
  constraint admin_users_role_check check (role in ('owner', 'admin', 'support'))
);

insert into public.admin_users (user_id, role)
select id, 'owner'
from public.profiles
where role = 'admin'
on conflict (user_id) do nothing;

alter table public.admin_users enable row level security;

drop policy if exists "Admins can view admin users" on public.admin_users;
drop policy if exists "Admins can manage admin users" on public.admin_users;
drop policy if exists "Admin users can view own record" on public.admin_users;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
      and role in ('owner', 'admin', 'support')
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

create policy "Admin users can view own record"
on public.admin_users
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "Admins can manage admin users"
on public.admin_users
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and not public.is_admin() then
    if new.role is distinct from old.role
      or new.email is distinct from old.email
      or new.is_active is distinct from old.is_active then
      raise exception 'profile privileged fields cannot be updated by the user';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_profile_privilege_escalation on public.profiles;
create trigger prevent_profile_privilege_escalation
before update on public.profiles
for each row execute function public.prevent_profile_privilege_escalation();

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

-- Products and subscriptions must not be self-granted from the browser.
drop policy if exists "Users can create their own products" on public.user_products;
drop policy if exists "Users can update their own products" on public.user_products;

drop policy if exists "Users can create their own product subscriptions" on public.product_subscriptions;
drop policy if exists "Users can update their own product subscriptions" on public.product_subscriptions;
drop policy if exists "Users can delete their own product subscriptions" on public.product_subscriptions;

revoke all on function public.activate_product_subscription_for_test(text) from public, anon, authenticated;

create or replace function public.check_product_access_v2(p_user_id uuid, p_product_slug text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (p_user_id = auth.uid() or public.is_admin()) and exists (
    select 1
    from public.user_product_subscriptions ups
    join public.products p on p.id = ups.product_id
    where ups.user_id = p_user_id
      and ups.product_slug = p_product_slug
      and p.slug = p_product_slug
      and p.status = 'active'
      and ups.status in ('active', 'trialing')
      and (ups.current_period_end is null or ups.current_period_end >= now())
      and (ups.trial_ends_at is null or ups.trial_ends_at >= now() or ups.status <> 'trialing')
  );
$$;

grant execute on function public.check_product_access_v2(uuid, text) to authenticated;

-- Support: users may create/view their own tickets, admins manage workflow fields.
drop policy if exists "Users can view their own support requests" on public.support_requests;
drop policy if exists "Users can create their own support requests" on public.support_requests;
drop policy if exists "Users can update their own support requests" on public.support_requests;
drop policy if exists "Users can delete their own support requests" on public.support_requests;
drop policy if exists "Admins can manage support requests" on public.support_requests;

alter table public.support_requests
drop constraint if exists support_requests_type_check;

alter table public.support_requests
add constraint support_requests_type_check
check (type in ('duvida', 'problema', 'sugestao', 'financeiro'));

alter table public.support_requests
drop constraint if exists support_requests_subject_length_check;

alter table public.support_requests
add constraint support_requests_subject_length_check
check (length(trim(subject)) between 1 and 120);

alter table public.support_requests
drop constraint if exists support_requests_message_length_check;

alter table public.support_requests
add constraint support_requests_message_length_check
check (length(trim(message)) between 1 and 5000);

create policy "Users can view their own support requests"
on public.support_requests
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own support requests"
on public.support_requests
for insert
to authenticated
with check (
  auth.uid() = user_id
  and status = 'open'
  and admin_notes is null
  and solved_at is null
  and solved_by is null
);

create policy "Admins can manage support requests"
on public.support_requests
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Access logs: allow telemetry inserts without allowing user spoofing.
drop policy if exists "Anyone can create site access logs" on public.site_access_logs;
drop policy if exists "Admins can view site access logs" on public.site_access_logs;

alter table public.site_access_logs
drop constraint if exists site_access_logs_access_type_check;

alter table public.site_access_logs
add constraint site_access_logs_access_type_check
check (access_type in ('page_view', 'product_view', 'admin_denied', 'export_requested', 'support_created'));

create policy "Clients can create own site access logs"
on public.site_access_logs
for insert
to anon, authenticated
with check (
  user_id is null or user_id = auth.uid()
);

create policy "Admins can view site access logs"
on public.site_access_logs
for select
to authenticated
using (public.is_admin());

-- Diagnostic public links: avoid table-wide anonymous reads.
drop policy if exists "Public can read active links by token" on public.diagnostic_links;

create or replace function public.mark_diagnostic_link_used(p_link_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.diagnostic_links;
begin
  if p_user_id <> auth.uid() then
    raise exception 'forbidden';
  end if;

  select *
  into v_link
  from public.diagnostic_links
  where id = p_link_id
  for update;

  if v_link.id is null
    or v_link.status <> 'active'
    or (v_link.expires_at is not null and v_link.expires_at < now())
    or (v_link.assigned_user_id is not null and v_link.assigned_user_id <> p_user_id)
    or (v_link.max_uses is not null and v_link.uses_count >= v_link.max_uses) then
    raise exception 'link_unavailable';
  end if;

  update public.diagnostic_links
  set uses_count = uses_count + 1,
      updated_at = now()
  where id = p_link_id;
end;
$$;

grant execute on function public.mark_diagnostic_link_used(uuid, uuid) to authenticated;

-- Avatar storage: keep public reads but restrict writes to own folder and safe image extensions.
drop policy if exists "Users can upload own avatar" on storage.objects;
drop policy if exists "Users can update own avatar" on storage.objects;

create policy "Users can upload own avatar"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
  and lower(name) ~ '\.(jpg|jpeg|png|webp)$'
);

create policy "Users can update own avatar"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
  and lower(name) ~ '\.(jpg|jpeg|png|webp)$'
);

-- Audit logs for future admin views and sensitive events.
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  constraint audit_logs_action_not_blank check (length(trim(action)) > 0)
);

create index if not exists audit_logs_actor_created_idx on public.audit_logs(actor_user_id, created_at desc);
create index if not exists audit_logs_action_created_idx on public.audit_logs(action, created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists "Admins can view audit logs" on public.audit_logs;
drop policy if exists "System and admins can create audit logs" on public.audit_logs;

create policy "Admins can view audit logs"
on public.audit_logs
for select
to authenticated
using (public.is_admin());

create policy "Admins can create audit logs"
on public.audit_logs
for insert
to authenticated
with check (public.is_admin() and (actor_user_id is null or actor_user_id = auth.uid()));
