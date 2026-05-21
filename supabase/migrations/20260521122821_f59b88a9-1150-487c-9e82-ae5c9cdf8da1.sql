-- Atualiza handle_new_user para criar automaticamente a estrutura padrão do DRE
-- (categorias, subcategorias e modelo) ao registrar um novo usuário.
-- A função create_default_dre_structure_for_user já é SECURITY DEFINER e insere
-- registros com o user_id fornecido, preservando o isolamento por RLS.

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_sector_id uuid;
  v_subsector_id uuid;
  v_first_sector uuid;
  v_first_subsector uuid;
begin
  if jsonb_typeof(new.raw_user_meta_data -> 'sector_ids') = 'array' then
    select value::uuid into v_first_sector
    from jsonb_array_elements_text(new.raw_user_meta_data -> 'sector_ids')
    limit 1;
  elsif (new.raw_user_meta_data ->> 'sector_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_first_sector := (new.raw_user_meta_data ->> 'sector_id')::uuid;
  end if;

  if jsonb_typeof(new.raw_user_meta_data -> 'subsector_ids') = 'array' then
    select value::uuid into v_first_subsector
    from jsonb_array_elements_text(new.raw_user_meta_data -> 'subsector_ids')
    limit 1;
  elsif (new.raw_user_meta_data ->> 'subsector_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_first_subsector := (new.raw_user_meta_data ->> 'subsector_id')::uuid;
  end if;

  insert into public.profiles (
    id, email, full_name, company_name, segment, sector_id, subsector_id, employees_count, role, is_active
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name'),
    nullif(new.raw_user_meta_data ->> 'company_name', ''),
    new.raw_user_meta_data ->> 'segment',
    v_first_sector,
    v_first_subsector,
    case when (new.raw_user_meta_data ->> 'employees_count') ~ '^[0-9]+$' then (new.raw_user_meta_data ->> 'employees_count')::integer else null end,
    'client'::public.app_role,
    true
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    company_name = coalesce(excluded.company_name, public.profiles.company_name),
    segment = coalesce(excluded.segment, public.profiles.segment),
    sector_id = coalesce(excluded.sector_id, public.profiles.sector_id),
    subsector_id = coalesce(excluded.subsector_id, public.profiles.subsector_id),
    employees_count = coalesce(excluded.employees_count, public.profiles.employees_count),
    updated_at = now();

  if jsonb_typeof(new.raw_user_meta_data -> 'sector_ids') = 'array' then
    for v_sector_id in select value::uuid from jsonb_array_elements_text(new.raw_user_meta_data -> 'sector_ids')
    loop
      insert into public.user_sectors (user_id, sector_id)
      values (new.id, v_sector_id)
      on conflict (user_id, sector_id) do nothing;
    end loop;
  elsif v_first_sector is not null then
    insert into public.user_sectors (user_id, sector_id)
    values (new.id, v_first_sector)
    on conflict (user_id, sector_id) do nothing;
  end if;

  if jsonb_typeof(new.raw_user_meta_data -> 'subsector_ids') = 'array' then
    for v_subsector_id in select value::uuid from jsonb_array_elements_text(new.raw_user_meta_data -> 'subsector_ids')
    loop
      select sector_id into v_sector_id from public.business_subsectors where id = v_subsector_id;
      if v_sector_id is not null then
        insert into public.user_subsectors (user_id, sector_id, subsector_id)
        values (new.id, v_sector_id, v_subsector_id)
        on conflict (user_id, subsector_id) do nothing;
      end if;
    end loop;
  elsif v_first_subsector is not null then
    select sector_id into v_sector_id from public.business_subsectors where id = v_first_subsector;
    if v_sector_id is not null then
      insert into public.user_subsectors (user_id, sector_id, subsector_id)
      values (new.id, v_sector_id, v_first_subsector)
      on conflict (user_id, subsector_id) do nothing;
    end if;
  end if;

  -- Cria estrutura padrão do DRE (categorias, subcategorias e modelo) para o novo usuário.
  -- Não falha o cadastro caso a criação tenha problema.
  begin
    perform public.create_default_dre_structure_for_user(new.id);
  exception when others then
    raise warning 'create_default_dre_structure_for_user failed for user %: %', new.id, sqlerrm;
  end;

  return new;
end;
$function$;

-- Backfill: cria a estrutura padrão para usuários existentes que ainda não a possuem.
DO $$
declare
  v_user record;
begin
  for v_user in
    select u.id
    from auth.users u
    where not exists (
      select 1 from public.dre_categories c where c.user_id = u.id
    )
  loop
    begin
      perform public.create_default_dre_structure_for_user(v_user.id);
    exception when others then
      raise warning 'backfill default DRE failed for user %: %', v_user.id, sqlerrm;
    end;
  end loop;
end $$;
