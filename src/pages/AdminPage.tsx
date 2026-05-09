import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Activity, Box, Eye, Headphones, LayoutDashboard, Plus, Settings, Users } from "lucide-react";

import { DiagnosticFlowBuilder } from "@/components/admin/diagnostic-flow-builder";
import { LinkManager } from "@/components/admin/link-manager";
import { supabase } from "@/integrations/supabase/client";
import { getAdminAccessError, isCurrentUserAdmin } from "@/lib/admin-access";
import { getAdminData, updateSupportRequest, type AdminPeriod } from "@/lib/admin-dashboard";
import {
  archiveTemplate,
  createTemplate,
  getAdminProfile,
  listTemplates,
  loadTemplate,
  saveTemplate,
} from "@/lib/diagnostic-builder";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { TemplateEditorState, TemplateSummary } from "@/types/diagnostic-builder";

export default function AdminPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialRoute = getAdminRouteState(location.pathname);
  const [section, setSection] = useState(initialRoute.section);
  const [productSection, setProductSection] = useState<"all" | "diagnosticos" | "gestor-dre">(initialRoute.productSection);
  const [period, setPeriod] = useState<AdminPeriod>("30d");
  const [adminData, setAdminData] = useState<any | null>(null);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [supportFilter, setSupportFilter] = useState("open");
  const [selectedSupport, setSelectedSupport] = useState<any | null>(null);
  const [supportNotes, setSupportNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [editorState, setEditorState] = useState<TemplateEditorState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createStatus, setCreateStatus] = useState<TemplateEditorState["status"]>("draft");

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  );

  useEffect(() => {
    async function bootstrap() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          navigate("/entrar?callbackUrl=/admin");
          return;
        }

        const isAdmin = await isCurrentUserAdmin();
        if (!isAdmin) {
          setError(getAdminAccessError());
          navigate("/minha-conta");
          return;
        }

        setUserId(session.user.id);
        setAdminUserId(session.user.id);

        await getAdminProfile(session.user.id);

        const loadedTemplates = await listTemplates();
        setTemplates(loadedTemplates);
        setSelectedTemplateId(loadedTemplates[0]?.id ?? null);
        setAdminData(await getAdminData(period));
      } catch (runtimeError) {
        setError(runtimeError instanceof Error ? runtimeError.message : "Nao foi possivel abrir o painel administrativo.");
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, [navigate, period]);

  useEffect(() => {
    const nextRoute = getAdminRouteState(location.pathname);
    setSection(nextRoute.section);
    setProductSection(nextRoute.productSection);
  }, [location.pathname]);

  useEffect(() => {
    async function openTemplate() {
      if (!selectedTemplateId) {
        setEditorState(null);
        return;
      }

      setBusy(true);
      try {
        const nextState = await loadTemplate(selectedTemplateId);
        setEditorState(nextState);
      } catch (runtimeError) {
        setError(runtimeError instanceof Error ? runtimeError.message : "Nao foi possivel carregar o modelo selecionado.");
      } finally {
        setBusy(false);
      }
    }

    void openTemplate();
  }, [selectedTemplateId]);

  async function handleCreateTemplate() {
    try {
      setBusy(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate("/entrar?callbackUrl=/admin");
        return;
      }

      const template = await createTemplate(session.user.id, {
        name: createName,
        description: createDescription,
        status: createStatus,
      });

      setTemplates((current) => [template, ...current]);
      setSelectedTemplateId(template.id);
      setCreateName("");
      setCreateDescription("");
      setCreateStatus("draft");
    } catch (runtimeError) {
      setError(runtimeError instanceof Error ? runtimeError.message : "Nao foi possivel criar o modelo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleArchiveTemplate(templateId: string) {
    try {
      setBusy(true);
      setError(null);
      await archiveTemplate(templateId);
      const nextTemplates = await listTemplates();
      setTemplates(nextTemplates);
      if (selectedTemplateId === templateId) {
        setSelectedTemplateId(nextTemplates[0]?.id ?? null);
      }
    } catch (runtimeError) {
      setError(runtimeError instanceof Error ? runtimeError.message : "Nao foi possivel arquivar este modelo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveTemplate(nextState: TemplateEditorState) {
    setBusy(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate("/entrar?callbackUrl=/admin");
        return;
      }

      await saveTemplate(session.user.id, nextState);
      const refreshedTemplates = await listTemplates();
      setTemplates(refreshedTemplates);
      setEditorState(nextState);
    } catch (runtimeError) {
      setError(runtimeError instanceof Error ? runtimeError.message : "Nao foi possivel salvar o modelo.");
      throw runtimeError;
    } finally {
      setBusy(false);
    }
  }

  async function refreshAdminData() {
    setAdminData(await getAdminData(period));
  }

  async function handleSupportStatus(requestId: string, status: "open" | "in_progress" | "solved" | "closed", notes?: string | null) {
    await updateSupportRequest(requestId, { status, admin_notes: notes ?? undefined, solved_by: status === "solved" ? adminUserId : undefined });
    await refreshAdminData();
    setSelectedSupport(null);
    setSupportNotes("");
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70 bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-display text-xl font-semibold">Painel Administrativo</p>
            <p className="text-sm opacity-70">Gerencie produtos, usuarios, acessos e suporte da plataforma.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/" className="text-sm opacity-70 transition hover:opacity-100">
              Ver site
            </Link>
            <Button variant="outline" size="sm" className="border-sidebar-foreground/20 text-sidebar-foreground hover:bg-white/10 hover:text-white" onClick={() => supabase.auth.signOut().then(() => navigate("/"))}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {error ? (
          <div className="mb-6 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
        ) : null}

        <AdminNav section={section} onSectionChange={setSection} />

        <div className="mt-6">
          {section === "overview" ? <OverviewPanel data={adminData} period={period} onPeriodChange={setPeriod} onOpenSupport={() => setSection("support")} /> : null}
          {section === "products" ? (
            <ProductsPanel
              data={adminData}
              productSection={productSection}
              onProductSectionChange={setProductSection}
              templates={templates}
              selectedTemplate={selectedTemplate}
              selectedTemplateId={selectedTemplateId}
              editorState={editorState}
              busy={busy}
              createName={createName}
              createDescription={createDescription}
              createStatus={createStatus}
              userId={userId}
              onCreateNameChange={setCreateName}
              onCreateDescriptionChange={setCreateDescription}
              onCreateStatusChange={setCreateStatus}
              onCreateTemplate={handleCreateTemplate}
              onSelectTemplate={setSelectedTemplateId}
              onArchiveTemplate={handleArchiveTemplate}
              onSaveTemplate={handleSaveTemplate}
            />
          ) : null}
          {section === "users" ? <UsersPanel data={adminData} search={userSearch} onSearch={setUserSearch} /> : null}
          {section === "access" ? <AccessPanel data={adminData} period={period} onPeriodChange={setPeriod} /> : null}
          {section === "support" ? (
            <SupportPanel
              data={adminData}
              filter={supportFilter}
              onFilterChange={setSupportFilter}
              onView={(request) => {
                setSelectedSupport(request);
                setSupportNotes(request.admin_notes ?? "");
              }}
              onStatusChange={(request, nextStatus) => void handleSupportStatus(request.id, nextStatus)}
            />
          ) : null}
          {section === "settings" ? <AdminSettingsPanel /> : null}
        </div>
      </main>

      <Dialog open={Boolean(selectedSupport)} onOpenChange={(open) => !open && setSelectedSupport(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedSupport?.subject ?? "Chamado"}</DialogTitle>
            <DialogDescription>{selectedSupport?.profile?.email ?? "Usuario sem email"} - {supportStatusLabel(selectedSupport?.status)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-4 text-sm">
              <p className="font-semibold">Mensagem</p>
              <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{selectedSupport?.message}</p>
            </div>
            <Label>Observacao administrativa<Textarea className="mt-2" value={supportNotes} onChange={(event) => setSupportNotes(event.target.value)} /></Label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => selectedSupport && void handleSupportStatus(selectedSupport.id, "in_progress", supportNotes)}>Marcar em andamento</Button>
            <Button onClick={() => selectedSupport && void handleSupportStatus(selectedSupport.id, "solved", supportNotes)}>Marcar solucionado</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdminNav({ section, onSectionChange }: { section: string; onSectionChange: (value: string) => void }) {
  const items = [
    ["overview", "Visao geral", LayoutDashboard],
    ["products", "Produtos", Box],
    ["users", "Usuarios", Users],
    ["access", "Acessos", Activity],
    ["support", "Suporte", Headphones],
    ["settings", "Configuracoes", Settings],
  ] as const;
  return (
    <nav className="flex gap-2 overflow-x-auto rounded-lg border bg-card p-2">
      {items.map(([value, label, Icon]) => (
        <button key={value} onClick={() => onSectionChange(value)} className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium transition ${section === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </nav>
  );
}

function OverviewPanel({ data, period, onPeriodChange, onOpenSupport }: { data: any; period: AdminPeriod; onPeriodChange: (period: AdminPeriod) => void; onOpenSupport: () => void }) {
  const stats = data?.overview ?? {};
  const cards = [
    ["Usuarios cadastrados", stats.totalUsers ?? 0],
    ["Usuarios ativos", stats.activeUsers ?? 0],
    ["Produtos ativos", stats.activeProducts ?? 0],
    ["Assinaturas ativas", stats.activeSubscriptions ?? 0],
    ["Acessos ao site", stats.accessCount ?? 0],
    ["Chamados abertos", stats.openSupport ?? 0],
    ["Chamados resolvidos", stats.solvedSupport ?? 0],
    ["Produto mais acessado", productLabel(stats.mostAccessedProduct)],
  ];
  const recentSupport = (data?.supportRequests ?? []).filter((item: any) => item.status === "open").slice(0, 5);
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Visao geral da plataforma</h1>
          <p className="text-sm text-muted-foreground">Indicadores globais de usuarios, produtos, acessos e suporte.</p>
        </div>
        <PeriodSelect value={period} onChange={onPeriodChange} />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => <StatCard key={label} label={String(label)} value={value} />)}
      </div>
      <Card className="bg-white/90">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div><CardTitle>Chamados recentes</CardTitle><CardDescription>Ultimos chamados abertos enviados pelos usuarios.</CardDescription></div>
          <Button variant="outline" onClick={onOpenSupport}>Ver todos os chamados</Button>
        </CardHeader>
        <CardContent>
          <SimpleTable columns={["Usuario", "Assunto", "Produto", "Data", "Status"]} rows={recentSupport.map((item: any) => [displayName(item), item.subject, productLabel(item.product_slug), formatDateTime(item.created_at), supportStatusLabel(item.status)])} empty="Nenhum chamado aberto." />
        </CardContent>
      </Card>
    </div>
  );
}

function ProductsPanel(props: any) {
  const products = props.data?.products ?? [];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Gestao de produtos</h1>
        <p className="text-sm text-muted-foreground">Acompanhe produtos, assinaturas e configuracoes por modulo.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {[
          ["all", "Todos os produtos"],
          ["diagnosticos", "Diagnostico"],
          ["gestor-dre", "Gestor de DRE"],
        ].map(([value, label]) => <Button key={value} variant={props.productSection === value ? "default" : "outline"} onClick={() => props.onProductSectionChange(value)}>{label}</Button>)}
      </div>
      {props.productSection === "all" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {products.length ? products.map((product: any) => (
            <Card key={product.id} className="bg-white/90">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div><CardTitle>{product.name}</CardTitle><CardDescription>{product.short_description}</CardDescription></div>
                  <Badge>{product.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <MiniMetric label="Usuarios ativos" value={product.activeUsers} />
                  <MiniMetric label="Trial" value={product.trialSubscriptions} />
                  <MiniMetric label="Inativas" value={product.inactiveSubscriptions} />
                </div>
                <Button onClick={() => props.onProductSectionChange(product.slug)}>Gerenciar</Button>
              </CardContent>
            </Card>
          )) : <EmptyCard text="Nenhum produto cadastrado." />}
        </div>
      ) : null}
      {props.productSection === "diagnosticos" ? <DiagnosticAdminPanel {...props} /> : null}
      {props.productSection === "gestor-dre" ? <DreAdminPanel data={props.data} /> : null}
    </div>
  );
}

function DiagnosticAdminPanel(props: any) {
  return (
    <div className="space-y-6">
      <div><h2 className="font-display text-2xl font-semibold">Produto: Diagnostico</h2><p className="text-sm text-muted-foreground">Gerencie modelos, fluxos de perguntas e links publicos de diagnostico.</p></div>
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Modelos cadastrados" value={props.templates.length} />
        <StatCard label="Modelos publicados" value={props.templates.filter((template: TemplateSummary) => template.status === "published").length} />
        <StatCard label="Modelo em foco" value={props.selectedTemplate?.name ?? "Nenhum"} />
      </section>
      <section className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="bg-white/90">
            <CardHeader><CardTitle>Novo modelo</CardTitle><CardDescription>Crie um template base para abrir o construtor.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <FieldBlock label="Nome"><Input value={props.createName} onChange={(event) => props.onCreateNameChange(event.target.value)} placeholder="Diagnostico de Maturidade Empresarial" /></FieldBlock>
              <FieldBlock label="Descricao"><Textarea value={props.createDescription} onChange={(event) => props.onCreateDescriptionChange(event.target.value)} /></FieldBlock>
              <FieldBlock label="Status inicial"><Select value={props.createStatus} onValueChange={props.onCreateStatusChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Rascunho</SelectItem><SelectItem value="published">Publicado</SelectItem><SelectItem value="archived">Arquivado</SelectItem></SelectContent></Select></FieldBlock>
              <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={props.onCreateTemplate} disabled={props.busy || !props.createName.trim()}><Plus className="h-4 w-4" />Criar modelo</Button>
            </CardContent>
          </Card>
          <Card className="bg-white/90">
            <CardHeader><CardTitle>Modelos existentes</CardTitle><CardDescription>Selecione um modelo para editar.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {props.templates.length ? props.templates.map((template: TemplateSummary) => (
                <button key={template.id} type="button" onClick={() => props.onSelectTemplate(template.id)} className={`w-full rounded-lg border p-4 text-left transition ${props.selectedTemplateId === template.id ? "border-primary bg-primary/5" : "bg-card hover:border-primary/30"}`}>
                  <div className="flex justify-between gap-3"><div><p className="font-semibold">{template.name}</p><p className="mt-1 text-sm text-muted-foreground">{template.description || "Sem descricao"}</p></div><Badge variant="outline">{template.status}</Badge></div>
                  <Button className="mt-3" size="sm" variant="ghost" onClick={(event) => { event.stopPropagation(); void props.onArchiveTemplate(template.id); }}>Arquivar</Button>
                </button>
              )) : <p className="text-sm text-muted-foreground">Nenhum modelo encontrado ainda.</p>}
            </CardContent>
          </Card>
        </div>
        <DiagnosticFlowBuilder template={props.editorState} saving={props.busy} onSave={props.onSaveTemplate} />
      </section>
      <LinkManager templateId={props.selectedTemplateId} userId={props.userId} />
    </div>
  );
}

function DreAdminPanel({ data }: { data: any }) {
  const dre = data?.dreMetrics ?? {};
  const subscriptions = (data?.products ?? []).find((product: any) => product.slug === "gestor-dre")?.subscriptions ?? [];
  return (
    <div className="space-y-6">
      <div><h2 className="font-display text-2xl font-semibold">Produto: Gestor de DRE</h2><p className="text-sm text-muted-foreground">Indicadores administrativos e usuarios com acesso ao produto.</p></div>
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Usuarios ativos" value={subscriptions.filter((item: any) => item.status === "active").length} />
        <StatCard label="Usuarios em teste" value={subscriptions.filter((item: any) => item.status === "trialing").length} />
        <StatCard label="Inativos/cancelados" value={subscriptions.filter((item: any) => !["active", "trialing"].includes(item.status)).length} />
        <StatCard label="Modelos DRE" value={dre.models ?? 0} />
        <StatCard label="DREs lancadas" value={dre.entries ?? 0} />
        <StatCard label="Ultima atividade" value={formatDateTime(dre.lastActivity) || "-"} />
      </div>
      <SubscribersTable subscriptions={subscriptions} users={data?.users ?? []} />
    </div>
  );
}

function UsersPanel({ data, search, onSearch }: { data: any; search: string; onSearch: (value: string) => void }) {
  const users = (data?.users ?? []).filter((user: any) => {
    const term = search.toLowerCase();
    return !term || [user.full_name, user.email, user.company_name, user.global_profile?.company_name].some((value) => String(value ?? "").toLowerCase().includes(term));
  });
  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-3xl font-semibold">Usuarios</h1><p className="text-sm text-muted-foreground">Lista administrativa de usuarios cadastrados na plataforma.</p></div>
      <Input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Buscar por nome, email ou empresa" />
      <Card className="bg-white/90"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Empresa</TableHead><TableHead>Cadastro</TableHead><TableHead>Produtos ativos</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{users.length ? users.map((user: any) => <TableRow key={user.id}><TableCell>{user.full_name ?? user.global_profile?.full_name ?? "-"}</TableCell><TableCell>{user.email ?? "-"}</TableCell><TableCell>{user.company_name ?? user.global_profile?.company_name ?? "-"}</TableCell><TableCell>{formatDateTime(user.created_at)}</TableCell><TableCell>{user.subscriptions?.filter((item: any) => ["active", "trialing"].includes(item.status)).length ?? 0}</TableCell><TableCell><Badge variant="outline">{user.is_active ? "Ativo" : "Inativo"}</Badge></TableCell></TableRow>) : <TableRow><TableCell colSpan={6} className="text-muted-foreground">Nenhum usuario encontrado.</TableCell></TableRow>}</TableBody></Table></CardContent></Card>
    </div>
  );
}

function AccessPanel({ data, period, onPeriodChange }: { data: any; period: AdminPeriod; onPeriodChange: (period: AdminPeriod) => void }) {
  const logs = data?.accessLogs ?? [];
  const uniqueUsers = new Set(logs.map((item: any) => item.user_id || item.session_id).filter(Boolean)).size;
  const byProduct = Object.entries(logs.reduce((acc: Record<string, number>, item: any) => { const key = productLabel(item.product_slug); acc[key] = (acc[key] ?? 0) + 1; return acc; }, {}));
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="font-display text-3xl font-semibold">Acessos</h1><p className="text-sm text-muted-foreground">Monitoramento inicial de paginas e produtos acessados.</p></div><PeriodSelect value={period} onChange={onPeriodChange} /></div>
      <div className="grid gap-4 md:grid-cols-3"><StatCard label="Total de acessos" value={logs.length} /><StatCard label="Usuarios/sessoes unicas" value={uniqueUsers} /><StatCard label="Produtos acessados" value={byProduct.length} /></div>
      <Card className="bg-white/90"><CardHeader><CardTitle>Acessos por produto</CardTitle></CardHeader><CardContent><SimpleTable columns={["Produto", "Acessos"]} rows={byProduct.map(([product, count]) => [product, count])} empty="Nenhum acesso registrado no periodo." /></CardContent></Card>
      <Card className="bg-white/90"><CardHeader><CardTitle>Ultimos acessos</CardTitle></CardHeader><CardContent><SimpleTable columns={["Data/hora", "Pagina", "Produto", "Tipo"]} rows={logs.slice(0, 50).map((item: any) => [formatDateTime(item.created_at), item.path ?? "-", productLabel(item.product_slug), item.access_type ?? "-"])} empty="Nenhum acesso registrado no periodo." /></CardContent></Card>
    </div>
  );
}

function SupportPanel({ data, filter, onFilterChange, onView, onStatusChange }: { data: any; filter: string; onFilterChange: (value: string) => void; onView: (request: any) => void; onStatusChange: (request: any, status: "open" | "in_progress" | "solved" | "closed") => void }) {
  const all = data?.supportRequests ?? [];
  const requests = filter === "all" ? all : all.filter((item: any) => item.status === filter);
  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-3xl font-semibold">Suporte</h1><p className="text-sm text-muted-foreground">Gestao dos chamados enviados pelos usuarios.</p></div>
      <div className="grid gap-4 md:grid-cols-4"><StatCard label="Abertos" value={all.filter((item: any) => item.status === "open").length} /><StatCard label="Em andamento" value={all.filter((item: any) => item.status === "in_progress").length} /><StatCard label="Solucionados" value={all.filter((item: any) => item.status === "solved").length} /><StatCard label="Fechados" value={all.filter((item: any) => item.status === "closed").length} /></div>
      <Select value={filter} onValueChange={onFilterChange}><SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="open">Abertos</SelectItem><SelectItem value="in_progress">Em andamento</SelectItem><SelectItem value="solved">Solucionados</SelectItem><SelectItem value="closed">Fechados</SelectItem><SelectItem value="all">Todos</SelectItem></SelectContent></Select>
      <Card className="bg-white/90"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Usuario</TableHead><TableHead>Assunto</TableHead><TableHead>Status</TableHead><TableHead>Prioridade</TableHead><TableHead>Acoes</TableHead></TableRow></TableHeader><TableBody>{requests.length ? requests.map((request: any) => <TableRow key={request.id}><TableCell>{formatDateTime(request.created_at)}</TableCell><TableCell>{displayName(request)}<p className="text-xs text-muted-foreground">{request.profile?.email}</p></TableCell><TableCell>{request.subject}<p className="line-clamp-1 text-xs text-muted-foreground">{request.message}</p></TableCell><TableCell><Badge variant="outline">{supportStatusLabel(request.status)}</Badge></TableCell><TableCell>{priorityLabel(request.priority)}</TableCell><TableCell><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => onView(request)}>Ver detalhes</Button>{request.status === "open" ? <Button size="sm" variant="outline" onClick={() => onStatusChange(request, "in_progress")}>Em andamento</Button> : null}{request.status !== "solved" ? <Button size="sm" onClick={() => onStatusChange(request, "solved")}>Solucionar</Button> : null}</div></TableCell></TableRow>) : <TableRow><TableCell colSpan={6} className="text-muted-foreground">Nenhum chamado encontrado.</TableCell></TableRow>}</TableBody></Table></CardContent></Card>
    </div>
  );
}

function AdminSettingsPanel() {
  return <EmptyCard text="Configuracoes administrativas globais serao adicionadas em uma proxima etapa." />;
}

function SubscribersTable({ subscriptions, users }: { subscriptions: any[]; users: any[] }) {
  const userById = new Map(users.map((user) => [user.id, user]));
  return <Card className="bg-white/90"><CardHeader><CardTitle>Usuarios do produto</CardTitle></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Empresa</TableHead><TableHead>Status</TableHead><TableHead>Tipo</TableHead><TableHead>Plano</TableHead><TableHead>Periodo</TableHead></TableRow></TableHeader><TableBody>{subscriptions.length ? subscriptions.map((item) => { const user = userById.get(item.user_id) ?? {}; return <TableRow key={item.id}><TableCell>{user.full_name ?? user.global_profile?.full_name ?? "-"}</TableCell><TableCell>{user.email ?? "-"}</TableCell><TableCell>{user.company_name ?? user.global_profile?.company_name ?? "-"}</TableCell><TableCell><Badge variant="outline">{subscriptionStatusLabel(item.status)}</Badge></TableCell><TableCell>{item.access_type ?? "-"}</TableCell><TableCell>{item.plan_name ?? "Padrao"}</TableCell><TableCell>{formatDateTime(item.current_period_start)} - {formatDateTime(item.current_period_end) || "sem fim"}</TableCell></TableRow>; }) : <TableRow><TableCell colSpan={7} className="text-muted-foreground">Nenhum usuario encontrado.</TableCell></TableRow>}</TableBody></Table></CardContent></Card>;
}

function StatCard({ label, value }: { label: string; value: any }) {
  return <Card className="bg-white/90"><CardHeader><CardDescription>{label}</CardDescription><CardTitle className="font-display text-3xl">{value}</CardTitle></CardHeader></Card>;
}

function MiniMetric({ label, value }: { label: string; value: any }) {
  return <div className="rounded-lg border bg-muted/40 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value ?? 0}</p></div>;
}

function EmptyCard({ text }: { text: string }) {
  return <Card className="bg-white/90"><CardContent className="p-6 text-sm text-muted-foreground">{text}</CardContent></Card>;
}

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function SimpleTable({ columns, rows, empty }: { columns: string[]; rows: any[][]; empty: string }) {
  return <Table><TableHeader><TableRow>{columns.map((column) => <TableHead key={column}>{column}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.length ? rows.map((row, index) => <TableRow key={index}>{row.map((cell, cellIndex) => <TableCell key={cellIndex}>{cell}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={columns.length} className="text-muted-foreground">{empty}</TableCell></TableRow>}</TableBody></Table>;
}

function PeriodSelect({ value, onChange }: { value: AdminPeriod; onChange: (period: AdminPeriod) => void }) {
  return <Select value={value} onValueChange={(next) => onChange(next as AdminPeriod)}><SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="today">Hoje</SelectItem><SelectItem value="7d">Ultimos 7 dias</SelectItem><SelectItem value="30d">Ultimos 30 dias</SelectItem><SelectItem value="month">Este mes</SelectItem></SelectContent></Select>;
}

function formatDateTime(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function displayName(item: any) {
  return item?.profile?.full_name ?? item?.global_profile?.full_name ?? item?.profile?.email ?? "Usuario";
}

function productLabel(value?: string | null) {
  const labels: Record<string, string> = { diagnosticos: "Diagnostico", "gestor-dre": "Gestor de DRE", global: "Global" };
  return value ? labels[value] ?? value : "-";
}

function supportStatusLabel(value?: string) {
  const labels: Record<string, string> = { open: "Aberto", in_progress: "Em andamento", solved: "Solucionado", closed: "Fechado" };
  return value ? labels[value] ?? value : "-";
}

function priorityLabel(value?: string) {
  const labels: Record<string, string> = { low: "Baixa", normal: "Normal", high: "Alta", urgent: "Urgente" };
  return value ? labels[value] ?? value : "Normal";
}

function subscriptionStatusLabel(value?: string) {
  const labels: Record<string, string> = { active: "Ativo", trialing: "Trial", canceled: "Cancelado", inactive: "Inativo", expired: "Expirado", test: "Teste" };
  return value ? labels[value] ?? value : "-";
}

function getAdminRouteState(pathname: string): { section: string; productSection: "all" | "diagnosticos" | "gestor-dre" } {
  if (pathname.includes("/admin/produtos/diagnostico")) return { section: "products", productSection: "diagnosticos" };
  if (pathname.includes("/admin/produtos/dre")) return { section: "products", productSection: "gestor-dre" };
  if (pathname.includes("/admin/produtos")) return { section: "products", productSection: "all" };
  if (pathname.includes("/admin/usuarios")) return { section: "users", productSection: "all" };
  if (pathname.includes("/admin/acessos")) return { section: "access", productSection: "all" };
  if (pathname.includes("/admin/suporte")) return { section: "support", productSection: "all" };
  return { section: "overview", productSection: "all" };
}
