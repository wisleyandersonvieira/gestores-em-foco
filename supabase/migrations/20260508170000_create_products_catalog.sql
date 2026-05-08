create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  short_description text,
  full_description text,
  status text not null default 'active',
  product_type text not null default 'saas',
  icon text,
  highlight_color text,
  route_path text,
  display_order integer not null default 0,
  stripe_product_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_name_not_blank check (length(trim(name)) > 0),
  constraint products_slug_not_blank check (length(trim(slug)) > 0)
);

create table if not exists public.user_product_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  product_slug text not null,
  status text not null default 'active',
  plan_name text,
  access_type text not null default 'subscription',
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_product_subscriptions_status_check check (status in ('active', 'trialing', 'past_due', 'canceled', 'inactive')),
  constraint user_product_subscriptions_access_type_check check (length(trim(access_type)) > 0),
  unique(user_id, product_id)
);

create index if not exists products_status_order_idx on public.products(status, display_order, name);
create index if not exists user_product_subscriptions_user_idx on public.user_product_subscriptions(user_id);
create index if not exists user_product_subscriptions_product_slug_idx on public.user_product_subscriptions(product_slug);
create index if not exists user_product_subscriptions_access_idx on public.user_product_subscriptions(user_id, product_slug, status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_products_updated_at on public.products;
drop trigger if exists set_user_product_subscriptions_updated_at on public.user_product_subscriptions;

create trigger set_products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create trigger set_user_product_subscriptions_updated_at before update on public.user_product_subscriptions
  for each row execute function public.set_updated_at();

alter table public.products enable row level security;
alter table public.user_product_subscriptions enable row level security;

drop policy if exists "Authenticated users can view active products" on public.products;
drop policy if exists "Admins can manage products" on public.products;
drop policy if exists "Users can view their own product subscriptions v2" on public.user_product_subscriptions;
drop policy if exists "Admins can manage product subscriptions v2" on public.user_product_subscriptions;

create policy "Authenticated users can view active products"
  on public.products
  for select
  to authenticated
  using (status = 'active');

create policy "Admins can manage products"
  on public.products
  for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Users can view their own product subscriptions v2"
  on public.user_product_subscriptions
  for select
  using (auth.uid() = user_id);

-- Subscription writes are intentionally restricted to admins for now.
-- Future Stripe integration should write through webhooks or secure server-side functions.
create policy "Admins can manage product subscriptions v2"
  on public.user_product_subscriptions
  for all
  using (public.is_admin())
  with check (public.is_admin());

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
  display_order
)
values
  (
    'Diagnósticos',
    'diagnosticos',
    'Ferramenta para análise, diagnóstico e acompanhamento da gestão do negócio.',
    'Diagnóstico da gestão, indicadores estratégicos, acompanhamento da evolução e relatórios gerenciais.',
    'active',
    'saas',
    'chart',
    'blue',
    '/diagnosticos',
    10
  ),
  (
    'Gestor de DRE',
    'gestor-dre',
    'Controle mensal de DRE com categorias, modelos, lançamentos, análises e indicadores.',
    'Cadastro de modelos de DRE, lançamento mensal por competência, dashboard financeiro e análise comparativa mensal, trimestral e semestral.',
    'active',
    'saas',
    'report',
    'orange',
    '/dre-facil',
    20
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
  updated_at = now();

create or replace function public.check_product_access_v2(p_user_id uuid, p_product_slug text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_product_subscriptions ups
    join public.products p on p.id = ups.product_id
    where ups.user_id = p_user_id
      and ups.product_slug = p_product_slug
      and p.slug = p_product_slug
      and p.status = 'active'
      and ups.status in ('active', 'trialing')
      and (ups.current_period_end is null or ups.current_period_end >= now())
  );
$$;

-- Temporary test helper. Replace this flow with Stripe Checkout/webhooks before production.
create or replace function public.activate_product_subscription_for_test(p_product_slug text)
returns public.user_product_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_product public.products;
  v_subscription public.user_product_subscriptions;
begin
  if v_user_id is null then
    raise exception 'authenticated user required';
  end if;

  select *
    into v_product
  from public.products
  where slug = p_product_slug
    and status = 'active';

  if v_product.id is null then
    raise exception 'active product not found';
  end if;

  insert into public.user_product_subscriptions (
    user_id,
    product_id,
    product_slug,
    status,
    plan_name,
    access_type,
    current_period_start,
    current_period_end
  )
  values (
    v_user_id,
    v_product.id,
    v_product.slug,
    'active',
    'Acesso de teste',
    'test',
    now(),
    null
  )
  on conflict (user_id, product_id) do update set
    status = 'active',
    plan_name = 'Acesso de teste',
    access_type = 'test',
    current_period_start = coalesce(public.user_product_subscriptions.current_period_start, now()),
    current_period_end = null,
    canceled_at = null,
    updated_at = now()
  returning * into v_subscription;

  return v_subscription;
end;
$$;

grant execute on function public.activate_product_subscription_for_test(text) to authenticated;

insert into public.user_product_subscriptions (
  user_id,
  product_id,
  product_slug,
  status,
  plan_name,
  access_type,
  stripe_customer_id,
  stripe_subscription_id,
  current_period_start,
  current_period_end
)
select
  ps.user_id,
  p.id,
  p.slug,
  case
    when ps.status in ('active', 'trialing') then ps.status
    when ps.status = 'ativo' then 'active'
    else 'inactive'
  end,
  ps.plan_name,
  'subscription',
  ps.stripe_customer_id,
  ps.stripe_subscription_id,
  ps.current_period_start,
  ps.current_period_end
from public.product_subscriptions ps
join public.products p on p.slug = case
  when ps.product_id in ('gestor-dre', 'dre_facil') then 'gestor-dre'
  when ps.product_id in ('diagnosticos', 'diagnostico') then 'diagnosticos'
  else ps.product_id
end
where ps.status in ('active', 'trialing', 'ativo')
on conflict (user_id, product_id) do update set
  status = excluded.status,
  plan_name = excluded.plan_name,
  stripe_customer_id = excluded.stripe_customer_id,
  stripe_subscription_id = excluded.stripe_subscription_id,
  current_period_start = excluded.current_period_start,
  current_period_end = excluded.current_period_end,
  updated_at = now();

insert into public.user_product_subscriptions (
  user_id,
  product_id,
  product_slug,
  status,
  plan_name,
  access_type,
  current_period_start,
  current_period_end
)
select
  up.user_id,
  p.id,
  p.slug,
  'active',
  'Acesso legado',
  'legacy',
  up.purchased_at,
  up.expires_at
from public.user_products up
join public.products p on p.slug = case
  when up.product_type::text in ('dre_facil', 'gestor-dre') then 'gestor-dre'
  when up.product_type::text in ('diagnostico', 'diagnosticos') then 'diagnosticos'
  else up.product_type::text
end
where up.status = 'ativo'
on conflict (user_id, product_id) do nothing;
