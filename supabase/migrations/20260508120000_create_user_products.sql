create type public.product_type as enum (
  'curso_presencial',
  'curso_online',
  'palestra',
  'workshop',
  'imersao',
  'diagnostico',
  'mentoria',
  'consultoria'
);

create type public.user_product_status as enum (
  'ativo',
  'concluido',
  'expirado',
  'pendente'
);

create table public.user_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_name text not null,
  product_type public.product_type not null,
  status public.user_product_status not null default 'ativo',
  purchased_at timestamptz not null default now(),
  expires_at timestamptz,
  access_url text,
  metadata jsonb
);

create index user_products_user_id_idx on public.user_products(user_id);
create index user_products_product_type_idx on public.user_products(product_type);
create index user_products_status_idx on public.user_products(status);
create unique index user_products_diagnostic_session_unique_idx
  on public.user_products(user_id, ((metadata->>'diagnostic_session_id')))
  where product_type = 'diagnostico' and metadata ? 'diagnostic_session_id';

alter table public.user_products enable row level security;

create policy "Users can view their own products"
  on public.user_products
  for select
  using (auth.uid() = user_id);

create policy "Users can create their own products"
  on public.user_products
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own products"
  on public.user_products
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins can manage user products"
  on public.user_products
  for all
  using (public.is_admin())
  with check (public.is_admin());
