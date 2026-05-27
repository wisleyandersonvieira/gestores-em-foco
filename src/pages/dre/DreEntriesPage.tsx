import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Edit2, Eye, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DreLayout } from "@/components/dre/dre-layout";
import { ConfirmDialog, formatCurrency } from "@/components/dre/dre-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteDreEntry, listDreEntriesPaginated, listDreModels } from "@/lib/dre-service";
import type { DreEntriesPageFilter } from "@/lib/dre-service";
import { formatCompetence, formatPercentage } from "@/lib/dre-calculations";
import type { DreEntryStatus, DreEntryWithModel, DreModel } from "@/types/dre";

const INITIAL_PAGE_SIZE = 5;
const FILTERED_PAGE_SIZE = 10;

export default function DreEntriesPage() {
  return <DreLayout>{(user) => <DreEntriesContent userId={user.id} />}</DreLayout>;
}

function DreEntriesContent({ userId }: { userId: string }) {
  const [entries, setEntries] = useState<DreEntryWithModel[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [models, setModels] = useState<DreModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<DreEntryWithModel | null>(null);

  const [startCompetence, setStartCompetence] = useState("");
  const [endCompetence, setEndCompetence] = useState("");
  const [modelId, setModelId] = useState("all");
  const [status, setStatus] = useState<DreEntryStatus | "all">("all");
  const [resultFilter, setResultFilter] = useState<"all" | "positive" | "negative" | "zero">("all");

  const hasActiveFilters =
    startCompetence !== "" || endCompetence !== "" || modelId !== "all" || status !== "all" || resultFilter !== "all";
  const pageSize = hasActiveFilters ? FILTERED_PAGE_SIZE : INITIAL_PAGE_SIZE;

  useEffect(() => {
    listDreModels(userId)
      .then(setModels)
      .catch(() => undefined);
  }, [userId]);

  useEffect(() => {
    setIsLoading(true);
    const activeFilters =
      startCompetence !== "" || endCompetence !== "" || modelId !== "all" || status !== "all" || resultFilter !== "all";
    const size = activeFilters ? FILTERED_PAGE_SIZE : INITIAL_PAGE_SIZE;
    const filter: DreEntriesPageFilter = {
      startCompetence: startCompetence || undefined,
      endCompetence: endCompetence || undefined,
      modelId,
      status,
      resultFilter,
    };

    listDreEntriesPaginated(userId, currentPage, size, filter)
      .then(({ entries: e, totalCount: t }) => {
        setEntries(e);
        setTotalCount(t);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Não foi possível carregar DREs."))
      .finally(() => setIsLoading(false));
  }, [userId, currentPage, startCompetence, endCompetence, modelId, status, resultFilter, reloadKey]);

  function applyFilter<T>(setter: (v: T) => void) {
    return (value: T) => {
      setter(value);
      setCurrentPage(0);
    };
  }

  function clearFilters() {
    setStartCompetence("");
    setEndCompetence("");
    setModelId("all");
    setStatus("all");
    setResultFilter("all");
    setCurrentPage(0);
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    try {
      await deleteDreEntry(userId, pendingDelete.id);
      setPendingDelete(null);
      toast.success("DRE excluído.");
      if (entries.length === 1 && currentPage > 0) {
        setCurrentPage((p) => p - 1);
      } else {
        setReloadKey((k) => k + 1);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir o DRE.");
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize);
  const firstItem = totalCount === 0 ? 0 : currentPage * pageSize + 1;
  const lastItem = Math.min((currentPage + 1) * pageSize, totalCount);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">DREs Cadastrados</h1>
          <p className="mt-1 text-sm text-muted-foreground">Consulte, edite, visualize e exclua seus DREs mensais.</p>
        </div>
        <Button asChild>
          <Link to="/dre-facil/cadastrar">
            <Plus className="h-4 w-4" />
            Cadastrar DRE
          </Link>
        </Button>
      </div>

      <Card className="border-primary/10 bg-white/90">
        <CardContent className="p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Input
              placeholder="Competência inicial (ex: 2026-01)"
              value={startCompetence}
              onChange={(e) => applyFilter(setStartCompetence)(e.target.value)}
            />
            <Input
              placeholder="Competência final (ex: 2026-12)"
              value={endCompetence}
              onChange={(e) => applyFilter(setEndCompetence)(e.target.value)}
            />
            <Select value={modelId} onValueChange={applyFilter(setModelId)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os modelos</SelectItem>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => applyFilter(setStatus)(v as DreEntryStatus | "all")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="finalized">Finalizado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={resultFilter} onValueChange={(v) => applyFilter(setResultFilter)(v as typeof resultFilter)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os resultados</SelectItem>
                <SelectItem value="positive">Resultado positivo</SelectItem>
                <SelectItem value="negative">Resultado negativo</SelectItem>
                <SelectItem value="zero">Resultado zerado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {hasActiveFilters && (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {totalCount} {totalCount === 1 ? "registro encontrado" : "registros encontrados"}
              </span>
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 px-3 text-xs">
                Limpar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/10 bg-white/90">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Competência</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead className="text-right">Créditos</TableHead>
                  <TableHead className="text-right">Débitos</TableHead>
                  <TableHead className="text-right">Resultado</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      Nenhum DRE encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => (
                    <TableRow key={entry.id} className="h-10">
                      <TableCell className="py-2 font-medium">{formatCompetence(entry.competence)}</TableCell>
                      <TableCell className="py-2">{entry.model?.name ?? "Modelo removido"}</TableCell>
                      <TableCell className="py-2 text-right">{formatCurrency(entry.total_credit)}</TableCell>
                      <TableCell className="py-2 text-right">{formatCurrency(entry.total_debit)}</TableCell>
                      <TableCell className={`py-2 text-right font-semibold ${entry.result >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {formatCurrency(entry.result)}
                      </TableCell>
                      <TableCell className="py-2 text-right">{formatPercentage(entry.margin_percentage)}</TableCell>
                      <TableCell className="py-2">
                        <Badge variant={entry.status === "finalized" ? "default" : "secondary"}>
                          {entry.status === "finalized" ? "Finalizado" : "Rascunho"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2">
                        {new Intl.DateTimeFormat("pt-BR").format(new Date(entry.created_at))}
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex justify-end gap-1">
                          <Button asChild variant="ghost" size="icon" className="h-7 w-7">
                            <Link to={`/dre-facil/dres/${entry.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                          </Button>
                          <Button asChild variant="ghost" size="icon" className="h-7 w-7">
                            <Link to={`/dre-facil/dres/${entry.id}/editar`}><Edit2 className="h-3.5 w-3.5" /></Link>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPendingDelete(entry)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!isLoading && totalCount > 0 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Exibindo {firstItem}–{lastItem} de {totalCount}{" "}
                {hasActiveFilters ? "registros filtrados" : "registros"}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Anterior
                </Button>
                <span className="text-xs text-muted-foreground">
                  {currentPage + 1}/{totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  disabled={currentPage + 1 >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Próxima
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Excluir DRE"
        description="O cabeçalho e os itens deste DRE serão removidos. Categorias, subcategorias e modelos permanecem intactos."
        onConfirm={handleDelete}
      />
    </div>
  );
}
