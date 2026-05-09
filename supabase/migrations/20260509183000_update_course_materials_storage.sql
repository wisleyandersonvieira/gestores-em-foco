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
    'text/csv',
    'application/csv',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.course_lesson_materials
  add column if not exists file_path text,
  add column if not exists file_name text,
  add column if not exists file_size integer,
  add column if not exists mime_type text,
  add column if not exists external_url text,
  add column if not exists material_type text default 'file',
  add column if not exists display_order integer default 0;

alter table public.course_lesson_materials
  drop constraint if exists course_lesson_materials_type_check;

alter table public.course_lesson_materials
  add constraint course_lesson_materials_type_check
  check (material_type in ('file', 'link'));

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
