import { useEffect, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, Clock3, PlayCircle, Search } from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { ClientLayout } from "@/components/platform/client-layout";
import { ProductAccessGate } from "@/components/platform/product-access";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { extractDiagnosticToken, getAccountWorkspace, validateDiagnosticTokenForUser } from "@/lib/diagnostic-runtime";
import { PRODUCT_SLUGS } from "@/lib/products";
import type { AccountWorkspace, AssignedDiagnosticItem, SessionHistoryItem } from "@/types/diagnostic-runtime";

export default function DiagnosticsWorkspacePage() {
  return (
    <ClientLayout>
      {(user) => (
        <ProductAccessGate user={user} productSlug={PRODUCT_SLUGS.diagnostics} productName="Diagnosticos">
          <DiagnosticsContent user={user} />
        </ProductAccessGate>
      )}
    </ClientLayout>
  );
}

function statusLabel(status: AssignedDiagnosticItem["status"] | SessionHistoryItem["status"]) {
  if (status === "completed") return "Concluido";
  if (status === "in_progress") return "Em andamento";
  return "Pendente";
}

function StatusBadge({ status }: { status: AssignedDiagnosticItem["status"] | SessionHistoryItem["status"] }) {
  const variant = status === "completed" ? "default" : status === "in_progress" ? "secondary" : "outline";
  return <Badge variant={variant}>{statusLabel(status)}</Badge>;
}

function DiagnosticsContent({ user }: { user: User }) {
  const navigate = useNavigate();
  const [linkInput, setLinkInput] = useState("");
  const [workspace, setWorkspace] = useState<AccountWorkspace>({ assigned: [], history: [] });
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [validatingLink, setValidatingLink] = useState(false);

  const pendingItems = useMemo(() => workspace.assigned.filter((item) => item.status === "pending"), [workspace.assigned]);
  const inProgressItems = useMemo(() => workspace.assigned.filter((item) => item.status === "in_progress"), [workspace.assigned]);
  const completedItems = useMemo(() => workspace.history.filter((item) => item.status === "completed"), [workspace.history]);

  useEffect(() => {
    getAccountWorkspace(user.id).then(setWorkspace).catch((err) => setWorkspaceError(err instanceof Error ? err.message : "Nao foi possivel carregar seus diagnosticos."));
  }, [user.id]);

  async function handleStartFromInput() {
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

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Diagnosticos</p>
        <h1 className="font-display mt-3 text-3xl font-semibold md:text-4xl">Acesse e acompanhe seus diagnosticos empresariais.</h1>
      </div>

      <Card className="border-primary/10 bg-white/90">
        <CardHeader>
          <CardTitle>Iniciar um diagnostico</CardTitle>
          <CardDescription>Cole o link que voce recebeu para acessar um novo fluxo de perguntas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="https://seudominio.com/diagnostico/token" value={linkInput} onChange={(event) => { setLinkInput(event.target.value); setInputError(null); }} />
          <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => void handleStartFromInput()} disabled={validatingLink || !extractDiagnosticToken(linkInput)}>
            {validatingLink ? "Validando..." : "Iniciar Diagnostico"}
          </Button>
          {inputError ? <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{inputError}</div> : null}
        </CardContent>
      </Card>

      {workspaceError ? (
        <Card className="border-destructive/20 bg-destructive/10"><CardContent className="p-6 text-sm text-destructive">{workspaceError}</CardContent></Card>
      ) : workspace.assigned.length === 0 && workspace.history.length === 0 ? (
        <Card className="border-dashed bg-white/80"><CardContent className="p-6 text-sm text-muted-foreground">Nenhum diagnostico foi associado a esta conta ainda.</CardContent></Card>
      ) : (
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 md:w-[480px]">
            <TabsTrigger value="pending">Pendentes</TabsTrigger>
            <TabsTrigger value="progress">Em andamento</TabsTrigger>
            <TabsTrigger value="done">Concluidos</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingItems.length === 0 ? <Empty icon={Clock3} text="Nenhum diagnostico pendente no momento." /> : pendingItems.map((item) => (
              <DiagnosticCard key={item.linkId} title={item.templateName} description={`${item.title || "Link sem identificador"} - Disponivel ${item.expiresAt ? `ate ${formatDate(item.expiresAt)}` : "sem prazo definido"}`} status={item.status}>
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => navigate(`/diagnostico/${item.token}`)}>
                  <PlayCircle className="h-4 w-4" />
                  Responder agora
                </Button>
              </DiagnosticCard>
            ))}
          </TabsContent>

          <TabsContent value="progress" className="space-y-4">
            {inProgressItems.length === 0 ? <Empty icon={Search} text="Nenhum diagnostico em andamento." /> : inProgressItems.map((item) => (
              <DiagnosticCard key={item.linkId} title={item.templateName} description={`${item.title || "Link sem identificador"} - Atualizado em ${formatDate(item.updatedAt)}`} status={item.status}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-muted-foreground"><span>Progresso salvo</span><span>{item.progressPercent}%</span></div>
                    <Progress value={item.progressPercent} className="h-3" />
                  </div>
                  <Button variant="outline" onClick={() => navigate(`/diagnostico/${item.token}`)}>Continuar</Button>
                </div>
              </DiagnosticCard>
            ))}
          </TabsContent>

          <TabsContent value="done" className="space-y-4">
            {completedItems.length === 0 ? <Empty icon={AlertCircle} text="Ainda nao ha diagnosticos concluidos." /> : completedItems.map((item) => (
              <DiagnosticCard key={item.sessionId} title={item.templateName} description={`${item.title || "Link sem identificador"} - Concluido em ${formatDate(item.completedAt ?? item.updatedAt)}`} status={item.status}>
                <Button variant="outline" onClick={() => navigate(`/minha-conta/diagnostico/${item.sessionId}/resultado`)}>
                  <CheckCircle2 className="h-4 w-4" />
                  Ver relatorio
                </Button>
              </DiagnosticCard>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function DiagnosticCard({ title, description, status, children }: { title: string; description: string; status: AssignedDiagnosticItem["status"] | SessionHistoryItem["status"]; children: ReactNode }) {
  return (
    <Card className="border-primary/10 bg-white/90">
      <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <p className="font-semibold">{title}</p>
            <StatusBadge status={status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="lg:min-w-56">{children}</div>
      </CardContent>
    </Card>
  );
}

function Empty({ icon: Icon, text }: { icon: ComponentType<{ className?: string }>; text: string }) {
  return (
    <Card className="bg-white/75">
      <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        {text}
      </CardContent>
    </Card>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}
