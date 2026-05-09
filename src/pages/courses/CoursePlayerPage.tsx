import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Circle, Download, FileText, PlayCircle, Search } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";

import { ClientLayout } from "@/components/platform/client-layout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  formatDuration,
  formatFileSize,
  getCourseStructure,
  getMaterialDownloadUrl,
  materialMimeLabel,
  markLessonCompleted,
  markLessonInProgress,
  markLessonNotCompleted,
  type CourseLesson,
  type CourseMaterial,
  type CourseStructure,
} from "@/lib/courses";

export default function CoursePlayerPage() {
  return <ClientLayout>{(user) => <CoursePlayerContent user={user} />}</ClientLayout>;
}

function CoursePlayerContent({ user }: { user: User }) {
  const { courseSlug, lessonId } = useParams<{ courseSlug: string; lessonId?: string }>();
  const navigate = useNavigate();
  const [structure, setStructure] = useState<CourseStructure | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProgress, setSavingProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!courseSlug) return;
    setLoading(true);
    try {
      const next = await getCourseStructure(courseSlug, user.id);
      if (!next.enrollment) {
        navigate(`/cursos/${courseSlug}`, { replace: true });
        return;
      }
      setStructure(next);
      const target = lessonId ? next.lessons.find((lesson) => lesson.id === lessonId) : next.lessons[0];
      if (!lessonId && target) navigate(`/cursos/${courseSlug}/aulas/${target.id}`, { replace: true });
      if (target) await markLessonInProgress(user.id, target);
    } catch (runtimeError) {
      setError(runtimeError instanceof Error ? runtimeError.message : "Nao foi possivel abrir a aula.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [courseSlug, lessonId, user.id]);

  const activeLesson = useMemo(() => structure?.lessons.find((lesson) => lesson.id === lessonId) ?? structure?.lessons[0] ?? null, [lessonId, structure]);
  const progressByLesson = useMemo(() => new Map((structure?.progress ?? []).map((item) => [item.lesson_id, item])), [structure]);
  const lessonsByModule = useMemo(() => {
    const term = query.trim().toLowerCase();
    const map = new Map<string, CourseLesson[]>();
    structure?.modules.forEach((module) => map.set(module.id, []));
    structure?.lessons
      .filter((lesson) => !term || [lesson.title, lesson.description, structure.modules.find((module) => module.id === lesson.module_id)?.title].some((value) => String(value ?? "").toLowerCase().includes(term)))
      .forEach((lesson) => map.set(lesson.module_id, [...(map.get(lesson.module_id) ?? []), lesson]));
    return map;
  }, [query, structure]);
  const lessonMaterials = (structure?.materials ?? []).filter((material) => material.lesson_id === activeLesson?.id || (!material.lesson_id && material.module_id === activeLesson?.module_id));

  if (loading) return <div className="text-sm text-muted-foreground">Carregando aula...</div>;
  if (error) return <Card className="border-destructive/20 bg-destructive/10"><CardContent className="p-5 text-sm text-destructive">{error}</CardContent></Card>;
  if (!structure || !activeLesson) return <Card className="bg-white/90"><CardContent className="p-6 text-sm text-muted-foreground">Este curso ainda nao possui aulas cadastradas.</CardContent></Card>;

  const completed = progressByLesson.get(activeLesson.id)?.status === "completed";

  async function toggleLessonCompletion() {
    if (savingProgress) return;
    setSavingProgress(true);
    try {
      if (completed) {
        await markLessonNotCompleted(user.id, activeLesson);
        toast.success("Aula marcada como em andamento.");
      } else {
        await markLessonCompleted(user.id, activeLesson);
        toast.success("Aula concluida.");
      }
      await load();
    } catch (runtimeError) {
      toast.error(runtimeError instanceof Error ? runtimeError.message : "Nao foi possivel atualizar esta aula.");
    } finally {
      setSavingProgress(false);
    }
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="gap-2">
        <Link to={`/cursos/${structure.course.slug}`}>
          <ArrowLeft className="h-4 w-4" />
          Voltar ao curso
        </Link>
      </Button>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="space-y-5">
          <div className="overflow-hidden rounded-lg border border-primary/10 bg-sidebar text-sidebar-foreground shadow-sm">
            <div className="aspect-video bg-black">
              {activeLesson.video_embed_url ? (
                <iframe
                  src={activeLesson.video_embed_url}
                  title={activeLesson.title}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="flex h-full items-center justify-center p-8 text-center text-sm text-white/70">Esta aula ainda nao possui video configurado.</div>
              )}
            </div>
            <div className="space-y-4 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <Badge className={completed ? "bg-emerald-600" : "bg-accent text-accent-foreground"}>{completed ? "Aula concluida" : "Assistindo agora"}</Badge>
                  <h1 className="font-display mt-3 text-2xl font-semibold md:text-3xl">{activeLesson.title}</h1>
                  {activeLesson.description ? <p className="mt-2 text-sm text-sidebar-foreground/70">{activeLesson.description}</p> : null}
                </div>
                <Button
                  className={completed ? "" : "bg-accent text-accent-foreground hover:bg-accent/90"}
                  variant={completed ? "outline" : "default"}
                  disabled={savingProgress}
                  onClick={() => void toggleLessonCompletion()}
                >
                  {savingProgress ? "Salvando..." : completed ? "Marcar como nao concluida" : "Concluir aula"}
                </Button>
              </div>
            </div>
          </div>

          <Card className="bg-white/90">
            <CardContent className="p-5">
              <h2 className="font-display text-xl font-semibold">Materiais de apoio</h2>
              <div className="mt-4 grid gap-3">
                {lessonMaterials.length ? lessonMaterials.map((material) => <MaterialRow key={material.id} material={material} />) : <p className="text-sm text-muted-foreground">Nenhum material de apoio disponivel para esta aula.</p>}
              </div>
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <Card className="bg-white/90">
            <CardContent className="space-y-4 p-5">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progresso do curso</span>
                  <span className="font-semibold">{structure.progressPercent}%</span>
                </div>
                <Progress value={structure.progressPercent} className="mt-2 h-2" />
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar conteudo" />
              </div>
            </CardContent>
          </Card>

          <Card className="max-h-[72vh] overflow-auto bg-white/90">
            <CardContent className="p-4">
              <Accordion type="multiple" defaultValue={structure.modules.map((module) => module.id)}>
                {structure.modules.map((module) => {
                  const moduleLessons = lessonsByModule.get(module.id) ?? [];
                  if (query && moduleLessons.length === 0) return null;
                  return (
                    <AccordionItem key={module.id} value={module.id}>
                      <AccordionTrigger className="text-left text-sm">{module.title}</AccordionTrigger>
                      <AccordionContent className="space-y-2">
                        {moduleLessons.map((lesson) => {
                          const isActive = lesson.id === activeLesson.id;
                          const isCompleted = progressByLesson.get(lesson.id)?.status === "completed";
                          return (
                            <Link
                              key={lesson.id}
                              to={`/cursos/${structure.course.slug}/aulas/${lesson.id}`}
                              className={`flex gap-3 rounded-lg border p-3 text-sm transition ${isActive ? "border-primary bg-primary/5" : "bg-card hover:border-primary/30"}`}
                            >
                              {isCompleted ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : isActive ? <PlayCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
                              <div className="min-w-0">
                                <p className="line-clamp-2 font-medium">{lesson.title}</p>
                                {lesson.duration_seconds ? <p className="mt-1 text-xs text-muted-foreground">{formatDuration(lesson.duration_seconds)}</p> : null}
                              </div>
                            </Link>
                          );
                        })}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function MaterialRow({ material }: { material: CourseMaterial }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <FileText className="h-5 w-5 text-primary" />
        <div>
          <p className="font-medium">{material.title}</p>
          <p className="break-all text-xs text-muted-foreground">
            {material.file_name ?? material.external_url ?? "Material"} {material.file_size ? `- ${formatFileSize(material.file_size)}` : ""} - {materialMimeLabel(material.mime_type, material.material_type)}
          </p>
          {material.description ? <p className="mt-1 text-xs text-muted-foreground">{material.description}</p> : null}
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          void getMaterialDownloadUrl(material)
            .then((url) => {
              if (url) window.open(url, "_blank", "noopener,noreferrer");
            })
            .catch((error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel abrir o material."));
        }}
      >
        <Download className="h-4 w-4" />
        Abrir
      </Button>
    </div>
  );
}
