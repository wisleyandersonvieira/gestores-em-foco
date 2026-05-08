alter type public.dre_model_line_type add value if not exists 'sum';

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
