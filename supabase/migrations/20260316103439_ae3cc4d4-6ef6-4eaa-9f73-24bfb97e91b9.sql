
-- ============================================================
-- 4. UTILITY FUNCTIONS
-- ============================================================

-- 4.1 is_admin(): checks if current user is admin (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 4.2 handle_updated_at(): generic trigger to set updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 4.3 handle_new_user(): auto-create profile from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, company_name, segment, employees_count)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'name',
    NEW.raw_user_meta_data ->> 'company_name',
    NEW.raw_user_meta_data ->> 'segment',
    (NEW.raw_user_meta_data ->> 'employees_count')::integer
  );
  RETURN NEW;
END;
$$;

-- ============================================================
-- 5. TRIGGERS
-- ============================================================

-- 5.1 Auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5.2 updated_at triggers
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_templates
  BEFORE UPDATE ON public.diagnostic_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_categories
  BEFORE UPDATE ON public.diagnostic_categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_questions
  BEFORE UPDATE ON public.diagnostic_questions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_links
  BEFORE UPDATE ON public.diagnostic_links
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_sessions
  BEFORE UPDATE ON public.diagnostic_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_answers
  BEFORE UPDATE ON public.diagnostic_answers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_reports
  BEFORE UPDATE ON public.diagnostic_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 6. ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_reports ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 7. RLS POLICIES
-- ============================================================

-- ── profiles ──
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

-- ── diagnostic_templates ──
CREATE POLICY "Anyone authenticated can read published templates"
  ON public.diagnostic_templates FOR SELECT TO authenticated
  USING (
    (status = 'published' AND is_active = TRUE)
    OR public.is_admin()
  );

CREATE POLICY "Admin can insert templates"
  ON public.diagnostic_templates FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update templates"
  ON public.diagnostic_templates FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can delete templates"
  ON public.diagnostic_templates FOR DELETE TO authenticated
  USING (public.is_admin());

-- ── diagnostic_categories ──
CREATE POLICY "Read categories of visible templates"
  ON public.diagnostic_categories FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.diagnostic_templates t
      WHERE t.id = template_id
        AND ((t.status = 'published' AND t.is_active = TRUE) OR public.is_admin())
    )
  );

CREATE POLICY "Admin can insert categories"
  ON public.diagnostic_categories FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update categories"
  ON public.diagnostic_categories FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can delete categories"
  ON public.diagnostic_categories FOR DELETE TO authenticated
  USING (public.is_admin());

-- ── diagnostic_questions ──
CREATE POLICY "Read questions of visible templates"
  ON public.diagnostic_questions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.diagnostic_templates t
      WHERE t.id = template_id
        AND ((t.status = 'published' AND t.is_active = TRUE) OR public.is_admin())
    )
  );

CREATE POLICY "Admin can insert questions"
  ON public.diagnostic_questions FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update questions"
  ON public.diagnostic_questions FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can delete questions"
  ON public.diagnostic_questions FOR DELETE TO authenticated
  USING (public.is_admin());

-- ── diagnostic_question_options ──
CREATE POLICY "Read options of visible questions"
  ON public.diagnostic_question_options FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.diagnostic_questions q
      JOIN public.diagnostic_templates t ON t.id = q.template_id
      WHERE q.id = question_id
        AND ((t.status = 'published' AND t.is_active = TRUE) OR public.is_admin())
    )
  );

CREATE POLICY "Admin can insert options"
  ON public.diagnostic_question_options FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update options"
  ON public.diagnostic_question_options FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can delete options"
  ON public.diagnostic_question_options FOR DELETE TO authenticated
  USING (public.is_admin());

-- ── diagnostic_links ──
-- Allow anon to read minimal link data by token (for public diagnostic route)
CREATE POLICY "Public can read active links by token"
  ON public.diagnostic_links FOR SELECT TO anon
  USING (status = 'active');

CREATE POLICY "Authenticated can read own or admin links"
  ON public.diagnostic_links FOR SELECT TO authenticated
  USING (
    assigned_user_id = auth.uid()
    OR created_by = auth.uid()
    OR public.is_admin()
  );

CREATE POLICY "Admin can insert links"
  ON public.diagnostic_links FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update links"
  ON public.diagnostic_links FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can delete links"
  ON public.diagnostic_links FOR DELETE TO authenticated
  USING (public.is_admin());

-- ── diagnostic_sessions ──
CREATE POLICY "Users can read own sessions"
  ON public.diagnostic_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can insert own sessions"
  ON public.diagnostic_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sessions"
  ON public.diagnostic_sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── diagnostic_answers ──
CREATE POLICY "Users can read own answers"
  ON public.diagnostic_answers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.diagnostic_sessions s
      WHERE s.id = session_id AND (s.user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Users can insert own answers"
  ON public.diagnostic_answers FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.diagnostic_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own answers"
  ON public.diagnostic_answers FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.diagnostic_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.diagnostic_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );

-- ── diagnostic_reports ──
CREATE POLICY "Users can read own reports"
  ON public.diagnostic_reports FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.diagnostic_sessions s
      WHERE s.id = session_id AND (s.user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Admin can insert reports"
  ON public.diagnostic_reports FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update reports"
  ON public.diagnostic_reports FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
