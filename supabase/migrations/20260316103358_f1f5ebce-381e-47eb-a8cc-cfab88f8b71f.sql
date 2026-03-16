
-- ============================================================
-- 1. ENUMS
-- ============================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'client');
CREATE TYPE public.template_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE public.link_status AS ENUM ('active', 'expired', 'cancelled');
CREATE TYPE public.session_status AS ENUM ('not_started', 'in_progress', 'completed');
CREATE TYPE public.question_type AS ENUM ('scale', 'single_choice', 'multiple_choice', 'text', 'yes_no');

-- ============================================================
-- 2. TABLES
-- ============================================================

-- 2.1 profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'client',
  full_name TEXT,
  email TEXT,
  company_name TEXT,
  segment TEXT,
  employees_count INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2 diagnostic_templates
CREATE TABLE public.diagnostic_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  status template_status NOT NULL DEFAULT 'draft',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.3 diagnostic_categories (pilares)
CREATE TABLE public.diagnostic_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.diagnostic_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  weight NUMERIC(8,2) DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.4 diagnostic_questions
CREATE TABLE public.diagnostic_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.diagnostic_templates(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.diagnostic_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  question_type question_type NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  weight NUMERIC(8,2) DEFAULT 1,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.5 diagnostic_question_options
CREATE TABLE public.diagnostic_question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.diagnostic_questions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  score NUMERIC(8,2),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.6 diagnostic_links
CREATE TABLE public.diagnostic_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.diagnostic_templates(id),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  assigned_user_id UUID REFERENCES public.profiles(id),
  token TEXT NOT NULL UNIQUE,
  title TEXT,
  notes TEXT,
  status link_status NOT NULL DEFAULT 'active',
  max_uses INTEGER DEFAULT 1,
  uses_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.7 diagnostic_sessions
CREATE TABLE public.diagnostic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES public.diagnostic_links(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.diagnostic_templates(id),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status session_status NOT NULL DEFAULT 'not_started',
  progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(link_id, user_id)
);

-- 2.8 diagnostic_answers
CREATE TABLE public.diagnostic_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.diagnostic_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.diagnostic_questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  answer_value TEXT,
  answer_json JSONB,
  score NUMERIC(8,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, question_id)
);

-- 2.9 diagnostic_reports
CREATE TABLE public.diagnostic_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES public.diagnostic_sessions(id) ON DELETE CASCADE,
  overall_score NUMERIC(8,2),
  category_scores JSONB DEFAULT '{}'::jsonb,
  strengths JSONB DEFAULT '[]'::jsonb,
  weaknesses JSONB DEFAULT '[]'::jsonb,
  summary TEXT,
  generated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. INDEXES
-- ============================================================

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);

CREATE INDEX idx_templates_status ON public.diagnostic_templates(status);
CREATE INDEX idx_templates_created_by ON public.diagnostic_templates(created_by);

CREATE INDEX idx_categories_template_id ON public.diagnostic_categories(template_id);

CREATE INDEX idx_questions_template_id ON public.diagnostic_questions(template_id);
CREATE INDEX idx_questions_category_id ON public.diagnostic_questions(category_id);

CREATE INDEX idx_options_question_id ON public.diagnostic_question_options(question_id);

CREATE INDEX idx_links_template_id ON public.diagnostic_links(template_id);
CREATE INDEX idx_links_created_by ON public.diagnostic_links(created_by);
CREATE INDEX idx_links_assigned_user ON public.diagnostic_links(assigned_user_id);
CREATE INDEX idx_links_token ON public.diagnostic_links(token);
CREATE INDEX idx_links_status ON public.diagnostic_links(status);

CREATE INDEX idx_sessions_link_id ON public.diagnostic_sessions(link_id);
CREATE INDEX idx_sessions_template_id ON public.diagnostic_sessions(template_id);
CREATE INDEX idx_sessions_user_id ON public.diagnostic_sessions(user_id);
CREATE INDEX idx_sessions_status ON public.diagnostic_sessions(status);

CREATE INDEX idx_answers_session_id ON public.diagnostic_answers(session_id);
CREATE INDEX idx_answers_question_id ON public.diagnostic_answers(question_id);

CREATE INDEX idx_reports_session_id ON public.diagnostic_reports(session_id);
