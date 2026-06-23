import { useEffect, useState } from "react";
import { Calendar, Check, Copy, ExternalLink, Link2, List, Loader2, ShieldX, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildPublicUrl,
  createShareLink,
  getShareLinkStatus,
  listShareLinks,
  revokeShareLink,
  type CreateShareLinkParams,
  type DreShareLink,
} from "@/lib/dre-share-service";
import type { DreAnalysisType } from "@/lib/dre-analysis";

type View = "create" | "manage";

type DreShareModalProps = {
  open: boolean;
  onClose: () => void;
  modelId: string;
  modelName: string;
  analysisType: DreAnalysisType;
  selectedYears: string[];
  selectedPeriodIds: string[];
  includeDrafts: boolean;
  showVariation: boolean;
  showVerticalAnalysis: boolean;
};

export function DreShareModal({
  open,
  onClose,
  modelId,
  modelName,
  analysisType,
  selectedYears,
  selectedPeriodIds,
  includeDrafts,
  showVariation,
  showVerticalAnalysis,
}: DreShareModalProps) {
  const [view, setView] = useState<View>("create");
  const [expiresAt, setExpiresAt] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState<{ token: string; url: string } | null>(null);
  const [links, setLinks] = useState<DreShareLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const maxDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  useEffect(() => {
    if (!open) {
      setView("create");
      setExpiresAt("");
      setDescription("");
      setCreatedLink(null);
    }
  }, [open]);

  useEffect(() => {
    if (open && view === "manage") {
      void loadLinks();
    }
  }, [open, view]);

  async function loadLinks() {
    setLoadingLinks(true);
    try {
      setLinks(await listShareLinks());
    } catch {
      toast.error("Não foi possível carregar os links.");
    } finally {
      setLoadingLinks(false);
    }
  }

  function validateExpiry(value: string): string | null {
    if (!value) return "Informe a data de validade.";
    const chosen = new Date(value + "T23:59:59");
    const now = new Date();
    if (chosen <= now) return "A data de validade deve ser futura.";
    const max = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    if (chosen > max) return "A validade máxima é de 30 dias.";
    return null;
  }

  async function handleCreate() {
    const validationError = validateExpiry(expiresAt);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (!modelId) {
      toast.error("Selecione um modelo de DRE antes de compartilhar.");
      return;
    }
    if (selectedPeriodIds.length === 0) {
      toast.error("Selecione ao menos um período antes de compartilhar.");
      return;
    }

    setCreating(true);
    try {
      const params: CreateShareLinkParams = {
        modelId,
        analysisType,
        selectedYears,
        selectedPeriodIds,
        includeDrafts,
        showVariation,
        showVerticalAnalysis,
        expiresAt: new Date(expiresAt + "T23:59:59"),
        description: description.trim() || undefined,
      };
      const result = await createShareLink(params);
      const url = buildPublicUrl(result.token);
      setCreatedLink({ token: result.token, url });
      toast.success("Link gerado com sucesso!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar o link.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(link: DreShareLink) {
    setRevoking(link.id);
    try {
      await revokeShareLink(link.id);
      toast.success("Link revogado.");
      await loadLinks();
    } catch {
      toast.error("Não foi possível revogar o link.");
    } finally {
      setRevoking(null);
    }
  }

  async function handleCopy(url: string, id: string) {
    await navigator.clipboard.writeText(url);
    setCopied(id);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Compartilhar Análise de DRE
          </DialogTitle>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex gap-2 border-b pb-3">
          <button
            type="button"
            onClick={() => setView("create")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${view === "create" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Link2 className="h-3.5 w-3.5" />
            Novo link
          </button>
          <button
            type="button"
            onClick={() => setView("manage")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${view === "manage" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <List className="h-3.5 w-3.5" />
            Links criados
          </button>
        </div>

        {/* Create view */}
        {view === "create" && !createdLink && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Análise atual</p>
              <p>Modelo: {modelName || "—"}</p>
              <p>Tipo: {analysisType === "monthly" ? "Mensal" : analysisType === "quarterly" ? "Trimestral" : "Semestral"}</p>
              <p>Períodos selecionados: {selectedPeriodIds.length}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expires-at" className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Data de validade <span className="text-red-500">*</span>
              </Label>
              <Input
                id="expires-at"
                type="date"
                min={today}
                max={maxDate}
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">O link expirará automaticamente nesta data. Máximo: 30 dias.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Descrição interna (opcional)</Label>
              <Input
                id="description"
                placeholder="Ex.: Compartilhado com cliente ABC"
                maxLength={200}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Created link success */}
        {view === "create" && createdLink && (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="mb-2 flex items-center gap-2 font-semibold text-emerald-800">
                <Check className="h-4 w-4" />
                Link gerado com sucesso!
              </p>
              <p className="mb-3 text-sm text-emerald-700">Copie e compartilhe o link abaixo. Ele expirará na data escolhida.</p>
              <div className="flex gap-2">
                <Input readOnly value={createdLink.url} className="font-mono text-xs" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleCopy(createdLink.url, "new")}
                >
                  {copied === "new" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(createdLink.url, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setCreatedLink(null);
                setExpiresAt("");
                setDescription("");
              }}
            >
              Gerar outro link
            </Button>
          </div>
        )}

        {/* Manage links view */}
        {view === "manage" && (
          <div className="space-y-3">
            {loadingLinks ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : links.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Nenhum link criado ainda.
              </div>
            ) : (
              <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                {links.map((link) => {
                  const status = getShareLinkStatus(link);
                  const url = buildPublicUrl(link.token);
                  return (
                    <div key={link.id} className="rounded-lg border bg-white p-3">
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-mono text-xs text-muted-foreground">{url}</p>
                          {link.description && <p className="mt-0.5 text-sm font-medium">{link.description}</p>}
                        </div>
                        <StatusBadge status={status} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Criado: {new Date(link.created_at).toLocaleDateString("pt-BR")}</span>
                        <span>Válido até: {new Date(link.expires_at).toLocaleDateString("pt-BR")}</span>
                        <span>Acessos: {link.access_count}</span>
                        {link.last_accessed_at && (
                          <span>Último acesso: {new Date(link.last_accessed_at).toLocaleDateString("pt-BR")}</span>
                        )}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={status !== "active"}
                          onClick={() => void handleCopy(url, link.id)}
                        >
                          {copied === link.id ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                          Copiar
                        </Button>
                        {status !== "active" ? null : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                            disabled={revoking === link.id}
                            onClick={() => void handleRevoke(link)}
                          >
                            {revoking === link.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <ShieldX className="h-3 w-3" />
                            )}
                            Revogar
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {view === "create" && !createdLink && (
            <>
              <Button variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={() => void handleCreate()} disabled={creating || !expiresAt}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                {creating ? "Gerando..." : "Gerar link"}
              </Button>
            </>
          )}
          {(view === "manage" || (view === "create" && createdLink)) && (
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4" />
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({ status }: { status: "active" | "expired" | "revoked" }) {
  if (status === "active") return <Badge className="bg-emerald-600 text-xs">Ativo</Badge>;
  if (status === "expired") return <Badge variant="secondary" className="text-xs">Expirado</Badge>;
  return <Badge variant="destructive" className="text-xs">Revogado</Badge>;
}
