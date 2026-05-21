-- Performance indexes for Gestor DRE read paths.
-- These match Dashboard, DRE Analysis, entry loading, model loading and delete/deactivate checks.

create index if not exists dre_entries_user_model_status_competence_idx
  on public.dre_entries(user_id, model_id, status, competence);

create index if not exists dre_entries_user_status_competence_idx
  on public.dre_entries(user_id, status, competence);

create index if not exists dre_entry_items_user_entry_display_idx
  on public.dre_entry_items(user_id, dre_entry_id, display_order);

create index if not exists dre_entry_items_user_category_idx
  on public.dre_entry_items(user_id, category_id);

create index if not exists dre_entry_items_user_subcategory_idx
  on public.dre_entry_items(user_id, subcategory_id);

create index if not exists dre_model_lines_user_model_display_idx
  on public.dre_model_lines(user_id, model_id, display_order);

create index if not exists dre_model_lines_user_model_financial_idx
  on public.dre_model_lines(user_id, model_id, financial_type)
  where line_type = 'sum';

create index if not exists dre_model_lines_user_category_idx
  on public.dre_model_lines(user_id, category_id);

create index if not exists dre_model_lines_user_subcategory_idx
  on public.dre_model_lines(user_id, subcategory_id);

create index if not exists dre_categories_user_display_name_idx
  on public.dre_categories(user_id, display_order, name);

create index if not exists dre_subcategories_user_display_name_idx
  on public.dre_subcategories(user_id, display_order, name);
