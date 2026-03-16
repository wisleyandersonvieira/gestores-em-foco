
-- Fix search_path warning on handle_updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 8. ADMIN DASHBOARD VIEWS
-- ============================================================

-- Total registered users
CREATE OR REPLACE VIEW public.admin_stats_users AS
SELECT
  count(*) AS total_users,
  count(*) FILTER (WHERE is_active) AS active_users,
  count(*) FILTER (WHERE role = 'admin') AS total_admins
FROM public.profiles;

-- Template stats
CREATE OR REPLACE VIEW public.admin_stats_templates AS
SELECT
  count(*) AS total_templates,
  count(*) FILTER (WHERE status = 'published' AND is_active) AS published_active,
  count(*) FILTER (WHERE status = 'draft') AS drafts,
  count(*) FILTER (WHERE status = 'archived') AS archived
FROM public.diagnostic_templates;

-- Recent links (last 30 days)
CREATE OR REPLACE VIEW public.admin_stats_links AS
SELECT
  count(*) AS total_links,
  count(*) FILTER (WHERE created_at >= now() - interval '30 days') AS recent_links,
  count(*) FILTER (WHERE status = 'active') AS active_links
FROM public.diagnostic_links;

-- Session stats with completion rate per template
CREATE OR REPLACE VIEW public.admin_stats_sessions AS
SELECT
  t.id AS template_id,
  t.name AS template_name,
  count(s.id) AS total_sessions,
  count(s.id) FILTER (WHERE s.status = 'completed') AS completed_sessions,
  CASE
    WHEN count(s.id) > 0
    THEN round((count(s.id) FILTER (WHERE s.status = 'completed')::numeric / count(s.id)) * 100, 2)
    ELSE 0
  END AS completion_rate
FROM public.diagnostic_templates t
LEFT JOIN public.diagnostic_sessions s ON s.template_id = t.id
GROUP BY t.id, t.name;

-- Secure the views: only admin can read
ALTER VIEW public.admin_stats_users OWNER TO postgres;
ALTER VIEW public.admin_stats_templates OWNER TO postgres;
ALTER VIEW public.admin_stats_links OWNER TO postgres;
ALTER VIEW public.admin_stats_sessions OWNER TO postgres;
