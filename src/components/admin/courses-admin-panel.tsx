import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { BookOpen, CheckCircle2, FileText, Plus, Users } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteCourseLesson,
  deleteCourseMaterial,
  deleteCourseModule,
  formatDuration,
  getAdminCourses,
  grantCourseAccess,
  saveCourse,
  saveCourseLesson,
  saveCourseMaterial,
  saveCourseModule,
  slugifyCourseTitle,
  updateCourseEnrollment,
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
  const [materialDialog, setMaterialDialog] = useState<CourseMaterial | null | "new">(null);
  const [enrollmentDialog, setEnrollmentDialog] = useState<UserCourseEnrollment | null | "new">(null);
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
        <StatCard label="Aulas" value={state.lessons.length} icon={FileText} />
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
                <TableHeader><TableRow><TableHead>Curso</TableHead><TableHead>Categoria</TableHead><TableHead>Status</TableHead><TableHead>Preco</TableHead><TableHead>Modulos</TableHead><TableHead>Aulas</TableHead><TableHead>Alunos</TableHead><TableHead>Acoes</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredCourses.length ? filteredCourses.map((course) => (
                    <TableRow key={course.id} className={course.id === selectedCourseId ? "bg-primary/5" : ""}>
                      <TableCell><button className="text-left font-medium hover:text-primary" onClick={() => setSelectedCourseId(course.id)}>{course.title}</button><p className="text-xs text-muted-foreground">{course.slug}</p></TableCell>
                      <TableCell>{course.category ?? "-"}</TableCell>
                      <TableCell><Badge variant="outline">{statusLabel(course.status)}</Badge></TableCell>
                      <TableCell>{course.price ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: course.currency ?? "BRL" }).format(Number(course.price)) : "Gratuito"}</TableCell>
                      <TableCell>{state.modules.filter((module) => module.course_id === course.id).length}</TableCell>
                      <TableCell>{state.lessons.filter((lesson) => lesson.course_id === course.id).length}</TableCell>
                      <TableCell>{state.enrollments.filter((enrollment) => enrollment.course_id === course.id).length}</TableCell>
                      <TableCell><Button size="sm" variant="outline" onClick={() => { setSelectedCourseId(course.id); setCourseDialog(course); }}>Editar</Button></TableCell>
                    </TableRow>
                  )) : <TableRow><TableCell colSpan={8} className="text-muted-foreground">Nenhum curso cadastrado ainda.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <SelectedCourseHeader course={selectedCourse} />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setModuleDialog("new")}><Plus className="h-4 w-4" />Modulo</Button>
            <Button onClick={() => setLessonDialog("new")} disabled={courseModules.length === 0}><Plus className="h-4 w-4" />Aula</Button>
            <Button onClick={() => setMaterialDialog("new")} disabled={!selectedCourse}><Plus className="h-4 w-4" />Material</Button>
          </div>
          <div className="grid gap-4">
            {courseModules.length ? courseModules.map((module) => {
              const lessons = courseLessons.filter((lesson) => lesson.module_id === module.id);
              return (
                <Card key={module.id} className="bg-white/90">
                  <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div><CardTitle>{module.title}</CardTitle><CardDescription>{module.description || "Sem descricao"} - {lessons.length} aula(s)</CardDescription></div>
                    <Button size="sm" variant="outline" onClick={() => setModuleDialog(module)}>Editar modulo</Button>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {lessons.length ? lessons.map((lesson) => (
                      <div key={lesson.id} className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium">{lesson.title} {lesson.is_preview ? <Badge variant="outline">Preview</Badge> : null}</p>
                          <p className="text-xs text-muted-foreground">{lesson.video_provider ?? lesson.lesson_type} {lesson.duration_seconds ? `- ${formatDuration(lesson.duration_seconds)}` : ""}</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => setLessonDialog(lesson)}>Editar aula</Button>
                      </div>
                    )) : <p className="text-sm text-muted-foreground">Este modulo ainda nao possui aulas cadastradas.</p>}
                  </CardContent>
                </Card>
              );
            }) : <Card className="border-dashed bg-white/80"><CardContent className="p-6 text-sm text-muted-foreground">Este curso ainda nao possui modulos cadastrados.</CardContent></Card>}
          </div>
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
      <ModuleDialog open={Boolean(moduleDialog)} value={moduleDialog} course={selectedCourse} onClose={() => setModuleDialog(null)} onSaved={reload} onDelete={reload} />
      <LessonDialog open={Boolean(lessonDialog)} value={lessonDialog} course={selectedCourse} modules={courseModules} onClose={() => setLessonDialog(null)} onSaved={reload} onDelete={reload} />
      <MaterialDialog open={Boolean(materialDialog)} value={materialDialog} course={selectedCourse} modules={courseModules} lessons={courseLessons} onClose={() => setMaterialDialog(null)} onSaved={reload} onDelete={reload} />
      <EnrollmentDialog open={Boolean(enrollmentDialog)} value={enrollmentDialog} course={selectedCourse} users={users} onClose={() => setEnrollmentDialog(null)} onSaved={reload} />
    </div>
  );
}

