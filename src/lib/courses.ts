import { supabase } from "@/integrations/supabase/client";

export const COURSES_PRODUCT_SLUG = "cursos";

export type CourseStatus = "draft" | "published" | "archived";
export type CourseLevel = "beginner" | "intermediate" | "advanced" | "all";
export type LessonStatus = "active" | "inactive";
export type EnrollmentStatus = "active" | "trialing" | "expired" | "canceled" | "suspended";
export type EnrollmentAccessType = "paid" | "trial" | "free" | "admin" | "test";
export type LessonProgressStatus = "not_started" | "in_progress" | "completed";
export type VideoProvider = "youtube" | "vimeo" | "external";

export type Course = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  cover_url: string | null;
  thumbnail_url: string | null;
  instructor_name: string | null;
  category: string | null;
  level: CourseLevel;
  status: CourseStatus;
  price: number | null;
  currency: string | null;
  checkout_url: string | null;
  estimated_duration_minutes: number | null;
  display_order: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export type CourseModule = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  display_order: number;
  status: LessonStatus;
  created_at: string;
  updated_at: string;
};

export type CourseLesson = {
  id: string;
  course_id: string;
  module_id: string;
  title: string;
  description: string | null;
  lesson_type: "video" | "text" | "file" | "quiz" | "external_link";
  video_provider: VideoProvider | null;
  video_url: string | null;
  video_embed_url: string | null;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  is_preview: boolean;
  display_order: number;
  status: LessonStatus;
  created_at: string;
  updated_at: string;
};

export type CourseMaterial = {
  id: string;
  course_id: string;
  lesson_id: string | null;
  module_id: string | null;
  title: string;
  description: string | null;
  material_type: "file" | "link";
  file_url: string | null;
  file_path: string | null;
  external_url: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  display_order: number | null;
  created_at: string;
  updated_at: string;
};

export type UserCourseEnrollment = {
  id: string;
  user_id: string;
  course_id: string;
  status: EnrollmentStatus;
  access_type: EnrollmentAccessType;
  source: string | null;
  started_at: string;
  expires_at: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
  course?: Course | null;
};

export type UserLessonProgress = {
  id: string;
  user_id: string;
  course_id: string;
  lesson_id: string;
  status: LessonProgressStatus;
  progress_seconds: number | null;
  completed_at: string | null;
  last_watched_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CourseStructure = {
  course: Course;
  modules: CourseModule[];
  lessons: CourseLesson[];
  materials: CourseMaterial[];
  enrollment: UserCourseEnrollment | null;
  progress: UserLessonProgress[];
  progressPercent: number;
};

const table = (name: string) => supabase.from(name as never) as any;

export async function getPublishedCourses() {
  const { data, error } = await table("courses")
    .select("*")
    .eq("status", "published")
    .order("display_order", { ascending: true })
    .order("title", { ascending: true });

  if (error) throw new Error("Nao foi possivel carregar os cursos.");
  return (data ?? []) as Course[];
}

export async function getUserCourses(userId: string) {
  const { data, error } = await table("user_course_enrollments")
    .select("*, course:courses(*)")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false });

  if (error) throw new Error("Nao foi possivel carregar seus cursos.");
  const now = Date.now();
  return ((data ?? []) as UserCourseEnrollment[]).filter((item) => !item.expires_at || new Date(item.expires_at).getTime() > now);
}

export async function getCourseBySlug(slug: string) {
  const { data, error } = await table("courses").select("*").eq("slug", slug).maybeSingle();
  if (error || !data) throw new Error("Curso nao encontrado.");
  return data as Course;
}

export async function getCourseEnrollment(userId: string, courseId: string) {
  const { data, error } = await table("user_course_enrollments")
    .select("*")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (error) throw new Error("Nao foi possivel validar seu acesso ao curso.");
  return data as UserCourseEnrollment | null;
}

export async function hasCourseAccess(courseId: string) {
  const { data, error } = await supabase.rpc("has_course_access" as any, { p_course_id: courseId });
  if (error) return false;
  return Boolean(data);
}

