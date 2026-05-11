create table if not exists public.user_sectors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sector_id uuid not null references public.business_sectors(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_sectors_user_sector_unique unique (user_id, sector_id)
);

create table if not exists public.user_subsectors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sector_id uuid not null references public.business_sectors(id) on delete cascade,
  subsector_id uuid not null references public.business_subsectors(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_subsectors_user_subsector_unique unique (user_id, subsector_id)
);

create table if not exists public.community_topics (
  id uuid primary key default gen_random_uuid(),
  community_type text not null check (community_type in ('sector', 'subsector')),
  sector_id uuid references public.business_sectors(id) on delete cascade,
  subsector_id uuid references public.business_subsectors(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  status text not null default 'active' check (status in ('active', 'hidden', 'deleted')),
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_topics_target_check check (
    (community_type = 'sector' and sector_id is not null and subsector_id is null)
    or
    (community_type = 'subsector' and sector_id is not null and subsector_id is not null)
  ),
  constraint community_topics_title_length check (length(trim(title)) between 1 and 120),
  constraint community_topics_content_length check (length(trim(content)) between 1 and 5000)
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.community_topics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  status text not null default 'active' check (status in ('active', 'hidden', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_comments_content_length check (length(trim(content)) between 1 and 2000)
);

create table if not exists public.community_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_type text not null default 'online' check (event_type in ('online', 'presencial', 'hibrido')),
  start_at timestamptz not null,
  end_at timestamptz,
  location text,
  meeting_url text,
  image_url text,
  status text not null default 'published' check (status in ('draft', 'published', 'canceled', 'archived')),
  visibility_type text not null default 'all' check (visibility_type in ('all', 'sector', 'subsector', 'custom')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_events_title_length check (length(trim(title)) between 1 and 160)
);

create table if not exists public.community_event_targets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.community_events(id) on delete cascade,
  target_type text not null check (target_type in ('sector', 'subsector')),
  sector_id uuid references public.business_sectors(id) on delete cascade,
  subsector_id uuid references public.business_subsectors(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint community_event_targets_target_check check (
    (target_type = 'sector' and sector_id is not null and subsector_id is null)
    or
    (target_type = 'subsector' and sector_id is not null and subsector_id is not null)
  )
);

create index if not exists user_sectors_user_idx on public.user_sectors(user_id);
create index if not exists user_sectors_sector_idx on public.user_sectors(sector_id);
create index if not exists user_subsectors_user_idx on public.user_subsectors(user_id);
create index if not exists user_subsectors_subsector_idx on public.user_subsectors(subsector_id);
create index if not exists community_topics_target_idx on public.community_topics(community_type, sector_id, subsector_id, status, updated_at desc);
create index if not exists community_comments_topic_idx on public.community_comments(topic_id, created_at);
create index if not exists community_events_status_start_idx on public.community_events(status, start_at);
create index if not exists community_event_targets_event_idx on public.community_event_targets(event_id);
create index if not exists community_event_targets_sector_idx on public.community_event_targets(sector_id);
create index if not exists community_event_targets_subsector_idx on public.community_event_targets(subsector_id);

drop trigger if exists set_community_topics_updated_at on public.community_topics;
drop trigger if exists set_community_comments_updated_at on public.community_comments;
drop trigger if exists set_community_events_updated_at on public.community_events;

create trigger set_community_topics_updated_at before update on public.community_topics
  for each row execute function public.set_updated_at();
create trigger set_community_comments_updated_at before update on public.community_comments
  for each row execute function public.set_updated_at();
create trigger set_community_events_updated_at before update on public.community_events
  for each row execute function public.set_updated_at();

create or replace function public.validate_user_subsector_sector()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.business_subsectors bs
    where bs.id = new.subsector_id
      and bs.sector_id = new.sector_id
  ) then
    raise exception 'subsector_must_belong_to_sector';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_user_subsectors_sector on public.user_subsectors;
create trigger validate_user_subsectors_sector
before insert or update of sector_id, subsector_id on public.user_subsectors
for each row execute function public.validate_user_subsector_sector();

create or replace function public.user_belongs_to_community(p_user_id uuid, p_community_type text, p_sector_id uuid, p_subsector_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_admin() then true
    when p_community_type = 'sector' then exists (
      select 1 from public.user_sectors us
      where us.user_id = p_user_id and us.sector_id = p_sector_id
    )
    when p_community_type = 'subsector' then exists (
      select 1 from public.user_subsectors uss
      where uss.user_id = p_user_id and uss.subsector_id = p_subsector_id
    )
    else false
  end;
$$;

create or replace function public.community_event_visible_to_user(p_event_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.community_events ce
    where ce.id = p_event_id
      and (
        public.is_admin()
        or (
          ce.status = 'published'
          and (
            ce.visibility_type = 'all'
            or exists (
              select 1
              from public.community_event_targets cet
              join public.user_sectors us on us.user_id = p_user_id and us.sector_id = cet.sector_id
              where cet.event_id = ce.id and cet.target_type = 'sector'
            )
            or exists (
              select 1
              from public.community_event_targets cet
              join public.user_subsectors uss on uss.user_id = p_user_id and uss.subsector_id = cet.subsector_id
              where cet.event_id = ce.id and cet.target_type = 'subsector'
            )
          )
        )
      )
  );
$$;

create or replace function public.sync_user_community_memberships(p_sector_ids uuid[], p_subsector_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_first_sector uuid;
  v_first_subsector uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  delete from public.user_subsectors where user_id = v_user_id;
  delete from public.user_sectors where user_id = v_user_id;

  insert into public.user_sectors (user_id, sector_id)
  select distinct v_user_id, bs.id
  from public.business_sectors bs
  where bs.id = any(coalesce(p_sector_ids, array[]::uuid[]));

  insert into public.user_subsectors (user_id, sector_id, subsector_id)
  select distinct v_user_id, bs.sector_id, bs.id
  from public.business_subsectors bs
  where bs.id = any(coalesce(p_subsector_ids, array[]::uuid[]))
    and bs.sector_id in (select us.sector_id from public.user_sectors us where us.user_id = v_user_id);

  select sector_id into v_first_sector from public.user_sectors where user_id = v_user_id order by created_at limit 1;
  select subsector_id into v_first_subsector from public.user_subsectors where user_id = v_user_id order by created_at limit 1;

  update public.profiles
  set sector_id = v_first_sector,
      subsector_id = v_first_subsector,
      updated_at = now()
  where id = v_user_id;

  insert into public.user_profiles (user_id, sector_id, subsector_id)
  values (v_user_id, v_first_sector, v_first_subsector)
  on conflict (user_id) do update set
    sector_id = excluded.sector_id,
    subsector_id = excluded.subsector_id,
    updated_at = now();
end;
$$;

create or replace function public.get_my_community_overview()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with
  my_sectors as (
    select bs.id, bs.name
    from public.user_sectors us
    join public.business_sectors bs on bs.id = us.sector_id
    where us.user_id = auth.uid()
    order by bs.display_order, bs.name
  ),
  my_subsectors as (
    select bss.id, bss.name, bss.sector_id, bs.name as sector_name
    from public.user_subsectors uss
    join public.business_subsectors bss on bss.id = uss.subsector_id
    join public.business_sectors bs on bs.id = bss.sector_id
    where uss.user_id = auth.uid()
    order by bs.display_order, bss.display_order, bss.name
  ),
  sector_users as (
    select count(distinct us2.user_id) as total
    from public.user_sectors us2
    where us2.sector_id in (select id from my_sectors)
  ),
  subsector_users as (
    select count(distinct uss2.user_id) as total
    from public.user_subsectors uss2
    where uss2.subsector_id in (select id from my_subsectors)
  ),
  events as (
    select count(*) as total
    from public.community_events ce
    where public.community_event_visible_to_user(ce.id, auth.uid())
  ),
  topics as (
    select coalesce(jsonb_agg(to_jsonb(t) order by t.updated_at desc), '[]'::jsonb) as items
    from (
      select ct.id, ct.title, ct.community_type, ct.created_at, ct.updated_at, ct.is_pinned,
        coalesce(bs.name, bss.name) as community_name
      from public.community_topics ct
      left join public.business_sectors bs on bs.id = ct.sector_id and ct.community_type = 'sector'
      left join public.business_subsectors bss on bss.id = ct.subsector_id and ct.community_type = 'subsector'
      where ct.status = 'active'
        and public.user_belongs_to_community(auth.uid(), ct.community_type, ct.sector_id, ct.subsector_id)
      order by ct.is_pinned desc, ct.updated_at desc
      limit 5
    ) t
  )
  select jsonb_build_object(
    'my_sectors', coalesce((select jsonb_agg(to_jsonb(my_sectors)) from my_sectors), '[]'::jsonb),
    'my_subsectors', coalesce((select jsonb_agg(to_jsonb(my_subsectors)) from my_subsectors), '[]'::jsonb),
    'users_in_my_sectors_count', coalesce((select total from sector_users), 0),
    'users_in_my_subsectors_count', coalesce((select total from subsector_users), 0),
    'available_events_count', coalesce((select total from events), 0),
    'recent_topics', coalesce((select items from topics), '[]'::jsonb)
  );
$$;

create or replace function public.get_my_community_topics(p_filter_type text default 'all', p_filter_id uuid default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(to_jsonb(t) order by t.is_pinned desc, t.updated_at desc), '[]'::jsonb)
  from (
    select ct.id, ct.title, ct.content, ct.community_type, ct.sector_id, ct.subsector_id, ct.user_id,
      ct.status, ct.is_pinned, ct.created_at, ct.updated_at,
      coalesce(p.full_name, p.email, 'Usuário') as author_name,
      coalesce(bs.name, bss.name) as community_name,
      (select count(*) from public.community_comments cc where cc.topic_id = ct.id and cc.status = 'active') as comments_count
    from public.community_topics ct
    left join public.profiles p on p.id = ct.user_id
    left join public.business_sectors bs on bs.id = ct.sector_id and ct.community_type = 'sector'
    left join public.business_subsectors bss on bss.id = ct.subsector_id and ct.community_type = 'subsector'
    where ct.status = 'active'
      and public.user_belongs_to_community(auth.uid(), ct.community_type, ct.sector_id, ct.subsector_id)
      and (
        p_filter_type = 'all'
        or (p_filter_type = 'sector' and ct.community_type = 'sector' and ct.sector_id = p_filter_id)
        or (p_filter_type = 'subsector' and ct.community_type = 'subsector' and ct.subsector_id = p_filter_id)
      )
    order by ct.is_pinned desc, ct.updated_at desc
    limit 100
  ) t;
$$;

create or replace function public.create_community_topic(p_community_type text, p_sector_id uuid, p_subsector_id uuid, p_title text, p_content text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_topic_id uuid;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;
  if not public.user_belongs_to_community(v_user_id, p_community_type, p_sector_id, p_subsector_id) then raise exception 'forbidden'; end if;
  if length(trim(coalesce(p_title, ''))) = 0 or length(trim(p_title)) > 120 then raise exception 'invalid_title'; end if;
  if length(trim(coalesce(p_content, ''))) = 0 or length(trim(p_content)) > 5000 then raise exception 'invalid_content'; end if;

  insert into public.community_topics (community_type, sector_id, subsector_id, user_id, title, content)
  values (p_community_type, p_sector_id, p_subsector_id, v_user_id, trim(p_title), trim(p_content))
  returning id into v_topic_id;
  return v_topic_id;
end;
$$;

create or replace function public.get_community_topic_comments(p_topic_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at), '[]'::jsonb)
  from (
    select cc.id, cc.topic_id, cc.user_id, cc.content, cc.created_at, coalesce(p.full_name, p.email, 'Usuário') as author_name
    from public.community_comments cc
    join public.community_topics ct on ct.id = cc.topic_id
    left join public.profiles p on p.id = cc.user_id
    where cc.topic_id = p_topic_id
      and cc.status = 'active'
      and public.user_belongs_to_community(auth.uid(), ct.community_type, ct.sector_id, ct.subsector_id)
    order by cc.created_at
  ) c;
$$;

create or replace function public.create_community_comment(p_topic_id uuid, p_content text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_topic public.community_topics;
  v_comment_id uuid;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;
  select * into v_topic from public.community_topics where id = p_topic_id and status = 'active';
  if v_topic.id is null then raise exception 'topic_not_found'; end if;
  if not public.user_belongs_to_community(v_user_id, v_topic.community_type, v_topic.sector_id, v_topic.subsector_id) then raise exception 'forbidden'; end if;
  if length(trim(coalesce(p_content, ''))) = 0 or length(trim(p_content)) > 2000 then raise exception 'invalid_content'; end if;

  insert into public.community_comments (topic_id, user_id, content)
  values (p_topic_id, v_user_id, trim(p_content))
  returning id into v_comment_id;

  update public.community_topics set updated_at = now() where id = p_topic_id;
  return v_comment_id;
end;
$$;

create or replace function public.get_my_community_events()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(to_jsonb(e) order by e.start_at), '[]'::jsonb)
  from (
    select ce.*,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'target_type', cet.target_type,
          'sector_id', cet.sector_id,
          'subsector_id', cet.subsector_id,
          'sector_name', bs.name,
          'subsector_name', bss.name
        ))
        from public.community_event_targets cet
        left join public.business_sectors bs on bs.id = cet.sector_id
        left join public.business_subsectors bss on bss.id = cet.subsector_id
        where cet.event_id = ce.id
      ), '[]'::jsonb) as targets
    from public.community_events ce
    where public.community_event_visible_to_user(ce.id, auth.uid())
    order by ce.start_at
  ) e;