function CourseDialog({ open, value, userId, onClose, onSaved }: { open: boolean; value: Course | "new" | null; userId: string | null; onClose: () => void; onSaved: () => void }) {
  const course = typeof value === "object" && value ? value : null;
  const [form, setForm] = useState<Partial<Course> & { title: string }>({ title: "" });
  useEffect(() => setForm(course ?? { title: "", slug: "", status: "draft", level: "beginner", currency: "BRL", display_order: 0 }), [course, open]);
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
          <Field label="Descricao completa" className="md:col-span-2"><Textarea value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
        </div>
        <Button onClick={() => void saveCourse(form, userId ?? "").then(() => { toast.success("Curso salvo."); onSaved(); onClose(); }).catch((error) => toast.error(error.message))}>Salvar curso</Button>
      </DialogContent>
    </Dialog>
  );
}

function ModuleDialog(props: { open: boolean; value: CourseModule | "new" | null; course: Course | null; onClose: () => void; onSaved: () => void; onDelete: () => void }) {
  const current = typeof props.value === "object" && props.value ? props.value : null;
  const [form, setForm] = useState<Partial<CourseModule> & { title: string }>({ title: "" });
  useEffect(() => setForm(current ?? { title: "", status: "active", display_order: 0 }), [current, props.open]);
  return <SimpleEntityDialog title={current ? "Editar modulo" : "Novo modulo"} open={props.open} onClose={props.onClose} onDelete={current ? () => void deleteCourseModule(current.id).then(() => { toast.success("Modulo excluido."); props.onDelete(); props.onClose(); }) : undefined} onSave={() => props.course && saveCourseModule({ ...form, course_id: props.course.id }).then(() => { toast.success("Modulo salvo."); props.onSaved(); props.onClose(); }).catch((error) => toast.error(error.message))}>
    <Field label="Titulo"><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
    <Field label="Descricao"><Textarea value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
    <Field label="Ordem"><Input type="number" value={form.display_order ?? 0} onChange={(event) => setForm({ ...form, display_order: Number(event.target.value) })} /></Field>
  </SimpleEntityDialog>;
}

