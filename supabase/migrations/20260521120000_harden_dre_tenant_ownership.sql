-- Hardens Gestor DRE tenant isolation at the database level.
-- Run the diagnostic function before applying in production if you want a full
-- list of offending rows:
--   select * from public.find_dre_ownership_violations();

create or replace function public.find_dre_ownership_violations()
returns table (
  table_name text,
  record_id uuid,
  relationship text,
  record_user_id uuid,
  referenced_id uuid,
  referenced_user_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select
    'dre_subcategories'::text,
    child.id,
    'category_id'::text,
    child.user_id,
    child.category_id,
    parent.user_id
  from public.dre_subcategories child
  left join public.dre_categories parent on parent.id = child.category_id
  where parent.id is null or parent.user_id <> child.user_id

  union all
  select
    'dre_model_lines',
    child.id,
    'model_id',
    child.user_id,
    child.model_id,
    parent.user_id
  from public.dre_model_lines child
  left join public.dre_models parent on parent.id = child.model_id
  where parent.id is null or parent.user_id <> child.user_id

  union all
  select
    'dre_model_lines',
    child.id,
    'category_id',
    child.user_id,
    child.category_id,
    parent.user_id
  from public.dre_model_lines child
  left join public.dre_categories parent on parent.id = child.category_id
  where child.category_id is not null
    and (parent.id is null or parent.user_id <> child.user_id)

  union all
  select
    'dre_model_lines',
    child.id,
    'subcategory_id',
    child.user_id,
    child.subcategory_id,
    parent.user_id
  from public.dre_model_lines child
  left join public.dre_subcategories parent on parent.id = child.subcategory_id
  where child.subcategory_id is not null
    and (parent.id is null or parent.user_id <> child.user_id)

  union all
  select
    'dre_model_lines',
    child.id,
    'parent_category_id',
    child.user_id,
    child.parent_category_id,
    parent.user_id
  from public.dre_model_lines child
  left join public.dre_categories parent on parent.id = child.parent_category_id
  where child.parent_category_id is not null
    and (parent.id is null or parent.user_id <> child.user_id)

  union all
  select
    'dre_entries',
    child.id,
    'model_id',
    child.user_id,
    child.model_id,
    parent.user_id
  from public.dre_entries child
  left join public.dre_models parent on parent.id = child.model_id
  where parent.id is null or parent.user_id <> child.user_id

  union all
  select
    'dre_entry_items',
    child.id,
    'dre_entry_id',
    child.user_id,
    child.dre_entry_id,
    parent.user_id
  from public.dre_entry_items child
  left join public.dre_entries parent on parent.id = child.dre_entry_id
  where parent.id is null or parent.user_id <> child.user_id

  union all
  select
    'dre_entry_items',
    child.id,
    'category_id',
    child.user_id,
    child.category_id,
    parent.user_id
  from public.dre_entry_items child
  left join public.dre_categories parent on parent.id = child.category_id
  where child.category_id is not null
    and (parent.id is null or parent.user_id <> child.user_id)

  union all
  select
    'dre_entry_items',
    child.id,
    'subcategory_id',
    child.user_id,
    child.subcategory_id,
    parent.user_id
  from public.dre_entry_items child
  left join public.dre_subcategories parent on parent.id = child.subcategory_id
  where child.subcategory_id is not null
    and (parent.id is null or parent.user_id <> child.user_id);
$$;

revoke all on function public.find_dre_ownership_violations() from public;

do $$
declare
  violation_count integer;
begin
  select count(*) into violation_count
  from public.find_dre_ownership_violations();

  if violation_count > 0 then
    raise exception
      'DRE ownership hardening blocked: % inconsistent relationship(s) found. Run select * from public.find_dre_ownership_violations(); and fix records before applying constraints.',
      violation_count;
  end if;
end $$;

alter table public.dre_categories
  add constraint dre_categories_id_user_id_unique unique (id, user_id);

alter table public.dre_subcategories
  add constraint dre_subcategories_id_user_id_unique unique (id, user_id);

alter table public.dre_models
  add constraint dre_models_id_user_id_unique unique (id, user_id);

alter table public.dre_entries
  add constraint dre_entries_id_user_id_unique unique (id, user_id);

alter table public.dre_subcategories
  add constraint dre_subcategories_category_same_user
  foreign key (category_id, user_id)
  references public.dre_categories(id, user_id)
  on delete restrict;

alter table public.dre_model_lines
  add constraint dre_model_lines_model_same_user
  foreign key (model_id, user_id)
  references public.dre_models(id, user_id)
  on delete cascade,
  add constraint dre_model_lines_category_same_user
  foreign key (category_id, user_id)
  references public.dre_categories(id, user_id)
  on delete restrict,
  add constraint dre_model_lines_subcategory_same_user
  foreign key (subcategory_id, user_id)
  references public.dre_subcategories(id, user_id)
  on delete restrict,
  add constraint dre_model_lines_parent_category_same_user
  foreign key (parent_category_id, user_id)
  references public.dre_categories(id, user_id)
  on delete restrict;

alter table public.dre_entries
  add constraint dre_entries_model_same_user
  foreign key (model_id, user_id)
  references public.dre_models(id, user_id)
  on delete restrict;

alter table public.dre_entry_items
  add constraint dre_entry_items_entry_same_user
  foreign key (dre_entry_id, user_id)
  references public.dre_entries(id, user_id)
  on delete cascade,
  add constraint dre_entry_items_category_same_user
  foreign key (category_id, user_id)
  references public.dre_categories(id, user_id)
  on delete set null (category_id),
  add constraint dre_entry_items_subcategory_same_user
  foreign key (subcategory_id, user_id)
  references public.dre_subcategories(id, user_id)
  on delete set null (subcategory_id);

alter table public.dre_categories enable row level security;
alter table public.dre_subcategories enable row level security;
alter table public.dre_models enable row level security;
alter table public.dre_model_lines enable row level security;
alter table public.dre_entries enable row level security;
alter table public.dre_entry_items enable row level security;

drop policy if exists "Users can view their own DRE categories" on public.dre_categories;
drop policy if exists "Users can create their own DRE categories" on public.dre_categories;
drop policy if exists "Users can update their own DRE categories" on public.dre_categories;
drop policy if exists "Users can delete their own DRE categories" on public.dre_categories;

drop policy if exists "Users can view their own DRE subcategories" on public.dre_subcategories;
drop policy if exists "Users can create their own DRE subcategories" on public.dre_subcategories;
drop policy if exists "Users can update their own DRE subcategories" on public.dre_subcategories;
drop policy if exists "Users can delete their own DRE subcategories" on public.dre_subcategories;

drop policy if exists "Users can view their own DRE models" on public.dre_models;
drop policy if exists "Users can create their own DRE models" on public.dre_models;
drop policy if exists "Users can update their own DRE models" on public.dre_models;
drop policy if exists "Users can delete their own DRE models" on public.dre_models;

drop policy if exists "Users can view their own DRE model lines" on public.dre_model_lines;
drop policy if exists "Users can create their own DRE model lines" on public.dre_model_lines;
drop policy if exists "Users can update their own DRE model lines" on public.dre_model_lines;
drop policy if exists "Users can delete their own DRE model lines" on public.dre_model_lines;

drop policy if exists "Users can view their own DRE entries" on public.dre_entries;
drop policy if exists "Users can create their own DRE entries" on public.dre_entries;
drop policy if exists "Users can update their own DRE entries" on public.dre_entries;
drop policy if exists "Users can delete their own DRE entries" on public.dre_entries;

drop policy if exists "Users can view their own DRE entry items" on public.dre_entry_items;
drop policy if exists "Users can create their own DRE entry items" on public.dre_entry_items;
drop policy if exists "Users can update their own DRE entry items" on public.dre_entry_items;
drop policy if exists "Users can delete their own DRE entry items" on public.dre_entry_items;

create policy "Users can view their own DRE categories" on public.dre_categories
  for select to authenticated using (auth.uid() = user_id);
create policy "Users can create their own DRE categories" on public.dre_categories
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update their own DRE categories" on public.dre_categories
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own DRE categories" on public.dre_categories
  for delete to authenticated using (auth.uid() = user_id);

create policy "Users can view their own DRE subcategories" on public.dre_subcategories
  for select to authenticated using (auth.uid() = user_id);
create policy "Users can create their own DRE subcategories" on public.dre_subcategories
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update their own DRE subcategories" on public.dre_subcategories
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own DRE subcategories" on public.dre_subcategories
  for delete to authenticated using (auth.uid() = user_id);

create policy "Users can view their own DRE models" on public.dre_models
  for select to authenticated using (auth.uid() = user_id);
create policy "Users can create their own DRE models" on public.dre_models
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update their own DRE models" on public.dre_models
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own DRE models" on public.dre_models
  for delete to authenticated using (auth.uid() = user_id);

create policy "Users can view their own DRE model lines" on public.dre_model_lines
  for select to authenticated using (auth.uid() = user_id);
create policy "Users can create their own DRE model lines" on public.dre_model_lines
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update their own DRE model lines" on public.dre_model_lines
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own DRE model lines" on public.dre_model_lines
  for delete to authenticated using (auth.uid() = user_id);

create policy "Users can view their own DRE entries" on public.dre_entries
  for select to authenticated using (auth.uid() = user_id);
create policy "Users can create their own DRE entries" on public.dre_entries
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update their own DRE entries" on public.dre_entries
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own DRE entries" on public.dre_entries
  for delete to authenticated using (auth.uid() = user_id);

create policy "Users can view their own DRE entry items" on public.dre_entry_items
  for select to authenticated using (auth.uid() = user_id);
create policy "Users can create their own DRE entry items" on public.dre_entry_items
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update their own DRE entry items" on public.dre_entry_items
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own DRE entry items" on public.dre_entry_items
  for delete to authenticated using (auth.uid() = user_id);