$$;

alter table public.user_sectors enable row level security;
alter table public.user_subsectors enable row level security;
alter table public.community_topics enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_events enable row level security;
alter table public.community_event_targets enable row level security;

drop policy if exists "Users manage own sectors" on public.user_sectors;
drop policy if exists "Admins view all user sectors" on public.user_sectors;
drop policy if exists "Users manage own subsectors" on public.user_subsectors;
drop policy if exists "Admins view all user subsectors" on public.user_subsectors;

create policy "Users manage own sectors" on public.user_sectors
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Admins view all user sectors" on public.user_sectors
for select to authenticated using (public.is_admin());
create policy "Users manage own subsectors" on public.user_subsectors
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Admins view all user subsectors" on public.user_subsectors
for select to authenticated using (public.is_admin());

create policy "Community topics visible to members" on public.community_topics
for select to authenticated using (public.user_belongs_to_community(auth.uid(), community_type, sector_id, subsector_id) and (status = 'active' or public.is_admin()));
create policy "Community topics insert by members" on public.community_topics
for insert to authenticated with check (user_id = auth.uid() and public.user_belongs_to_community(auth.uid(), community_type, sector_id, subsector_id));
create policy "Community topics update by owners or admins" on public.community_topics
for update to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

create policy "Community comments visible to topic members" on public.community_comments
for select to authenticated using (
  exists (
    select 1 from public.community_topics ct
    where ct.id = community_comments.topic_id
      and public.user_belongs_to_community(auth.uid(), ct.community_type, ct.sector_id, ct.subsector_id)
  )
  and (status = 'active' or public.is_admin())
);
create policy "Community comments insert by topic members" on public.community_comments
for insert to authenticated with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.community_topics ct
    where ct.id = community_comments.topic_id
      and public.user_belongs_to_community(auth.uid(), ct.community_type, ct.sector_id, ct.subsector_id)
  )
);
create policy "Community comments update by owners or admins" on public.community_comments
for update to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

