import { useEffect, useRef, useState } from "react";
import type React from "react";
import { BookOpen, CheckCircle2, Download, Eye, EyeOff, FileSpreadsheet, FileText, Image, Link as LinkIcon, Pencil, Plus, Table as TableIcon, Trash2, Upload, Users } from "lucide-react";
import { toast } from "sonner";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteCourseLesson,
  deleteCourseMaterialWithFile,
  deleteCourseModule,
  formatFileSize,
  formatDuration,
  formatDurationInput,
  getAdminCourses,
  getCourseMaterialSignedUrl,
  grantCourseAccess,
  materialMimeLabel,
  removeCourseMaterialFile,
  saveCourse,
  saveCourseLesson,
  saveCourseMaterial,
  saveCourseModule,
  slugifyCourseTitle,
  updateCourseVisibility,
  updateCourseEnrollment,
  uploadCourseMaterial,
  validateCourseMaterialFile,
  type Course,
  type CourseLesson,
  type CourseMaterial,
  type CourseModule,
  type EnrollmentAccessType,
  type EnrollmentStatus,
  type UserCourseEnrollment,
  type UserLessonProgress,
} from "@/lib/courses";

type AdminUser = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  company_name?: string | null;
  global_profile?: { full_name?: string | null; company_name?: string | null } | null;
};

type AdminCoursesState = {
  courses: Course[];
  modules: CourseModule[];
  lessons: CourseLesson[];
  materials: CourseMaterial[];
  enrollments: Array<UserCourseEnrollment & { profile?: AdminUser }>;
  progress: UserLessonProgress[];
};

const emptyState: AdminCoursesState = { courses: [], modules: [], lessons: [], materials: [], enrollments: [], progress: [] };

