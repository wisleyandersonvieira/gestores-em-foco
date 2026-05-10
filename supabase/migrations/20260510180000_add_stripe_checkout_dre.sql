alter table public.products
  add column if not exists stripe_price_id text,
  add column if not exists price_cents integer,
  add column if not exists currency text,
  add column if not exists billing_interval text;

alter table public.user_product_subscriptions
  add column if not exists cancel_at_period_end boolean not null default false;

alter table public.user_product_subscriptions
  drop constraint if exists user_product_subscriptions_status_check;

alter table public.user_product_subscriptions
  add constraint user_product_subscriptions_status_check
  check (status in (
    'active',
    'trialing',
    'past_due',
    'canceled',
    'inactive',
    'incomplete',
    'incomplete_expired',
    'unpaid',
    'paused'
  ));

create unique index if not exists user_product_subscriptions_user_slug_key
  on public.user_product_subscriptions(user_id, product_slug);

create unique index if not exists user_product_subscriptions_stripe_subscription_key
  on public.user_product_subscriptions(stripe_subscription_id)
  where stripe_subscription_id is not null;

create table if not exists public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stripe_webhook_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now(),
  payload jsonb not null
);

create index if not exists billing_customers_user_idx on public.billing_customers(user_id);
create index if not exists stripe_webhook_events_type_processed_idx on public.stripe_webhook_events(type, processed_at desc);

drop trigger if exists set_billing_customers_updated_at on public.billing_customers;
create trigger set_billing_customers_updated_at before update on public.billing_customers
  for each row execute function public.set_updated_at();

alter table public.billing_customers enable row level security;
alter table public.stripe_webhook_events enable row level security;

drop policy if exists "Users can view own billing customer" on public.billing_customers;
drop policy if exists "Admins can manage billing customers" on public.billing_customers;
drop policy if exists "Admins can view stripe webhook events" on public.stripe_webhook_events;

create policy "Users can view own billing customer"
  on public.billing_customers
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Admins can manage billing customers"
  on public.billing_customers
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can view stripe webhook events"
  on public.stripe_webhook_events
  for select
  to authenticated
  using (public.is_admin());

insert into public.products (
  name,
  slug,
  short_description,
  full_description,
  status,
  product_type,
  icon,
  highlight_color,
  route_path,
  display_order,
  stripe_product_id,
  stripe_price_id,
  price_cents,
  currency,
  billing_interval
)
values (
  'Gestor de DRE',
  'gestor-dre',
  'Controle mensal de DRE com categorias, modelos, lançamentos, análises e indicadores.',
  'Cadastro de modelos de DRE, lançamento mensal por competência, dashboard financeiro e análise comparativa mensal, trimestral e semestral.',
  'active',
  'saas',
  'report',
  'orange',
  '/dre-facil',
  20,
  'prod_UUYPBR36Xoot1W',
  'price_1TVZITGrbv5UzR86dNyVUUTn',
  2990,
  'BRL',
  'month'
)
on conflict (slug) do update set
  name = excluded.name,
  short_description = excluded.short_description,
  full_description = excluded.full_description,
  status = excluded.status,
  product_type = excluded.product_type,
  icon = excluded.icon,
  highlight_color = excluded.highlight_color,
  route_path = excluded.route_path,
  display_order = excluded.display_order,
  stripe_product_id = excluded.stripe_product_id,
  stripe_price_id = excluded.stripe_price_id,
  price_cents = excluded.price_cents,
  currency = excluded.currency,
  billing_interval = excluded.billing_interval,
  updated_at = now();

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
      and (
        ups.status in ('active', 'trialing')
        or (ups.status = 'past_due' and ups.current_period_end is not null and ups.current_period_end >= now())
      )
      and (ups.current_period_end is null or ups.current_period_end >= now())
      and (ups.trial_ends_at is null or ups.trial_ends_at >= now() or ups.status <> 'trialing')
      and ups.status not in ('canceled', 'inactive', 'incomplete_expired', 'unpaid', 'paused')
  );
$$;

grant execute on function public.check_product_access_v2(uuid, text) to authenticated;
