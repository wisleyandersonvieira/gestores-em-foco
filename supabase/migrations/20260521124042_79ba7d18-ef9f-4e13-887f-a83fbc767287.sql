DO $$
DECLARE
  v_user_id uuid;
  v_model_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower('wisley_anderson@hotmail.com')
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    SELECT id INTO v_model_id
    FROM public.dre_models
    WHERE user_id = v_user_id
      AND name = 'DRE Gerencial Padrão'
      AND description = 'Modelo padrão para acompanhar receitas, deduções, custos, despesas e resultado líquido da empresa.'
      AND NOT EXISTS (
        SELECT 1 FROM public.dre_entries e
        WHERE e.user_id = v_user_id
          AND e.model_id = public.dre_models.id
      )
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_model_id IS NOT NULL THEN
      CREATE TEMP TABLE IF NOT EXISTS wisley_default_dre_categories_to_remove (id uuid primary key) ON COMMIT DROP;
      CREATE TEMP TABLE IF NOT EXISTS wisley_default_dre_subcategories_to_remove (id uuid primary key) ON COMMIT DROP;

      INSERT INTO wisley_default_dre_categories_to_remove (id)
      SELECT DISTINCT category_id
      FROM public.dre_model_lines
      WHERE user_id = v_user_id
        AND model_id = v_model_id
        AND category_id IS NOT NULL
      ON CONFLICT DO NOTHING;

      INSERT INTO wisley_default_dre_categories_to_remove (id)
      SELECT DISTINCT parent_category_id
      FROM public.dre_model_lines
      WHERE user_id = v_user_id
        AND model_id = v_model_id
        AND parent_category_id IS NOT NULL
      ON CONFLICT DO NOTHING;

      INSERT INTO wisley_default_dre_subcategories_to_remove (id)
      SELECT DISTINCT subcategory_id
      FROM public.dre_model_lines
      WHERE user_id = v_user_id
        AND model_id = v_model_id
        AND subcategory_id IS NOT NULL
      ON CONFLICT DO NOTHING;

      DELETE FROM public.dre_model_lines
      WHERE user_id = v_user_id
        AND model_id = v_model_id;

      DELETE FROM public.dre_subcategories s
      USING wisley_default_dre_subcategories_to_remove r
      WHERE s.id = r.id
        AND s.user_id = v_user_id
        AND s.created_at >= timestamp with time zone '2026-05-21 12:20:00+00'
        AND NOT EXISTS (
          SELECT 1 FROM public.dre_entry_items i
          WHERE i.user_id = v_user_id
            AND i.subcategory_id = s.id
        );

      DELETE FROM public.dre_categories c
      USING wisley_default_dre_categories_to_remove r
      WHERE c.id = r.id
        AND c.user_id = v_user_id
        AND c.created_at >= timestamp with time zone '2026-05-21 12:20:00+00'
        AND NOT EXISTS (
          SELECT 1 FROM public.dre_entry_items i
          WHERE i.user_id = v_user_id
            AND i.category_id = c.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.dre_subcategories s
          WHERE s.user_id = v_user_id
            AND s.category_id = c.id
        );

      DELETE FROM public.dre_models
      WHERE id = v_model_id
        AND user_id = v_user_id
        AND NOT EXISTS (
          SELECT 1 FROM public.dre_entries e
          WHERE e.user_id = v_user_id
            AND e.model_id = v_model_id
        );
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regprocedure('public.create_default_dre_structure_for_user_unchecked(uuid)') IS NULL THEN
    ALTER FUNCTION public.create_default_dre_structure_for_user(uuid)
    RENAME TO create_default_dre_structure_for_user_unchecked;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.create_default_dre_structure_for_user(p_user_id uuid)
RETURNS TABLE(created boolean, model_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_default_model_id uuid;
  v_has_custom_structure boolean := false;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id is required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  SELECT id INTO v_existing_default_model_id
  FROM public.dre_models
  WHERE user_id = p_user_id
    AND name = 'DRE Gerencial Padrão'
  ORDER BY created_at
  LIMIT 1;

  SELECT EXISTS (
    SELECT 1
    FROM public.dre_entries e
    WHERE e.user_id = p_user_id
  ) OR EXISTS (
    SELECT 1
    FROM public.dre_models m
    WHERE m.user_id = p_user_id
      AND m.name <> 'DRE Gerencial Padrão'
  ) OR EXISTS (
    SELECT 1
    FROM public.dre_categories c
    WHERE c.user_id = p_user_id
      AND c.name NOT IN (
        'Receita Bruta',
        'Deduções da Receita',
        'Custos Variáveis / CMV',
        'Despesas com Pessoal',
        'Despesas Administrativas',
        'Despesas Comerciais e Marketing',
        'Receitas Financeiras',
        'Despesas Financeiras',
        'Impostos sobre Resultado'
      )
  ) INTO v_has_custom_structure;

  IF v_has_custom_structure THEN
    created := false;
    model_id := v_existing_default_model_id;
    RETURN NEXT;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.create_default_dre_structure_for_user_unchecked(p_user_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_default_dre_structure()
RETURNS TABLE(created boolean, model_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authenticated user required';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.create_default_dre_structure_for_user(v_user_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_default_dre_categories(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  PERFORM public.create_default_dre_structure_for_user(p_user_id);
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

REVOKE ALL ON FUNCTION public.default_dre_category_id(uuid, text, public.dre_category_type, integer, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.default_dre_subcategory_id(uuid, uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.default_dre_subcategory_id(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_default_dre_structure_for_user_unchecked(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_default_dre_structure_for_user(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_default_dre_structure() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_default_dre_categories(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_default_dre_structure() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_default_dre_categories(uuid) TO authenticated;