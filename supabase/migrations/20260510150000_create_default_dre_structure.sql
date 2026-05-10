-- Creates the initial professional DRE setup for first-time users.

create or replace function public.default_dre_subcategory_id(p_user_id uuid, p_category_id uuid, p_name text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.dre_subcategories
  where user_id = p_user_id
    and category_id = p_category_id
    and name = p_name
  limit 1;
$$;

revoke all on function public.default_dre_subcategory_id(uuid, uuid, text) from public;

create or replace function public.create_default_dre_structure()
returns table(created boolean, model_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_model_id uuid;
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
  if v_user_id is null then
    raise exception 'authenticated user required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select id
  into v_model_id
  from public.dre_models
  where user_id = v_user_id
  order by created_at
  limit 1;

  if v_model_id is not null or exists (select 1 from public.dre_categories where user_id = v_user_id limit 1) then
    created := false;
    model_id := v_model_id;
    return next;
    return;
  end if;

  insert into public.dre_categories (user_id, name, type, status, display_order)
  values (v_user_id, 'Receita Bruta', 'credit', 'active', 1)
  returning id into v_receita_bruta_id;

  insert into public.dre_categories (user_id, name, type, status, display_order)
  values (v_user_id, 'Deduções da Receita', 'debit', 'active', 2)
  returning id into v_deducoes_id;

  insert into public.dre_categories (user_id, name, type, status, display_order)
  values (v_user_id, 'Custos Variáveis / CMV', 'debit', 'active', 3)
  returning id into v_custos_id;

  insert into public.dre_categories (user_id, name, type, status, display_order)
  values (v_user_id, 'Despesas com Pessoal', 'debit', 'active', 4)
  returning id into v_pessoal_id;

  insert into public.dre_categories (user_id, name, type, status, display_order)
  values (v_user_id, 'Despesas Administrativas', 'debit', 'active', 5)
  returning id into v_administrativas_id;

  insert into public.dre_categories (user_id, name, type, status, display_order)
  values (v_user_id, 'Despesas Comerciais e Marketing', 'debit', 'active', 6)
  returning id into v_marketing_id;

  insert into public.dre_categories (user_id, name, type, status, display_order)
  values (v_user_id, 'Receitas Financeiras', 'credit', 'active', 7)
  returning id into v_receitas_financeiras_id;

  insert into public.dre_categories (user_id, name, type, status, display_order)
  values (v_user_id, 'Despesas Financeiras', 'debit', 'active', 8)
  returning id into v_despesas_financeiras_id;

  insert into public.dre_categories (user_id, name, type, status, display_order)
  values (v_user_id, 'Impostos sobre Resultado', 'debit', 'active', 9)
  returning id into v_impostos_id;

  insert into public.dre_subcategories (user_id, category_id, name, status, display_order)
  values
    (v_user_id, v_receita_bruta_id, 'Vendas de Produtos', 'active', 1),
    (v_user_id, v_receita_bruta_id, 'Prestação de Serviços', 'active', 2),
    (v_user_id, v_receita_bruta_id, 'Receitas Recorrentes', 'active', 3),
    (v_user_id, v_receita_bruta_id, 'Outras Receitas Operacionais', 'active', 4),
    (v_user_id, v_deducoes_id, 'Devoluções', 'active', 1),
    (v_user_id, v_deducoes_id, 'Descontos Concedidos', 'active', 2),
    (v_user_id, v_deducoes_id, 'Taxas de Cartão', 'active', 3),
    (v_user_id, v_deducoes_id, 'Comissões sobre Vendas', 'active', 4),
    (v_user_id, v_custos_id, 'Mercadorias', 'active', 1),
    (v_user_id, v_custos_id, 'Matéria-prima', 'active', 2),
    (v_user_id, v_custos_id, 'Embalagens', 'active', 3),
    (v_user_id, v_custos_id, 'Fretes sobre Compra', 'active', 4),
    (v_user_id, v_custos_id, 'Mão de Obra Direta', 'active', 5),
    (v_user_id, v_custos_id, 'Serviços Terceirizados Diretos', 'active', 6),
    (v_user_id, v_pessoal_id, 'Salários', 'active', 1),
    (v_user_id, v_pessoal_id, 'Pró-labore', 'active', 2),
    (v_user_id, v_pessoal_id, 'Encargos Trabalhistas', 'active', 3),
    (v_user_id, v_pessoal_id, 'Benefícios', 'active', 4),
    (v_user_id, v_administrativas_id, 'Aluguel', 'active', 1),
    (v_user_id, v_administrativas_id, 'Condomínio', 'active', 2),
    (v_user_id, v_administrativas_id, 'Energia', 'active', 3),
    (v_user_id, v_administrativas_id, 'Água', 'active', 4),
    (v_user_id, v_administrativas_id, 'Internet e Telefonia', 'active', 5),
    (v_user_id, v_administrativas_id, 'Material de Escritório', 'active', 6),
    (v_user_id, v_administrativas_id, 'Contabilidade', 'active', 7),
    (v_user_id, v_administrativas_id, 'Jurídico', 'active', 8),
    (v_user_id, v_administrativas_id, 'Sistemas e Softwares', 'active', 9),
    (v_user_id, v_administrativas_id, 'Manutenção', 'active', 10),
    (v_user_id, v_marketing_id, 'Tráfego Pago', 'active', 1),
    (v_user_id, v_marketing_id, 'Agência de Marketing', 'active', 2),
    (v_user_id, v_marketing_id, 'Brindes', 'active', 3),
    (v_user_id, v_receitas_financeiras_id, 'Rendimentos de Aplicações', 'active', 1),
    (v_user_id, v_receitas_financeiras_id, 'Juros Recebidos', 'active', 2),
    (v_user_id, v_receitas_financeiras_id, 'Descontos Obtidos', 'active', 3),
    (v_user_id, v_despesas_financeiras_id, 'Juros', 'active', 1),
    (v_user_id, v_despesas_financeiras_id, 'Multas', 'active', 2),
    (v_user_id, v_despesas_financeiras_id, 'Tarifas Bancárias', 'active', 3),
    (v_user_id, v_despesas_financeiras_id, 'Taxas de Maquininha', 'active', 4),
    (v_user_id, v_impostos_id, 'Simples Nacional', 'active', 1),
    (v_user_id, v_impostos_id, 'Outros Tributos', 'active', 2);

  insert into public.dre_models (user_id, name, description, status)
  values (
    v_user_id,
    'DRE Gerencial Padrão',
    'Modelo padrão para acompanhar receitas, deduções, custos, despesas e resultado líquido da empresa.',
    'active'
  )
  returning id into v_model_id;

  insert into public.dre_model_lines (user_id, model_id, category_id, subcategory_id, line_type, parent_category_id, sum_label, display_order)
  select v_user_id, v_model_id, line.category_id, line.subcategory_id, line.line_type::public.dre_model_line_type, line.parent_category_id, line.sum_label, line.display_order
  from (
    values
      (v_receita_bruta_id, null::uuid, 'category', null::uuid, null::text, 1000),
      (v_receita_bruta_id, public.default_dre_subcategory_id(v_user_id, v_receita_bruta_id, 'Vendas de Produtos'), 'subcategory', v_receita_bruta_id, null, 1010),
      (v_receita_bruta_id, public.default_dre_subcategory_id(v_user_id, v_receita_bruta_id, 'Prestação de Serviços'), 'subcategory', v_receita_bruta_id, null, 1020),
      (v_receita_bruta_id, public.default_dre_subcategory_id(v_user_id, v_receita_bruta_id, 'Receitas Recorrentes'), 'subcategory', v_receita_bruta_id, null, 1030),
      (v_receita_bruta_id, public.default_dre_subcategory_id(v_user_id, v_receita_bruta_id, 'Outras Receitas Operacionais'), 'subcategory', v_receita_bruta_id, null, 1040),
      (v_deducoes_id, null::uuid, 'category', null::uuid, null::text, 2000),
      (v_deducoes_id, public.default_dre_subcategory_id(v_user_id, v_deducoes_id, 'Devoluções'), 'subcategory', v_deducoes_id, null, 2010),
      (v_deducoes_id, public.default_dre_subcategory_id(v_user_id, v_deducoes_id, 'Descontos Concedidos'), 'subcategory', v_deducoes_id, null, 2020),
      (v_deducoes_id, public.default_dre_subcategory_id(v_user_id, v_deducoes_id, 'Taxas de Cartão'), 'subcategory', v_deducoes_id, null, 2030),
      (v_deducoes_id, public.default_dre_subcategory_id(v_user_id, v_deducoes_id, 'Comissões sobre Vendas'), 'subcategory', v_deducoes_id, null, 2040),
      (null::uuid, null::uuid, 'sum', null::uuid, 'Receita Líquida', 3000),
      (v_custos_id, null::uuid, 'category', null::uuid, null::text, 4000),
      (v_custos_id, public.default_dre_subcategory_id(v_user_id, v_custos_id, 'Mercadorias'), 'subcategory', v_custos_id, null, 4010),
      (v_custos_id, public.default_dre_subcategory_id(v_user_id, v_custos_id, 'Matéria-prima'), 'subcategory', v_custos_id, null, 4020),
      (v_custos_id, public.default_dre_subcategory_id(v_user_id, v_custos_id, 'Embalagens'), 'subcategory', v_custos_id, null, 4030),
      (v_custos_id, public.default_dre_subcategory_id(v_user_id, v_custos_id, 'Fretes sobre Compra'), 'subcategory', v_custos_id, null, 4040),
      (v_custos_id, public.default_dre_subcategory_id(v_user_id, v_custos_id, 'Mão de Obra Direta'), 'subcategory', v_custos_id, null, 4050),
      (v_custos_id, public.default_dre_subcategory_id(v_user_id, v_custos_id, 'Serviços Terceirizados Diretos'), 'subcategory', v_custos_id, null, 4060),
      (null::uuid, null::uuid, 'sum', null::uuid, 'Lucro Bruto', 5000),
      (v_pessoal_id, null::uuid, 'category', null::uuid, null::text, 6000),
      (v_pessoal_id, public.default_dre_subcategory_id(v_user_id, v_pessoal_id, 'Salários'), 'subcategory', v_pessoal_id, null, 6010),
      (v_pessoal_id, public.default_dre_subcategory_id(v_user_id, v_pessoal_id, 'Pró-labore'), 'subcategory', v_pessoal_id, null, 6020),
      (v_pessoal_id, public.default_dre_subcategory_id(v_user_id, v_pessoal_id, 'Encargos Trabalhistas'), 'subcategory', v_pessoal_id, null, 6030),
      (v_pessoal_id, public.default_dre_subcategory_id(v_user_id, v_pessoal_id, 'Benefícios'), 'subcategory', v_pessoal_id, null, 6040),
      (v_administrativas_id, null::uuid, 'category', null::uuid, null::text, 7000),
      (v_administrativas_id, public.default_dre_subcategory_id(v_user_id, v_administrativas_id, 'Aluguel'), 'subcategory', v_administrativas_id, null, 7010),
      (v_administrativas_id, public.default_dre_subcategory_id(v_user_id, v_administrativas_id, 'Condomínio'), 'subcategory', v_administrativas_id, null, 7020),
      (v_administrativas_id, public.default_dre_subcategory_id(v_user_id, v_administrativas_id, 'Energia'), 'subcategory', v_administrativas_id, null, 7030),
      (v_administrativas_id, public.default_dre_subcategory_id(v_user_id, v_administrativas_id, 'Água'), 'subcategory', v_administrativas_id, null, 7040),
      (v_administrativas_id, public.default_dre_subcategory_id(v_user_id, v_administrativas_id, 'Internet e Telefonia'), 'subcategory', v_administrativas_id, null, 7050),
      (v_administrativas_id, public.default_dre_subcategory_id(v_user_id, v_administrativas_id, 'Material de Escritório'), 'subcategory', v_administrativas_id, null, 7060),
      (v_administrativas_id, public.default_dre_subcategory_id(v_user_id, v_administrativas_id, 'Contabilidade'), 'subcategory', v_administrativas_id, null, 7070),
      (v_administrativas_id, public.default_dre_subcategory_id(v_user_id, v_administrativas_id, 'Jurídico'), 'subcategory', v_administrativas_id, null, 7080),
      (v_administrativas_id, public.default_dre_subcategory_id(v_user_id, v_administrativas_id, 'Sistemas e Softwares'), 'subcategory', v_administrativas_id, null, 7090),
      (v_administrativas_id, public.default_dre_subcategory_id(v_user_id, v_administrativas_id, 'Manutenção'), 'subcategory', v_administrativas_id, null, 7100),
      (v_marketing_id, null::uuid, 'category', null::uuid, null::text, 8000),
      (v_marketing_id, public.default_dre_subcategory_id(v_user_id, v_marketing_id, 'Tráfego Pago'), 'subcategory', v_marketing_id, null, 8010),
      (v_marketing_id, public.default_dre_subcategory_id(v_user_id, v_marketing_id, 'Agência de Marketing'), 'subcategory', v_marketing_id, null, 8020),
      (v_marketing_id, public.default_dre_subcategory_id(v_user_id, v_marketing_id, 'Brindes'), 'subcategory', v_marketing_id, null, 8030),
      (null::uuid, null::uuid, 'sum', null::uuid, 'Resultado Operacional', 9000),
      (v_receitas_financeiras_id, null::uuid, 'category', null::uuid, null::text, 10000),
      (v_receitas_financeiras_id, public.default_dre_subcategory_id(v_user_id, v_receitas_financeiras_id, 'Rendimentos de Aplicações'), 'subcategory', v_receitas_financeiras_id, null, 10010),
      (v_receitas_financeiras_id, public.default_dre_subcategory_id(v_user_id, v_receitas_financeiras_id, 'Juros Recebidos'), 'subcategory', v_receitas_financeiras_id, null, 10020),
      (v_receitas_financeiras_id, public.default_dre_subcategory_id(v_user_id, v_receitas_financeiras_id, 'Descontos Obtidos'), 'subcategory', v_receitas_financeiras_id, null, 10030),
      (v_despesas_financeiras_id, null::uuid, 'category', null::uuid, null::text, 11000),
      (v_despesas_financeiras_id, public.default_dre_subcategory_id(v_user_id, v_despesas_financeiras_id, 'Juros'), 'subcategory', v_despesas_financeiras_id, null, 11010),
      (v_despesas_financeiras_id, public.default_dre_subcategory_id(v_user_id, v_despesas_financeiras_id, 'Multas'), 'subcategory', v_despesas_financeiras_id, null, 11020),
      (v_despesas_financeiras_id, public.default_dre_subcategory_id(v_user_id, v_despesas_financeiras_id, 'Tarifas Bancárias'), 'subcategory', v_despesas_financeiras_id, null, 11030),
      (v_despesas_financeiras_id, public.default_dre_subcategory_id(v_user_id, v_despesas_financeiras_id, 'Taxas de Maquininha'), 'subcategory', v_despesas_financeiras_id, null, 11040),
      (null::uuid, null::uuid, 'sum', null::uuid, 'Resultado Antes dos Impostos', 12000),
      (v_impostos_id, null::uuid, 'category', null::uuid, null::text, 13000),
      (v_impostos_id, public.default_dre_subcategory_id(v_user_id, v_impostos_id, 'Simples Nacional'), 'subcategory', v_impostos_id, null, 13010),
      (v_impostos_id, public.default_dre_subcategory_id(v_user_id, v_impostos_id, 'Outros Tributos'), 'subcategory', v_impostos_id, null, 13020),
      (null::uuid, null::uuid, 'sum', null::uuid, 'Lucro Líquido', 14000)
  ) as line(category_id, subcategory_id, line_type, parent_category_id, sum_label, display_order);

  created := true;
  model_id := v_model_id;
  return next;
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

  perform public.create_default_dre_structure();
end;
$$;

revoke all on function public.create_default_dre_structure() from public;
revoke all on function public.create_default_dre_categories(uuid) from public;
grant execute on function public.create_default_dre_structure() to authenticated;
grant execute on function public.create_default_dre_categories(uuid) to authenticated;
