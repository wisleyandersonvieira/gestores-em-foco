import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, CheckCircle2, GraduationCap, Search } from "lucide-react";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatCoursePrice, getPublishedCourses, type Course } from "@/lib/courses";
import { getPublicProductBySlug, PRODUCT_SLUGS } from "@/lib/products";

export default function PublicCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [coursesProductVisible, setCoursesProductVisible] = useState(true);

  useEffect(() => {
    document.title = "Cursos Online de Gestão Empresarial";
    setMetaDescription("Cursos digitais para desenvolver liderança, finanças, estratégia e rotina de gestão empresarial.");

    Promise.all([getPublicProductBySlug(PRODUCT_SLUGS.courses), getPublishedCourses()])
      .then(([product, nextCourses]) => {
        setCoursesProductVisible(Boolean(product));
        setCourses(product ? nextCourses : []);
      })
      .catch(() => {
        setCoursesProductVisible(false);
        setCourses([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(Boolean(session?.user));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session?.user));
    });

    return () => subscription.unsubscribe();
  }, []);

  const filteredCourses = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return courses;
    return courses.filter((course) =>
      [course.title, course.short_description, course.description, course.category]
        .some((value) => String(value ?? "").toLowerCase().includes(term))
    );
  }, [courses, search]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="border-b border-border/70 bg-secondary/45">
          <div className="mx-auto grid max-w-[1200px] gap-8 px-6 py-10 md:py-14 lg:grid-cols-[1fr_340px] lg:items-center">
            <div>
              <Badge className="bg-accent text-accent-foreground">CURSOS ONLINE</Badge>
              <h1 className="font-display mt-4 max-w-[850px] text-3xl font-semibold leading-tight md:text-5xl">
                Aprenda gestão empresarial no seu ritmo
              </h1>
              <p className="mt-4 max-w-[720px] text-base leading-7 text-muted-foreground md:text-lg">
                Cursos práticos para empresários, gestores e equipes que desejam melhorar processos, finanças e tomada de decisão.
              </p>
            </div>

            <Card className="hidden border-primary/10 bg-card/95 shadow-sm lg:block">
              <CardContent className="p-5">
                <p className="font-display text-lg font-semibold">Conteúdo para evoluir sua gestão</p>
                <ul className="mt-4 grid gap-3 text-sm text-muted-foreground">
                  {["Aulas objetivas", "Materiais de apoio", "Acesso após login"].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-6 py-8 md:py-10">
          <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl font-semibold md:text-3xl">Cursos disponíveis</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Conteúdos digitais para desenvolver sua gestão, liderança e rotina empresarial.
              </p>
            </div>
            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar curso"
                className="h-11 bg-card pl-9"
              />
            </div>
          </div>

          {loading ? (
            <Card className="border-primary/10 bg-card">
              <CardContent className="p-6 text-sm text-muted-foreground">Carregando cursos...</CardContent>
            </Card>
          ) : !coursesProductVisible ? (
            <Card className="border-dashed bg-card">
              <CardContent className="flex flex-col items-start gap-5 p-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <p className="mt-5 text-lg font-semibold">Cursos indisponíveis no momento</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Novos cursos online serão publicados em breve.</p>
                </div>
                <Button asChild variant="outline">
                  <Link to="/produtos">Voltar para produtos</Link>
                </Button>
              </CardContent>
            </Card>
          ) : courses.length === 0 ? (
            <Card className="border-dashed bg-card">
              <CardContent className="flex flex-col items-start gap-5 p-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <p className="mt-5 text-lg font-semibold">Nenhum curso disponível no momento</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Novos cursos online serão publicados em breve.</p>
                </div>
                <Button asChild variant="outline">
                  <Link to="/produtos">Voltar para produtos</Link>
                </Button>
              </CardContent>
            </Card>
          ) : filteredCourses.length === 0 ? (
            <Card className="border-dashed bg-card">
              <CardContent className="p-6 text-sm text-muted-foreground">Nenhum curso encontrado para a busca informada.</CardContent>
            </Card>
          ) : (
            <div className="grid max-w-5xl gap-6 md:grid-cols-2 xl:max-w-none xl:grid-cols-3 2xl:grid-cols-4">
              {filteredCourses.map((course) => (
                <CourseShelfCard key={course.id} course={course} isAuthenticated={isAuthenticated} />
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function CourseShelfCard({ course, isAuthenticated }: { course: Course; isAuthenticated: boolean }) {
  const coursePath = `/cursos/${course.slug}`;
  const href = isAuthenticated ? coursePath : `/login?redirect=${encodeURIComponent(coursePath)}`;

  return (
    <Card className="flex h-full overflow-hidden border-primary/10 bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
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
        <CardHeader className="space-y-3 p-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{course.category ?? "Curso"}</Badge>
            <Badge variant="outline">{levelLabel(course.level)}</Badge>
            <Badge className="bg-accent text-accent-foreground">{formatCoursePrice(course)}</Badge>
          </div>
          <CardTitle className="line-clamp-2 text-xl">{course.title}</CardTitle>
          <CardDescription className="line-clamp-3 text-sm leading-6">
            {course.short_description ?? course.description ?? "Curso disponível na plataforma."}
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-auto p-5 pt-0">
          <Button asChild className="w-full bg-primary hover:bg-primary/90">
            <Link to={href}>
              {isAuthenticated ? "Acessar curso" : "Entrar para acessar"}
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
