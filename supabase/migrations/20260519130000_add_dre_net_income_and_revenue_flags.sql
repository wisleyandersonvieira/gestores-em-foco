alter table public.dre_model_lines
add column if not exists is_net_income boolean not null default false;

alter table public.dre_categories
add column if not exists is_revenue boolean not null default false;

update public.dre_categories
set is_revenue = true
where type = 'credit'
  and is_revenue = false;

alter table public.dre_model_lines
drop constraint if exists dre_model_lines_net_income_sum_only;

alter table public.dre_model_lines
add constraint dre_model_lines_net_income_sum_only
check (is_net_income = false or line_type::text = 'sum');

create unique index if not exists dre_model_lines_one_net_income_per_model_idx
on public.dre_model_lines(model_id)
where is_net_income = true;

alter table public.dre_categories
drop constraint if exists dre_categories_revenue_credit_only;

alter table public.dre_categories
add constraint dre_categories_revenue_credit_only
check (is_revenue = false or type::text = 'credit');

comment on column public.dre_model_lines.is_net_income is
  'Marks the single sum line in a DRE model that represents net income for analytical calculations.';

comment on column public.dre_categories.is_revenue is
  'Marks credit categories that compose revenue/faturamento for dashboards, margins and analysis.';
