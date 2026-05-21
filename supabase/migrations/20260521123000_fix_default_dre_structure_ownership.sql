create or replace function public.default_dre_category_id(
  p_user_id uuid,
  p_name text,
  p_type public.dre_category_type,
  p_display_order integer,
  p_is_revenue boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_user_id is null then
    raise exception 'user_id is required';
  end if;

  select id
  into v_id
  from public.dre_categories
  where user_id = p_user_id
    and name = p_name
  order by created_at
  limit 1;

  if v_id is not null then
    update public.dre_categories
    set
      type = p_type,
      status = 'active',
      display_order = p_display_order,
      is_revenue = p_is_revenue
    where id = v_id
      and user_id = p_user_id;
    return v_id;
  end if;

  insert into public.dre_categories (user_id, name, type, status, display_order, is_revenue)
  values (p_user_id, p_name, p_type, 'active', p_display_order, p_is_revenue)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.default_dre_subcategory_id(
  p_user_id uuid,
  p_category_id uuid,
  p_name text,
  p_display_order integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_category_user_id uuid;
begin
  if p_user_id is null then
    raise exception 'user_id is required';
  end if;

  select user_id
  into v_category_user_id
  from public.dre_categories
  where id = p_category_id;

  if v_category_user_id is distinct from p_user_id then
    raise exception 'default_dre_subcategory_owner_mismatch: category_id % does not belong to user_id %', p_category_id, p_user_id;
  end if;

  select id
  into v_id
  from public.dre_subcategories
  where user_id = p_user_id
    and category_id = p_category_id
    and name = p_name
  order by created_at
  limit 1;

  if v_id is not null then
    if p_display_order is not null then
      update public.dre_subcategories
      set status = 'active', display_order = p_display_order
      where id = v_id
        and user_id = p_user_id;
    end if;
    return v_id;
  end if;

  insert into public.dre_subcategories (user_id, category_id, name, status, display_order)
  values (p_user_id, p_category_id, p_name, 'active', coalesce(p_display_order, 0))
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.default_dre_subcategory_id(
  p_user_id uuid,
  p_category_id uuid,
  p_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.default_dre_subcategory_id(p_user_id, p_category_id, p_name, null);
end;
$$;

create or replace function public.create_default_dre_structure_for_user(p_user_id uuid)
returns table(created boolean, model_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_model_id uuid;
  v_had_model boolean := false;
  v_inserted_lines integer := 0;
  v_receita_bruta_id uuid;
  v_deducoes_id uuid;
  v_custos_id uuid;
  v_pessoal_id uuid;
  v_administrativas_id uuid;
  v_marketing_id uuid;
  v_receitas_financeiras_id uuid;
  v_despesas_financeiras_id uuid;
  v_impostos_id uuid;
begin
  if p_user_id is null then
    raise exception 'user_id is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  v_receita_bruta_id := public.default_dre_category_id(p_user_id, 'Receita Bruta', 'credit', 1, true);
  v_deducoes_id := public.default_dre_category_id(p_user_id, 'Deduções da Receita', 'debit', 2, false);
  v_custos_id := public.default_dre_category_id(p_user_id, 'Custos Variáveis / CMV', 'debit', 3, false);
  v_pessoal_id := public.default_dre_category_id(p_user_id, 'Despesas com Pessoal', 'debit', 4, false);
  v_administrativas_id := public.default_dre_category_id(p_user_id, 'Despesas Administrativas', 'debit', 5, false);
  v_marketing_id := public.default_dre_category_id(p_user_id, 'Despesas Comerciais e Marketing', 'debit', 6, false);
  v_receitas_financeiras_id := public.default_dre_category_id(p_user_id, 'Receitas Financeiras', 'credit', 7, true);
  v_despesas_financeiras_id := public.default_dre_category_id(p_user_id, 'Despesas Financeiras', 'debit', 8, false);
  v_impostos_id := public.default_dre_category_id(p_user_id, 'Impostos sobre Resultado', 'debit', 9, false);

  perform public.default_dre_subcategory_id(p_user_id, v_receita_bruta_id, 'Vendas de Produtos', 1);
  perform public.default_dre_subcategory_id(p_user_id, v_receita_bruta_id, 'Prestação de Serviços', 2);
  perform public.default_dre_subcategory_id(p_user_id, v_receita_bruta_id, 'Receitas Recorrentes', 3);
  perform public.default_dre_subcategory_id(p_user_id, v_receita_bruta_id, 'Outras Receitas Operacionais', 4);
  perform public.default_dre_subcategory_id(p_user_id, v_deducoes_id, 'Devoluções', 1);
  perform public.default_dre_subcategory_id(p_user_id, v_deducoes_id, 'Descontos Concedidos', 2);
  perform public.default_dre_subcategory_id(p_user_id, v_deducoes_id, 'Taxas de Cartão', 3);
  perform public.default_dre_subcategory_id(p_user_id, v_deducoes_id, 'Comissões sobre Vendas', 4);
  perform public.default_dre_subcategory_id(p_user_id, v_custos_id, 'Mercadorias', 1);
  perform public.default_dre_subcategory_id(p_user_id, v_custos_id, 'Matéria-prima', 2);
  perform public.default_dre_subcategory_id(p_user_id, v_custos_id, 'Embalagens', 3);
  perform public.default_dre_subcategory_id(p_user_id, v_custos_id, 'Fretes sobre Compra', 4);
  perform public.default_dre_subcategory_id(p_user_id, v_custos_id, 'Mão de Obra Direta', 5);
  perform public.default_dre_subcategory_id(p_user_id, v_custos_id, 'Serviços Terceirizados Diretos', 6);
  perform public.default_dre_subcategory_id(p_user_id, v_pessoal_id, 'Salários', 1);
  perform public.default_dre_subcategory_id(p_user_id, v_pessoal_id, 'Pró-labore', 2);
  perform public.default_dre_subcategory_id(p_user_id, v_pessoal_id, 'Encargos Trabalhistas', 3);
  perform public.default_dre_subcategory_id(p_user_id, v_pessoal_id, 'Benefícios', 4);
  perform public.default_dre_subcategory_id(p_user_id, v_administrativas_id, 'Aluguel', 1);
  perform public.default_dre_subcategory_id(p_user_id, v_administrativas_id, 'Condomínio', 2);
  perform public.default_dre_subcategory_id(p_user_id, v_administrativas_id, 'Energia', 3);
  perform public.default_dre_subcategory_id(p_user_id, v_administrativas_id, 'Água', 4);
  perform public.default_dre_subcategory_id(p_user_id, v_administrativas_id, 'Internet e Telefonia', 5);
  perform public.default_dre_subcategory_id(p_user_id, v_administrativas_id, 'Material de Escritório', 6);
  perform public.default_dre_subcategory_id(p_user_id, v_administrativas_id, 'Contabilidade', 7);
  perform public.default_dre_subcategory_id(p_user_id, v_administrativas_id, 'Jurídico', 8);
  perform public.default_dre_subcategory_id(p_user_id, v_administrativas_id, 'Sistemas e Softwares', 9);
  perform public.default_dre_subcategory_id(p_user_id, v_administrativas_id, 'Manutenção', 10);
  perform public.default_dre_subcategory_id(p_user_id, v_marketing_id, 'Tráfego Pago', 1);
  perform public.default_dre_subcategory_id(p_user_id, v_marketing_id, 'Agência de Marketing', 2);
  perform public.default_dre_subcategory_id(p_user_id, v_marketing_id, 'Brindes', 3);
  perform public.default_dre_subcategory_id(p_user_id, v_receitas_financeiras_id, 'Rendimentos de Aplicações', 1);
  perform public.default_dre_subcategory_id(p_user_id, v_receitas_financeiras_id, 'Juros Recebidos', 2);
  perform public.default_dre_subcategory_id(p_user_id, v_receitas_financeiras_id, 'Descontos Obtidos', 3);
  perform public.default_dre_subcategory_id(p_user_id, v_despesas_financeiras_id, 'Juros', 1);
  perform public.default_dre_subcategory_id(p_user_id, v_despesas_financeiras_id, 'Multas', 2);
  perform public.default_dre_subcategory_id(p_user_id, v_despesas_financeiras_id, 'Tarifas Bancárias', 3);
  perform public.default_dre_subcategory_id(p_user_id, v_despesas_financeiras_id, 'Taxas de Maquininha', 4);
  perform public.default_dre_subcategory_id(p_user_id, v_impostos_id, 'Simples Nacional', 1);
  perform public.default_dre_subcategory_id(p_user_id, v_impostos_id, 'Outros Tributos', 2);

  select id
  into v_model_id
  from public.dre_models
  where user_id = p_user_id
    and name = 'DRE Gerencial Padrão'
  order by created_at
  limit 1;

  v_had_model := v_model_id is not null;

  if v_model_id is null then
    insert into public.dre_models (user_id, name, description, status)
    values (
      p_user_id,
      'DRE Gerencial Padrão',
      'Modelo padrão para acompanhar receitas, deduções, custos, despesas e resultado líquido da empresa.',
      'active'
    )
    returning id into v_model_id;
  else
    update public.dre_models
    set status = 'active'
    where id = v_model_id
      and user_id = p_user_id;
  end if;

  insert into public.dre_model_lines (
    user_id,
    model_id,
    category_id,
    subcategory_id,
    line_type,
    parent_category_id,
    sum_label,
    display_order,
    is_net_income,
    financial_type
  )
  select
    p_user_id,
    v_model_id,
    line.category_id,
    line.subcategory_id,
    line.line_type::public.dre_model_line_type,
    line.parent_category_id,
    line.sum_label,
    line.display_order,
    line.is_net_income,
    line.financial_type::public.dre_model_line_financial_type
  from (
    values
      (v_receita_bruta_id, null::uuid, 'category', null::uuid, null::text, 1000, false, null::text),
      (v_receita_bruta_id, public.default_dre_subcategory_id(p_user_id, v_receita_bruta_id, 'Vendas de Produtos'), 'subcategory', v_receita_bruta_id, null, 1010, false, null),
      (v_receita_bruta_id, public.default_dre_subcategory_id(p_user_id, v_receita_bruta_id, 'Prestação de Serviços'), 'subcategory', v_receita_bruta_id, null, 1020, false, null),
      (v_receita_bruta_id, public.default_dre_subcategory_id(p_user_id, v_receita_bruta_id, 'Receitas Recorrentes'), 'subcategory', v_receita_bruta_id, null, 1030, false, null),
      (v_receita_bruta_id, public.default_dre_subcategory_id(p_user_id, v_receita_bruta_id, 'Outras Receitas Operacionais'), 'subcategory', v_receita_bruta_id, null, 1040, false, null),
      (v_deducoes_id, null::uuid, 'category', null::uuid, null::text, 2000, false, null),
      (v_deducoes_id, public.default_dre_subcategory_id(p_user_id, v_deducoes_id, 'Devoluções'), 'subcategory', v_deducoes_id, null, 2010, false, null),
      (v_deducoes_id, public.default_dre_subcategory_id(p_user_id, v_deducoes_id, 'Descontos Concedidos'), 'subcategory', v_deducoes_id, null, 2020, false, null),
      (v_deducoes_id, public.default_dre_subcategory_id(p_user_id, v_deducoes_id, 'Taxas de Cartão'), 'subcategory', v_deducoes_id, null, 2030, false, null),
      (v_deducoes_id, public.default_dre_subcategory_id(p_user_id, v_deducoes_id, 'Comissões sobre Vendas'), 'subcategory', v_deducoes_id, null, 2040, false, null),
      (null::uuid, null::uuid, 'sum', null::uuid, 'Receita Líquida', 3000, false, 'revenue'),
      (v_custos_id, null::uuid, 'category', null::uuid, null::text, 4000, false, null),
      (v_custos_id, public.default_dre_subcategory_id(p_user_id, v_custos_id, 'Mercadorias'), 'subcategory', v_custos_id, null, 4010, false, null),
      (v_custos_id, public.default_dre_subcategory_id(p_user_id, v_custos_id, 'Matéria-prima'), 'subcategory', v_custos_id, null, 4020, false, null),
      (v_custos_id, public.default_dre_subcategory_id(p_user_id, v_custos_id, 'Embalagens'), 'subcategory', v_custos_id, null, 4030, false, null),
      (v_custos_id, public.default_dre_subcategory_id(p_user_id, v_custos_id, 'Fretes sobre Compra'), 'subcategory', v_custos_id, null, 4040, false, null),
      (v_custos_id, public.default_dre_subcategory_id(p_user_id, v_custos_id, 'Mão de Obra Direta'), 'subcategory', v_custos_id, null, 4050, false, null),
      (v_custos_id, public.default_dre_subcategory_id(p_user_id, v_custos_id, 'Serviços Terceirizados Diretos'), 'subcategory', v_custos_id, null, 4060, false, null),
      (null::uuid, null::uuid, 'sum', null::uuid, 'Lucro Bruto', 5000, false, 'gross_profit'),
      (v_pessoal_id, null::uuid, 'category', null::uuid, null::text, 6000, false, null),
      (v_pessoal_id, public.default_dre_subcategory_id(p_user_id, v_pessoal_id, 'Salários'), 'subcategory', v_pessoal_id, null, 6010, false, null),
      (v_pessoal_id, public.default_dre_subcategory_id(p_user_id, v_pessoal_id, 'Pró-labore'), 'subcategory', v_pessoal_id, null, 6020, false, null),
      (v_pessoal_id, public.default_dre_subcategory_id(p_user_id, v_pessoal_id, 'Encargos Trabalhistas'), 'subcategory', v_pessoal_id, null, 6030, false, null),
      (v_pessoal_id, public.default_dre_subcategory_id(p_user_id, v_pessoal_id, 'Benefícios'), 'subcategory', v_pessoal_id, null, 6040, false, null),
      (v_administrativas_id, null::uuid, 'category', null::uuid, null::text, 7000, false, null),
      (v_administrativas_id, public.default_dre_subcategory_id(p_user_id, v_administrativas_id, 'Aluguel'), 'subcategory', v_administrativas_id, null, 7010, false, null),
      (v_administrativas_id, public.default_dre_subcategory_id(p_user_id, v_administrativas_id, 'Condomínio'), 'subcategory', v_administrativas_id, null, 7020, false, null),
      (v_administrativas_id, public.default_dre_subcategory_id(p_user_id, v_administrativas_id, 'Energia'), 'subcategory', v_administrativas_id, null, 7030, false, null),
      (v_administrativas_id, public.default_dre_subcategory_id(p_user_id, v_administrativas_id, 'Água'), 'subcategory', v_administrativas_id, null, 7040, false, null),
      (v_administrativas_id, public.default_dre_subcategory_id(p_user_id, v_administrativas_id, 'Internet e Telefonia'), 'subcategory', v_administrativas_id, null, 7050, false, null),
      (v_administrativas_id, public.default_dre_subcategory_id(p_user_id, v_administrativas_id, 'Material de Escritório'), 'subcategory', v_administrativas_id, null, 7060, false, null),
      (v_administrativas_id, public.default_dre_subcategory_id(p_user_id, v_administrativas_id, 'Contabilidade'), 'subcategory', v_administrativas_id, null, 7070, false, null),
      (v_administrativas_id, public.default_dre_subcategory_id(p_user_id, v_administrativas_id, 'Jurídico'), 'subcategory', v_administrativas_id, null, 7080, false, null),
      (v_administrativas_id, public.default_dre_subcategory_id(p_user_id, v_administrativas_id, 'Sistemas e Softwares'), 'subcategory', v_administrativas_id, null, 7090, false, null),
      (v_administrativas_id, public.default_dre_subcategory_id(p_user_id, v_administrativas_id, 'Manutenção'), 'subcategory', v_administrativas_id, null, 7100, false, null),
      (v_marketing_id, null::uuid, 'category', null::uuid, null::text, 8000, false, null),
      (v_marketing_id, public.default_dre_subcategory_id(p_user_id, v_marketing_id, 'Tráfego Pago'), 'subcategory', v_marketing_id, null, 8010, false, null),
      (v_marketing_id, public.default_dre_subcategory_id(p_user_id, v_marketing_id, 'Agência de Marketing'), 'subcategory', v_marketing_id, null, 8020, false, null),
      (v_marketing_id, public.default_dre_subcategory_id(p_user_id, v_marketing_id, 'Brindes'), 'subcategory', v_marketing_id, null, 8030, false, null),
      (null::uuid, null::uuid, 'sum', null::uuid, 'Resultado Operacional', 9000, false, 'operating_result'),
      (v_receitas_financeiras_id, null::uuid, 'category', null::uuid, null::text, 10000, false, null),
      (v_receitas_financeiras_id, public.default_dre_subcategory_id(p_user_id, v_receitas_financeiras_id, 'Rendimentos de Aplicações'), 'subcategory', v_receitas_financeiras_id, null, 10010, false, null),
      (v_receitas_financeiras_id, public.default_dre_subcategory_id(p_user_id, v_receitas_financeiras_id, 'Juros Recebidos'), 'subcategory', v_receitas_financeiras_id, null, 10020, false, null),
      (v_receitas_financeiras_id, public.default_dre_subcategory_id(p_user_id, v_receitas_financeiras_id, 'Descontos Obtidos'), 'subcategory', v_receitas_financeiras_id, null, 10030, false, null),
      (v_despesas_financeiras_id, null::uuid, 'category', null::uuid, null::text, 11000, false, null),
      (v_despesas_financeiras_id, public.default_dre_subcategory_id(p_user_id, v_despesas_financeiras_id, 'Juros'), 'subcategory', v_despesas_financeiras_id, null, 11010, false, null),
      (v_despesas_financeiras_id, public.default_dre_subcategory_id(p_user_id, v_despesas_financeiras_id, 'Multas'), 'subcategory', v_despesas_financeiras_id, null, 11020, false, null),
      (v_despesas_financeiras_id, public.default_dre_subcategory_id(p_user_id, v_despesas_financeiras_id, 'Tarifas Bancárias'), 'subcategory', v_despesas_financeiras_id, null, 11030, false, null),
      (v_despesas_financeiras_id, public.default_dre_subcategory_id(p_user_id, v_despesas_financeiras_id, 'Taxas de Maquininha'), 'subcategory', v_despesas_financeiras_id, null, 11040, false, null),
      (null::uuid, null::uuid, 'sum', null::uuid, 'Resultado Antes dos Impostos', 12000, false, 'pre_tax_profit'),
      (v_impostos_id, null::uuid, 'category', null::uuid, null::text, 13000, false, null),
      (v_impostos_id, public.default_dre_subcategory_id(p_user_id, v_impostos_id, 'Simples Nacional'), 'subcategory', v_impostos_id, null, 13010, false, null),
      (v_impostos_id, public.default_dre_subcategory_id(p_user_id, v_impostos_id, 'Outros Tributos'), 'subcategory', v_impostos_id, null, 13020, false, null),
      (null::uuid, null::uuid, 'sum', null::uuid, 'Lucro Líquido', 14000, true, 'net_profit')
  ) as line(category_id, subcategory_id, line_type, parent_category_id, sum_label, display_order, is_net_income, financial_type)
  where not exists (
    select 1
    from public.dre_model_lines existing
    where existing.user_id = p_user_id
      and existing.model_id = v_model_id
      and existing.display_order = line.display_order
  )
  and (
    line.financial_type is null
    or not exists (
      select 1
      from public.dre_model_lines existing_financial
      where existing_financial.user_id = p_user_id
        and existing_financial.model_id = v_model_id
        and existing_financial.financial_type = line.financial_type::public.dre_model_line_financial_type
    )
  );

  get diagnostics v_inserted_lines = row_count;

  created := (not v_had_model) or v_inserted_lines > 0;
  model_id := v_model_id;
  return next;
exception
  when foreign_key_violation or check_violation or unique_violation then
    raise exception 'default_dre_structure_failed for user_id %, sqlstate %, detail %', p_user_id, sqlstate, sqlerrm;
end;
$$;

create or replace function public.create_default_dre_structure()
returns table(created boolean, model_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authenticated user required';
  end if;

  return query
  select *
  from public.create_default_dre_structure_for_user(v_user_id);
end;
$$;

create or replace function public.create_default_dre_categories(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_user_id <> auth.uid() then
    raise exception 'forbidden';
  end if;

  perform public.create_default_dre_structure_for_user(p_user_id);
end;
$$;

revoke all on function public.default_dre_category_id(uuid, text, public.dre_category_type, integer, boolean) from public;
revoke all on function public.default_dre_subcategory_id(uuid, uuid, text, integer) from public;
revoke all on function public.default_dre_subcategory_id(uuid, uuid, text) from public;
revoke all on function public.create_default_dre_structure_for_user(uuid) from public;
revoke all on function public.create_default_dre_structure() from public;
revoke all on function public.create_default_dre_categories(uuid) from public;

grant execute on function public.create_default_dre_structure() to authenticated;
grant execute on function public.create_default_dre_categories(uuid) to authenticated;
