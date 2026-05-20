do $$
begin
  create type public.dre_model_line_financial_type as enum (
    'revenue',
    'gross_profit',
    'operating_result',
    'pre_tax_profit',
    'net_profit'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.dre_model_lines
add column if not exists financial_type public.dre_model_line_financial_type;

update public.dre_model_lines
set financial_type = 'net_profit'
where line_type::text = 'sum'
  and is_net_income = true
  and financial_type is null;

alter table public.dre_model_lines
drop constraint if exists dre_model_lines_financial_type_sum_only;

alter table public.dre_model_lines
add constraint dre_model_lines_financial_type_sum_only
check (financial_type is null or line_type::text = 'sum');

drop index if exists public.dre_model_lines_one_financial_type_per_model_idx;

create unique index dre_model_lines_one_financial_type_per_model_idx
on public.dre_model_lines(model_id, financial_type)
where financial_type is not null;

comment on column public.dre_model_lines.financial_type is
  'Optional financial concept represented by a sum line in a DRE model. Each value can be used once per model.';
