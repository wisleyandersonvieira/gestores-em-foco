import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Clock3, PlayCircle, Search, CheckCircle2, AlertCircle } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { extractDiagnosticToken, getAccountWorkspace, validateDiagnosticTokenForUser } from "@/lib/diagnostic-runtime";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { User } from "@supabase/supabase-js";
import type { AccountWorkspace, AssignedDiagnosticItem, SessionHistoryItem } from "@/types/diagnostic-runtime";

function statusLabel(status: AssignedDiagnosticItem["status"] | SessionHistoryItem["status"]) {
  if (status === "completed") {
    return "Concluido";
  }
  if (status === "in_progress") {
    return "Em andamento";
  }
  return "Pendente";
}

function StatusBadge({ status }: { status: AssignedDiagnosticItem["status"] | SessionHistoryItem["status"] }) {
  const variant = status === "completed" ? "default" : status === "in_progress" ? "secondary" : "outline";

  return <Badge variant={variant}>{statusLabel(status)}</Badge>;
}

export default function AccountPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkInput, setLinkInput] = useState("");
  const [workspace, setWorkspace] = useState<AccountWorkspace>({
    assigned: [],
    history: [],
  });
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [validatingLink, setValidatingLink] = useState(false);

  const linkedCount = useMemo(() => workspace.assigned.length, [workspace.assigned.length]);
  const inProgressCount = useMemo(
    () => workspace.assigned.filter((item) => item.status === "in_progress").length,
    [workspace.assigned],
  );
  const completedCount = useMemo(
    () => workspace.history.filter((item) => item.status === "completed").length,
    [workspace.history],
  );
  const pendingItems = useMemo(
    () => workspace.assigned.filter((item) => item.status === "pending"),
    [workspace.assigned],
  );
  const inProgressItems = useMemo(
    () => workspace.assigned.filter((item) => item.status === "in_progress"),
    [workspace.assigned],
  );
  const completedItems = useMemo(
    () => workspace.history.filter((item) => item.status === "completed"),
    [workspace.history],
  );

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user) {
        navigate("/entrar?callbackUrl=/minha-conta");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user) {
        navigate("/entrar?callbackUrl=/minha-conta");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/");
  }

  useEffect(() => {
    async function loadWorkspace() {
      if (!user) {
        return;
      }

      try {
        const nextWorkspace = await getAccountWorkspace(user.id);
        setWorkspace(nextWorkspace);
      } catch (runtimeError) {
        setWorkspaceError(runtimeError instanceof Error ? runtimeError.message : "Nao foi possivel carregar sua area do cliente.");
      }
    }

    void loadWorkspace();
  }, [user]);

  async function handleStartFromInput() {
    if (!user) {
      return;
    }

    setValidatingLink(true);
    setInputError(null);

    try {
      const token = await validateDiagnosticTokenForUser(linkInput, user.id);
      navigate(`/diagnostico/${token}`);
    } catch (runtimeError) {
      setInputError(runtimeError instanceof Error ? runtimeError.message : "Nao foi possivel validar este diagnostico.");
    } finally {
      setValidatingLink(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  if (!user) return null;

  const metadata = user.user_metadata;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="font-display text-xl font-semibold">Minha Conta</p>
            <p className="text-sm text-muted-foreground">{metadata?.name ?? user.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm font-medium text-muted-foreground transition hover:text-foreground">
              Voltar ao site
            </Link>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="surface-panel border-none">
            <CardHeader>
              <CardTitle className="font-display text-3xl">Iniciar um diagnostico</CardTitle>
              <CardDescription>Cole o link que voce recebeu para acessar um novo fluxo de perguntas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="https://seudominio.com/diagnostico/token"
                value={linkInput}
                onChange={(event) => {
                  setLinkInput(event.target.value);
                  setInputError(null);
                }}
              />
              <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => void handleStartFromInput()} disabled={validatingLink || !extractDiagnosticToken(linkInput)}>
                {validatingLink ? "Validando..." : "Iniciar Diagnostico"}
              </Button>
              <p className="text-sm text-muted-foreground">Cole o link completo ou apenas o token para continuar de onde parou.</p>
              {inputError ? (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {inputError}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="surface-panel border-none">
            <CardHeader>
              <CardTitle className="font-display text-3xl">Resumo da conta</CardTitle>
              <CardDescription>Dados basicos da empresa usados para personalizar o acompanhamento.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-muted p-4">
                <p className="text-sm text-muted-foreground">Empresa</p>
                <p className="mt-1 font-semibold">{metadata?.company_name ?? "Nao informada"}</p>
              </div>
              <div className="rounded-2xl bg-muted p-4">
                <p className="text-sm text-muted-foreground">Diagnosticos vinculados</p>
                <p className="mt-1 font-semibold">{linkedCount}</p>
              </div>
              <div className="rounded-2xl bg-muted p-4">
                <p className="text-sm text-muted-foreground">Em andamento</p>
                <p className="mt-1 font-semibold">{inProgressCount}</p>
              </div>
              <div className="rounded-2xl bg-muted p-4">
                <p className="text-sm text-muted-foreground">Concluidos</p>
                <p className="mt-1 font-semibold">{completedCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <section className="mt-10">
          <div className="mb-5">
            <h2 className="font-display text-2xl font-semibold">Minha jornada de diagnosticos</h2>
            <p className="text-sm text-muted-foreground">Acompanhe o que ainda precisa ser respondido, o que esta em andamento e o que ja foi concluido.</p>
          </div>

          {workspaceError ? (
            <Card className="border-destructive/20 bg-destructive/10">
              <CardContent className="p-6 text-sm text-destructive">{workspaceError}</CardContent>
            </Card>
          ) : workspace.assigned.length === 0 && workspace.history.length === 0 ? (
            <Card className="border-dashed bg-white/70">
              <CardContent className="p-6 text-sm text-muted-foreground">
                Nenhum diagnostico foi associado a esta conta ainda.
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="pending" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3 md:w-[480px]">
                <TabsTrigger value="pending">Pendentes</TabsTrigger>
                <TabsTrigger value="progress">Em andamento</TabsTrigger>
                <TabsTrigger value="done">Concluidos</TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-4">
                {pendingItems.length === 0 ? (
                  <Card className="bg-white/75">
                    <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
                      <Clock3 className="h-4 w-4" />
                      Nenhum diagnostico pendente no momento.
                    </CardContent>
                  </Card>
                ) : (
                  pendingItems.map((item) => (
                    <Card key={item.linkId} className="bg-white/85">
                      <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <p className="font-semibold">{item.templateName}</p>
                            <StatusBadge status={item.status} />
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.title || "Link sem identificador"} • Disponivel {item.expiresAt ? `ate ${new Intl.DateTimeFormat("pt-BR").format(new Date(item.expiresAt))}` : "sem prazo definido"}
                          </p>
                        </div>
                        <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => navigate(`/diagnostico/${item.token}`)}>
                          <PlayCircle className="h-4 w-4" />
                          Responder agora
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="progress" className="space-y-4">
                {inProgressItems.length === 0 ? (
                  <Card className="bg-white/75">
                    <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
                      <Search className="h-4 w-4" />
                      Nenhum diagnostico em andamento.
                    </CardContent>
                  </Card>
                ) : (
                  inProgressItems.map((item) => (
                    <Card key={item.linkId} className="bg-white/85">
                      <CardContent className="space-y-4 p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <div className="flex items-center gap-3">
                              <p className="font-semibold">{item.templateName}</p>
                              <StatusBadge status={item.status} />
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {item.title || "Link sem identificador"} • Atualizado em {new Intl.DateTimeFormat("pt-BR").format(new Date(item.updatedAt))}
                            </p>
                          </div>
                      <Button variant="outline" onClick={() => navigate(`/diagnostico/${item.token}`)}>
                        Continuar
                      </Button>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>Progresso salvo</span>
                            <span>{item.progressPercent}%</span>
                          </div>
                          <Progress value={item.progressPercent} className="h-3" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="done" className="space-y-4">
                {completedItems.length === 0 ? (
                  <Card className="bg-white/75">
                    <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
                      <AlertCircle className="h-4 w-4" />
                      Ainda nao ha diagnosticos concluidos.
                    </CardContent>
                  </Card>
                ) : (
                  completedItems.map((item) => (
                    <Card key={item.sessionId} className="bg-white/85">
                      <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <p className="font-semibold">{item.templateName}</p>
                            <StatusBadge status={item.status} />
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.title || "Link sem identificador"} • Concluido em{" "}
                            {item.completedAt ? new Intl.DateTimeFormat("pt-BR").format(new Date(item.completedAt)) : new Intl.DateTimeFormat("pt-BR").format(new Date(item.updatedAt))}
                          </p>
                        </div>
                        <Button variant="outline" onClick={() => navigate(`/minha-conta/diagnostico/${item.sessionId}/resultado`)}>
                          <CheckCircle2 className="h-4 w-4" />
                          Ver relatorio
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          )}
        </section>
      </main>
    </div>
  );
}
