import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Edit2, Eye, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DreLayout } from "@/components/dre/dre-layout";
import { ConfirmDialog, formatCurrency } from "@/components/dre/dre-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteDreEntry, listDreEntries, listDreModels } from "@/lib/dre-service";
import { formatCompetence, formatPercentage } from "@/lib/dre-calculations";
import type { DreEntryStatus, DreEntryWithModel, DreModel } from "@/types/dre";

export default function DreEntriesPage() {
  return <DreLayout>{(user) => <DreEntriesContent userId={user.id} />}</DreLayout>;
}

function DreEntriesContent({ userId }: { userId: string }) {
  const [entries, setEntries] = useState<DreEntryWithModel[]>([]);
  const [models, setModels] = useState<DreModel[]>([]);
  const [status, setStatus] = useState<DreEntryStatus | "all">("all");
  const [modelId, setModelId] = useState("all");
  const [resultFilter, setResultFilter] = useState<"all" | "positive" | "negative">("all");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [pendingDelete, setPendingDelete] = useState<DreEntryWithModel | null>(null);

  async function reload() {
    const [nextEntries, nextModels] = await Promise.all([listDreEntries(userId), listDreModels(userId)]);
    setEntries(nextEntries);
    setModels(nextModels);
  }

  useEffect(() => {
    void reload().catch((error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel carregar DREs."));
  }, [userId]);

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      if (status !== "all" && entry.status !== status) return false;
      if (modelId !== "all" && entry.model_id !== modelId) return false;
      if (resultFilter === "positive" && entry.result < 0) return false;
      if (resultFilter === "negative" && entry.result >= 0) return false;
      if (start && entry.competence < start) return false;
      if (end && entry.competence > end) return false;
      return true;
    });
  }, [end, entries, modelId, resultFilter, start, status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">DREs Cadastrados</h1>
          <p className="mt-1 text-sm text-muted-foreground">Consulte, edite, visualize e exclua seus DREs mensais.</p>
        </div>
        <Button asChild><Link to="/dre-facil/cadastrar"><Plus className="h-4 w-4" />Cadastrar DRE</Link></Button>
      </div>

      <Card className="border-primary/10 bg-white/90">
        <CardContent className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Competencia inicial" value={start} onChange={(event) => setStart(event.target.value)} />
          </div>
          <Input placeholder="Competencia final" value={end} onChange={(event) => setEnd(event.target.value)} />
          <Select value={modelId} onValueChange={setModelId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os modelos</SelectItem>{models.map((model) => <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>)}</SelectContent></Select>
          <Select value={status} onValueChange={(value) => setStatus(value as DreEntryStatus | "all")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem><SelectItem value="draft">Rascunho</SelectItem><SelectItem value="finalized">Finalizado</SelectItem></SelectContent></Select>
          <Select value={resultFilter} onValueChange={(value) => setResultFilter(value as "all" | "positive" | "negative")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os resultados</SelectItem><SelectItem value="positive">Resultado positivo</SelectItem><SelectItem value="negative">Resultado negativo</SelectItem></SelectContent></Select>
        </CardContent>
      </Card>

      <Card className="border-primary/10 bg-white/90">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Competencia</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead className="text-right">Creditos</TableHead>
                  <TableHead className="text-right">Debitos</TableHead>
                  <TableHead className="text-right">Resultado</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="h-24 text-center text-muted-foreground">Nenhum DRE encontrado.</TableCell></TableRow>
                ) : filtered.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{formatCompetence(entry.competence)}</TableCell>
                    <TableCell>{entry.model?.name ?? "Modelo removido"}</TableCell>
                    <TableCell className="text-right">{formatCurrency(entry.total_credit)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(entry.total_debit)}</TableCell>
                    <TableCell className={`text-right font-semibold ${entry.result >= 0 ? "text-emerald-700" : "text-red-700"}`}>{formatCurrency(entry.result)}</TableCell>
                    <TableCell className="text-right">{formatPercentage(entry.margin_percentage)}</TableCell>
                    <TableCell><Badge variant={entry.status === "finalized" ? "default" : "secondary"}>{entry.status === "finalized" ? "Finalizado" : "Rascunho"}</Badge></TableCell>
                    <TableCell>{new Intl.DateTimeFormat("pt-BR").format(new Date(entry.created_at))}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button asChild variant="ghost" size="icon"><Link to={`/dre-facil/dres/${entry.id}`}><Eye className="h-4 w-4" /></Link></Button>
                        <Button asChild variant="ghost" size="icon"><Link to={`/dre-facil/dres/${entry.id}/editar`}><Edit2 className="h-4 w-4" /></Link></Button>
                        <Button variant="ghost" size="icon" onClick={() => setPendingDelete(entry)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Excluir DRE"
        description="O cabecalho e os itens deste DRE serao removidos. Categorias, subcategorias e modelos permanecem intactos."
        onConfirm={() => {
          if (!pendingDelete) return;
          void deleteDreEntry(userId, pendingDelete.id)
            .then(async () => {
              setPendingDelete(null);
              await reload();
              toast.success("DRE excluido.");
            })
            .catch((error) => toast.error(error.message));
        }}
      />
    </div>
  );
}
