-- M1: Restringir listagem do bucket avatars (mantém leitura pública via URL CDN, pois bucket é public)
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

CREATE POLICY "Users can list own avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.is_admin()
  )
);

-- M2: Padronizar diagnostic_templates para usar is_admin() ao invés de profiles.role
DROP POLICY IF EXISTS "Admin can delete templates" ON public.diagnostic_templates;
DROP POLICY IF EXISTS "Admin can insert templates" ON public.diagnostic_templates;
DROP POLICY IF EXISTS "Admin can update templates" ON public.diagnostic_templates;
DROP POLICY IF EXISTS "Authenticated can read accessible templates" ON public.diagnostic_templates;

CREATE POLICY "Admins can delete templates"
ON public.diagnostic_templates
FOR DELETE
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can insert templates"
ON public.diagnostic_templates
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update templates"
ON public.diagnostic_templates
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated can read accessible templates"
ON public.diagnostic_templates
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR (status = 'published' AND is_active = true)
  OR EXISTS (
    SELECT 1 FROM public.diagnostic_sessions s
    WHERE s.template_id = diagnostic_templates.id AND s.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.diagnostic_links l
    WHERE l.template_id = diagnostic_templates.id
      AND (l.assigned_user_id = auth.uid() OR (l.assigned_user_id IS NULL AND l.status = 'active'))
  )
);