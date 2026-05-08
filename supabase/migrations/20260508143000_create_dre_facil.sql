alter type public.product_type add value if not exists 'dre_facil';

do $$
begin
  create type public.dre_category_type as enum ('credit', 'debit');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.dre_record_status as enum ('active', 'inactive');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.dre_model_line_type as enum ('category', 'subcategory', 'sum');
exception
  when duplicate_object then null;
end $$;

alter type public.dre_model_line_type add value if not exists 'sum';

do $$
begin
  create type public.dre_entry_status as enum ('draft', 'finalized');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.dre_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type public.dre_category_type not null,
  status public.dre_record_status not null default 'active',
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dre_categories_name_not_blank check (length(trim(name)) > 0)
);

create table if not exists public.dre_subcategories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.dre_categories(id) on delete restrict,
  name text not null,
  status public.dre_record_status not null default 'active',
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dre_subcategories_name_not_blank check (length(trim(name)) > 0)
);

create table if not exists public.dre_models (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  status public.dre_record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dre_models_name_not_blank check (length(trim(name)) > 0)
);

create table if not exists public.dre_model_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  model_id uuid not null references public.dre_models(id) on delete cascade,
  category_id uuid references public.dre_categories(id) on delete restrict,
  subcategory_id uuid references public.dre_subcategories(id) on delete restrict,
  line_type public.dre_model_line_type not null,
  parent_category_id uuid references public.dre_categories(id) on delete restrict,
  sum_label text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint dre_model_category_line_shape check (
    (line_type::text = 'category' and category_id is not null and subcategory_id is null and parent_category_id is null)
    or
    (line_type::text = 'subcategory' and category_id is not null and subcategory_id is not null and parent_category_id is not null)
    or
    (line_type::text = 'sum' and category_id is null and subcategory_id is null and parent_category_id is null and length(trim(coalesce(sum_label, ''))) > 0)
  )
);

create table if not exists public.dre_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  model_id uuid not null references public.dre_models(id) on delete restrict,
  competence text not null,
  status public.dre_entry_status not null default 'draft',
  total_credit numeric(14,2) not null default 0,
  total_debit numeric(14,2) not null default 0,
  result numeric(14,2) not null default 0,
  margin_percentage numeric(8,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dre_entries_competence_format check (competence ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
);

create table if not exists public.dre_entry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dre_entry_id uuid not null references public.dre_entries(id) on delete cascade,
  category_id uuid references public.dre_categories(id) on delete set null,
  subcategory_id uuid references public.dre_subcategories(id) on delete set null,
  category_name_snapshot text not null,
  subcategory_name_snapshot text,
  category_type_snapshot public.dre_category_type not null,
  line_type public.dre_model_line_type not null,
  display_order integer not null default 0,
  value numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dre_entry_item_line_shape check (
    (line_type::text = 'category' and subcategory_name_snapshot is null)
    or
    (line_type::text = 'subcategory' and subcategory_name_snapshot is not null)
    or
    (line_type::text = 'sum' and subcategory_name_snapshot is null)
  )
);

create table if not exists public.product_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  status text not null default 'active',
  plan_name text,
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dre_model_lines
  alter column category_id drop not null,
  add column if not exists sum_label text;

alter table public.dre_model_lines
  drop constraint if exists dre_model_category_line_shape;

alter table public.dre_model_lines
  add constraint dre_model_category_line_shape check (
    (line_type::text = 'category' and category_id is not null and subcategory_id is null and parent_category_id is null)
    or
    (line_type::text = 'subcategory' and category_id is not null and subcategory_id is not null and parent_category_id is not null)
    or
    (line_type::text = 'sum' and category_id is null and subcategory_id is null and parent_category_id is null and length(trim(coalesce(sum_label, ''))) > 0)
  );

alter table public.dre_entry_items
  drop constraint if exists dre_entry_item_line_shape;

alter table public.dre_entry_items
  add constraint dre_entry_item_line_shape check (
    (line_type::text = 'category' and category_name_snapshot is not null and subcategory_name_snapshot is null)
    or
    (line_type::text = 'subcategory' and category_name_snapshot is not null and subcategory_name_snapshot is not null)
    or
    (line_type::text = 'sum' and category_name_snapshot is not null and subcategory_name_snapshot is null)
  );

