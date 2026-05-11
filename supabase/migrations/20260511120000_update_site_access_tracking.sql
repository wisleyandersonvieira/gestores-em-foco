alter table public.site_access_logs
add column if not exists event_type text not null default 'page_view',
add column if not exists metadata jsonb not null default '{}'::jsonb,
add column if not exists product_slug text;

update public.site_access_logs
set event_type = access_type
where event_type is null;

alter table public.site_access_logs
drop constraint if exists site_access_logs_event_type_check;

alter table public.site_access_logs
add constraint site_access_logs_event_type_check
check (event_type in ('page_view', 'user_panel_access', 'product_access', 'product_view', 'admin_denied', 'export_requested', 'support_created'));

alter table public.site_access_logs
drop constraint if exists site_access_logs_access_type_check;

alter table public.site_access_logs
add constraint site_access_logs_access_type_check
check (access_type in ('page_view', 'user_panel_access', 'product_access', 'product_view', 'admin_denied', 'export_requested', 'support_created'));

create index if not exists idx_site_access_logs_event_type_created_at
on public.site_access_logs (event_type, created_at desc);

create index if not exists idx_site_access_logs_user_event_created_at
on public.site_access_logs (user_id, event_type, created_at desc);

create index if not exists idx_site_access_logs_product_event_created_at
on public.site_access_logs (product_slug, event_type, created_at desc);

create or replace function public.log_user_access(
  p_event_type text,
  p_product_slug text default null,
  p_page text default null,
  p_session_id text default null,
  p_page_title text default null,
  p_referrer text default null,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_id uuid;
  v_log_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_event_type not in ('user_panel_access', 'product_access') then
    raise exception 'invalid_event_type';
  end if;

  if p_event_type = 'user_panel_access' then
    select id
    into v_existing_id
    from public.site_access_logs
    where user_id = v_user_id
      and event_type = 'user_panel_access'
      and created_at >= now() - interval '30 minutes'
    order by created_at desc
    limit 1;

    if v_existing_id is not null then
      return v_existing_id;
    end if;
  end if;

  if p_event_type = 'product_access' then
    if nullif(p_product_slug, '') is null then
      raise exception 'product_slug_required';
    end if;

    select id
    into v_existing_id
    from public.site_access_logs
    where user_id = v_user_id
      and event_type = 'product_access'
      and product_slug = p_product_slug
      and created_at >= now() - interval '30 minutes'
    order by created_at desc
    limit 1;

    if v_existing_id is not null then
      return v_existing_id;
    end if;
  end if;

  insert into public.site_access_logs (
    user_id,
    path,
    page_title,
    product_slug,
    referrer,
    user_agent,
    session_id,
    access_type,
    event_type
  )
  values (
    v_user_id,
    p_page,
    p_page_title,
    case when p_event_type = 'product_access' then p_product_slug else null end,
    p_referrer,
    p_user_agent,
    p_session_id,
    p_event_type,
    p_event_type
  )
  returning id into v_log_id;

  return v_log_id;
end;
$$;

revoke all on function public.log_user_access(text, text, text, text, text, text, text) from public;
grant execute on function public.log_user_access(text, text, text, text, text, text, text) to authenticated;
