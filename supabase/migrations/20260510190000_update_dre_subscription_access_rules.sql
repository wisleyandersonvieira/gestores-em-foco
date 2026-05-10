-- Keep access to Gestor de DRE through the paid period when Stripe schedules
-- cancellation at period end or payment is temporarily past_due.
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
      and (
        ups.status in ('active', 'trialing')
        or (
          ups.status = 'past_due'
          and ups.current_period_end is not null
          and ups.current_period_end >= now()
        )
        or (
          ups.cancel_at_period_end = true
          and ups.current_period_end is not null
          and ups.current_period_end >= now()
          and ups.status not in ('canceled', 'inactive', 'incomplete_expired', 'unpaid', 'paused')
        )
      )
      and (ups.current_period_end is null or ups.current_period_end >= now())
      and (ups.trial_ends_at is null or ups.trial_ends_at >= now() or ups.status <> 'trialing')
      and ups.status not in ('inactive', 'incomplete_expired', 'unpaid', 'paused')
  );
$$;

grant execute on function public.check_product_access_v2(uuid, text) to authenticated;
