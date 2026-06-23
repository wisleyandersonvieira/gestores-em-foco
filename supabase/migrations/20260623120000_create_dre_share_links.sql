-- Table for DRE analysis share links
create table if not exists public.dre_analysis_share_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  dre_model_id uuid not null references public.dre_models(id) on delete cascade,
  analysis_type text not null,
  selected_years text[] not null,
  selected_period_ids text[] not null,
  include_drafts boolean not null default false,
  show_variation boolean not null default false,
  show_vertical_analysis boolean not null default false,
  expires_at timestamptz not null,
  description text,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete cascade,
  revoked_at timestamptz,
  last_accessed_at timestamptz,
  access_count integer not null default 0,
  constraint dre_share_links_token_length check (length(trim(token)) >= 32),
  constraint dre_share_links_analysis_type check (analysis_type in ('monthly', 'quarterly', 'semester'))
);

create index if not exists dre_share_links_token_idx on public.dre_analysis_share_links(token);
create index if not exists dre_share_links_user_id_idx on public.dre_analysis_share_links(user_id);
create index if not exists dre_share_links_expires_at_idx on public.dre_analysis_share_links(expires_at);

alter table public.dre_analysis_share_links enable row level security;

-- Authenticated users can only view and update their own links
-- INSERT is handled via security definer function to enforce model ownership
create policy "Users can view their own dre share links"
  on public.dre_analysis_share_links for select
  using (auth.uid() = user_id);

create policy "Users can update their own dre share links"
  on public.dre_analysis_share_links for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins can manage dre share links"
  on public.dre_analysis_share_links for all
  using (public.is_admin())
  with check (public.is_admin());