export async function getCourseStructure(slug: string, userId?: string): Promise<CourseStructure> {
  const course = await getCourseBySlug(slug);
  const enrollment = userId ? await getCourseEnrollment(userId, course.id) : null;
  const [{ data: modules, error: modulesError }, { data: lessons, error: lessonsError }, { data: materials, error: materialsError }, { data: progress, error: progressError }] =
    await Promise.all([
      table("course_modules").select("*").eq("course_id", course.id).order("display_order", { ascending: true }),
      table("course_lessons").select("*").eq("course_id", course.id).order("display_order", { ascending: true }),
      userId && enrollment ? table("course_lesson_materials").select("*").eq("course_id", course.id).order("display_order", { ascending: true }) : Promise.resolve({ data: [], error: null }),
      userId ? table("user_lesson_progress").select("*").eq("user_id", userId).eq("course_id", course.id) : Promise.resolve({ data: [], error: null }),
    ]);

  if (modulesError || lessonsError || materialsError || progressError) {
    throw new Error("Nao foi possivel carregar o conteudo do curso.");
  }

  const activeLessons = ((lessons ?? []) as CourseLesson[]).filter((lesson) => lesson.status === "active");
  const progressRows = (progress ?? []) as UserLessonProgress[];
  return {
    course,
    modules: (modules ?? []) as CourseModule[],
    lessons: activeLessons,
    materials: (materials ?? []) as CourseMaterial[],
    enrollment,
    progress: progressRows,
    progressPercent: calculateCourseProgress(progressRows, activeLessons),
  };
}

export async function markLessonInProgress(userId: string, lesson: CourseLesson) {
  const payload = {
    user_id: userId,
    course_id: lesson.course_id,
    lesson_id: lesson.id,
    status: "in_progress",
    last_watched_at: new Date().toISOString(),
  };

  const { error } = await table("user_lesson_progress").upsert(payload, { onConflict: "user_id,lesson_id" });
  if (error) throw new Error("Nao foi possivel atualizar seu progresso.");
}

export async function markLessonCompleted(userId: string, lesson: CourseLesson) {
  const payload = {
    user_id: userId,
    course_id: lesson.course_id,
    lesson_id: lesson.id,
    status: "completed",
    completed_at: new Date().toISOString(),
    last_watched_at: new Date().toISOString(),
  };

  const { error } = await table("user_lesson_progress").upsert(payload, { onConflict: "user_id,lesson_id" });
  if (error) throw new Error("Nao foi possivel concluir esta aula.");
}

export async function markLessonNotCompleted(userId: string, lesson: CourseLesson) {
  const payload = {
    user_id: userId,
    course_id: lesson.course_id,
    lesson_id: lesson.id,
    status: "in_progress",
    completed_at: null,
    last_watched_at: new Date().toISOString(),
  };

  const { error } = await table("user_lesson_progress").upsert(payload, { onConflict: "user_id,lesson_id" });
  if (error) throw new Error("Nao foi possivel atualizar esta aula.");
}

export async function getMaterialDownloadUrl(material: CourseMaterial) {
  if (material.material_type === "link") return material.external_url ?? "";
  if (material.file_url) return material.file_url;
  if (!material.file_path) return "";

  const { data, error } = await supabase.storage.from("course-materials").createSignedUrl(material.file_path, 60 * 5);
  if (error || !data?.signedUrl) throw new Error("Nao foi possivel gerar o link do material.");
  return data.signedUrl;
}

export function calculateCourseProgress(progress: UserLessonProgress[], lessons: CourseLesson[]) {
  const activeLessons = lessons.filter((lesson) => lesson.status === "active");
  if (activeLessons.length === 0) return 0;
  const completed = new Set(progress.filter((item) => item.status === "completed").map((item) => item.lesson_id));
  return Math.round((activeLessons.filter((lesson) => completed.has(lesson.id)).length / activeLessons.length) * 100);
}

export function formatDuration(seconds?: number | null) {
  if (!seconds) return "";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}min`;
}

export function formatCoursePrice(course: Course) {
  if (!course.price || Number(course.price) <= 0) return "Gratuito";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: course.currency ?? "BRL" }).format(Number(course.price));
}

export function slugifyCourseTitle(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function buildEmbedUrl(rawUrl: string, provider?: VideoProvider | null) {
  const url = rawUrl.trim();
  if (!url) return { provider: null, embedUrl: null };

  const youtubeId = parseYouTubeUrl(url);
  if (youtubeId) return { provider: "youtube" as const, embedUrl: `https://www.youtube.com/embed/${youtubeId}` };

  const vimeoId = parseVimeoUrl(url);
  if (vimeoId) return { provider: "vimeo" as const, embedUrl: `https://player.vimeo.com/video/${vimeoId}` };

  if (provider === "external" && isSafeExternalUrl(url)) return { provider: "external" as const, embedUrl: url };
  throw new Error("Informe um link valido do YouTube, Vimeo ou uma URL externa HTTPS permitida.");
}

