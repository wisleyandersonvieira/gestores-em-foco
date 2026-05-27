import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { DreLayout } from "@/components/dre/dre-layout";
import { CompetenceSelect, CurrencyInput, formatCurrency } from "@/components/dre/dre-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buildDraftLinesFromModel, getDreEntry, getDreModelWithLines, listDreModels, saveDreEntry } from "@/lib/dre-service";
import { calculateCategoryTotal, calculateDreTotals, calculateSumLineValue, currentCompetence, formatCompetence } from "@/lib/dre-calculations";
import type { DreDraftLine, DreEntryStatus, DreModel } from "@/types/dre";

export default function DreEntryFormPage() {
  return <DreLayout>{(user) => <DreEntryFormContent userId={user.id} />}</DreLayout>;
}

function DreEntryFormContent({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const { entryId } = useParams();
  const [models, setModels] = useState<DreModel[]>([]);
  const [entryModelName, setEntryModelName] = useState<string | null>(null);
  const [competence, setCompetence] = useState(currentCompetence());
  const [modelId, setModelId] = useState("");
  const [lines, setLines] = useState<DreDraftLine[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const nextModels = await listDreModels(userId, "active");
      setModels(nextModels);

      if (entryId) {
        const entry = await getDreEntry(userId, entryId);
        setCompetence(entry.competence);
        setModelId(entry.model_id);
        setEntryModelName(entry.model?.name ?? "Modelo salvo");
        setLines(entry.items.map((item) => ({
          categoryId: item.category_id,
          subcategoryId: item.subcategory_id,
          categoryName: item.category_name_snapshot,
          subcategoryName: item.subcategory_name_snapshot,
          categoryType: item.category_type_snapshot,
          categoryIsRevenue: item.category_is_revenue ?? false,
          financialType: null,
          isNetIncome: item.is_net_income ?? false,
          subcategoryIsReductive: item.subcategory_is_reductive ?? false,
          lineType: item.line_type,
          displayOrder: item.display_order,
          value: Number(item.value || 0),
        })));
      }
    }

    void load().catch((error) => toast.error(error instanceof Error ? error.message : "Não foi possível carregar o formulário."));
  }, [entryId, userId]);

  const totals = useMemo(() => calculateDreTotals(lines), [lines]);

  async function generateDre() {
    if (!modelId) {
      toast.error("Selecione um modelo.");
      return;
    }

    const model = await getDreModelWithLines(userId, modelId);
    const draftLines = buildDraftLinesFromModel(model);
    setEntryModelName(model.name);
    setLines(draftLines);
    toast.success("Estrutura gerada.");
  }

  async function submit(status: DreEntryStatus) {
    setLoading(true);
    try {
      const entry = await saveDreEntry({ userId, id: entryId, competence, modelId, status, lines });
      toast.success(status === "draft" ? "DRE salvo como rascunho." : "DRE finalizado.");
      navigate(`/dre-facil/dres/${entry.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o DRE.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">{entryId ? "Editar DRE" : "Cadastrar DRE"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Preencha valores somente nas subcategorias. Categorias e resultado são calculados automaticamente.</p>
      </div>

      <Card className="border-primary/10 bg-white/90">
        <CardHeader><CardTitle>1. Competência e modelo</CardTitle></CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[220px_1fr_auto]">
          <Label>Competência<CompetenceSelect value={competence} onChange={setCompetence} /></Label>
          <Label>Modelo<Select value={modelId} onValueChange={setModelId} disabled={Boolean(entryId)}><SelectTrigger className="mt-2"><SelectValue placeholder="Selecione um modelo ativo" /></SelectTrigger><SelectContent>{models.map((model) => <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>)}</SelectContent></Select></Label>
          <Button className="self-end" onClick={() => void generateDre().catch((error) => toast.error(error.message))} disabled={Boolean(entryId)}>Gerar DRE</Button>
        </CardContent>
      </Card>

      <Card className="border-primary/10 bg-white/90">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>2. Lançamentos</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{entryModelName ? `${entryModelName} · ${formatCompetence(competence)}` : "Gere a estrutura para preencher os valores."}</p>
          </div>
          <Badge variant={totals.result >= 0 ? "default" : "destructive"}>{totals.result >= 0 ? "Lucro" : "Prejuízo"} {formatCurrency(totals.result)}</Badge>
        </CardHeader>
        <CardContent>
          {lines.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Selecione a competência e o modelo para gerar a planilha financeira.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estrutura</TableHead>
                    <TableHead className="w-44 text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, index) => {
                    const readonlyValue = line.lineType === "category" ? calculateCategoryTotal(line.categoryId, lines) : line.lineType === "sum" ? calculateSumLineValue(index, lines) : line.value;
                    return (
                      <TableRow key={`${line.lineType}-${line.categoryId}-${line.subcategoryId}-${index}`} className={line.lineType === "category" ? "bg-muted/70" : line.lineType === "sum" ? "bg-primary/5" : ""}>
                        <TableCell>
                          <div className={line.lineType === "category" ? "font-semibold uppercase" : line.lineType === "sum" ? "font-semibold text-primary" : "pl-6 text-sm"}>
                            {line.lineType === "category" || line.lineType === "sum" ? line.categoryName : line.subcategoryName}
                            {line.lineType === "category" ? <Badge className="ml-2" variant={line.categoryType === "credit" ? "default" : "secondary"}>{line.categoryType === "credit" ? "Crédito" : "Débito"}</Badge> : null}
                            {line.lineType === "category" && line.categoryIsRevenue ? <Badge className="ml-2" variant="outline">FATURAMENTO</Badge> : null}
                            {line.lineType === "sum" && line.isNetIncome ? <Badge className="ml-2" variant="secondary">LUCRO LÍQUIDO</Badge> : null}
                            {line.lineType === "subcategory" && line.subcategoryIsReductive ? <Badge className="ml-2" variant="secondary">REDUTORA</Badge> : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          {line.lineType !== "subcategory" ? (
                            <div className="text-right font-semibold tabular-nums">{formatCurrency(readonlyValue)}</div>
                          ) : (
                            <CurrencyInput
                              value={line.value}
                              onChange={(value) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, value } : item))}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Summary label="Total de créditos" value={formatCurrency(totals.totalCredit)} />
        <Summary label="Total de débitos" value={formatCurrency(totals.totalDebit)} />
        <Summary label="Resultado" value={formatCurrency(totals.result)} tone={totals.result >= 0 ? "positive" : "negative"} />
        <Summary label="Margem" value={`${totals.marginPercentage.toFixed(2).replace(".", ",")}%`} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={() => void submit("draft")} disabled={loading || lines.length === 0}>
          <Save className="h-4 w-4" />
          Salvar rascunho
        </Button>
        <Button onClick={() => void submit("finalized")} disabled={loading || lines.length === 0}>
          <Save className="h-4 w-4" />
          Salvar finalizado
        </Button>
      </div>
    </div>
  );
}

function Summary({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  return (
    <Card className="border-primary/10 bg-white/90">
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`mt-1 text-xl font-semibold ${tone === "positive" ? "text-emerald-700" : tone === "negative" ? "text-red-700" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
