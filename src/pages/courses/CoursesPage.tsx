import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, GraduationCap, Search } from "lucide-react";
import { Link } from "react-router-dom";
import type { User } from "@supabase/supabase-js";

import { ClientLayout } from "@/components/platform/client-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { getPublishedCourses, getUserCourses, type Course, type UserCourseEnrollment } from "@/lib/courses";

export default function CoursesPage() {
  return <ClientLayout>{(user) => <CoursesContent user={user} />}</ClientLayout>;
}

function CoursesContent({ user }: { user: User }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<UserCourseEnrollment[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getPublishedCourses(), getUserCourses(user.id)])
      .then(([available, owned]) => {
        setCourses(available);
        setEnrollments(owned);
      })
      .catch((runtimeError) => setError(runtimeError instanceof Error ? runtimeError.message : "Nao foi possivel carregar os cursos."));
  }, [user.id]);

  const enrollmentByCourse = useMemo(() => new Map(enrollments.map((item) => [item.course_id, item])), [enrollments]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return courses.filter((course) => !term || [course.title, course.short_description, course.category, course.instructor_name].some((value) => String(value ?? "").toLowerCase().includes(term)));
  }, [courses, search]);
  const myCourses = filtered.filter((course) => enrollmentByCourse.has(course.id));
  const availableCourses = filtered.filter((course) => !enrollmentByCourse.has(course.id));

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-lg border border-primary/10 bg-sidebar text-sidebar-foreground">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_280px] md:p-8">
          <div>
            <Badge className="bg-accent text-accent-foreground">Cursos</Badge>
            <h1 className="font-display mt-4 text-3xl font-semibold md:text-4xl">Aulas, materiais e trilhas para evoluir sua gestao.</h1>
            <p className="mt-3 max-w-2xl text-sm text-sidebar-foreground/70">Acesse seus cursos contratados, continue de onde parou e conheca novos treinamentos disponiveis.</p>
          </div>
          <div className="flex items-center justify-center rounded-lg bg-white/10 p-6">
            <GraduationCap className="h-24 w-24 text-accent" />
          </div>
        </div>
      </section>

      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar curso, aula ou categoria" />
      </div>

      {error ? <Card className="border-destructive/20 bg-destructive/10"><CardContent className="p-5 text-sm text-destructive">{error}</CardContent></Card> : null}

      <CourseSection title="Meus cursos" empty="Voce ainda nao possui cursos contratados." courses={myCourses} enrollmentByCourse={enrollmentByCourse} owned />
      <CourseSection title="Conheca novos cursos" empty="Nenhum curso disponivel no momento." courses={availableCourses} enrollmentByCourse={enrollmentByCourse} />
    </div>
  );
}

function CourseSection({
  title,
  empty,
  courses,
  enrollmentByCourse,
  owned,
}: {
  title: string;
  empty: string;
  courses: Course[];
  enrollmentByCourse: Map<string, UserCourseEnrollment>;
  owned?: boolean;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-semibold">{title}</h2>
        <Badge variant="outline">{courses.length}</Badge>
      </div>
      {courses.length === 0 ? (
        <Card className="border-dashed bg-white/80"><CardContent className="p-6 text-sm text-muted-foreground">{empty}</CardContent></Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => {
            const enrollment = enrollmentByCourse.get(course.id);
            return <CourseCard key={course.id} course={course} enrollment={enrollment} owned={owned} />;
          })}
        </div>
      )}
    </section>
  );
}

function CourseCard({ course, enrollment, owned }: { course: Course; enrollment?: UserCourseEnrollment; owned?: boolean }) {
  return (
    <Card className="flex h-full overflow-hidden border-primary/10 bg-white/90 shadow-sm">
      <div className="flex w-full flex-col">
        <div className="aspect-[16/9] bg-muted">
          {course.thumbnail_url || course.cover_url ? (
            <img src={course.thumbnail_url ?? course.cover_url ?? ""} alt={course.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center bg-sidebar text-sidebar-foreground"><BookOpen className="h-12 w-12 text-accent" /></div>
          )}
        </div>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <Badge variant="outline">{course.category ?? "Curso"}</Badge>
            <Badge className={enrollment ? "bg-emerald-600" : ""}>{enrollment ? "Contratado" : formatPrice(course)}</Badge>
          </div>
          <CardTitle className="text-xl">{course.title}</CardTitle>
          <p className="line-clamp-2 text-sm text-muted-foreground">{course.short_description ?? course.description ?? "Curso disponivel na plataforma."}</p>
        </CardHeader>
        <CardContent className="mt-auto space-y-4">
          {owned ? (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground"><span>Progresso</span><span>0%</span></div>
              <Progress value={0} className="h-2" />
            </div>
          ) : null}
          <Button asChild className="w-full bg-primary hover:bg-primary/90">
            <Link to={owned ? `/cursos/${course.slug}/aulas` : `/cursos/${course.slug}`}>
              {owned ? "Continuar assistindo" : "Ver detalhes"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </div>
    </Card>
  );
}

function formatPrice(course: Course) {
  if (!course.price || Number(course.price) <= 0) return "Gratuito";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: course.currency ?? "BRL" }).format(Number(course.price));
}
