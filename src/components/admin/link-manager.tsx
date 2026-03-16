import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Link2, Plus } from "lucide-react";

import {
  createDiagnosticLink,
  listClientProfiles,
  listDiagnosticLinks,
} from "@/lib/diagnostic-runtime";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ClientProfileOption, DiagnosticLinkItem } from "@/types/diagnostic-runtime";

type LinkManagerProps = {
  templateId: string | null;
  userId: string | null;
};

export function LinkManager({ templateId, userId }: LinkManagerProps) {
  const [clients, setClients] = useState<ClientProfileOption[]>([]);
  const [links, setLinks] = useState<DiagnosticLinkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [assignedUserId, setAssignedUserId] = useState<string>("unassigned");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxUses, setMaxUses] = useState("");

  const baseUrl = useMemo(() => window.location.origin, []);

  useEffect(() => {
    async function bootstrap() {
      if (!templateId) {
        setLinks([]);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const [loadedClients, loadedLinks] = await Promise.all([listClientProfiles(), listDiagnosticLinks(templateId)]);
        setClients(loadedClients);
        setLinks(loadedLinks);
      } catch (runtimeError) {
        setError(runtimeError instanceof Error ? runtimeError.message : "Nao foi possivel carregar os links.");
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, [templateId]);

  async function handleCreateLink() {
    if (!templateId || !userId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createDiagnosticLink(userId, {
        templateId,
        title,
        notes,
        assignedUserId: assignedUserId === "unassigned" ? null : assignedUserId,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        maxUses: maxUses ? Number(maxUses) : null,
      });

      const nextLinks = await listDiagnosticLinks(templateId);
      setLinks(nextLinks);
      setTitle("");
      setNotes("");
      setAssignedUserId("unassigned");
      setExpiresAt("");
      setMaxUses("");
    } catch (runtimeError) {
      setError(runtimeError instanceof Error ? runtimeError.message : "Nao foi possivel gerar o link.");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink(token: string) {
    await navigator.clipboard.writeText(`${baseUrl}/diagnostico/${token}`);
    setCopiedToken(token);
    window.setTimeout(() => setCopiedToken(null), 1800);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      <Card className="bg-white/90">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Gerador de links</CardTitle>
          <CardDescription>Crie links unicos para cada turma, cliente ou rodada de diagnostico.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="link-title">Titulo / identificador</Label>
            <Input id="link-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Turma Summit SP - Marco" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="link-notes">Observacoes</Label>
            <Textarea id="link-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notas internas sobre este envio." />
          </div>

          <div className="space-y-2">
            <Label>Destinatario</Label>
            <Select value={assignedUserId} onValueChange={setAssignedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Sem vinculo</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="link-expiry">Expira em</Label>
              <Input id="link-expiry" type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-max-uses">Max. usos</Label>
              <Input id="link-max-uses" type="number" min="1" value={maxUses} onChange={(event) => setMaxUses(event.target.value)} placeholder="Opcional" />
            </div>
          </div>

          <Button type="button" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleCreateLink} disabled={loading || !templateId}>
            <Plus className="h-4 w-4" />
            Gerar link
          </Button>

          {error ? <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
        </CardContent>
      </Card>

      <Card className="bg-white/90">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Links gerados</CardTitle>
          <CardDescription>Monitore o status de cada link e copie o acesso com um clique.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && links.length === 0 ? <p className="text-sm text-muted-foreground">Carregando links...</p> : null}
          {!loading && links.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum link gerado para este modelo ainda.</p> : null}

          {links.map((link) => (
            <div key={link.id} className="rounded-2xl border border-border/70 bg-white p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{link.title || "Link sem identificador"}</p>
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                      {link.progressStatus === "completed" ? "Concluido" : link.progressStatus === "in_progress" ? "Em andamento" : "Pendente"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{link.assignedUserName || "Sem destinatario vinculado"}</p>
                  <p className="text-xs text-muted-foreground break-all">{`${baseUrl}/diagnostico/${link.token}`}</p>
                  {link.notes ? <p className="text-sm text-slate-600">{link.notes}</p> : null}
                </div>

                <div className="flex flex-col items-start gap-2 lg:items-end">
                  <Button type="button" variant="outline" size="sm" onClick={() => void copyLink(link.token)}>
                    {copiedToken === link.token ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copiedToken === link.token ? "Copiado" : "Copiar link"}
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    <p>Usos: {link.usesCount}{link.maxUses ? ` / ${link.maxUses}` : ""}</p>
                    <p>Expira: {link.expiresAt ? new Intl.DateTimeFormat("pt-BR").format(new Date(link.expiresAt)) : "Sem expiracao"}</p>
                  </div>
                </div>
              </div>

              {link.sessionId ? (
                <div className="mt-4 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                  Sessao registrada para este link. Use a proxima fase para abrir respostas completas diretamente daqui.
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