function LessonDialog(props: { open: boolean; value: CourseLesson | "new" | null; course: Course | null; modules: CourseModule[]; onClose: () => void; onSaved: () => void; onDelete: () => void }) {
  const current = typeof props.value === "object" && props.value ? props.value : null;
  const [form, setForm] = useState<Partial<CourseLesson> & { title: string }>({ title: "" });
  useEffect(() => setForm(current ?? { title: "", module_id: props.modules[0]?.id, lesson_type: "video", status: "active", display_order: 0 }), [current, props.open, props.modules]);
  return <SimpleEntityDialog title={current ? "Editar aula" : "Nova aula"} open={props.open} onClose={props.onClose} onDelete={current ? () => void deleteCourseLesson(current.id).then(() => { toast.success("Aula excluida."); props.onDelete(); props.onClose(); }) : undefined} onSave={() => props.course && form.module_id && saveCourseLesson({ ...form, course_id: props.course.id, module_id: form.module_id }).then(() => { toast.success("Aula salva."); props.onSaved(); props.onClose(); }).catch((error) => toast.error(error.message))}>
    <Field label="Modulo"><Select value={form.module_id ?? ""} onValueChange={(module_id) => setForm({ ...form, module_id })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{props.modules.map((module) => <SelectItem key={module.id} value={module.id}>{module.title}</SelectItem>)}</SelectContent></Select></Field>
    <Field label="Titulo"><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
    <Field label="Descricao"><Textarea value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
    <Field label="URL do video"><Input value={form.video_url ?? ""} onChange={(event) => setForm({ ...form, video_url: event.target.value })} placeholder="YouTube, Vimeo ou HTTPS externo" /></Field>
    <Field label="Duracao em segundos"><Input type="number" value={form.duration_seconds ?? ""} onChange={(event) => setForm({ ...form, duration_seconds: Number(event.target.value) })} /></Field>
    <Field label="Ordem"><Input type="number" value={form.display_order ?? 0} onChange={(event) => setForm({ ...form, display_order: Number(event.target.value) })} /></Field>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(form.is_preview)} onChange={(event) => setForm({ ...form, is_preview: event.target.checked })} />Aula preview gratuita</label>
  </SimpleEntityDialog>;
}

function MaterialDialog(props: { open: boolean; value: CourseMaterial | "new" | null; course: Course | null; modules: CourseModule[]; lessons: CourseLesson[]; onClose: () => void; onSaved: () => void; onDelete: () => void }) {
  const current = typeof props.value === "object" && props.value ? props.value : null;
  const [form, setForm] = useState<Partial<CourseMaterial> & { title: string }>({ title: "" });
  useEffect(() => setForm(current ?? { title: "", material_type: "link", display_order: 0 }), [current, props.open]);
  return <SimpleEntityDialog title={current ? "Editar material" : "Novo material"} open={props.open} onClose={props.onClose} onDelete={current ? () => void deleteCourseMaterial(current.id).then(() => { toast.success("Material excluido."); props.onDelete(); props.onClose(); }) : undefined} onSave={() => props.course && saveCourseMaterial({ ...form, course_id: props.course.id }).then(() => { toast.success("Material salvo."); props.onSaved(); props.onClose(); }).catch((error) => toast.error(error.message))}>
    <Field label="Titulo"><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
    <Field label="Aula"><Select value={form.lesson_id ?? "none"} onValueChange={(lesson_id) => setForm({ ...form, lesson_id: lesson_id === "none" ? null : lesson_id })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Material do curso/modulo</SelectItem>{props.lessons.map((lesson) => <SelectItem key={lesson.id} value={lesson.id}>{lesson.title}</SelectItem>)}</SelectContent></Select></Field>
    <Field label="URL externa ou signed/backend path"><Input value={form.external_url ?? form.file_path ?? ""} onChange={(event) => setForm({ ...form, material_type: "link", external_url: event.target.value })} /></Field>
    <Field label="Descricao"><Textarea value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
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

function SimpleEntityDialog({ title, open, children, onClose, onSave, onDelete }: { title: string; open: boolean; children: React.ReactNode; onClose: () => void; onSave: () => void; onDelete?: () => void }) {
  return <Dialog open={open} onOpenChange={(next) => !next && onClose()}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader><div className="grid gap-4">{children}</div><div className="flex justify-between gap-3"><div>{onDelete ? <Button variant="destructive" onClick={onDelete}>Excluir</Button> : null}</div><div className="flex gap-2"><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={onSave}>Salvar</Button></div></div></DialogContent></Dialog>;
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

function SelectedCourseHeader({ course }: { course: Course | null }) {
  return course ? <div><h3 className="font-display text-xl font-semibold">{course.title}</h3><p className="text-sm text-muted-foreground">{course.short_description || course.slug}</p></div> : null;
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
