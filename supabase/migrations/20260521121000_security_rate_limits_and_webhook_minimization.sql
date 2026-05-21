create table if not exists public.edge_rate_limits (
  key text primary key,
  function_name text not null,
  subject text not null,
  window_start timestamptz not null default now(),
  request_count integer not null default 1,
  updated_at timestamptz not null default now(),
  constraint edge_rate_limits_key_not_blank check (length(trim(key)) > 0),
  constraint edge_rate_limits_function_not_blank check (length(trim(function_name)) > 0),
  constraint edge_rate_limits_subject_not_blank check (length(trim(subject)) > 0),
  constraint edge_rate_limits_request_count_positive check (request_count > 0)
);

create index if not exists edge_rate_limits_function_window_idx
  on public.edge_rate_limits(function_name, window_start desc);

alter table public.edge_rate_limits enable row level security;

drop policy if exists "Admins can view edge rate limits" on public.edge_rate_limits;

create policy "Admins can view edge rate limits"
  on public.edge_rate_limits
  for select
  to authenticated
  using (public.is_admin());

alter table public.stripe_webhook_events
  add column if not exists livemode boolean,
  add column if not exists object_id text,
  add column if not exists customer_id text,
  add column if not exists subscription_id text,
  add column if not exists checkout_session_id text,
  add column if not exists payment_intent_id text,
  add column if not exists status text,
  add column if not exists payload_minimized jsonb;

alter table public.stripe_webhook_events
  alter column payload drop not null;

create index if not exists stripe_webhook_events_object_id_idx
  on public.stripe_webhook_events(object_id)
  where object_id is not null;

create index if not exists stripe_webhook_events_customer_id_idx
  on public.stripe_webhook_events(customer_id)
  where customer_id is not null;

do $$
declare
  policy_check text := 'user_id = auth.uid()';
begin
  if to_regclass('public.site_access_logs') is null then
    return;
  end if;

  alter table public.site_access_logs
    drop constraint if exists site_access_logs_product_slug_length,
    drop constraint if exists site_access_logs_route_path_length,
    drop constraint if exists site_access_logs_path_length,
    drop constraint if exists site_access_logs_access_type_length,
    drop constraint if exists site_access_logs_session_id_length,
    drop constraint if exists site_access_logs_referrer_length,
    drop constraint if exists site_access_logs_user_agent_length,
    drop constraint if exists site_access_logs_event_type_length;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'site_access_logs' and column_name = 'product_slug'
  ) then
    alter table public.site_access_logs
      add constraint site_access_logs_product_slug_length
      check (product_slug is null or char_length(product_slug) <= 80) not valid;
    policy_check := policy_check || ' and (product_slug is null or char_length(product_slug) <= 80)';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'site_access_logs' and column_name = 'path'
  ) then
    alter table public.site_access_logs
      add constraint site_access_logs_path_length
      check (path is null or char_length(path) <= 300) not valid;
    policy_check := policy_check || ' and (path is null or char_length(path) <= 300)';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'site_access_logs' and column_name = 'access_type'
  ) then
    alter table public.site_access_logs
      add constraint site_access_logs_access_type_length
      check (access_type is null or char_length(access_type) <= 40) not valid;
    policy_check := policy_check || ' and (access_type is null or char_length(access_type) <= 40)';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'site_access_logs' and column_name = 'session_id'
  ) then
    alter table public.site_access_logs
      add constraint site_access_logs_session_id_length
      check (session_id is null or char_length(session_id) <= 120) not valid;
    policy_check := policy_check || ' and (session_id is null or char_length(session_id) <= 120)';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'site_access_logs' and column_name = 'referrer'
  ) then
    alter table public.site_access_logs
      add constraint site_access_logs_referrer_length
      check (referrer is null or char_length(referrer) <= 500) not valid;
    policy_check := policy_check || ' and (referrer is null or char_length(referrer) <= 500)';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'site_access_logs' and column_name = 'user_agent'
  ) then
    alter table public.site_access_logs
      add constraint site_access_logs_user_agent_length
      check (user_agent is null or char_length(user_agent) <= 500) not valid;
    policy_check := policy_check || ' and (user_agent is null or char_length(user_agent) <= 500)';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'site_access_logs' and column_name = 'event_type'
  ) then
    alter table public.site_access_logs
      add constraint site_access_logs_event_type_length
      check (event_type is null or char_length(event_type) <= 40) not valid;
    policy_check := policy_check || ' and (event_type is null or char_length(event_type) <= 40)';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'site_access_logs' and column_name = 'user_id'
  ) then
    drop policy if exists "Anyone can create site access logs" on public.site_access_logs;
    drop policy if exists "Clients can create own site access logs" on public.site_access_logs;
    drop policy if exists "Authenticated clients can create own site access logs" on public.site_access_logs;

    execute format(
      'create policy "Authenticated clients can create own site access logs" on public.site_access_logs for insert to authenticated with check (%s)',
      policy_check
    );
  end if;
end $$;
