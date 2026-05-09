import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, GraduationCap } from "lucide-react";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCoursePrice, getPublishedCourses, type Course } from "@/lib/courses";

export default function PublicCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Cursos Online de Gestão Empresarial";
    setMetaDescription("Cursos digitais para desenvolver liderança, finanças, estratégia e rotina de gestão empresarial.");

    getPublishedCourses()
      .then(setCourses)
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="border-b border-border/70 bg-secondary/50">
          <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
            <Badge className="bg-accent text-accent-foreground">CURSOS ONLINE</Badge>
            <h1 className="font-display mt-5 max-w-4xl text-4xl font-semibold leading-tight md:text-5xl">
              Aprenda gestão empresarial no seu ritmo
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
              Cursos práticos para empresários, gestores e equipes que desejam melhorar processos, finanças e tomada de decisão.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-14 md:py-20">
          <div className="mb-10 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Cursos Online</p>
            <h2 className="font-display mt-3 text-3xl font-semibold md:text-4xl">
              Conteúdos digitais para desenvolver sua gestão, sua liderança e sua rotina empresarial.
            </h2>
          </div>

          {loading ? (
            <Card className="border-primary/10 bg-card">
              <CardContent className="p-6 text-sm text-muted-foreground">Carregando cursos...</CardContent>
            </Card>
          ) : courses.length === 0 ? (
            <Card className="border-dashed bg-card">
              <CardContent className="flex flex-col items-start gap-4 p-8 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <p className="mt-5 text-lg font-semibold">Novos cursos estarão disponíveis em breve.</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    A estrutura da vitrine já está pronta para receber os cursos publicados no painel administrativo.
                  </p>
                </div>
                <Button asChild variant="outline">
                  <Link to="/#produtos">Voltar aos produtos</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {courses.map((course) => (
                <CourseShelfCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function CourseShelfCard({ course }: { course: Course }) {
  return (
    <Card className="flex h-full overflow-hidden border-primary/10 bg-card shadow-sm">
      <div className="flex w-full flex-col">
        <div className="aspect-[16/9] bg-muted">
          {course.thumbnail_url || course.cover_url ? (
            <img src={course.thumbnail_url ?? course.cover_url ?? ""} alt={course.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center bg-primary/10 text-primary">
              <GraduationCap className="h-14 w-14" />
            </div>
          )}
        </div>
        <CardHeader>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{course.category ?? "Curso"}</Badge>
            <Badge variant="outline">{levelLabel(course.level)}</Badge>
            <Badge className="bg-accent text-accent-foreground">{formatCoursePrice(course)}</Badge>
          </div>
          <CardTitle className="text-xl">{course.title}</CardTitle>
          <CardDescription className="line-clamp-3 leading-6">
            {course.short_description ?? course.description ?? "Curso disponível na plataforma."}
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-auto">
          <Button asChild className="w-full bg-primary hover:bg-primary/90">
            <Link to={`/login?callbackUrl=${encodeURIComponent(`/cursos/${course.slug}`)}`}>
              Acessar curso
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </div>
    </Card>
  );
}

function levelLabel(value: string) {
  const labels: Record<string, string> = { beginner: "Iniciante", intermediate: "Intermediário", advanced: "Avançado", all: "Todos os níveis" };
  return labels[value] ?? "Todos os níveis";
}

function setMetaDescription(content: string) {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "description";
    document.head.appendChild(meta);
  }
  meta.content = content;
}