export function parseYouTubeUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    if (url.hostname === "youtu.be") return cleanVideoId(url.pathname.slice(1));
    if (url.hostname.endsWith("youtube.com")) {
      if (url.pathname.startsWith("/embed/")) return cleanVideoId(url.pathname.split("/embed/")[1]);
      return cleanVideoId(url.searchParams.get("v") ?? "");
    }
  } catch {
    return null;
  }
  return null;
}

export function parseVimeoUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    if (url.hostname.endsWith("vimeo.com")) {
      const id = url.pathname.split("/").filter(Boolean).pop() ?? "";
      return /^\d+$/.test(id) ? id : null;
    }
  } catch {
    return null;
  }
  return null;
}

function cleanVideoId(value: string) {
  const id = value.split(/[?&/]/)[0];
  return /^[a-zA-Z0-9_-]{6,}$/.test(id) ? id : null;
}

function isSafeExternalUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" && !["javascript:", "data:", "file:"].includes(url.protocol);
  } catch {
    return false;
  }
}

export async function getAdminCourses() {
  const [{ data: courses, error }, { data: modules }, { data: lessons }, { data: materials }, { data: enrollments }, { data: progress }] = await Promise.all([
    table("courses").select("*").order("display_order", { ascending: true }).order("updated_at", { ascending: false }),
    table("course_modules").select("*"),
    table("course_lessons").select("*"),
    table("course_lesson_materials").select("*"),
    table("user_course_enrollments").select("*, course:courses(*), profile:profiles(id,email,full_name,company_name)"),
    table("user_lesson_progress").select("*"),
  ]);

  if (error) throw new Error("Nao foi possivel carregar cursos administrativos.");
  return {
    courses: (courses ?? []) as Course[],
    modules: (modules ?? []) as CourseModule[],
    lessons: (lessons ?? []) as CourseLesson[],
    materials: (materials ?? []) as CourseMaterial[],
    enrollments: (enrollments ?? []) as Array<UserCourseEnrollment & { profile?: any }>,
    progress: (progress ?? []) as UserLessonProgress[],
  };
}

export async function saveCourse(input: Partial<Course> & { title: string; slug?: string }, userId: string) {
  const payload = sanitizeCoursePayload(input, userId);
  const query = input.id
    ? table("courses").update(payload).eq("id", input.id).select("*").single()
    : table("courses").insert(payload).select("*").single();

  const { data, error } = await query;
  if (error || !data) throw new Error("Nao foi possivel salvar o curso.");
  return data as Course;
}

export async function saveCourseModule(input: Partial<CourseModule> & { course_id: string; title: string }) {
  const payload = {
    course_id: input.course_id,
    title: stripHtml(input.title).trim(),
    description: stripHtml(input.description ?? "").trim() || null,
    display_order: Number(input.display_order ?? 0),
    status: input.status ?? "active",
  };
  const query = input.id ? table("course_modules").update(payload).eq("id", input.id).select("*").single() : table("course_modules").insert(payload).select("*").single();
  const { data, error } = await query;
  if (error || !data) throw new Error("Nao foi possivel salvar o modulo.");
  return data as CourseModule;
}

export async function saveCourseLesson(input: Partial<CourseLesson> & { course_id: string; module_id: string; title: string }) {
  let videoProvider = input.video_provider ?? null;
  let videoEmbedUrl = input.video_embed_url ?? null;
  if (input.video_url) {
    const embed = buildEmbedUrl(input.video_url, input.video_provider);
    videoProvider = embed.provider;
    videoEmbedUrl = embed.embedUrl;
  }

  const payload = {
    course_id: input.course_id,
    module_id: input.module_id,
    title: stripHtml(input.title).trim(),
    description: stripHtml(input.description ?? "").trim() || null,
    lesson_type: input.lesson_type ?? "video",
    video_provider: videoProvider,
    video_url: input.video_url?.trim() || null,
    video_embed_url: videoEmbedUrl,
    duration_seconds: Number(input.duration_seconds ?? 0) || null,
    thumbnail_url: input.thumbnail_url?.trim() || null,
    is_preview: Boolean(input.is_preview),
    display_order: Number(input.display_order ?? 0),
    status: input.status ?? "active",
  };

  const query = input.id ? table("course_lessons").update(payload).eq("id", input.id).select("*").single() : table("course_lessons").insert(payload).select("*").single();
  const { data, error } = await query;
  if (error || !data) throw new Error("Nao foi possivel salvar a aula.");
  return data as CourseLesson;
}

