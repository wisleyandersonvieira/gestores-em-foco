-- Additional security hardening from the platform audit.

-- Legacy product records must not be self-deleted or self-granted from the browser.
drop policy if exists "Users can create their own products" on public.user_products;
drop policy if exists "Users can update their own products" on public.user_products;
drop policy if exists "Users can delete their own products" on public.user_products;

-- Legacy DRE/product subscription writes remain admin/backend only.
drop policy if exists "Users can create their own product subscriptions" on public.product_subscriptions;
drop policy if exists "Users can update their own product subscriptions" on public.product_subscriptions;
drop policy if exists "Users can delete their own product subscriptions" on public.product_subscriptions;

-- Keep the old product access helper constrained to the caller or admins.
create or replace function public.check_product_access(p_user_id uuid, p_product_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (p_user_id = auth.uid() or public.is_admin()) and (
    exists (
      select 1
      from public.product_subscriptions
      where user_id = p_user_id
        and product_id = p_product_key
        and status in ('active', 'trialing')
        and (current_period_end is null or current_period_end >= now())
    )
    or exists (
      select 1
      from public.user_products
      where user_id = p_user_id
        and product_type::text = 'dre_facil'
        and status = 'ativo'
        and (expires_at is null or expires_at >= now())
    )
  );
$$;

grant execute on function public.check_product_access(uuid, text) to authenticated;

-- Product access must ignore canceled subscriptions.
create or replace function public.check_product_access_v2(p_user_id uuid, p_product_slug text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (p_user_id = auth.uid() or public.is_admin()) and exists (
    select 1
    from public.user_product_subscriptions ups
    join public.products p on p.id = ups.product_id
    where ups.user_id = p_user_id
      and ups.product_slug = p_product_slug
      and p.slug = p_product_slug
      and p.status = 'active'
      and ups.status in ('active', 'trialing')
      and ups.canceled_at is null
      and (ups.current_period_end is null or ups.current_period_end >= now())
      and (ups.trial_ends_at is null or ups.trial_ends_at >= now() or ups.status <> 'trialing')
  );
$$;

grant execute on function public.check_product_access_v2(uuid, text) to authenticated;

-- Register a completed diagnostic as a legacy user product without allowing arbitrary inserts.
create or replace function public.register_completed_diagnostic_product(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.diagnostic_sessions;
  v_template_name text;
begin
  select *
  into v_session
  from public.diagnostic_sessions
  where id = p_session_id
    and user_id = auth.uid()
    and status = 'completed';

  if v_session.id is null then
    raise exception 'completed diagnostic session not found';
  end if;

  select name
  into v_template_name
  from public.diagnostic_templates
  where id = v_session.template_id;

  insert into public.user_products (
    user_id,
    product_name,
    product_type,
    status,
    purchased_at,
    access_url,
    metadata
  )
  select
    v_session.user_id,
    coalesce(v_template_name, 'Diagnostico Empresarial'),
    'diagnostico',
    'concluido',
    coalesce(v_session.completed_at, now()),
    '/minha-conta/diagnostico/' || v_session.id::text || '/resultado',
    jsonb_build_object('diagnostic_session_id', v_session.id::text)
  where not exists (
    select 1
    from public.user_products
    where user_id = v_session.user_id
      and product_type = 'diagnostico'
      and metadata->>'diagnostic_session_id' = v_session.id::text
  );
end;
$$;

revoke all on function public.register_completed_diagnostic_product(uuid) from public;
grant execute on function public.register_completed_diagnostic_product(uuid) to authenticated;

-- Resolve a diagnostic link by token without reopening table-wide link reads.
create or replace function public.get_diagnostic_link_by_token(p_token text)
returns setof public.diagnostic_links
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.diagnostic_links l
  where l.token = p_token
    and l.status = 'active'
    and (l.expires_at is null or l.expires_at >= now())
    and (l.assigned_user_id is null or l.assigned_user_id = auth.uid() or public.is_admin())
  limit 1;
$$;

revoke all on function public.get_diagnostic_link_by_token(text) from public;
grant execute on function public.get_diagnostic_link_by_token(text) to authenticated;

drop policy if exists "Authenticated can read own or admin links" on public.diagnostic_links;

create policy "Authenticated can read own session or admin links"
on public.diagnostic_links for select
to authenticated
using (
  assigned_user_id = auth.uid()
  or created_by = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.diagnostic_sessions s
    where s.link_id = diagnostic_links.id
      and s.user_id = auth.uid()
  )
);

-- Course access must ignore canceled enrollments.
create or replace function public.has_course_access(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1
    from public.user_course_enrollments e
    join public.courses c on c.id = e.course_id
    where e.user_id = auth.uid()
      and e.course_id = p_course_id
      and c.status = 'published'
      and e.status in ('active', 'trialing')
      and e.canceled_at is null
      and (e.expires_at is null or e.expires_at > now())
  );
$$;

grant execute on function public.has_course_access(uuid) to anon, authenticated;

-- Storage writes for course materials are admin-only and constrained by path/extension.
drop policy if exists "Admins can manage course materials storage" on storage.objects;

create policy "Admins can manage course materials storage"
on storage.objects for all
to authenticated
using (bucket_id = 'course-materials' and public.is_admin())
with check (
  bucket_id = 'course-materials'
  and public.is_admin()
  and lower(name) ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[^/]+\\.(pdf|xls|xlsx|doc|docx|csv|jpg|jpeg|png|webp)$'
);
