-- ============================================================
-- 1. Tabela de municípios brasileiros
-- ============================================================
create table if not exists public.brazilian_cities (
  id uuid primary key default gen_random_uuid(),
  state_name text not null,
  city_name text not null,
  created_at timestamp with time zone default now()
);

create index if not exists idx_brazilian_cities_state_name
  on public.brazilian_cities (state_name);

create index if not exists idx_brazilian_cities_city_name
  on public.brazilian_cities (city_name);

alter table public.brazilian_cities
  add constraint if not exists unique_state_city unique (state_name, city_name);

-- RLS: leitura pública (necessário para o formulário de cadastro)
alter table public.brazilian_cities enable row level security;

drop policy if exists "Anyone can read brazilian_cities" on public.brazilian_cities;
create policy "Anyone can read brazilian_cities"
  on public.brazilian_cities for select
  using (true);

-- ============================================================
-- 2. Adicionar phone, state, city à tabela profiles
-- ============================================================
alter table public.profiles
  add column if not exists phone text,
  add column if not exists state text,
  add column if not exists city  text;

-- ============================================================
-- 3. Adicionar state, city à tabela user_profiles
--    (phone já existe nessa tabela)
-- ============================================================
alter table public.user_profiles
  add column if not exists state text,
  add column if not exists city  text;

-- ============================================================
-- 4. Atualizar handle_new_user para extrair phone/state/city
--    do metadata do auth e persistir em profiles
-- ============================================================
create or replace function public.handle_new_user()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_sector_id    uuid;
  v_subsector_id uuid;
  v_first_sector    uuid;
  v_first_subsector uuid;
begin
  -- Resolve primeiro setor
  if jsonb_typeof(new.raw_user_meta_data -> 'sector_ids') = 'array' then
    select value::uuid into v_first_sector
    from jsonb_array_elements_text(new.raw_user_meta_data -> 'sector_ids')
    limit 1;
  elsif (new.raw_user_meta_data ->> 'sector_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_first_sector := (new.raw_user_meta_data ->> 'sector_id')::uuid;
  end if;

  -- Resolve primeiro subsetor
  if jsonb_typeof(new.raw_user_meta_data -> 'subsector_ids') = 'array' then
    select value::uuid into v_first_subsector
    from jsonb_array_elements_text(new.raw_user_meta_data -> 'subsector_ids')
    limit 1;
  elsif (new.raw_user_meta_data ->> 'subsector_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_first_subsector := (new.raw_user_meta_data ->> 'subsector_id')::uuid;
  end if;

  -- Cria / atualiza perfil
  insert into public.profiles (
    id, email, full_name, company_name, segment,
    sector_id, subsector_id, employees_count,
    phone, state, city,
    role, is_active
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name'),
    nullif(new.raw_user_meta_data ->> 'company_name', ''),
    new.raw_user_meta_data ->> 'segment',
    v_first_sector,
    v_first_subsector,
    case
      when (new.raw_user_meta_data ->> 'employees_count') ~ '^[0-9]+$'
        then (new.raw_user_meta_data ->> 'employees_count')::integer
      else null
    end,
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'state', ''),
    nullif(new.raw_user_meta_data ->> 'city',  ''),
    'client'::public.app_role,
    true
  )
  on conflict (id) do update set
    email          = excluded.email,
    full_name      = coalesce(excluded.full_name,      public.profiles.full_name),
    company_name   = coalesce(excluded.company_name,   public.profiles.company_name),
    segment        = coalesce(excluded.segment,        public.profiles.segment),
    sector_id      = coalesce(excluded.sector_id,      public.profiles.sector_id),
    subsector_id   = coalesce(excluded.subsector_id,   public.profiles.subsector_id),
    employees_count= coalesce(excluded.employees_count,public.profiles.employees_count),
    phone          = coalesce(excluded.phone,          public.profiles.phone),
    state          = coalesce(excluded.state,          public.profiles.state),
    city           = coalesce(excluded.city,           public.profiles.city),
    updated_at     = now();

  -- Sectores do usuário (many-to-many)
  if jsonb_typeof(new.raw_user_meta_data -> 'sector_ids') = 'array' then
    for v_sector_id in
      select value::uuid from jsonb_array_elements_text(new.raw_user_meta_data -> 'sector_ids')
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

  -- Subsetores do usuário (many-to-many)
  if jsonb_typeof(new.raw_user_meta_data -> 'subsector_ids') = 'array' then
    for v_subsector_id in
      select value::uuid from jsonb_array_elements_text(new.raw_user_meta_data -> 'subsector_ids')
    loop
      select sector_id into v_sector_id
      from public.business_subsectors
      where id = v_subsector_id;

      if v_sector_id is not null then
        insert into public.user_subsectors (user_id, sector_id, subsector_id)
        values (new.id, v_sector_id, v_subsector_id)
        on conflict (user_id, subsector_id) do nothing;
      end if;
    end loop;
  elsif v_first_subsector is not null then
    select sector_id into v_sector_id
    from public.business_subsectors
    where id = v_first_subsector;

    if v_sector_id is not null then
      insert into public.user_subsectors (user_id, sector_id, subsector_id)
      values (new.id, v_sector_id, v_first_subsector)
      on conflict (user_id, subsector_id) do nothing;
    end if;
  end if;

  -- Estrutura padrão do DRE
  begin
    perform public.create_default_dre_structure_for_user(new.id);
  exception when others then
    raise warning 'create_default_dre_structure_for_user failed for user %: %', new.id, sqlerrm;
  end;

  return new;
end;
$function$;