create policy "Community events visible by target" on public.community_events
for select to authenticated using (public.community_event_visible_to_user(id, auth.uid()));
create policy "Admins manage community events" on public.community_events
for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Community event targets visible through event" on public.community_event_targets
for select to authenticated using (exists (select 1 from public.community_events ce where ce.id = event_id and public.community_event_visible_to_user(ce.id, auth.uid())));
create policy "Admins manage community event targets" on public.community_event_targets
for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.user_sectors (user_id, sector_id)
select id, sector_id from public.profiles where sector_id is not null
on conflict (user_id, sector_id) do nothing;

insert into public.user_subsectors (user_id, sector_id, subsector_id)
select p.id, bss.sector_id, p.subsector_id
from public.profiles p
join public.business_subsectors bss on bss.id = p.subsector_id
where p.subsector_id is not null
on conflict (user_id, subsector_id) do nothing;

revoke all on function public.sync_user_community_memberships(uuid[], uuid[]) from public;
revoke all on function public.get_my_community_overview() from public;
revoke all on function public.get_my_community_topics(text, uuid) from public;
revoke all on function public.create_community_topic(text, uuid, uuid, text, text) from public;
revoke all on function public.get_community_topic_comments(uuid) from public;
revoke all on function public.create_community_comment(uuid, text) from public;
revoke all on function public.get_my_community_events() from public;

grant execute on function public.sync_user_community_memberships(uuid[], uuid[]) to authenticated;
grant execute on function public.get_my_community_overview() to authenticated;
grant execute on function public.get_my_community_topics(text, uuid) to authenticated;
grant execute on function public.create_community_topic(text, uuid, uuid, text, text) to authenticated;
grant execute on function public.get_community_topic_comments(uuid) to authenticated;
grant execute on function public.create_community_comment(uuid, text) to authenticated;
grant execute on function public.get_my_community_events() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

  return new;
end;
$$;