export async function saveCourseMaterial(input: Partial<CourseMaterial> & { course_id: string; title: string }) {
  const payload = {
    course_id: input.course_id,
    lesson_id: input.lesson_id || null,
    module_id: input.module_id || null,
    title: stripHtml(input.title).trim(),
    description: stripHtml(input.description ?? "").trim() || null,
    material_type: input.material_type ?? "link",
    file_url: input.file_url?.trim() || null,
    file_path: input.file_path?.trim() || null,
    external_url: input.external_url?.trim() || null,
    file_name: input.file_name?.trim() || null,
    file_size: input.file_size ?? null,
    mime_type: input.mime_type?.trim() || null,
    display_order: Number(input.display_order ?? 0),
  };
  const query = input.id ? table("course_lesson_materials").update(payload).eq("id", input.id).select("*").single() : table("course_lesson_materials").insert(payload).select("*").single();
  const { data, error } = await query;
  if (error || !data) throw new Error("Nao foi possivel salvar o material.");
  return data as CourseMaterial;
}

export async function grantCourseAccess(input: {
  user_id: string;
  course_id: string;
  status: EnrollmentStatus;
  access_type: EnrollmentAccessType;
  expires_at?: string | null;
  source?: string | null;
}) {
  const payload = {
    user_id: input.user_id,
    course_id: input.course_id,
    status: input.status,
    access_type: input.access_type,
    expires_at: input.expires_at || null,
    source: input.source || "admin",
    canceled_at: ["canceled", "expired", "suspended"].includes(input.status) ? new Date().toISOString() : null,
  };
  const { data, error } = await table("user_course_enrollments")
    .upsert(payload, { onConflict: "user_id,course_id" })
    .select("*")
    .single();
  if (error || !data) throw new Error("Nao foi possivel conceder acesso ao curso.");
  return data as UserCourseEnrollment;
}

export async function updateCourseEnrollment(id: string, input: Partial<UserCourseEnrollment>) {
  const payload = {
    status: input.status,
    access_type: input.access_type,
    expires_at: input.expires_at || null,
    canceled_at: input.status && ["canceled", "expired", "suspended"].includes(input.status) ? new Date().toISOString() : null,
  };
  const { data, error } = await table("user_course_enrollments").update(payload).eq("id", id).select("*").single();
  if (error || !data) throw new Error("Nao foi possivel atualizar a matricula.");
  return data as UserCourseEnrollment;
}

export async function deleteCourseModule(id: string) {
  const { error } = await table("course_modules").delete().eq("id", id);
  if (error) throw new Error("Nao foi possivel excluir o modulo.");
}

export async function deleteCourseLesson(id: string) {
  const { error } = await table("course_lessons").delete().eq("id", id);
  if (error) throw new Error("Nao foi possivel excluir a aula.");
}

export async function deleteCourseMaterial(id: string) {
  const { error } = await table("course_lesson_materials").delete().eq("id", id);
  if (error) throw new Error("Nao foi possivel excluir o material.");
}

function sanitizeCoursePayload(input: Partial<Course> & { title: string; slug?: string }, userId: string) {
  const status = input.status ?? "draft";
  return {
    title: stripHtml(input.title).trim(),
    slug: slugifyCourseTitle(input.slug || input.title),
    short_description: stripHtml(input.short_description ?? "").trim() || null,
    description: stripHtml(input.description ?? "").trim() || null,
    cover_url: input.cover_url?.trim() || null,
    thumbnail_url: input.thumbnail_url?.trim() || null,
    instructor_name: stripHtml(input.instructor_name ?? "").trim() || null,
    category: stripHtml(input.category ?? "").trim() || null,
    level: input.level ?? "beginner",
    status,
    price: input.price === null || input.price === undefined ? null : Number(input.price),
    currency: input.currency ?? "BRL",
    checkout_url: input.checkout_url?.trim() || null,
    estimated_duration_minutes: Number(input.estimated_duration_minutes ?? 0) || null,
    display_order: Number(input.display_order ?? 0),
    created_by: input.created_by ?? userId,
    published_at: status === "published" ? input.published_at ?? new Date().toISOString() : null,
  };
}

function stripHtml(value: string) {
  return value.replace(/[<>]/g, "");
}
