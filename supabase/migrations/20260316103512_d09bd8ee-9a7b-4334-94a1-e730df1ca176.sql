
-- Fix security definer views by setting security_invoker = true
ALTER VIEW public.admin_stats_users SET (security_invoker = true);
ALTER VIEW public.admin_stats_templates SET (security_invoker = true);
ALTER VIEW public.admin_stats_links SET (security_invoker = true);
ALTER VIEW public.admin_stats_sessions SET (security_invoker = true);
