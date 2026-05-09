import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Clock, Lock, PlayCircle } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import type { User } from "@supabase/supabase-js";

import { ClientLayout } from "@/components/platform/client-layout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCoursePrice, formatDuration, getCourseStructure, type CourseStructure } from "@/lib/courses";

export default function CourseDetailPage() {
  return <ClientLayout>{(user) => <CourseDetailContent user={user} />}</ClientLayout>;
}

function CourseDetailContent({ user }: { user: User }) {
  const { courseSlug } = useParams<{ courseSlug: string }>();
  const [structure, setStructure] = useState<CourseStructure | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseSlug) return;
    getCourseStructure(courseSlug, user.id)
      .then(setStructure)
      .catch((runtimeError) => setError(runtimeError instanceof Error ? runtimeError.message : "Nao foi possivel carregar o curso."));
  }, [courseSlug, user.id]);

  const lessonsByModule = useMemo(() => {
    const map = new Map<string, typeof structure.lessons>();
    structure?.modules.forEach((module) => map.set(module.id, []));
    structure?.lessons.forEach((lesson) => map.set(lesson.module_id, [...(map.get(lesson.module_id) ?? []), lesson]));
    return map;
  }, [structure]);

  if (error) return <ClientError message={error} />;
  if (!structure) return <div className="text-sm text-muted-foreground">Carregando curso...</div>;

  const { course, enrollment, progressPercent } = structure;
  const totalDuration = structure.lessons.reduce((sum, lesson) => sum + Number(lesson.duration_seconds ?? 0), 0);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-lg border border-primary/10 bg-sidebar text-sidebar-foreground">
        {course.cover_url ? <img src={course.cover_url} alt={course.title} className="h-56 w-full object-cover opacity-80" /> : null}
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_280px] md:p-8">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-accent text-accent-foreground">{course.category ?? "Curso"}</Badge>
              <Badge variant="outline" className="border-white/25 text-sidebar-foreground">{levelLabel(course.level)}</Badge>
              {enrollment ? <Badge className="bg-emerald-600">Contratado</Badge> : null}
            </div>
            <h1 className="font-display mt-4 text-3xl font-semibold md:text-5xl">{course.title}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-sidebar-foreground/75">{course.description ?? course.short_description}</p>
            <div className="mt-5 flex flex-wrap gap-4 text-sm text-sidebar-foreground/75">
              {course.instructor_name ? <span>Instrutor: {course.instructor_name}</span> : null}
              {totalDuration ? <span>{Math.round(totalDuration / 60)} min de conteudo</span> : null}
              <span>{structure.lessons.length} aulas</span>
            </div>
          </div>
          <Card className="bg-white text-foreground">
            <CardContent className="space-y-5 p-5">
              <div>
                <p className="text-sm text-muted-foreground">{enrollment ? "Seu progresso" : "Investimento"}</p>
                <p className="mt-1 text-3xl font-semibold">{enrollment ? `${progressPercent}%` : formatCoursePrice(course)}</p>
              </div>
              {enrollment ? <Progress value={progressPercent} /> : null}
              {enrollment ? (
                <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  <Link to={`/cursos/${course.slug}/aulas`}>
                    Continuar curso
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : course.checkout_url ? (
                <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  <a href={course.checkout_url} target="_blank" rel="noreferrer">Comprar agora</a>
                </Button>
              ) : (
                <Button className="w-full" disabled>Solicite acesso</Button>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="bg-white/90">
          <CardContent className="p-6">
            <h2 className="font-display text-2xl font-semibold">Conteudo do curso</h2>
            <Accordion type="multiple" defaultValue={structure.modules.map((module) => module.id)} className="mt-4">
              {structure.modules.map((module) => {
                const moduleLessons = lessonsByModule.get(module.id) ?? [];
                return (
                  <AccordionItem key={module.id} value={module.id}>
                    <AccordionTrigger>
                      <span className="text-left">{module.title}<span className="ml-2 text-sm font-normal text-muted-foreground">{moduleLessons.length} aulas</span></span>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-2">
                      {moduleLessons.length ? moduleLessons.map((lesson) => {
                        const locked = !enrollment && !lesson.is_preview;
                        return (
                          <div key={lesson.id} className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 text-sm">
                            <div className="flex items-center gap-3">
                              {locked ? <Lock className="h-4 w-4 text-muted-foreground" /> : lesson.is_preview ? <PlayCircle className="h-4 w-4 text-accent" /> : <CheckCircle2 className="h-4 w-4 text-muted-foreground" />}
                              <div>
                                <p className="font-medium">{lesson.title}</p>
                                <p className="text-xs text-muted-foreground">{lesson.description}</p>
                              </div>
                            </div>
                            {lesson.duration_seconds ? <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{formatDuration(lesson.duration_seconds)}</span> : null}
                          </div>
                        );
                      }) : <p className="text-sm text-muted-foreground">Este modulo ainda nao possui aulas cadastradas.</p>}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
        <Card className="h-fit bg-white/90">
          <CardContent className="space-y-3 p-6">
            <h3 className="font-display text-xl font-semibold">Inclui</h3>
            <Info label="Aulas" value={structure.lessons.length} />
            <Info label="Modulos" value={structure.modules.length} />
            <Info label="Materiais" value={structure.materials.length} />
            <Info label="Nivel" value={levelLabel(course.level)} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | number }) {
  return <div className="flex justify-between gap-4 text-sm"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>;
}

function levelLabel(value: string) {
  const labels: Record<string, string> = { beginner: "Iniciante", intermediate: "Intermediario", advanced: "Avancado", all: "Todos os niveis" };
  return labels[value] ?? value;
}

function ClientError({ message }: { message: string }) {
  return <Card className="border-destructive/20 bg-destructive/10"><CardContent className="p-5 text-sm text-destructive">{message}</CardContent></Card>;
}
