alter table public.products
  add column if not exists is_public_visible boolean not null default true;

alter table public.courses
  add column if not exists is_public_visible boolean not null default true;

create index if not exists idx_products_public_visible
  on public.products (is_public_visible);

create index if not exists idx_courses_public_visible
  on public.courses (is_public_visible);

drop policy if exists "Authenticated users can view active products" on public.products;
drop policy if exists "Admins can manage products" on public.products;

create policy "Public visible products are readable"
  on public.products
  for select
  to anon, authenticated
  using (
    public.is_admin()
    or (status = 'active' and is_public_visible = true)
    or exists (
      select 1
      from public.user_product_subscriptions ups
      where ups.user_id = auth.uid()
        and ups.product_id = products.id
    )
  );

create policy "Admins can manage products"
  on public.products
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

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
      and (e.expires_at is null or e.expires_at > now())
  );
$$;

grant execute on function public.has_course_access(uuid) to anon, authenticated;

drop policy if exists "Published courses are visible" on public.courses;
drop policy if exists "Admins can manage courses" on public.courses;
drop policy if exists "Visible course modules" on public.course_modules;
drop policy if exists "Visible course lessons" on public.course_lessons;

create policy "Visible courses are readable"
  on public.courses
  for select
  to anon, authenticated
  using (
    public.is_admin()
    or (status = 'published' and is_public_visible = true)
    or public.has_course_access(id)
  );

create policy "Admins can manage courses"
  on public.courses
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Visible course modules"
  on public.course_modules
  for select
  to anon, authenticated
  using (
    public.is_admin()
    or (
      status = 'active'
      and exists (
        select 1
        from public.courses c
        where c.id = course_id
          and c.status = 'published'
          and (c.is_public_visible = true or public.has_course_access(c.id))
      )
    )
  );

create policy "Visible course lessons"
  on public.course_lessons
  for select
  to anon, authenticated
  using (
    public.is_admin()
    or (
      status = 'active'
      and exists (
        select 1
        from public.courses c
        where c.id = course_id
          and c.status = 'published'
          and (c.is_public_visible = true or public.has_course_access(c.id))
      )
      and (is_preview = true or public.has_course_access(course_id))
    )
  );
