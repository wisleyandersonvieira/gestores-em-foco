import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

import { DiagnosticFlowBuilder } from "@/components/admin/diagnostic-flow-builder";
import { LinkManager } from "@/components/admin/link-manager";
import { supabase } from "@/integrations/supabase/client";
import {
  archiveTemplate,
  createTemplate,
  getAdminProfile,
  listTemplates,
  loadTemplate,
  saveTemplate,
} from "@/lib/diagnostic-builder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TemplateEditorState, TemplateSummary } from "@/types/diagnostic-builder";

export default function AdminPage() {
  const navigate = useNavigate();
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

        setUserId(session.user.id);

        const profile = await getAdminProfile(session.user.id);
        if (profile.role !== "admin") {
          navigate("/minha-conta");
          return;
        }

        const loadedTemplates = await listTemplates();
        setTemplates(loadedTemplates);
        setSelectedTemplateId(loadedTemplates[0]?.id ?? null);
      } catch (runtimeError) {
        setError(runtimeError instanceof Error ? runtimeError.message : "Nao foi possivel abrir o painel administrativo.");
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, [navigate]);

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

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/70 bg-foreground text-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="font-display text-xl font-semibold">Painel Administrativo</p>
            <p className="text-sm opacity-70">Gerencie modelos, fluxo de perguntas e preparacao para links publicos.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm opacity-70 transition hover:opacity-100">
              Ver site
            </Link>
            <Button variant="outline" size="sm" className="border-background/20 text-background hover:bg-background/10" onClick={() => supabase.auth.signOut().then(() => navigate("/"))}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        {error ? (
          <div className="mb-6 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="bg-white/90">
            <CardHeader>
              <CardDescription>Modelos cadastrados</CardDescription>
              <CardTitle className="font-display text-4xl">{templates.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-white/90">
            <CardHeader>
              <CardDescription>Modelos publicados</CardDescription>
              <CardTitle className="font-display text-4xl">
                {templates.filter((template) => template.status === "published").length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-white/90">
            <CardHeader>
              <CardDescription>Modelo em foco</CardDescription>
              <CardTitle className="font-display text-2xl">{selectedTemplate?.name ?? "Nenhum"}</CardTitle>
            </CardHeader>
          </Card>
        </section>

        <section className="mt-10 grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className="space-y-6">
            <Card className="bg-white/90">
              <CardHeader>
                <CardTitle className="font-display text-2xl">Novo modelo</CardTitle>
                <CardDescription>Crie um template base para abrir o construtor do fluxo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="create-name">Nome</Label>
                  <Input id="create-name" value={createName} onChange={(event) => setCreateName(event.target.value)} placeholder="Diagnostico de Maturidade Empresarial" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-description">Descricao</Label>
                  <Textarea id="create-description" value={createDescription} onChange={(event) => setCreateDescription(event.target.value)} placeholder="Descreva a finalidade deste modelo." />
                </div>
                <div className="space-y-2">
                  <Label>Status inicial</Label>
                  <Select value={createStatus} onValueChange={(value) => setCreateStatus(value as TemplateEditorState["status"])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="published">Publicado</SelectItem>
                      <SelectItem value="archived">Arquivado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleCreateTemplate} disabled={busy || !createName.trim()}>
                  <Plus className="h-4 w-4" />
                  Criar modelo
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/90">
              <CardHeader>
                <CardTitle className="font-display text-2xl">Modelos existentes</CardTitle>
                <CardDescription>Selecione um modelo para editar ou arquive quando nao estiver mais em uso.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {templates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum modelo encontrado ainda.</p>
                ) : (
                  templates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        selectedTemplateId === template.id
                          ? "border-primary bg-primary/5"
                          : "border-border/70 bg-white hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{template.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{template.description || "Sem descricao"}</p>
                        </div>
                        <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          {template.status}
                        </span>
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          Atualizado em {new Intl.DateTimeFormat("pt-BR").format(new Date(template.updatedAt))}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleArchiveTemplate(template.id);
                          }}
                        >
                          Arquivar
                        </Button>
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <DiagnosticFlowBuilder template={editorState} saving={busy} onSave={handleSaveTemplate} />
        </section>

        <section className="mt-10">
          <LinkManager templateId={selectedTemplateId} userId={userId} />
        </section>
      </main>
    </div>
  );
}
