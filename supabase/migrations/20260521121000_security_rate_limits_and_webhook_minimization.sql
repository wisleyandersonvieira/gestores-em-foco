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

alter table public.site_access_logs
  drop constraint if exists site_access_logs_product_slug_length,
  drop constraint if exists site_access_logs_route_path_length,
  drop constraint if exists site_access_logs_access_type_length,
  drop constraint if exists site_access_logs_session_id_length,
  drop constraint if exists site_access_logs_referrer_length,
  drop constraint if exists site_access_logs_user_agent_length,
  drop constraint if exists site_access_logs_event_type_length;

alter table public.site_access_logs
  add constraint site_access_logs_product_slug_length check (product_slug is null or length(product_slug) <= 80) not valid,
  add constraint site_access_logs_route_path_length check (route_path is null or length(route_path) <= 300) not valid,
  add constraint site_access_logs_access_type_length check (access_type is null or length(access_type) <= 40) not valid,
  add constraint site_access_logs_session_id_length check (session_id is null or length(session_id) <= 120) not valid,
  add constraint site_access_logs_referrer_length check (referrer is null or length(referrer) <= 500) not valid,
  add constraint site_access_logs_user_agent_length check (user_agent is null or length(user_agent) <= 500) not valid,
  add constraint site_access_logs_event_type_length check (event_type is null or length(event_type) <= 40) not valid;

drop policy if exists "Clients can create own site access logs" on public.site_access_logs;

create policy "Authenticated clients can create own site access logs"
  on public.site_access_logs
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and (product_slug is null or length(product_slug) <= 80)
    and (path is null or length(path) <= 300)
    and (access_type is null or length(access_type) <= 40)
    and (session_id is null or length(session_id) <= 120)
    and (referrer is null or length(referrer) <= 500)
    and (user_agent is null or length(user_agent) <= 500)
    and (event_type is null or length(event_type) <= 40)
  );
