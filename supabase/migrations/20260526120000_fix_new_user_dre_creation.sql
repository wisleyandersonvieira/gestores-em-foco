-- Corrige a criação automática da estrutura padrão de DRE para novos usuários.
--
-- PROBLEMA: A função create_default_dre_structure_for_user_unchecked chamava
-- default_dre_subcategory_id() dentro da cláusula VALUES do INSERT em dre_model_lines.
-- Essa função contém uma verificação de proprietário (SELECT em dre_categories) que pode
-- retornar NULL em certos contextos de execução do Supabase, levantando a exceção
-- 'default_dre_subcategory_owner_mismatch' e impedindo a criação da estrutura.
--
-- SOLUÇÃO: Reescrever create_default_dre_structure_for_user_unchecked para armazenar
-- todos os IDs de subcategoria em variáveis locais antes do INSERT em dre_model_lines,
-- eliminando chamadas de função na cláusula VALUES.

CREATE OR REPLACE FUNCTION public.create_default_dre_structure_for_user_unchecked(p_user_id uuid)
RETURNS TABLE(created boolean, model_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_model_id uuid;
  v_had_model boolean := false;
  v_inserted_lines integer := 0;

  -- category IDs
  v_receita_bruta_id uuid;
  v_deducoes_id uuid;
  v_custos_id uuid;
  v_pessoal_id uuid;
  v_administrativas_id uuid;
  v_marketing_id uuid;
  v_receitas_financeiras_id uuid;
  v_despesas_financeiras_id uuid;
  v_impostos_id uuid;

  -- subcategory IDs — receita bruta
  v_sub_vendas_id uuid;
  v_sub_servicos_id uuid;
  v_sub_recorrentes_id uuid;
  v_sub_outras_receitas_id uuid;

  -- subcategory IDs — deduções
  v_sub_devolucoes_id uuid;
  v_sub_descontos_id uuid;
  v_sub_taxas_cartao_id uuid;
  v_sub_comissoes_id uuid;

  -- subcategory IDs — custos
  v_sub_mercadorias_id uuid;
  v_sub_materia_prima_id uuid;
  v_sub_embalagens_id uuid;
  v_sub_fretes_id uuid;
  v_sub_mao_obra_id uuid;
  v_sub_servicos_terc_id uuid;

  -- subcategory IDs — pessoal
  v_sub_salarios_id uuid;
  v_sub_prolabore_id uuid;
  v_sub_encargos_id uuid;
  v_sub_beneficios_id uuid;

  -- subcategory IDs — administrativas
  v_sub_aluguel_id uuid;
  v_sub_condominio_id uuid;
  v_sub_energia_id uuid;
  v_sub_agua_id uuid;
  v_sub_internet_id uuid;
  v_sub_material_id uuid;
  v_sub_contabilidade_id uuid;
  v_sub_juridico_id uuid;
  v_sub_sistemas_id uuid;
  v_sub_manutencao_id uuid;

  -- subcategory IDs — marketing
  v_sub_trafego_id uuid;
  v_sub_agencia_id uuid;
  v_sub_brindes_id uuid;

  -- subcategory IDs — receitas financeiras
  v_sub_rendimentos_id uuid;
  v_sub_juros_rec_id uuid;
  v_sub_descontos_obt_id uuid;

  -- subcategory IDs — despesas financeiras
  v_sub_juros_pag_id uuid;
  v_sub_multas_id uuid;
  v_sub_tarifas_id uuid;
  v_sub_taxas_maq_id uuid;

  -- subcategory IDs — impostos
  v_sub_simples_id uuid;
  v_sub_outros_trib_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id is required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  -- Cria ou atualiza categorias
  v_receita_bruta_id         := public.default_dre_category_id(p_user_id, 'Receita Bruta',                     'credit', 1, true);
  v_deducoes_id              := public.default_dre_category_id(p_user_id, 'Deduções da Receita',               'debit',  2, false);
  v_custos_id                := public.default_dre_category_id(p_user_id, 'Custos Variáveis / CMV',            'debit',  3, false);
  v_pessoal_id               := public.default_dre_category_id(p_user_id, 'Despesas com Pessoal',              'debit',  4, false);
  v_administrativas_id       := public.default_dre_category_id(p_user_id, 'Despesas Administrativas',          'debit',  5, false);
  v_marketing_id             := public.default_dre_category_id(p_user_id, 'Despesas Comerciais e Marketing',   'debit',  6, false);
  v_receitas_financeiras_id  := public.default_dre_category_id(p_user_id, 'Receitas Financeiras',              'credit', 7, true);
  v_despesas_financeiras_id  := public.default_dre_category_id(p_user_id, 'Despesas Financeiras',              'debit',  8, false);
  v_impostos_id              := public.default_dre_category_id(p_user_id, 'Impostos sobre Resultado',          'debit',  9, false);

  -- Cria ou atualiza subcategorias — armazena IDs em variáveis locais
  -- Receita Bruta
  v_sub_vendas_id          := public.default_dre_subcategory_id(p_user_id, v_receita_bruta_id,        'Vendas de Produtos',          1);
  v_sub_servicos_id        := public.default_dre_subcategory_id(p_user_id, v_receita_bruta_id,        'Prestação de Serviços',       2);
  v_sub_recorrentes_id     := public.default_dre_subcategory_id(p_user_id, v_receita_bruta_id,        'Receitas Recorrentes',        3);
  v_sub_outras_receitas_id := public.default_dre_subcategory_id(p_user_id, v_receita_bruta_id,        'Outras Receitas Operacionais',4);

  -- Deduções
  v_sub_devolucoes_id  := public.default_dre_subcategory_id(p_user_id, v_deducoes_id, 'Devoluções',            1);
  v_sub_descontos_id   := public.default_dre_subcategory_id(p_user_id, v_deducoes_id, 'Descontos Concedidos',  2);
  v_sub_taxas_cartao_id:= public.default_dre_subcategory_id(p_user_id, v_deducoes_id, 'Taxas de Cartão',       3);
  v_sub_comissoes_id   := public.default_dre_subcategory_id(p_user_id, v_deducoes_id, 'Comissões sobre Vendas',4);

  -- Custos
  v_sub_mercadorias_id  := public.default_dre_subcategory_id(p_user_id, v_custos_id, 'Mercadorias',                    1);
  v_sub_materia_prima_id:= public.default_dre_subcategory_id(p_user_id, v_custos_id, 'Matéria-prima',                  2);
  v_sub_embalagens_id   := public.default_dre_subcategory_id(p_user_id, v_custos_id, 'Embalagens',                     3);
  v_sub_fretes_id       := public.default_dre_subcategory_id(p_user_id, v_custos_id, 'Fretes sobre Compra',             4);
  v_sub_mao_obra_id     := public.default_dre_subcategory_id(p_user_id, v_custos_id, 'Mão de Obra Direta',              5);
  v_sub_servicos_terc_id:= public.default_dre_subcategory_id(p_user_id, v_custos_id, 'Serviços Terceirizados Diretos',  6);

  -- Pessoal
  v_sub_salarios_id  := public.default_dre_subcategory_id(p_user_id, v_pessoal_id, 'Salários',              1);
  v_sub_prolabore_id := public.default_dre_subcategory_id(p_user_id, v_pessoal_id, 'Pró-labore',            2);
  v_sub_encargos_id  := public.default_dre_subcategory_id(p_user_id, v_pessoal_id, 'Encargos Trabalhistas', 3);
  v_sub_beneficios_id:= public.default_dre_subcategory_id(p_user_id, v_pessoal_id, 'Benefícios',            4);

  -- Administrativas
  v_sub_aluguel_id    := public.default_dre_subcategory_id(p_user_id, v_administrativas_id, 'Aluguel',               1);
  v_sub_condominio_id := public.default_dre_subcategory_id(p_user_id, v_administrativas_id, 'Condomínio',             2);
  v_sub_energia_id    := public.default_dre_subcategory_id(p_user_id, v_administrativas_id, 'Energia',                3);
  v_sub_agua_id       := public.default_dre_subcategory_id(p_user_id, v_administrativas_id, 'Água',                   4);
  v_sub_internet_id   := public.default_dre_subcategory_id(p_user_id, v_administrativas_id, 'Internet e Telefonia',   5);
  v_sub_material_id   := public.default_dre_subcategory_id(p_user_id, v_administrativas_id, 'Material de Escritório', 6);
  v_sub_contabilidade_id:=public.default_dre_subcategory_id(p_user_id, v_administrativas_id, 'Contabilidade',         7);
  v_sub_juridico_id   := public.default_dre_subcategory_id(p_user_id, v_administrativas_id, 'Jurídico',               8);
  v_sub_sistemas_id   := public.default_dre_subcategory_id(p_user_id, v_administrativas_id, 'Sistemas e Softwares',   9);
  v_sub_manutencao_id := public.default_dre_subcategory_id(p_user_id, v_administrativas_id, 'Manutenção',            10);

  -- Marketing
  v_sub_trafego_id := public.default_dre_subcategory_id(p_user_id, v_marketing_id, 'Tráfego Pago',          1);
  v_sub_agencia_id := public.default_dre_subcategory_id(p_user_id, v_marketing_id, 'Agência de Marketing',  2);
  v_sub_brindes_id := public.default_dre_subcategory_id(p_user_id, v_marketing_id, 'Brindes',               3);

  -- Receitas Financeiras
  v_sub_rendimentos_id   := public.default_dre_subcategory_id(p_user_id, v_receitas_financeiras_id, 'Rendimentos de Aplicações', 1);
  v_sub_juros_rec_id     := public.default_dre_subcategory_id(p_user_id, v_receitas_financeiras_id, 'Juros Recebidos',            2);
  v_sub_descontos_obt_id := public.default_dre_subcategory_id(p_user_id, v_receitas_financeiras_id, 'Descontos Obtidos',          3);

  -- Despesas Financeiras
  v_sub_juros_pag_id := public.default_dre_subcategory_id(p_user_id, v_despesas_financeiras_id, 'Juros',             1);
  v_sub_multas_id    := public.default_dre_subcategory_id(p_user_id, v_despesas_financeiras_id, 'Multas',            2);
  v_sub_tarifas_id   := public.default_dre_subcategory_id(p_user_id, v_despesas_financeiras_id, 'Tarifas Bancárias', 3);
  v_sub_taxas_maq_id := public.default_dre_subcategory_id(p_user_id, v_despesas_financeiras_id, 'Taxas de Maquininha',4);

  -- Impostos
  v_sub_simples_id    := public.default_dre_subcategory_id(p_user_id, v_impostos_id, 'Simples Nacional', 1);
  v_sub_outros_trib_id:= public.default_dre_subcategory_id(p_user_id, v_impostos_id, 'Outros Tributos',  2);

  -- Cria ou reutiliza o modelo padrão
  SELECT id INTO v_model_id
  FROM public.dre_models
  WHERE user_id = p_user_id
    AND name = 'DRE Gerencial Padrão'
  ORDER BY created_at
  LIMIT 1;

  v_had_model := v_model_id IS NOT NULL;

  IF v_model_id IS NULL THEN
    INSERT INTO public.dre_models (user_id, name, description, status)
    VALUES (
      p_user_id,
      'DRE Gerencial Padrão',
      'Modelo padrão para acompanhar receitas, deduções, custos, despesas e resultado líquido da empresa.',
      'active'
    )
    RETURNING id INTO v_model_id;
  ELSE
    UPDATE public.dre_models
    SET status = 'active'
    WHERE id = v_model_id
      AND user_id = p_user_id;
  END IF;

  -- Insere linhas do modelo usando variáveis locais (sem chamadas de função na VALUES)
  INSERT INTO public.dre_model_lines (
    user_id, model_id, category_id, subcategory_id, line_type,
    parent_category_id, sum_label, display_order, is_net_income, financial_type
  )
  SELECT
    p_user_id, v_model_id,
    line.category_id,
    line.subcategory_id,
    line.line_type::public.dre_model_line_type,
    line.parent_category_id,
    line.sum_label,
    line.display_order,
    line.is_net_income,
    line.financial_type::public.dre_model_line_financial_type
  FROM (VALUES
    -- Receita Bruta
    (v_receita_bruta_id,        null::uuid,               'category',    null::uuid,              null::text,             1000, false, null::text),
    (v_receita_bruta_id,        v_sub_vendas_id,          'subcategory', v_receita_bruta_id,       null,                  1010, false, null),
    (v_receita_bruta_id,        v_sub_servicos_id,        'subcategory', v_receita_bruta_id,       null,                  1020, false, null),
    (v_receita_bruta_id,        v_sub_recorrentes_id,     'subcategory', v_receita_bruta_id,       null,                  1030, false, null),
    (v_receita_bruta_id,        v_sub_outras_receitas_id, 'subcategory', v_receita_bruta_id,       null,                  1040, false, null),
    -- Deduções da Receita
    (v_deducoes_id,             null::uuid,               'category',    null::uuid,              null,                   2000, false, null),
    (v_deducoes_id,             v_sub_devolucoes_id,      'subcategory', v_deducoes_id,            null,                  2010, false, null),
    (v_deducoes_id,             v_sub_descontos_id,       'subcategory', v_deducoes_id,            null,                  2020, false, null),
    (v_deducoes_id,             v_sub_taxas_cartao_id,    'subcategory', v_deducoes_id,            null,                  2030, false, null),
    (v_deducoes_id,             v_sub_comissoes_id,       'subcategory', v_deducoes_id,            null,                  2040, false, null),
    -- Linha de soma: Receita Líquida
    (null::uuid,                null::uuid,               'sum',         null::uuid,              'Receita Líquida',      3000, false, 'revenue'),
    -- Custos Variáveis / CMV
    (v_custos_id,               null::uuid,               'category',    null::uuid,              null,                   4000, false, null),
    (v_custos_id,               v_sub_mercadorias_id,     'subcategory', v_custos_id,              null,                  4010, false, null),
    (v_custos_id,               v_sub_materia_prima_id,   'subcategory', v_custos_id,              null,                  4020, false, null),
    (v_custos_id,               v_sub_embalagens_id,      'subcategory', v_custos_id,              null,                  4030, false, null),
    (v_custos_id,               v_sub_fretes_id,          'subcategory', v_custos_id,              null,                  4040, false, null),
    (v_custos_id,               v_sub_mao_obra_id,        'subcategory', v_custos_id,              null,                  4050, false, null),
    (v_custos_id,               v_sub_servicos_terc_id,   'subcategory', v_custos_id,              null,                  4060, false, null),
    -- Linha de soma: Lucro Bruto
    (null::uuid,                null::uuid,               'sum',         null::uuid,              'Lucro Bruto',          5000, false, 'gross_profit'),
    -- Despesas com Pessoal
    (v_pessoal_id,              null::uuid,               'category',    null::uuid,              null,                   6000, false, null),
    (v_pessoal_id,              v_sub_salarios_id,        'subcategory', v_pessoal_id,             null,                  6010, false, null),
    (v_pessoal_id,              v_sub_prolabore_id,       'subcategory', v_pessoal_id,             null,                  6020, false, null),
    (v_pessoal_id,              v_sub_encargos_id,        'subcategory', v_pessoal_id,             null,                  6030, false, null),
    (v_pessoal_id,              v_sub_beneficios_id,      'subcategory', v_pessoal_id,             null,                  6040, false, null),
    -- Despesas Administrativas
    (v_administrativas_id,      null::uuid,               'category',    null::uuid,              null,                   7000, false, null),
    (v_administrativas_id,      v_sub_aluguel_id,         'subcategory', v_administrativas_id,     null,                  7010, false, null),
    (v_administrativas_id,      v_sub_condominio_id,      'subcategory', v_administrativas_id,     null,                  7020, false, null),
    (v_administrativas_id,      v_sub_energia_id,         'subcategory', v_administrativas_id,     null,                  7030, false, null),
    (v_administrativas_id,      v_sub_agua_id,            'subcategory', v_administrativas_id,     null,                  7040, false, null),
    (v_administrativas_id,      v_sub_internet_id,        'subcategory', v_administrativas_id,     null,                  7050, false, null),
    (v_administrativas_id,      v_sub_material_id,        'subcategory', v_administrativas_id,     null,                  7060, false, null),
    (v_administrativas_id,      v_sub_contabilidade_id,   'subcategory', v_administrativas_id,     null,                  7070, false, null),
    (v_administrativas_id,      v_sub_juridico_id,        'subcategory', v_administrativas_id,     null,                  7080, false, null),
    (v_administrativas_id,      v_sub_sistemas_id,        'subcategory', v_administrativas_id,     null,                  7090, false, null),
    (v_administrativas_id,      v_sub_manutencao_id,      'subcategory', v_administrativas_id,     null,                  7100, false, null),
    -- Despesas Comerciais e Marketing
    (v_marketing_id,            null::uuid,               'category',    null::uuid,              null,                   8000, false, null),
    (v_marketing_id,            v_sub_trafego_id,         'subcategory', v_marketing_id,           null,                  8010, false, null),
    (v_marketing_id,            v_sub_agencia_id,         'subcategory', v_marketing_id,           null,                  8020, false, null),
    (v_marketing_id,            v_sub_brindes_id,         'subcategory', v_marketing_id,           null,                  8030, false, null),
    -- Linha de soma: Resultado Operacional
    (null::uuid,                null::uuid,               'sum',         null::uuid,              'Resultado Operacional', 9000, false, 'operating_result'),
    -- Receitas Financeiras
    (v_receitas_financeiras_id, null::uuid,               'category',    null::uuid,              null,                  10000, false, null),
    (v_receitas_financeiras_id, v_sub_rendimentos_id,     'subcategory', v_receitas_financeiras_id,null,                 10010, false, null),
    (v_receitas_financeiras_id, v_sub_juros_rec_id,       'subcategory', v_receitas_financeiras_id,null,                 10020, false, null),
    (v_receitas_financeiras_id, v_sub_descontos_obt_id,   'subcategory', v_receitas_financeiras_id,null,                 10030, false, null),
    -- Despesas Financeiras
    (v_despesas_financeiras_id, null::uuid,               'category',    null::uuid,              null,                  11000, false, null),
    (v_despesas_financeiras_id, v_sub_juros_pag_id,       'subcategory', v_despesas_financeiras_id,null,                 11010, false, null),
    (v_despesas_financeiras_id, v_sub_multas_id,          'subcategory', v_despesas_financeiras_id,null,                 11020, false, null),
    (v_despesas_financeiras_id, v_sub_tarifas_id,         'subcategory', v_despesas_financeiras_id,null,                 11030, false, null),
    (v_despesas_financeiras_id, v_sub_taxas_maq_id,       'subcategory', v_despesas_financeiras_id,null,                 11040, false, null),
    -- Linha de soma: Resultado Antes dos Impostos
    (null::uuid,                null::uuid,               'sum',         null::uuid,              'Resultado Antes dos Impostos', 12000, false, 'pre_tax_profit'),
    -- Impostos sobre Resultado
    (v_impostos_id,             null::uuid,               'category',    null::uuid,              null,                  13000, false, null),
    (v_impostos_id,             v_sub_simples_id,         'subcategory', v_impostos_id,            null,                 13010, false, null),
    (v_impostos_id,             v_sub_outros_trib_id,     'subcategory', v_impostos_id,            null,                 13020, false, null),
    -- Linha de soma: Lucro Líquido
    (null::uuid,                null::uuid,               'sum',         null::uuid,              'Lucro Líquido',       14000, true, 'net_profit')
  ) AS line(category_id, subcategory_id, line_type, parent_category_id, sum_label, display_order, is_net_income, financial_type)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.dre_model_lines existing
    WHERE existing.user_id = p_user_id
      AND existing.model_id = v_model_id
      AND existing.display_order = line.display_order
  )
  AND (
    line.financial_type IS NULL
    OR NOT EXISTS (
      SELECT 1
      FROM public.dre_model_lines existing_financial
      WHERE existing_financial.user_id = p_user_id
        AND existing_financial.model_id = v_model_id
        AND existing_financial.financial_type = line.financial_type::public.dre_model_line_financial_type
    )
  );

  GET DIAGNOSTICS v_inserted_lines = ROW_COUNT;

  created := (NOT v_had_model) OR v_inserted_lines > 0;
  model_id := v_model_id;
  RETURN NEXT;
EXCEPTION
  WHEN foreign_key_violation OR check_violation OR unique_violation THEN
    RAISE EXCEPTION 'default_dre_structure_failed for user_id %, sqlstate %, detail %', p_user_id, SQLSTATE, SQLERRM;
END;
$function$;

-- Garante permissões corretas
REVOKE ALL ON FUNCTION public.create_default_dre_structure_for_user_unchecked(uuid) FROM PUBLIC, anon, authenticated;