export function CoursesAdminPanel({ userId, users }: { userId: string | null; users: AdminUser[] }) {
  const [state, setState] = useState<AdminCoursesState>(emptyState);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [courseDialog, setCourseDialog] = useState<Course | null | "new">(null);
  const [moduleDialog, setModuleDialog] = useState<CourseModule | null | "new">(null);
  const [lessonDialog, setLessonDialog] = useState<CourseLesson | null | "new">(null);
  const [lessonModuleId, setLessonModuleId] = useState<string | null>(null);
  const [materialDialog, setMaterialDialog] = useState<{ lesson: CourseLesson; material?: CourseMaterial | "new" } | null>(null);
  const [enrollmentDialog, setEnrollmentDialog] = useState<UserCourseEnrollment | null | "new">(null);
  const [visibilityTarget, setVisibilityTarget] = useState<Course | null>(null);
  const [search, setSearch] = useState("");

  async function reload() {
    try {
      const data = await getAdminCourses();
      setState(data);
      setSelectedCourseId((current) => current ?? data.courses[0]?.id ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel carregar cursos.");
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  const selectedCourse = state.courses.find((course) => course.id === selectedCourseId) ?? null;
  const filteredCourses = state.courses.filter((course) => {
    const term = search.toLowerCase();
    return !term || [course.title, course.category, course.instructor_name, course.status].some((value) => String(value ?? "").toLowerCase().includes(term));
  });
  const courseModules = state.modules.filter((module) => module.course_id === selectedCourseId).sort((a, b) => a.display_order - b.display_order);
  const courseLessons = state.lessons.filter((lesson) => lesson.course_id === selectedCourseId).sort((a, b) => a.display_order - b.display_order);
  const courseMaterials = state.materials.filter((material) => material.course_id === selectedCourseId);
  const courseEnrollments = state.enrollments.filter((enrollment) => enrollment.course_id === selectedCourseId);
  const progressStats = calculateProgressStats(courseLessons, courseEnrollments, state.progress);
  const activeLessons = state.lessons.filter((lesson) => lesson.status === "active");
  const nextVisibility = visibilityTarget ? !visibilityTarget.is_public_visible : true;

  const openNewLesson = (moduleId: string) => {
    setLessonModuleId(moduleId);
    setLessonDialog("new");
  };

  async function confirmVisibilityChange() {
    if (!visibilityTarget) return;
    try {
      await updateCourseVisibility(visibilityTarget.id, nextVisibility);
      toast.success(nextVisibility ? "Exibição no site habilitada com sucesso." : "Exibição no site desabilitada com sucesso.");
      setVisibilityTarget(null);
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a visibilidade.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold">Produto: Cursos</h2>
        <p className="text-sm text-muted-foreground">Cadastre cursos, organize modulos e aulas, acompanhe matriculas e progresso.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Cursos cadastrados" value={state.courses.length} icon={BookOpen} />
        <StatCard label="Publicados" value={state.courses.filter((course) => course.status === "published").length} icon={CheckCircle2} />
        <StatCard label="Matriculas" value={state.enrollments.length} icon={Users} />
        <StatCard label="Aulas" value={activeLessons.length} icon={FileText} />
      </div>

      <Tabs defaultValue="courses" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="courses">Cursos</TabsTrigger>
          <TabsTrigger value="content" disabled={!selectedCourse}>Conteudo</TabsTrigger>
          <TabsTrigger value="students" disabled={!selectedCourse}>Alunos</TabsTrigger>
          <TabsTrigger value="progress" disabled={!selectedCourse}>Progresso</TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por curso, categoria ou status" className="max-w-md" />
            <Button onClick={() => setCourseDialog("new")} className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4" />Novo curso</Button>
          </div>
          <Card className="bg-white/90">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Curso</TableHead><TableHead>Categoria</TableHead><TableHead>Status</TableHead><TableHead>Visibilidade</TableHead><TableHead>Preco</TableHead><TableHead>Modulos</TableHead><TableHead>Aulas</TableHead><TableHead>Alunos</TableHead><TableHead>Acoes</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredCourses.length ? filteredCourses.map((course) => (
                    <TableRow key={course.id} className={course.id === selectedCourseId ? "bg-primary/5" : ""}>
                      <TableCell><button className="text-left font-medium hover:text-primary" onClick={() => setSelectedCourseId(course.id)}>{course.title}</button><p className="text-xs text-muted-foreground">{course.slug}</p></TableCell>
                      <TableCell>{course.category ?? "-"}</TableCell>
                      <TableCell><Badge variant="outline">{statusLabel(course.status)}</Badge></TableCell>
                      <TableCell><VisibilityBadge visible={course.is_public_visible} /></TableCell>
                      <TableCell>{course.price ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: course.currency ?? "BRL" }).format(Number(course.price)) : "Gratuito"}</TableCell>
                      <TableCell>{state.modules.filter((module) => module.course_id === course.id && module.status === "active").length}</TableCell>
                      <TableCell>{state.lessons.filter((lesson) => lesson.course_id === course.id && lesson.status === "active").length}</TableCell>
                      <TableCell>{state.enrollments.filter((enrollment) => enrollment.course_id === course.id).length}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => { setSelectedCourseId(course.id); setCourseDialog(course); }}>Editar</Button>
                          <Button size="sm" variant="outline" onClick={() => setVisibilityTarget(course)}>
                            {course.is_public_visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            {course.is_public_visible ? "Desabilitar no site" : "Habilitar no site"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : <TableRow><TableCell colSpan={9} className="text-muted-foreground">Nenhum curso cadastrado ainda.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <div className="space-y-1">
            <h3 className="font-display text-2xl font-semibold">Conteudo do curso</h3>
            <p className="text-sm text-muted-foreground">Organize os blocos, aulas e materiais deste curso.</p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <Field label="Selecionar curso" className="w-full md:max-w-md">
              <Select value={selectedCourseId ?? ""} onValueChange={setSelectedCourseId}>
                <SelectTrigger><SelectValue placeholder="Selecione um curso" /></SelectTrigger>
                <SelectContent>{state.courses.map((course) => <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Button onClick={() => setModuleDialog("new")} disabled={!selectedCourse} className="w-full bg-accent text-accent-foreground hover:bg-accent/90 md:w-auto">
              <Plus className="h-4 w-4" />Novo bloco
            </Button>
          </div>

          {!selectedCourse ? (
            <EmptyCard message="Selecione um curso para gerenciar o conteudo." />
          ) : (
            <>
              <CourseContentSummary course={selectedCourse} modules={courseModules} lessons={courseLessons} materials={courseMaterials} />
              {courseModules.length === 0 ? (
                <Card className="border-dashed bg-white/80">
                  <CardContent className="flex flex-col gap-3 p-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <span>Este curso ainda nao possui blocos cadastrados.</span>
                    <Button onClick={() => setModuleDialog("new")} className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4" />Criar primeiro bloco</Button>
                  </CardContent>
                </Card>
              ) : (
                <Accordion type="multiple" defaultValue={courseModules.map((module) => module.id)} className="space-y-3">
                  {courseModules.map((module) => {
                    const lessons = courseLessons.filter((lesson) => lesson.module_id === module.id).sort((a, b) => a.display_order - b.display_order);
                    return (
                      <AccordionItem key={module.id} value={module.id} className="rounded-lg border bg-white/90 px-4">
                        <AccordionTrigger className="gap-3 text-left hover:no-underline">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-display text-lg font-semibold">Bloco {module.display_order} - {module.title}</span>
                              <Badge variant={module.status === "active" ? "default" : "outline"}>{module.status === "active" ? "Ativo" : "Inativo"}</Badge>
                              <Badge variant="outline">{lessons.length} aula(s)</Badge>
                            </div>
                            <p className="mt-1 line-clamp-2 text-sm font-normal text-muted-foreground">{module.description || "Sem descricao"}</p>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => setModuleDialog(module)}><Pencil className="h-4 w-4" />Editar</Button>
                            <Button size="sm" variant="outline" onClick={() => openNewLesson(module.id)}><Plus className="h-4 w-4" />Adicionar aula</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteModule(module, lessons, reload)}><Trash2 className="h-4 w-4" />Excluir</Button>
                          </div>

                          {lessons.length === 0 ? (
                            <div className="flex flex-col gap-3 rounded-md border border-dashed p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                              <span>Nenhuma aula cadastrada neste bloco.</span>
                              <Button size="sm" variant="outline" onClick={() => openNewLesson(module.id)}><Plus className="h-4 w-4" />Adicionar primeira aula</Button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {lessons.map((lesson) => {
                                const lessonMaterials = courseMaterials.filter((material) => material.lesson_id === lesson.id);
                                return (
                                  <div key={lesson.id} className="flex flex-col gap-3 rounded-lg border bg-card p-3 md:flex-row md:items-center md:justify-between">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-medium">{lesson.title}</p>
                                        <Badge variant={lesson.status === "active" ? "default" : "outline"}>{lesson.status === "active" ? "Ativa" : "Inativa"}</Badge>
                                        {lesson.is_preview ? <Badge variant="outline">Previa gratuita</Badge> : null}
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        {lessonTypeLabel(lesson.lesson_type)} {lesson.video_provider ? `- ${providerLabel(lesson.video_provider)}` : ""} {lesson.duration_seconds ? `- ${formatDuration(lesson.duration_seconds)}` : ""} - {lessonMaterials.length} material(is)
                                      </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      <Button size="sm" variant="outline" onClick={() => setLessonDialog(lesson)}><Pencil className="h-4 w-4" />Editar</Button>
                                      <Button size="sm" variant="outline" onClick={() => setMaterialDialog({ lesson })}>Materiais</Button>
                                      <Button size="sm" variant="destructive" onClick={() => handleDeleteLesson(lesson, state.progress, reload)}><Trash2 className="h-4 w-4" />Excluir</Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <SelectedCourseHeader course={selectedCourse} />
          <Button onClick={() => setEnrollmentDialog("new")} className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4" />Conceder acesso</Button>
          <Card className="bg-white/90"><CardContent className="p-0"><EnrollmentsTable enrollments={courseEnrollments} progress={state.progress} lessons={courseLessons} onEdit={setEnrollmentDialog} /></CardContent></Card>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <SelectedCourseHeader course={selectedCourse} />
          <div className="grid gap-4 md:grid-cols-4">
            <MiniMetric label="Alunos" value={courseEnrollments.length} />
            <MiniMetric label="Iniciaram" value={progressStats.started} />
            <MiniMetric label="Concluidos 100%" value={progressStats.completedUsers} />
            <MiniMetric label="Progresso medio" value={`${progressStats.average}%`} />
          </div>
          <Card className="bg-white/90"><CardContent className="p-0"><EnrollmentsTable enrollments={courseEnrollments} progress={state.progress} lessons={courseLessons} onEdit={setEnrollmentDialog} /></CardContent></Card>
        </TabsContent>
      </Tabs>

      <CourseDialog open={Boolean(courseDialog)} value={courseDialog} userId={userId} onClose={() => setCourseDialog(null)} onSaved={reload} />
      <ModuleDialog open={Boolean(moduleDialog)} value={moduleDialog} course={selectedCourse} modules={courseModules} onClose={() => setModuleDialog(null)} onSaved={reload} />
      <LessonDialog open={Boolean(lessonDialog)} value={lessonDialog} course={selectedCourse} modules={courseModules} lessons={courseLessons} initialModuleId={lessonModuleId} onClose={() => { setLessonDialog(null); setLessonModuleId(null); }} onSaved={reload} />
      <MaterialDialog open={Boolean(materialDialog)} value={materialDialog?.material ?? null} course={selectedCourse} lesson={materialDialog?.lesson ?? null} materials={courseMaterials} onClose={() => setMaterialDialog(null)} onSaved={reload} />
      <EnrollmentDialog open={Boolean(enrollmentDialog)} value={enrollmentDialog} course={selectedCourse} users={users} onClose={() => setEnrollmentDialog(null)} onSaved={reload} />
      <Dialog open={Boolean(visibilityTarget)} onOpenChange={(open) => !open && setVisibilityTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{nextVisibility ? "Habilitar exibição no site" : "Desabilitar exibição no site"}</DialogTitle>
            <DialogDescription>
              {nextVisibility
                ? "Este item voltará a aparecer nas páginas públicas e nas prateleiras de contratação."
                : "Este item deixará de aparecer nas páginas públicas e nas prateleiras de contratação. Usuários que já possuem acesso continuarão podendo utilizar normalmente."}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-muted p-4 text-sm">
            Curso: <strong>{visibilityTarget?.title}</strong>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setVisibilityTarget(null)}>Cancelar</Button>
            <Button onClick={() => void confirmVisibilityChange()}>{nextVisibility ? "Habilitar" : "Desabilitar"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CourseDialog({ open, value, userId, onClose, onSaved }: { open: boolean; value: Course | "new" | null; userId: string | null; onClose: () => void; onSaved: () => void }) {
  const course = typeof value === "object" && value ? value : null;
  const [form, setForm] = useState<Partial<Course> & { title: string }>({ title: "" });
  useEffect(() => setForm(course ?? { title: "", slug: "", status: "draft", level: "beginner", currency: "BRL", display_order: 0, is_public_visible: true }), [course, open]);
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-auto">
        <DialogHeader><DialogTitle>{course ? "Editar curso" : "Novo curso"}</DialogTitle><DialogDescription>Configure dados comerciais, capa e publicacao.</DialogDescription></DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nome"><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value, slug: form.slug || slugifyCourseTitle(event.target.value) })} /></Field>
          <Field label="Slug"><Input value={form.slug ?? ""} onChange={(event) => setForm({ ...form, slug: event.target.value })} /></Field>
          <Field label="Descricao curta"><Input value={form.short_description ?? ""} onChange={(event) => setForm({ ...form, short_description: event.target.value })} /></Field>
          <Field label="Categoria"><Input value={form.category ?? ""} onChange={(event) => setForm({ ...form, category: event.target.value })} /></Field>
          <Field label="Instrutor"><Input value={form.instructor_name ?? ""} onChange={(event) => setForm({ ...form, instructor_name: event.target.value })} /></Field>
          <Field label="Nivel"><Select value={form.level ?? "beginner"} onValueChange={(level) => setForm({ ...form, level: level as Course["level"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="beginner">Iniciante</SelectItem><SelectItem value="intermediate">Intermediario</SelectItem><SelectItem value="advanced">Avancado</SelectItem><SelectItem value="all">Todos</SelectItem></SelectContent></Select></Field>
          <Field label="Preco"><Input type="number" value={form.price ?? ""} onChange={(event) => setForm({ ...form, price: Number(event.target.value) })} /></Field>
          <Field label="Checkout URL"><Input value={form.checkout_url ?? ""} onChange={(event) => setForm({ ...form, checkout_url: event.target.value })} /></Field>
          <Field label="Thumbnail URL"><Input value={form.thumbnail_url ?? ""} onChange={(event) => setForm({ ...form, thumbnail_url: event.target.value })} /></Field>
          <Field label="Capa URL"><Input value={form.cover_url ?? ""} onChange={(event) => setForm({ ...form, cover_url: event.target.value })} /></Field>
          <Field label="Status"><Select value={form.status ?? "draft"} onValueChange={(status) => setForm({ ...form, status: status as Course["status"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Rascunho</SelectItem><SelectItem value="published">Publicado</SelectItem><SelectItem value="archived">Arquivado</SelectItem></SelectContent></Select></Field>
          <Field label="Ordem"><Input type="number" value={form.display_order ?? 0} onChange={(event) => setForm({ ...form, display_order: Number(event.target.value) })} /></Field>
          <label className="flex items-center gap-2 text-sm md:col-span-2"><Checkbox checked={form.is_public_visible !== false} onCheckedChange={(checked) => setForm({ ...form, is_public_visible: checked === true })} />Exibir este curso no site público</label>
          <Field label="Descricao completa" className="md:col-span-2"><Textarea value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
        </div>
        <Button onClick={() => void saveCourse(form, userId ?? "").then(() => { toast.success("Curso salvo."); onSaved(); onClose(); }).catch((error) => toast.error(error.message))}>Salvar curso</Button>
      </DialogContent>
    </Dialog>
  );
}

function ModuleDialog(props: { open: boolean; value: CourseModule | "new" | null; course: Course | null; modules: CourseModule[]; onClose: () => void; onSaved: () => void }) {
  const current = typeof props.value === "object" && props.value ? props.value : null;
  const [form, setForm] = useState<Partial<CourseModule> & { title: string }>({ title: "" });
  useEffect(() => setForm(current ?? { title: "", status: "active", display_order: nextOrder(props.modules) }), [current, props.open, props.modules]);
  return <SimpleEntityDialog
    title={current ? "Editar bloco" : "Novo bloco"}
    description={current ? "Atualize as informacoes do bloco." : "Cadastre um bloco para organizar as aulas do curso."}
    open={props.open}
    onClose={props.onClose}
    saveLabel="Salvar bloco"
    onSave={() => props.course && saveCourseModule({ ...form, course_id: props.course.id }).then(() => { toast.success(current ? "Bloco atualizado com sucesso." : "Bloco criado com sucesso."); props.onSaved(); props.onClose(); }).catch((error) => toast.error(error.message))}
  >
    <Field label="Titulo do bloco"><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Introducao ao DRE" /></Field>
    <Field label="Descricao"><Textarea value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Primeiros conceitos para entender a estrutura de um DRE." /></Field>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Ordem"><Input type="number" min={0} value={form.display_order ?? 0} onChange={(event) => setForm({ ...form, display_order: Number(event.target.value) })} /></Field>
      <Field label="Status"><Select value={form.status ?? "active"} onValueChange={(status) => setForm({ ...form, status: status as CourseModule["status"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Ativo</SelectItem><SelectItem value="inactive">Inativo</SelectItem></SelectContent></Select></Field>
    </div>
  </SimpleEntityDialog>;
}

function LessonDialog(props: { open: boolean; value: CourseLesson | "new" | null; course: Course | null; modules: CourseModule[]; lessons: CourseLesson[]; initialModuleId: string | null; onClose: () => void; onSaved: () => void }) {
  const current = typeof props.value === "object" && props.value ? props.value : null;
  const [form, setForm] = useState<Partial<CourseLesson> & { title: string; duration_input?: string }>({ title: "" });
  useEffect(() => {
    const moduleId = current?.module_id ?? props.initialModuleId ?? props.modules[0]?.id ?? "";
    const moduleLessons = props.lessons.filter((lesson) => lesson.module_id === moduleId);
    setForm(current ? { ...current, duration_input: formatDurationInput(current.duration_seconds) } : { title: "", module_id: moduleId, lesson_type: "video", video_provider: "vimeo", status: "active", is_preview: false, display_order: nextOrder(moduleLessons), duration_input: "" });
  }, [current, props.open, props.modules, props.lessons, props.initialModuleId]);
  return <SimpleEntityDialog
    title={current ? "Editar aula" : "Nova aula"}
    description="Cadastre titulo, video, duracao, ordem e status da aula."
    open={props.open}
    onClose={props.onClose}
    saveLabel="Salvar aula"
    onSave={() => props.course && form.module_id && saveCourseLesson({ ...form, course_id: props.course.id, module_id: form.module_id, duration_seconds: form.duration_input ?? form.duration_seconds ?? null } as Partial<CourseLesson> & { course_id: string; module_id: string; title: string }).then(() => { toast.success(current ? "Aula atualizada com sucesso." : "Aula criada com sucesso."); props.onSaved(); props.onClose(); }).catch((error) => toast.error(error.message))}
  >
    <Field label="Bloco"><Select value={form.module_id ?? ""} onValueChange={(module_id) => { const moduleLessons = props.lessons.filter((lesson) => lesson.module_id === module_id); setForm({ ...form, module_id, display_order: current ? form.display_order : nextOrder(moduleLessons) }); }}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{props.modules.map((module) => <SelectItem key={module.id} value={module.id}>{module.title}</SelectItem>)}</SelectContent></Select></Field>
    <Field label="Titulo da aula"><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Aula 1 - O que e DRE?" /></Field>
    <Field label="Descricao da aula"><Textarea value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Tipo da aula"><Select value={form.lesson_type ?? "video"} onValueChange={(lesson_type) => setForm({ ...form, lesson_type: lesson_type as CourseLesson["lesson_type"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="video">Video</SelectItem><SelectItem value="text">Texto</SelectItem><SelectItem value="file">Arquivo</SelectItem><SelectItem value="external_link">Link externo</SelectItem></SelectContent></Select></Field>
      <Field label="Provedor do video"><Select value={form.video_provider ?? "vimeo"} onValueChange={(video_provider) => setForm({ ...form, video_provider: video_provider as CourseLesson["video_provider"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="youtube">YouTube</SelectItem><SelectItem value="vimeo">Vimeo</SelectItem><SelectItem value="external">Externo</SelectItem></SelectContent></Select></Field>
    </div>
    <Field label="Link do video"><Input value={form.video_url ?? ""} onChange={(event) => setForm({ ...form, video_url: event.target.value })} placeholder="https://vimeo.com/123456789/a1b2c3d4e5" /><span className="text-xs font-normal text-muted-foreground">Cole o link do Vimeo. Para videos nao listados, use o link completo com o codigo de privacidade (vimeo.com/ID/codigo).</span></Field>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Duracao da aula"><Input value={form.duration_input ?? ""} onChange={(event) => setForm({ ...form, duration_input: event.target.value })} placeholder="10, 10:30 ou 01:10:30" /></Field>
      <Field label="Thumbnail URL"><Input value={form.thumbnail_url ?? ""} onChange={(event) => setForm({ ...form, thumbnail_url: event.target.value })} placeholder="Opcional" /></Field>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Ordem"><Input type="number" min={0} value={form.display_order ?? 0} onChange={(event) => setForm({ ...form, display_order: Number(event.target.value) })} /></Field>
      <Field label="Status"><Select value={form.status ?? "active"} onValueChange={(status) => setForm({ ...form, status: status as CourseLesson["status"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Ativa</SelectItem><SelectItem value="inactive">Inativa</SelectItem></SelectContent></Select></Field>
    </div>
    <label className="flex items-center gap-2 text-sm"><Checkbox checked={Boolean(form.is_preview)} onCheckedChange={(checked) => setForm({ ...form, is_preview: checked === true })} />Permitir assistir esta aula sem contratacao</label>
  </SimpleEntityDialog>;
}

function MaterialDialog(props: { open: boolean; value: CourseMaterial | "new" | null; course: Course | null; lesson: CourseLesson | null; materials: CourseMaterial[]; onClose: () => void; onSaved: () => void }) {
  const current = typeof props.value === "object" && props.value ? props.value : null;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<Partial<CourseMaterial> & { title: string }>({ title: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<CourseMaterial | null>(current);
  const [saving, setSaving] = useState(false);
  const [preparingId, setPreparingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const lessonMaterials = props.lesson ? props.materials.filter((material) => material.lesson_id === props.lesson?.id).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)) : [];

  function resetForm(type: CourseMaterial["material_type"] = "link") {
    setEditingMaterial(null);
    setSelectedFile(null);
    setForm({ title: "", material_type: type, display_order: nextOrder(lessonMaterials) });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  useEffect(() => {
    setEditingMaterial(current);
    setSelectedFile(null);
    setForm(current ?? { title: "", material_type: "link", display_order: nextOrder(lessonMaterials) });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [current, props.open, props.lesson?.id, props.materials]);

  async function handleSaveMaterial() {
    if (!props.course || !props.lesson || saving) return;
    setSaving(true);
    let uploadedPath: string | null = null;
    try {
      let filePayload: Partial<CourseMaterial> = {};
      if (form.material_type === "file" && !editingMaterial) {
        if (!selectedFile) throw new Error("Selecione um arquivo.");
        const upload = await uploadCourseMaterial({ courseId: props.course.id, lessonId: props.lesson.id, file: selectedFile });
        uploadedPath = upload.file_path;
        filePayload = { ...upload, file_url: null };
      }

      await saveCourseMaterial({
        ...form,
        ...filePayload,
        id: editingMaterial?.id,
        course_id: props.course.id,
        module_id: props.lesson.module_id,
        lesson_id: props.lesson.id,
        material_type: form.material_type ?? "link",
        external_url: form.material_type === "link" ? form.external_url : null,
        file_path: form.material_type === "file" ? filePayload.file_path ?? form.file_path ?? editingMaterial?.file_path ?? null : null,
        file_url: null,
        file_name: form.material_type === "file" ? filePayload.file_name ?? form.file_name ?? editingMaterial?.file_name ?? null : null,
        file_size: form.material_type === "file" ? filePayload.file_size ?? form.file_size ?? editingMaterial?.file_size ?? null : null,
        mime_type: form.material_type === "file" ? filePayload.mime_type ?? form.mime_type ?? editingMaterial?.mime_type ?? null : null,
      });

      toast.success(editingMaterial ? "Material atualizado com sucesso." : "Material adicionado com sucesso.");
      await props.onSaved();
      resetForm(form.material_type ?? "link");
    } catch (error) {
      if (uploadedPath) {
        try {
          await removeCourseMaterialFile(uploadedPath);
        } catch (cleanupError) {
          if (import.meta.env.DEV) console.error("Falha ao limpar arquivo enviado sem registro.", cleanupError);
        }
      }
      toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar o material.");
    } finally {
      setSaving(false);
    }
  }

  async function handleOpenMaterial(material: CourseMaterial) {
    if (preparingId) return;
    setPreparingId(material.id);
    try {
      const url = material.material_type === "link" ? material.external_url : material.file_path ? await getCourseMaterialSignedUrl(material.file_path) : material.file_url;
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel preparar o download do material.");
    } finally {
      setPreparingId(null);
    }
  }

  async function handleDeleteMaterial(material: CourseMaterial) {
    if (!window.confirm("Deseja realmente excluir este material?")) return;
    setDeletingId(material.id);
    try {
      await deleteCourseMaterialWithFile(material);
      toast.success("Material excluido com sucesso.");
      await props.onSaved();
      if (editingMaterial?.id === material.id) resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel excluir o material.");
    } finally {
      setDeletingId(null);
    }
  }

  return <SimpleEntityDialog
    title="Materiais de apoio"
    description={props.lesson ? props.lesson.title : "Gerencie os materiais da aula."}
    open={props.open}
    onClose={props.onClose}
    saveLabel={saving ? "Enviando..." : editingMaterial ? "Salvar material" : "Adicionar material"}
    onSave={() => void handleSaveMaterial()}
    saving={saving}
  >
    <div className="space-y-2 rounded-md border p-3">
      {lessonMaterials.length ? lessonMaterials.map((material) => (
        <div key={material.id} className="flex flex-col gap-3 rounded-md bg-muted/40 p-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 gap-3">
            <MaterialIcon material={material} className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="font-medium">{material.title}</p>
              <p className="break-all text-xs text-muted-foreground">
                {material.file_name ?? material.external_url ?? "Material"} {material.file_size ? `- ${formatFileSize(material.file_size)}` : ""} - {materialMimeLabel(material.mime_type, material.material_type)} - ordem {material.display_order ?? 0}
              </p>
              {material.description ? <p className="mt-1 text-xs text-muted-foreground">{material.description}</p> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => void handleOpenMaterial(material)} disabled={preparingId === material.id}>{preparingId === material.id ? null : <Download className="h-4 w-4" />}{preparingId === material.id ? "Preparando..." : material.material_type === "link" ? "Abrir" : "Baixar"}</Button>
            <Button size="sm" variant="outline" onClick={() => { setEditingMaterial(material); setSelectedFile(null); setForm(material); if (fileInputRef.current) fileInputRef.current.value = ""; }}><Pencil className="h-4 w-4" />Editar</Button>
            <Button size="sm" variant="destructive" onClick={() => void handleDeleteMaterial(material)} disabled={deletingId === material.id}>{deletingId === material.id ? "Excluindo..." : "Excluir"}</Button>
          </div>
        </div>
      )) : <p className="text-sm text-muted-foreground">Nenhum material de apoio cadastrado para esta aula.</p>}
    </div>
    {editingMaterial ? <div className="flex items-center justify-between gap-3 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm"><span>Editando: {editingMaterial.title}</span><Button size="sm" variant="outline" onClick={() => resetForm()}>Cancelar edicao</Button></div> : null}
    <Field label="Titulo do material"><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Apostila da Aula 1" /></Field>
    <Field label="Descricao"><Textarea value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Tipo do material"><Select value={form.material_type ?? "link"} disabled={Boolean(editingMaterial)} onValueChange={(material_type) => { setSelectedFile(null); setForm({ ...form, material_type: material_type as CourseMaterial["material_type"], external_url: "", file_path: null, file_url: null, file_name: null, file_size: null, mime_type: null }); if (fileInputRef.current) fileInputRef.current.value = ""; }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="link">Link externo</SelectItem><SelectItem value="file">Arquivo</SelectItem></SelectContent></Select></Field>
      <Field label="Ordem"><Input type="number" min={0} value={form.display_order ?? 0} onChange={(event) => setForm({ ...form, display_order: Number(event.target.value) })} /></Field>
    </div>
    {form.material_type === "file" ? (
      <div className="space-y-2">
        <Label>Arquivo do material</Label>
        {editingMaterial ? (
          <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">A troca de arquivo nao esta habilitada nesta etapa. Voce pode editar titulo, descricao e ordem.</div>
        ) : selectedFile ? (
          <div className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="break-all font-medium">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">{materialMimeLabel(selectedFile.type)} - {formatFileSize(selectedFile.size)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>Trocar arquivo</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>Remover</Button>
            </div>
          </div>
        ) : (
          <button type="button" className="flex w-full flex-col items-center justify-center rounded-md border border-dashed p-6 text-sm text-muted-foreground transition hover:border-primary hover:text-primary" onClick={() => fileInputRef.current?.click()}>
            <UploadHint />
            <span className="mt-2 font-medium">Selecionar arquivo</span>
            <span className="mt-1">PDF, Excel, Word, CSV ou imagem ate 20 MB</span>
          </button>
        )}
        <Input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.xls,.xlsx,.doc,.docx,.csv,.jpg,.jpeg,.png,.webp,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/csv,application/csv,image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            try {
              if (file) validateCourseMaterialFile(file);
              setSelectedFile(file);
            } catch (error) {
              setSelectedFile(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
              toast.error(error instanceof Error ? error.message : "Tipo de arquivo nao permitido.");
            }
          }}
        />
      </div>
    ) : (
      <Field label="URL externa"><Input value={form.external_url ?? ""} onChange={(event) => setForm({ ...form, external_url: event.target.value })} placeholder="https://..." /></Field>
    )}
  </SimpleEntityDialog>;
}

function EnrollmentDialog({ open, value, course, users, onClose, onSaved }: { open: boolean; value: UserCourseEnrollment | "new" | null; course: Course | null; users: AdminUser[]; onClose: () => void; onSaved: () => void }) {
  const current = typeof value === "object" && value ? value : null;
  const [form, setForm] = useState({ user_id: "", status: "active" as EnrollmentStatus, access_type: "admin" as EnrollmentAccessType, expires_at: "" });
  useEffect(() => setForm({ user_id: current?.user_id ?? "", status: current?.status ?? "active", access_type: current?.access_type ?? "admin", expires_at: current?.expires_at?.slice(0, 10) ?? "" }), [current, open]);
  return <SimpleEntityDialog title={current ? "Editar acesso" : "Conceder acesso"} open={open} onClose={onClose} onSave={() => course && (current ? updateCourseEnrollment(current.id, form) : grantCourseAccess({ ...form, course_id: course.id, expires_at: form.expires_at || null })).then(() => { toast.success("Matricula salva."); onSaved(); onClose(); }).catch((error) => toast.error(error.message))}>
    <Field label="Usuario"><Select value={form.user_id} onValueChange={(user_id) => setForm({ ...form, user_id })} disabled={Boolean(current)}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{users.map((user) => <SelectItem key={user.id} value={user.id}>{user.full_name ?? user.email ?? user.id}</SelectItem>)}</SelectContent></Select></Field>
    <Field label="Status"><Select value={form.status} onValueChange={(status) => setForm({ ...form, status: status as EnrollmentStatus })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Ativo</SelectItem><SelectItem value="trialing">Trial</SelectItem><SelectItem value="suspended">Suspenso</SelectItem><SelectItem value="canceled">Cancelado</SelectItem><SelectItem value="expired">Expirado</SelectItem></SelectContent></Select></Field>
    <Field label="Tipo"><Select value={form.access_type} onValueChange={(access_type) => setForm({ ...form, access_type: access_type as EnrollmentAccessType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="paid">Pago</SelectItem><SelectItem value="free">Gratuito</SelectItem><SelectItem value="test">Teste</SelectItem><SelectItem value="admin">Admin</SelectItem><SelectItem value="trial">Trial</SelectItem></SelectContent></Select></Field>
    <Field label="Expira em"><Input type="date" value={form.expires_at} onChange={(event) => setForm({ ...form, expires_at: event.target.value })} /></Field>
  </SimpleEntityDialog>;
}

function EnrollmentsTable({ enrollments, progress, lessons, onEdit }: { enrollments: Array<UserCourseEnrollment & { profile?: AdminUser }>; progress: UserLessonProgress[]; lessons: CourseLesson[]; onEdit: (value: UserCourseEnrollment) => void }) {
  return <Table><TableHeader><TableRow><TableHead>Aluno</TableHead><TableHead>Status</TableHead><TableHead>Tipo</TableHead><TableHead>Progresso</TableHead><TableHead>Inicio</TableHead><TableHead>Expira</TableHead><TableHead>Acoes</TableHead></TableRow></TableHeader><TableBody>{enrollments.length ? enrollments.map((enrollment) => { const userProgress = progress.filter((item) => item.user_id === enrollment.user_id && item.course_id === enrollment.course_id); const percent = lessons.length ? Math.round((userProgress.filter((item) => item.status === "completed").length / lessons.length) * 100) : 0; return <TableRow key={enrollment.id}><TableCell>{enrollment.profile?.full_name ?? enrollment.profile?.email ?? enrollment.user_id}</TableCell><TableCell><Badge variant="outline">{enrollment.status}</Badge></TableCell><TableCell>{enrollment.access_type}</TableCell><TableCell>{percent}%</TableCell><TableCell>{formatDate(enrollment.started_at)}</TableCell><TableCell>{formatDate(enrollment.expires_at) || "sem fim"}</TableCell><TableCell><Button size="sm" variant="outline" onClick={() => onEdit(enrollment)}>Editar</Button></TableCell></TableRow>; }) : <TableRow><TableCell colSpan={7} className="text-muted-foreground">Nenhum usuario contratou este curso ainda.</TableCell></TableRow>}</TableBody></Table>;
}

function SimpleEntityDialog({ title, description, open, children, onClose, onSave, saveLabel = "Salvar", saving = false }: { title: string; description?: string; open: boolean; children: React.ReactNode; onClose: () => void; onSave: () => void; saveLabel?: string; saving?: boolean }) {
  return <Dialog open={open} onOpenChange={(next) => !next && !saving && onClose()}><DialogContent className="max-h-[90vh] max-w-2xl overflow-auto"><DialogHeader><DialogTitle>{title}</DialogTitle>{description ? <DialogDescription>{description}</DialogDescription> : null}</DialogHeader><div className="grid gap-4">{children}</div><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button><Button onClick={onSave} disabled={saving}>{saveLabel}</Button></div></DialogContent></Dialog>;
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <Label className={`space-y-2 ${className}`}><span>{label}</span>{children}</Label>;
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ComponentType<{ className?: string }> }) {
  return <Card className="bg-white/90"><CardHeader><Icon className="h-5 w-5 text-primary" /><CardDescription>{label}</CardDescription><CardTitle className="text-3xl">{value}</CardTitle></CardHeader></Card>;
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return <Card className="bg-white/90"><CardHeader><CardDescription>{label}</CardDescription><CardTitle>{value}</CardTitle></CardHeader></Card>;
}

function VisibilityBadge({ visible }: { visible: boolean }) {
  return visible ? <Badge className="bg-emerald-600">Visível no site</Badge> : <Badge variant="secondary">Oculto no site</Badge>;
}

function SelectedCourseHeader({ course }: { course: Course | null }) {
  return course ? <div><h3 className="font-display text-xl font-semibold">{course.title}</h3><p className="text-sm text-muted-foreground">{course.short_description || course.slug}</p></div> : null;
}

function CourseContentSummary({ course, modules, lessons, materials }: { course: Course; modules: CourseModule[]; lessons: CourseLesson[]; materials: CourseMaterial[] }) {
  return (
    <Card className="bg-white/90">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{course.title}</CardTitle>
            <CardDescription>{course.short_description || course.slug}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{statusLabel(course.status)}</Badge>
            <VisibilityBadge visible={course.is_public_visible} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <MiniMetric label="Blocos" value={modules.length} />
          <MiniMetric label="Aulas" value={lessons.filter((lesson) => lesson.status === "active").length} />
          <MiniMetric label="Materiais" value={materials.length} />
        </div>
      </CardHeader>
    </Card>
  );
}

function EmptyCard({ message }: { message: string }) {
  return <Card className="border-dashed bg-white/80"><CardContent className="p-6 text-sm text-muted-foreground">{message}</CardContent></Card>;
}

function MaterialIcon({ material, className }: { material: CourseMaterial; className?: string }) {
  if (material.material_type === "link") return <LinkIcon className={className} />;
  if (material.mime_type?.includes("spreadsheet") || material.mime_type === "application/vnd.ms-excel") return <FileSpreadsheet className={className} />;
  if (material.mime_type?.includes("csv")) return <TableIcon className={className} />;
  if (material.mime_type?.startsWith("image/")) return <Image className={className} />;
  return <FileText className={className} />;
}

function UploadHint() {
  return <Upload className="h-6 w-6" />;
}

function nextOrder(items: Array<{ display_order?: number | null }>) {
  return items.length ? Math.max(...items.map((item) => Number(item.display_order ?? 0))) + 1 : 1;
}

async function handleDeleteModule(module: CourseModule, lessons: CourseLesson[], reload: () => Promise<void>) {
  if (lessons.length > 0) {
    toast.error("Nao e possivel excluir este bloco porque ele possui aulas cadastradas.");
    return;
  }
  if (!window.confirm("Deseja realmente excluir este bloco?")) return;
  try {
    await deleteCourseModule(module.id);
    toast.success("Bloco excluido com sucesso.");
    await reload();
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Nao foi possivel excluir o bloco.");
  }
}

async function handleDeleteLesson(lesson: CourseLesson, progress: UserLessonProgress[], reload: () => Promise<void>) {
  if (!window.confirm("Deseja realmente excluir esta aula?")) return;
  try {
    const hasProgress = progress.some((item) => item.lesson_id === lesson.id);
    if (hasProgress) {
      await saveCourseLesson({ ...lesson, status: "inactive" });
      toast.success("Esta aula possui progresso de alunos. Ela foi inativada para preservar o historico.");
    } else {
      await deleteCourseLesson(lesson.id);
      toast.success("Aula excluida com sucesso.");
    }
    await reload();
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Nao foi possivel excluir a aula.");
  }
}

function lessonTypeLabel(value: CourseLesson["lesson_type"]) {
  const labels: Record<CourseLesson["lesson_type"], string> = { video: "Video", text: "Texto", file: "Arquivo", quiz: "Quiz", external_link: "Link externo" };
  return labels[value] ?? value;
}

function providerLabel(value: string) {
  const labels: Record<string, string> = { youtube: "YouTube", vimeo: "Vimeo", external: "Externo" };
  return labels[value] ?? value;
}

function calculateProgressStats(lessons: CourseLesson[], enrollments: UserCourseEnrollment[], progress: UserLessonProgress[]) {
  const percents = enrollments.map((enrollment) => {
    const rows = progress.filter((item) => item.user_id === enrollment.user_id && item.course_id === enrollment.course_id);
    return lessons.length ? Math.round((rows.filter((item) => item.status === "completed").length / lessons.length) * 100) : 0;
  });
  return {
    started: percents.filter((value) => value > 0).length,
    completedUsers: percents.filter((value) => value === 100).length,
    average: percents.length ? Math.round(percents.reduce((sum, value) => sum + value, 0) / percents.length) : 0,
  };
}

function statusLabel(value: string) {
  const labels: Record<string, string> = { draft: "Rascunho", published: "Publicado", archived: "Arquivado" };
  return labels[value] ?? value;
}

function formatDate(value?: string | null) {
  return value ? new Intl.DateTimeFormat("pt-BR").format(new Date(value)) : "";
}