create index if not exists dre_categories_user_id_idx on public.dre_categories(user_id);
create index if not exists dre_categories_type_status_idx on public.dre_categories(user_id, type, status);
create index if not exists dre_subcategories_user_id_idx on public.dre_subcategories(user_id);
create index if not exists dre_subcategories_category_id_idx on public.dre_subcategories(category_id);
create index if not exists dre_models_user_id_idx on public.dre_models(user_id);
create index if not exists dre_model_lines_user_model_idx on public.dre_model_lines(user_id, model_id);
create index if not exists dre_entries_user_competence_idx on public.dre_entries(user_id, competence);
create index if not exists dre_entries_user_model_idx on public.dre_entries(user_id, model_id);
create index if not exists dre_entry_items_entry_idx on public.dre_entry_items(dre_entry_id);
create index if not exists product_subscriptions_user_product_idx on public.product_subscriptions(user_id, product_id);

create unique index if not exists dre_entries_finalized_unique_idx
  on public.dre_entries(user_id, model_id, competence)
  where status = 'finalized';

create unique index if not exists product_subscriptions_active_unique_idx
  on public.product_subscriptions(user_id, product_id)
  where status in ('active', 'trialing');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_dre_categories_updated_at on public.dre_categories;
drop trigger if exists set_dre_subcategories_updated_at on public.dre_subcategories;
drop trigger if exists set_dre_models_updated_at on public.dre_models;
drop trigger if exists set_dre_entries_updated_at on public.dre_entries;
drop trigger if exists set_dre_entry_items_updated_at on public.dre_entry_items;
drop trigger if exists set_product_subscriptions_updated_at on public.product_subscriptions;

create trigger set_dre_categories_updated_at before update on public.dre_categories
  for each row execute function public.set_updated_at();
create trigger set_dre_subcategories_updated_at before update on public.dre_subcategories
  for each row execute function public.set_updated_at();
create trigger set_dre_models_updated_at before update on public.dre_models
  for each row execute function public.set_updated_at();
create trigger set_dre_entries_updated_at before update on public.dre_entries
  for each row execute function public.set_updated_at();
create trigger set_dre_entry_items_updated_at before update on public.dre_entry_items
  for each row execute function public.set_updated_at();
create trigger set_product_subscriptions_updated_at before update on public.product_subscriptions
  for each row execute function public.set_updated_at();

