-- Reescreve políticas de diagnostic_templates sem dependência de is_admin()
DROP POLICY IF EXISTS "Admin can insert templates" ON public.diagnostic_templates;
DROP POLICY IF EXISTS "Admin can update templates" ON public.diagnostic_templates;
DROP POLICY IF EXISTS "Admin can delete templates" ON public.diagnostic_templates;
DROP POLICY IF EXISTS "Authenticated can read accessible templates" ON public.diagnostic_templates;

CREATE POLICY "Admin can insert templates"
ON public.diagnostic_templates
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'::public.app_role
  )
);

CREATE POLICY "Admin can update templates"
ON public.diagnostic_templates
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'::public.app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'::public.app_role
  )
);

CREATE POLICY "Admin can delete templates"
ON public.diagnostic_templates
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'::public.app_role
  )
);

CREATE POLICY "Authenticated can read accessible templates"
ON public.diagnostic_templates
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'::public.app_role
  )
  OR (
    diagnostic_templates.status = 'published'::public.template_status
    AND diagnostic_templates.is_active = true
  )
  OR EXISTS (
    SELECT 1
    FROM public.diagnostic_sessions s
    WHERE s.template_id = diagnostic_templates.id
      AND s.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.diagnostic_links l
    WHERE l.template_id = diagnostic_templates.id
      AND (
        l.assigned_user_id = auth.uid()
        OR (
          l.assigned_user_id IS NULL
          AND l.status = 'active'::public.link_status
        )
      )
  )
);