-- Function to create a share link (validates model ownership server-side)
create or replace function public.create_dre_share_link(
  p_token text,
  p_dre_model_id uuid,
  p_analysis_type text,
  p_selected_years text[],
  p_selected_period_ids text[],
  p_include_drafts boolean,
  p_show_variation boolean,
  p_show_vertical_analysis boolean,
  p_expires_at timestamptz,
  p_description text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_link_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Não autorizado';
  end if;

  -- Ensure model belongs to authenticated user
  if not exists (
    select 1 from public.dre_models
    where id = p_dre_model_id and user_id = v_user_id
  ) then
    raise exception 'Modelo não encontrado ou sem permissão';
  end if;

  if p_analysis_type not in ('monthly', 'quarterly', 'semester') then
    raise exception 'Tipo de análise inválido';
  end if;

  if p_expires_at <= now() then
    raise exception 'A data de validade deve ser futura';
  end if;

  if p_expires_at > now() + interval '90 days' then
    raise exception 'A data de validade não pode ultrapassar 90 dias';
  end if;

  if length(trim(p_token)) < 32 then
    raise exception 'Token inválido';
  end if;

  insert into public.dre_analysis_share_links (
    token, user_id, dre_model_id, analysis_type,
    selected_years, selected_period_ids,
    include_drafts, show_variation, show_vertical_analysis,
    expires_at, description, created_by
  ) values (
    p_token, v_user_id, p_dre_model_id, p_analysis_type,
    p_selected_years, p_selected_period_ids,
    p_include_drafts, p_show_variation, p_show_vertical_analysis,
    p_expires_at, p_description, v_user_id
  )
  returning id into v_link_id;

  return jsonb_build_object('id', v_link_id, 'token', p_token);
end;
$$;

-- Function to fetch complete DRE analysis data for a public token (no authentication required)
-- The function runs as security definer so it can bypass RLS using the link owner's scope
create or replace function public.fetch_dre_analysis_for_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link record;
  v_model jsonb;
  v_model_lines jsonb;
  v_entries jsonb;
  v_entry_items jsonb;
begin
  if p_token is null or length(trim(p_token)) = 0 then
    return jsonb_build_object('error', 'invalid_token');
  end if;

  select * into v_link
  from public.dre_analysis_share_links
  where token = p_token;

  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;

  if v_link.revoked_at is not null then
    return jsonb_build_object('error', 'revoked');
  end if;

  if v_link.expires_at < now() then
    return jsonb_build_object('error', 'expired');
  end if;

  -- Track access without failing the request if update errors
  begin
    update public.dre_analysis_share_links
    set last_accessed_at = now(), access_count = access_count + 1
    where id = v_link.id;
  exception when others then
    null;
  end;

  -- Fetch model
  select to_jsonb(m) into v_model
  from public.dre_models m
  where m.id = v_link.dre_model_id and m.user_id = v_link.user_id;

  if v_model is null then
    return jsonb_build_object('error', 'not_found');
  end if;

  -- Fetch model lines with joined categories and subcategories
  select jsonb_agg(
    jsonb_build_object(
      'id', ml.id,
      'user_id', ml.user_id,
      'model_id', ml.model_id,
      'category_id', ml.category_id,
      'subcategory_id', ml.subcategory_id,
      'line_type', ml.line_type,
      'parent_category_id', ml.parent_category_id,
      'sum_label', ml.sum_label,
      'display_order', ml.display_order,
      'financial_type', ml.financial_type,
      'is_net_income', ml.is_net_income,
      'created_at', ml.created_at,
      'category', case when c.id is not null then jsonb_build_object(
        'id', c.id,
        'user_id', c.user_id,
        'name', c.name,
        'type', c.type,
        'status', c.status,
        'is_revenue', c.is_revenue,
        'display_order', c.display_order,
        'created_at', c.created_at,
        'updated_at', c.updated_at
      ) else null end,
      'subcategory', case when sc.id is not null then jsonb_build_object(
        'id', sc.id,
        'user_id', sc.user_id,
        'name', sc.name,
        'category_id', sc.category_id,
        'status', sc.status,
        'display_order', sc.display_order,
        'is_reductive', sc.is_reductive,
        'created_at', sc.created_at,
        'updated_at', sc.updated_at
      ) else null end
    ) order by ml.display_order
  ) into v_model_lines
  from public.dre_model_lines ml
  left join public.dre_categories c on c.id = ml.category_id
  left join public.dre_subcategories sc on sc.id = ml.subcategory_id
  where ml.model_id = v_link.dre_model_id and ml.user_id = v_link.user_id;

  -- Fetch entries matching the saved year filter
  select jsonb_agg(
    jsonb_build_object(
      'id', e.id,
      'user_id', e.user_id,
      'model_id', e.model_id,
      'competence', e.competence,
      'status', e.status,
      'total_credit', e.total_credit,
      'total_debit', e.total_debit,
      'result', e.result,
      'margin_percentage', e.margin_percentage,
      'created_at', e.created_at,
      'updated_at', e.updated_at,
      'model', jsonb_build_object('id', mdl.id, 'name', mdl.name)
    ) order by e.competence
  ) into v_entries
  from public.dre_entries e
  left join public.dre_models mdl on mdl.id = e.model_id
  where e.user_id = v_link.user_id
    and e.model_id = v_link.dre_model_id
    and substring(e.competence, 1, 4) = any(v_link.selected_years)
    and (v_link.include_drafts or e.status = 'finalized');

  -- Fetch entry items enriched with category_is_revenue, subcategory_is_reductive, is_net_income
  select jsonb_agg(
    jsonb_build_object(
      'id', ei.id,
      'user_id', ei.user_id,
      'dre_entry_id', ei.dre_entry_id,
      'category_id', ei.category_id,
      'subcategory_id', ei.subcategory_id,
      'category_name_snapshot', ei.category_name_snapshot,
      'subcategory_name_snapshot', ei.subcategory_name_snapshot,
      'category_type_snapshot', ei.category_type_snapshot,
      'line_type', ei.line_type,
      'display_order', ei.display_order,
      'value', ei.value,
      'created_at', ei.created_at,
      'updated_at', ei.updated_at,
      'category_is_revenue', coalesce(cat.is_revenue, false),
      'subcategory_is_reductive', coalesce(sc.is_reductive, false),
      'is_net_income', (
        ei.line_type = 'sum' and exists (
          select 1 from public.dre_model_lines nml
          where nml.model_id = v_link.dre_model_id
            and nml.user_id = v_link.user_id
            and nml.line_type = 'sum'
            and nml.display_order = ei.display_order
            and (nml.is_net_income = true or nml.financial_type::text = 'net_profit')
        )
      )
    ) order by ei.dre_entry_id, ei.display_order
  ) into v_entry_items
  from public.dre_entry_items ei
  left join public.dre_categories cat on cat.id = ei.category_id
  left join public.dre_subcategories sc on sc.id = ei.subcategory_id
  where ei.user_id = v_link.user_id
    and ei.dre_entry_id in (
      select id from public.dre_entries
      where user_id = v_link.user_id
        and model_id = v_link.dre_model_id
        and substring(competence, 1, 4) = any(v_link.selected_years)
        and (v_link.include_drafts or status = 'finalized')
    );

  return jsonb_build_object(
    'link', jsonb_build_object(
      'id', v_link.id,
      'analysis_type', v_link.analysis_type,
      'selected_years', v_link.selected_years,
      'selected_period_ids', v_link.selected_period_ids,
      'include_drafts', v_link.include_drafts,
      'show_variation', v_link.show_variation,
      'show_vertical_analysis', v_link.show_vertical_analysis,
      'expires_at', v_link.expires_at,
      'description', v_link.description,
      'created_at', v_link.created_at
    ),
    'model', v_model,
    'model_lines', coalesce(v_model_lines, '[]'::jsonb),
    'entries', coalesce(v_entries, '[]'::jsonb),
    'entry_items', coalesce(v_entry_items, '[]'::jsonb)
  );
end;
$$;

-- Grant the public token lookup to anon so the public page can call it without a session
grant execute on function public.fetch_dre_analysis_for_token(text) to anon, authenticated;
grant execute on function public.create_dre_share_link(text, uuid, text, text[], text[], boolean, boolean, boolean, timestamptz, text) to authenticated;