create or replace function public.create_default_dre_categories(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'user_id is required';
  end if;

  if exists (select 1 from public.dre_categories where user_id = p_user_id limit 1) then
    return;
  end if;

  -- Placeholder intentionally empty. Default DRE categories will be inserted here
  -- when the definitive list is provided.
  return;
end;
$$;

create or replace function public.check_product_access(p_user_id uuid, p_product_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.product_subscriptions
    where user_id = p_user_id
      and product_id = p_product_key
      and status in ('active', 'trialing')
      and (current_period_end is null or current_period_end >= now())
  )
  or exists (
    select 1
    from public.user_products
    where user_id = p_user_id
      and product_type::text = 'dre_facil'
      and status = 'ativo'
      and (expires_at is null or expires_at >= now())
  );
$$;

alter table public.dre_categories enable row level security;
alter table public.dre_subcategories enable row level security;
alter table public.dre_models enable row level security;
alter table public.dre_model_lines enable row level security;
alter table public.dre_entries enable row level security;
alter table public.dre_entry_items enable row level security;
alter table public.product_subscriptions enable row level security;

drop policy if exists "Users can view their own DRE categories" on public.dre_categories;
drop policy if exists "Users can create their own DRE categories" on public.dre_categories;
drop policy if exists "Users can update their own DRE categories" on public.dre_categories;
drop policy if exists "Users can delete their own DRE categories" on public.dre_categories;
drop policy if exists "Admins can manage DRE categories" on public.dre_categories;

drop policy if exists "Users can view their own DRE subcategories" on public.dre_subcategories;
drop policy if exists "Users can create their own DRE subcategories" on public.dre_subcategories;
drop policy if exists "Users can update their own DRE subcategories" on public.dre_subcategories;
drop policy if exists "Users can delete their own DRE subcategories" on public.dre_subcategories;
drop policy if exists "Admins can manage DRE subcategories" on public.dre_subcategories;

drop policy if exists "Users can view their own DRE models" on public.dre_models;
drop policy if exists "Users can create their own DRE models" on public.dre_models;
drop policy if exists "Users can update their own DRE models" on public.dre_models;
drop policy if exists "Users can delete their own DRE models" on public.dre_models;
drop policy if exists "Admins can manage DRE models" on public.dre_models;

drop policy if exists "Users can view their own DRE model lines" on public.dre_model_lines;
drop policy if exists "Users can create their own DRE model lines" on public.dre_model_lines;
drop policy if exists "Users can update their own DRE model lines" on public.dre_model_lines;
drop policy if exists "Users can delete their own DRE model lines" on public.dre_model_lines;
drop policy if exists "Admins can manage DRE model lines" on public.dre_model_lines;

drop policy if exists "Users can view their own DRE entries" on public.dre_entries;
drop policy if exists "Users can create their own DRE entries" on public.dre_entries;
drop policy if exists "Users can update their own DRE entries" on public.dre_entries;
drop policy if exists "Users can delete their own DRE entries" on public.dre_entries;
drop policy if exists "Admins can manage DRE entries" on public.dre_entries;

drop policy if exists "Users can view their own DRE entry items" on public.dre_entry_items;
drop policy if exists "Users can create their own DRE entry items" on public.dre_entry_items;
drop policy if exists "Users can update their own DRE entry items" on public.dre_entry_items;
drop policy if exists "Users can delete their own DRE entry items" on public.dre_entry_items;
drop policy if exists "Admins can manage DRE entry items" on public.dre_entry_items;

drop policy if exists "Users can view their own product subscriptions" on public.product_subscriptions;
drop policy if exists "Users can create their own product subscriptions" on public.product_subscriptions;
drop policy if exists "Users can update their own product subscriptions" on public.product_subscriptions;
drop policy if exists "Users can delete their own product subscriptions" on public.product_subscriptions;
drop policy if exists "Admins can manage product subscriptions" on public.product_subscriptions;

create policy "Users can view their own DRE categories" on public.dre_categories
  for select using (auth.uid() = user_id);
create policy "Users can create their own DRE categories" on public.dre_categories
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own DRE categories" on public.dre_categories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own DRE categories" on public.dre_categories
  for delete using (auth.uid() = user_id);

create policy "Users can view their own DRE subcategories" on public.dre_subcategories
  for select using (auth.uid() = user_id);
create policy "Users can create their own DRE subcategories" on public.dre_subcategories
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own DRE subcategories" on public.dre_subcategories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own DRE subcategories" on public.dre_subcategories
  for delete using (auth.uid() = user_id);

create policy "Users can view their own DRE models" on public.dre_models
  for select using (auth.uid() = user_id);
create policy "Users can create their own DRE models" on public.dre_models
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own DRE models" on public.dre_models
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own DRE models" on public.dre_models
  for delete using (auth.uid() = user_id);

create policy "Users can view their own DRE model lines" on public.dre_model_lines
  for select using (auth.uid() = user_id);
create policy "Users can create their own DRE model lines" on public.dre_model_lines
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own DRE model lines" on public.dre_model_lines
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own DRE model lines" on public.dre_model_lines
  for delete using (auth.uid() = user_id);

create policy "Users can view their own DRE entries" on public.dre_entries
  for select using (auth.uid() = user_id);
create policy "Users can create their own DRE entries" on public.dre_entries
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own DRE entries" on public.dre_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own DRE entries" on public.dre_entries
  for delete using (auth.uid() = user_id);

create policy "Users can view their own DRE entry items" on public.dre_entry_items
  for select using (auth.uid() = user_id);
create policy "Users can create their own DRE entry items" on public.dre_entry_items
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own DRE entry items" on public.dre_entry_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own DRE entry items" on public.dre_entry_items
  for delete using (auth.uid() = user_id);

create policy "Users can view their own product subscriptions" on public.product_subscriptions
  for select using (auth.uid() = user_id);
create policy "Users can create their own product subscriptions" on public.product_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own product subscriptions" on public.product_subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own product subscriptions" on public.product_subscriptions
  for delete using (auth.uid() = user_id);

create policy "Admins can manage DRE categories" on public.dre_categories
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins can manage DRE subcategories" on public.dre_subcategories
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins can manage DRE models" on public.dre_models
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins can manage DRE model lines" on public.dre_model_lines
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins can manage DRE entries" on public.dre_entries
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins can manage DRE entry items" on public.dre_entry_items
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins can manage product subscriptions" on public.product_subscriptions
  for all using (public.is_admin()) with check (public.is_admin());
