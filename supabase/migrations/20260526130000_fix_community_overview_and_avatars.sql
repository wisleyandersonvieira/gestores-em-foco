-- Fix get_my_community_overview: add content, author_name, author_avatar_url and comments_count to recent_topics
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
      select
        ct.id,
        ct.title,
        ct.content,
        ct.community_type,
        ct.created_at,
        ct.updated_at,
        ct.is_pinned,
        coalesce(p.full_name, p.email, 'Usuário') as author_name,
        up.avatar_url as author_avatar_url,
        coalesce(bs.name, bss.name) as community_name,
        (select count(*) from public.community_comments cc where cc.topic_id = ct.id and cc.status = 'active') as comments_count
      from public.community_topics ct
      left join public.profiles p on p.id = ct.user_id
      left join public.user_profiles up on up.user_id = ct.user_id
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

-- Fix get_my_community_topics: add author_avatar_url
create or replace function public.get_my_community_topics(p_filter_type text default 'all', p_filter_id uuid default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(to_jsonb(t) order by t.is_pinned desc, t.updated_at desc), '[]'::jsonb)
  from (
    select
      ct.id,
      ct.title,
      ct.content,
      ct.community_type,
      ct.sector_id,
      ct.subsector_id,
      ct.user_id,
      ct.status,
      ct.is_pinned,
      ct.created_at,
      ct.updated_at,
      coalesce(p.full_name, p.email, 'Usuário') as author_name,
      up.avatar_url as author_avatar_url,
      coalesce(bs.name, bss.name) as community_name,
      (select count(*) from public.community_comments cc where cc.topic_id = ct.id and cc.status = 'active') as comments_count
    from public.community_topics ct
    left join public.profiles p on p.id = ct.user_id
    left join public.user_profiles up on up.user_id = ct.user_id
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

-- Fix get_community_topic_comments: add author_avatar_url
create or replace function public.get_community_topic_comments(p_topic_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at), '[]'::jsonb)
  from (
    select
      cc.id,
      cc.topic_id,
      cc.user_id,
      cc.content,
      cc.created_at,
      coalesce(p.full_name, p.email, 'Usuário') as author_name,
      up.avatar_url as author_avatar_url
    from public.community_comments cc
    join public.community_topics ct on ct.id = cc.topic_id
    left join public.profiles p on p.id = cc.user_id
    left join public.user_profiles up on up.user_id = cc.user_id
    where cc.topic_id = p_topic_id
      and cc.status = 'active'
      and public.user_belongs_to_community(auth.uid(), ct.community_type, ct.sector_id, ct.subsector_id)
    order by cc.created_at
  ) c;
$$;
