create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  short_description text,
  description text,
  cover_url text,
  thumbnail_url text,
  instructor_name text,
  category text,
  level text default 'beginner',
  status text not null default 'draft',
  price numeric(12,2),
  currency text default 'BRL',
  checkout_url text,
  estimated_duration_minutes integer,
  display_order integer default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint courses_title_not_blank check (length(trim(title)) > 0),
  constraint courses_slug_not_blank check (length(trim(slug)) > 0),
  constraint courses_status_check check (status in ('draft', 'published', 'archived')),
  constraint courses_level_check check (level in ('beginner', 'intermediate', 'advanced', 'all')),
  constraint courses_currency_check check (currency in ('BRL', 'USD'))
);

create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  display_order integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_modules_title_not_blank check (length(trim(title)) > 0),
  constraint course_modules_status_check check (status in ('active', 'inactive'))
);

create table if not exists public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  module_id uuid not null references public.course_modules(id) on delete cascade,
  title text not null,
  description text,
  lesson_type text not null default 'video',
  video_provider text,
  video_url text,
  video_embed_url text,
  duration_seconds integer,
  thumbnail_url text,
  is_preview boolean not null default false,
  display_order integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_lessons_title_not_blank check (length(trim(title)) > 0),
  constraint course_lessons_type_check check (lesson_type in ('video', 'text', 'file', 'quiz', 'external_link')),
  constraint course_lessons_status_check check (status in ('active', 'inactive')),
  constraint course_lessons_provider_check check (video_provider is null or video_provider in ('youtube', 'vimeo', 'external'))
);

create table if not exists public.course_lesson_materials (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid references public.course_lessons(id) on delete cascade,
  module_id uuid references public.course_modules(id) on delete cascade,
  title text not null,
  description text,
  material_type text not null default 'file',
  file_url text,
  file_path text,
  external_url text,
  file_name text,
  file_size integer,
  mime_type text,
  display_order integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_lesson_materials_title_not_blank check (length(trim(title)) > 0),
  constraint course_lesson_materials_type_check check (material_type in ('file', 'link'))
);

create table if not exists public.user_course_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status text not null default 'active',
  access_type text not null default 'paid',
  source text,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_payment_intent_id text,
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_course_enrollments_unique unique (user_id, course_id),
  constraint user_course_enrollments_status_check check (status in ('active', 'trialing', 'expired', 'canceled', 'suspended')),
  constraint user_course_enrollments_access_type_check check (access_type in ('paid', 'trial', 'free', 'admin', 'test'))
);

create table if not exists public.user_lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid not null references public.course_lessons(id) on delete cascade,
  status text not null default 'not_started',
  progress_seconds integer default 0,
  completed_at timestamptz,
  last_watched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_lesson_progress_unique unique (user_id, lesson_id),
  constraint user_lesson_progress_status_check check (status in ('not_started', 'in_progress', 'completed'))
);

create index if not exists courses_status_order_idx on public.courses(status, display_order, title);
create index if not exists course_modules_course_order_idx on public.course_modules(course_id, display_order);
create index if not exists course_lessons_course_order_idx on public.course_lessons(course_id, module_id, display_order);
create index if not exists course_lesson_materials_course_idx on public.course_lesson_materials(course_id, lesson_id, display_order);
create index if not exists user_course_enrollments_user_idx on public.user_course_enrollments(user_id, status);
create index if not exists user_course_enrollments_course_idx on public.user_course_enrollments(course_id, status);
create index if not exists user_lesson_progress_user_course_idx on public.user_lesson_progress(user_id, course_id);

drop trigger if exists set_courses_updated_at on public.courses;
drop trigger if exists set_course_modules_updated_at on public.course_modules;
drop trigger if exists set_course_lessons_updated_at on public.course_lessons;
drop trigger if exists set_course_lesson_materials_updated_at on public.course_lesson_materials;
drop trigger if exists set_user_course_enrollments_updated_at on public.user_course_enrollments;
drop trigger if exists set_user_lesson_progress_updated_at on public.user_lesson_progress;

