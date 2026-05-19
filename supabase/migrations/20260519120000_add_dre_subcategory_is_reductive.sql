alter table public.dre_subcategories
add column if not exists is_reductive boolean not null default false;

comment on column public.dre_subcategories.is_reductive is
  'When true, entries linked to this subcategory use the inverse financial behavior of the parent category in analytical calculations only.';