create trigger set_courses_updated_at before update on public.courses for each row execute function public.set_updated_at();
create trigger set_course_modules_updated_at before update on public.course_modules for each row execute function public.set_updated_at();
create trigger set_course_lessons_updated_at before update on public.course_lessons for each row execute function public.set_updated_at();
create trigger set_course_lesson_materials_updated_at before update on public.course_lesson_materials for each row execute function public.set_updated_at();
create trigger set_user_course_enrollments_updated_at before update on public.user_course_enrollments for each row execute function public.set_updated_at();
create trigger set_user_lesson_progress_updated_at before update on public.user_lesson_progress for each row execute function public.set_updated_at();

alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.course_lessons enable row level security;
alter table public.course_lesson_materials enable row level security;
alter table public.user_course_enrollments enable row level security;
alter table public.user_lesson_progress enable row level security;

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
drop policy if exists "Admins can manage course modules" on public.course_modules;
drop policy if exists "Visible course lessons" on public.course_lessons;
drop policy if exists "Admins can manage course lessons" on public.course_lessons;
drop policy if exists "Visible course materials" on public.course_lesson_materials;
drop policy if exists "Admins can manage course materials" on public.course_lesson_materials;
drop policy if exists "Users can view own course enrollments" on public.user_course_enrollments;
drop policy if exists "Admins can manage course enrollments" on public.user_course_enrollments;
drop policy if exists "Users can manage own lesson progress" on public.user_lesson_progress;
drop policy if exists "Admins can view lesson progress" on public.user_lesson_progress;

create policy "Published courses are visible"
on public.courses for select
to anon, authenticated
using (status = 'published' or public.is_admin());

create policy "Admins can manage courses"
on public.courses for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Visible course modules"
on public.course_modules for select
to anon, authenticated
using (
  public.is_admin()
  or (
    status = 'active'
    and exists (select 1 from public.courses c where c.id = course_id and c.status = 'published')
  )
);

create policy "Admins can manage course modules"
on public.course_modules for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Visible course lessons"
on public.course_lessons for select
to anon, authenticated
using (
  public.is_admin()
  or (
    status = 'active'
    and exists (select 1 from public.courses c where c.id = course_id and c.status = 'published')
    and (is_preview = true or public.has_course_access(course_id))
  )
);

create policy "Admins can manage course lessons"
on public.course_lessons for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Visible course materials"
on public.course_lesson_materials for select
to authenticated
using (public.has_course_access(course_id));

create policy "Admins can manage course materials"
on public.course_lesson_materials for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Users can view own course enrollments"
on public.user_course_enrollments for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "Admins can manage course enrollments"
on public.user_course_enrollments for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Users can manage own lesson progress"
on public.user_lesson_progress for all
to authenticated
using (user_id = auth.uid() and public.has_course_access(course_id))
with check (user_id = auth.uid() and public.has_course_access(course_id));

create policy "Admins can view lesson progress"
on public.user_lesson_progress for select
to authenticated
using (public.is_admin());

insert into public.products (
  name, slug, short_description, full_description, status, product_type, icon, highlight_color, route_path, display_order
)
values (
  'Cursos',
  'cursos',
  'Acesse treinamentos, aulas e materiais exclusivos para evoluir sua gestão.',
  'Plataforma de cursos e conteúdos exclusivos com módulos, aulas, materiais de apoio e acompanhamento de progresso.',
  'active',
  'container',
  'book-open',
  'blue',
  '/cursos',
  30
)
on conflict (slug) do update set
  name = excluded.name,
  short_description = excluded.short_description,
  full_description = excluded.full_description,
  status = excluded.status,
  product_type = excluded.product_type,
  icon = excluded.icon,
  highlight_color = excluded.highlight_color,
  route_path = excluded.route_path,
  display_order = excluded.display_order,
  updated_at = now();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-materials',
  'course-materials',
  false,
  20971520,
  array[
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/csv'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can manage course materials storage" on storage.objects;
drop policy if exists "Users can read own course materials storage" on storage.objects;

create policy "Admins can manage course materials storage"
on storage.objects for all
to authenticated
using (bucket_id = 'course-materials' and public.is_admin())
with check (bucket_id = 'course-materials' and public.is_admin());

create policy "Users can read own course materials storage"
on storage.objects for select
to authenticated
using (
  bucket_id = 'course-materials'
  and public.has_course_access(((storage.foldername(name))[1])::uuid)
);
