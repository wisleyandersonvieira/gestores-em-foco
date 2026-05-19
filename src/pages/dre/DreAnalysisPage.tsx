import { useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { DreLayout } from "@/components/dre/dre-layout";
import { IndicatorCard, formatCurrency } from "@/components/dre/dre-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calculateDreTotals, calculateNetIncomeFromEntryItems, calculateRevenueFromEntryItems, effectiveCategoryType, formatCompetence, formatPercentage, variationPercentage } from "@/lib/dre-calculations";
import { getDreEntry, listDreEntriesByModelAndYears, listDreModels } from "@/lib/dre-service";
import type { DreCategoryType, DreEntryWithItems, DreEntryWithModel, DreModel } from "@/types/dre";

type AnalysisType = "monthly" | "quarterly" | "semester";
type SelectablePeriod = { id: string; label: string; year: string; months: string[] };
type ComparisonPeriod = SelectablePeriod & {
  entries: DreEntryWithItems[];
  values: Map<string, number>;
  totals: { revenue: number; totalCredit: number; totalDebit: number; result: number; marginPercentage: number };
  missingMonths: string[];
};
type ComparisonRow = {
  key: string;
  label: string;
  lineType: "category" | "subcategory" | "total";
  categoryType: DreCategoryType | "result" | "margin";
  displayOrder: number;
  parentKey?: string;
};
type AnalysisResult = {
  periods: ComparisonPeriod[];
  rows: ComparisonRow[];
  summary: {
    totalCredit: number;
    revenue: number;
    totalDebit: number;
    result: number;
    averageMargin: number;
    bestPeriod: string;
    worstPeriod: string;
  };
};

export default function DreAnalysisPage() {
  return <DreLayout>{(user) => <DreAnalysisContent userId={user.id} />}</DreLayout>;
}

function DreAnalysisContent({ userId }: { userId: string }) {
  const [models, setModels] = useState<DreModel[]>([]);
  const [modelId, setModelId] = useState("");
  const [analysisType, setAnalysisType] = useState<AnalysisType>("monthly");
  const [years, setYears] = useState<string[]>([]);
  const [includeDrafts, setIncludeDrafts] = useState(false);
  const [showVariation, setShowVariation] = useState(false);
  const [availableEntries, setAvailableEntries] = useState<DreEntryWithModel[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void listDreModels(userId, "active")
      .then(setModels)
      .catch((error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel carregar modelos."));
  }, [userId]);

  useEffect(() => {
    setAvailableEntries([]);
    setSelectedIds([]);
    setResult(null);

    if (!modelId || years.length === 0) return;

    void listDreEntriesByModelAndYears({ userId, modelId, years, includeDrafts })
      .then(setAvailableEntries)
      .catch((error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel carregar DREs."));
  }, [includeDrafts, modelId, userId, years]);

  const allEntriesForModel = useMemo(() => availableEntries, [availableEntries]);
  const availableYears = useMemo(() => buildAvailableYears(availableEntries, years), [availableEntries, years]);
  const selectablePeriods = useMemo(() => buildSelectablePeriods(analysisType, years, availableEntries), [analysisType, availableEntries, years]);
  const selectedPeriods = useMemo(() => selectablePeriods.filter((period) => selectedIds.includes(period.id)), [selectablePeriods, selectedIds]);
  const canGenerate = Boolean(modelId) && years.length > 0 && selectedPeriods.length > 0;

  function toggleYear(year: string, checked: boolean) {
    setYears((current) => checked ? [...current, year].sort() : current.filter((item) => item !== year));
  }

  function togglePeriod(periodId: string, checked: boolean) {
    const limit = analysisType === "monthly" ? 12 : 6;
    if (checked && selectedIds.length >= limit) {
      toast.warning(analysisType === "monthly" ? "Voce pode selecionar no maximo 12 meses para comparacao." : `Voce pode selecionar no maximo ${limit} periodos para comparacao.`);
      return;
    }

    setSelectedIds((current) => checked ? [...current, periodId] : current.filter((id) => id !== periodId));
  }

  async function generateAnalysis() {
    if (!canGenerate) {
      toast.warning("Selecione modelo, ano e pelo menos um periodo.");
      return;
    }

    setLoading(true);
    try {
      const detailedEntries = await Promise.all(
        selectedPeriods.flatMap((period) => period.months)
          .map((competence) => availableEntries.find((entry) => entry.competence === competence))
          .filter((entry): entry is DreEntryWithModel => Boolean(entry))
          .map((entry) => getDreEntry(userId, entry.id)),
      );
      setResult(buildComparison(selectedPeriods, detailedEntries));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel gerar a analise.");
    } finally {
      setLoading(false);
    }
  }

  function clearFilters() {
    setModelId("");
    setAnalysisType("monthly");
    setYears([]);
    setIncludeDrafts(false);
    setShowVariation(false);
    setAvailableEntries([]);
    setSelectedIds([]);
    setResult(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Analise de DRE</h1>
        <p className="mt-1 text-sm text-muted-foreground">Compare DREs por mes, trimestre ou semestre usando a estrutura historica salva nos lancamentos.</p>
      </div>

      <Card className="border-primary/10 bg-white/90">
        <CardHeader><CardTitle>Filtros da analise</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_260px]">
            <Label>
              Modelo de DRE
              <Select value={modelId} onValueChange={(value) => { setModelId(value); setSelectedIds([]); setResult(null); }}>
                <SelectTrigger className="mt-2"><SelectValue placeholder="Selecione um modelo ativo" /></SelectTrigger>
                <SelectContent>{models.map((model) => <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>)}</SelectContent>
              </Select>
            </Label>
            <Label>
              Tipo de analise
              <Select value={analysisType} onValueChange={(value) => { setAnalysisType(value as AnalysisType); setSelectedIds([]); setResult(null); }}>
                <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="semester">Semestral</SelectItem>
                </SelectContent>
              </Select>
            </Label>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_280px_280px]">
            <div>
              <Label>Ano(s)</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {availableYears.map((year) => (
                  <label key={year} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm">
                    <Checkbox checked={years.includes(year)} onCheckedChange={(checked) => toggleYear(year, Boolean(checked))} />
                    {year}
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-center justify-between gap-3 rounded-lg border bg-white px-4 py-3 text-sm">
              <span>Incluir DREs em rascunho</span>
              <Switch checked={includeDrafts} onCheckedChange={setIncludeDrafts} />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-lg border bg-white px-4 py-3 text-sm">
              <span>Exibir variacao entre periodos</span>
              <Switch checked={showVariation} onCheckedChange={setShowVariation} />
            </label>
          </div>

          {modelId && years.length > 0 ? (
            <PeriodSelector
              analysisType={analysisType}
              entries={allEntriesForModel}
              periods={selectablePeriods}
              selectedIds={selectedIds}
              onToggle={togglePeriod}
            />
          ) : (
            <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">Selecione um modelo e pelo menos um ano para carregar os DREs disponiveis.</div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={clearFilters}><RotateCcw className="h-4 w-4" />Limpar filtros</Button>
            <Button disabled={!canGenerate || loading} onClick={() => void generateAnalysis()}>{loading ? "Gerando..." : "Gerar Analise"}</Button>
            <Button variant="outline" disabled={!result} onClick={() => result && exportAnalysisPdf(result, showVariation)}><Download className="h-4 w-4" />Exportar PDF</Button>
            <Button variant="outline" disabled={!result} onClick={() => result && exportAnalysisExcel(result, showVariation)}><FileSpreadsheet className="h-4 w-4" />Exportar Excel</Button>
          </div>
        </CardContent>
      </Card>

      {result ? (
        <>
          {result.periods.some((period) => period.missingMonths.length > 0) ? (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="grid gap-2 p-4 text-sm text-amber-900">
                {result.periods.filter((period) => period.missingMonths.length > 0).map((period) => (
                  <p key={period.id}>Atencao: {period.label} nao possui DRE cadastrado para {period.missingMonths.map(formatCompetence).join(", ")}.</p>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <IndicatorCard title="Faturamento" value={formatCurrency(result.summary.revenue)} />
            <IndicatorCard title="Total de Debitos" value={formatCurrency(result.summary.totalDebit)} />
            <IndicatorCard title="Resultado acumulado" value={formatCurrency(result.summary.result)} tone={result.summary.result >= 0 ? "positive" : "negative"} />
            <IndicatorCard title="Margem media" value={formatPercentage(result.summary.averageMargin)} />
            <IndicatorCard title="Melhor periodo" value={result.summary.bestPeriod} />
            <IndicatorCard title="Pior periodo" value={result.summary.worstPeriod} />
          </div>

          <ComparisonTable result={result} showVariation={showVariation} />
        </>
      ) : null}
    </div>
  );
}

function PeriodSelector({
  analysisType,
  entries,
  periods,
  selectedIds,
  onToggle,
}: {
  analysisType: AnalysisType;
  entries: DreEntryWithModel[];
  periods: SelectablePeriod[];
  selectedIds: string[];
  onToggle: (periodId: string, checked: boolean) => void;
}) {
  if (analysisType === "monthly") {
    const availablePeriodIds = new Set(entries.map((entry) => entry.competence));
    const monthlyPeriods = periods.filter((period) => availablePeriodIds.has(period.id));
    return (
      <div>
        <Label>DREs mensais disponiveis</Label>
        {monthlyPeriods.length === 0 ? (
          <div className="mt-2 rounded-lg border border-dashed p-5 text-sm text-muted-foreground">Nenhum DRE encontrado para o modelo e anos selecionados.</div>
        ) : (
          <div className="mt-2 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {monthlyPeriods.map((period) => {
              const entry = entries.find((item) => item.competence === period.id);
              if (!entry) return null;
              return (
                <label key={period.id} className="flex items-start gap-3 rounded-lg border bg-white p-3">
                  <Checkbox checked={selectedIds.includes(period.id)} onCheckedChange={(checked) => onToggle(period.id, Boolean(checked))} />
                  <div>
                    <p className="font-medium">{formatCompetence(entry.competence)}</p>
                    <p className="text-sm text-muted-foreground">Resultado: {formatCurrency(entry.result)}</p>
                    <div className="mt-2 flex gap-2">
                      <Badge variant={entry.status === "finalized" ? "default" : "secondary"}>{entry.status === "finalized" ? "Finalizado" : "Rascunho"}</Badge>
                      <Badge variant="outline">{formatCurrency(entry.total_credit)} / {formatCurrency(entry.total_debit)}</Badge>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const grouped = groupPeriodsByYear(periods);
  return (
    <div className="grid gap-4">
      <Label>{analysisType === "quarterly" ? "Trimestres" : "Semestres"} disponiveis</Label>
      {Object.entries(grouped).map(([year, yearPeriods]) => (
        <div key={year} className="rounded-lg border bg-white p-4">
          <p className="mb-3 font-semibold">{year}</p>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {yearPeriods.map((period) => (
              <label key={period.id} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted">
                <Checkbox checked={selectedIds.includes(period.id)} onCheckedChange={(checked) => onToggle(period.id, Boolean(checked))} />
                {period.label}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ComparisonTable({ result, showVariation }: { result: AnalysisResult; showVariation: boolean }) {
  return (
    <Card className="border-primary/10 bg-white/90">
      <CardHeader><CardTitle>Tabela Comparativa</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <Table className="min-w-[920px]">
          <TableHeader className="sticky top-0 z-10 bg-white">
            <TableRow>
              <TableHead className="sticky left-0 z-20 min-w-72 bg-white">Categoria / Subcategoria</TableHead>
              {result.periods.map((period, index) => (
                <ColumnHeaders key={period.id} period={period} index={index} showVariation={showVariation} />
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.map((row) => (
              <TableRow key={row.key} className={row.lineType === "category" ? "bg-muted/70" : row.lineType === "total" ? "bg-primary/5" : ""}>
                <TableCell className={`sticky left-0 z-10 bg-inherit ${row.lineType === "subcategory" ? "pl-10 text-sm" : "font-semibold"}`}>{row.label}</TableCell>
                {result.periods.map((period, index) => {
                  const current = getRowValue(row, period);
                  const previous = index > 0 ? getRowValue(row, result.periods[index - 1]) : 0;
                  const variation = index > 0 ? current - previous : 0;
                  return (
                    <ValueCells
                      key={`${period.id}-${row.key}`}
                      row={row}
                      value={current}
                      variation={variation}
                      previous={previous}
                      showVariation={showVariation && index > 0}
                    />
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ColumnHeaders({ period, index, showVariation }: { period: ComparisonPeriod; index: number; showVariation: boolean }) {
  return (
    <>
      <TableHead className="min-w-36 text-right">{period.label}</TableHead>
      {showVariation && index > 0 ? <TableHead className="min-w-44 text-right">Var. anterior</TableHead> : null}
    </>
  );
}

function ValueCells({ row, value, variation, previous, showVariation }: { row: ComparisonRow; value: number; variation: number; previous: number; showVariation: boolean }) {
  const formatted = row.categoryType === "margin" ? formatPercentage(value) : formatCurrency(value);
  const variationClass = variation === 0 ? "text-muted-foreground" : isGoodVariation(row.categoryType, variation) ? "text-emerald-700" : "text-red-700";
  return (
    <>
      <TableCell className={`text-right font-medium tabular-nums ${row.categoryType === "result" ? value >= 0 ? "text-emerald-700" : "text-red-700" : ""}`}>{formatted}</TableCell>
      {showVariation ? (
        <TableCell className={`text-right text-sm font-semibold tabular-nums ${variationClass}`}>
          {formatCurrency(variation)} / {formatPercentage(variationPercentage(previous, value))}
        </TableCell>
      ) : null}
    </>
  );
}

function buildAvailableYears(entries: DreEntryWithModel[], selectedYears: string[]) {
  const currentYear = String(new Date().getFullYear());
  const years = new Set([
    String(Number(currentYear) - 3),
    String(Number(currentYear) - 2),
    String(Number(currentYear) - 1),
    currentYear,
    String(Number(currentYear) + 1),
    ...selectedYears,
  ]);
  entries.forEach((entry) => years.add(entry.competence.slice(0, 4)));
  return Array.from(years).sort();
}

function buildSelectablePeriods(type: AnalysisType, years: string[], entries: DreEntryWithModel[]): SelectablePeriod[] {
  if (type === "monthly") {
    const entryCompetences = new Set(entries.map((entry) => entry.competence));
    return years.flatMap((year) => Array.from({ length: 12 }, (_, index) => {
      const competence = `${year}-${String(index + 1).padStart(2, "0")}`;
      return { id: competence, label: formatCompetence(competence), year, months: [competence] };
    })).filter((period) => entryCompetences.has(period.id));
  }

  if (type === "quarterly") {
    return years.flatMap((year) => [0, 1, 2, 3].map((quarter) => {
      const startMonth = quarter * 3 + 1;
      const months = [0, 1, 2].map((offset) => `${year}-${String(startMonth + offset).padStart(2, "0")}`);
      return { id: `${year}-Q${quarter + 1}`, label: `${quarter + 1}o Tri/${year}`, year, months };
    }));
  }

  return years.flatMap((year) => [0, 1].map((semester) => {
    const startMonth = semester * 6 + 1;
    const months = Array.from({ length: 6 }, (_, offset) => `${year}-${String(startMonth + offset).padStart(2, "0")}`);
    return { id: `${year}-S${semester + 1}`, label: `${semester + 1}o Sem/${year}`, year, months };
  }));
}

function buildComparison(periods: SelectablePeriod[], entries: DreEntryWithItems[]): AnalysisResult {
  const entriesByCompetence = new Map(entries.map((entry) => [entry.competence, entry]));
  const comparisonPeriods = periods.map((period) => buildComparisonPeriod(period, entriesByCompetence));
  const rows = buildComparisonRows(comparisonPeriods);
  const revenue = comparisonPeriods.reduce((sum, period) => sum + period.totals.revenue, 0);
  const totalCredit = comparisonPeriods.reduce((sum, period) => sum + period.totals.totalCredit, 0);
  const totalDebit = comparisonPeriods.reduce((sum, period) => sum + period.totals.totalDebit, 0);
  const result = comparisonPeriods.reduce((sum, period) => sum + period.totals.result, 0);
  const averageMargin = comparisonPeriods.length ? comparisonPeriods.reduce((sum, period) => sum + period.totals.marginPercentage, 0) / comparisonPeriods.length : 0;
  const best = [...comparisonPeriods].sort((a, b) => b.totals.result - a.totals.result)[0];
  const worst = [...comparisonPeriods].sort((a, b) => a.totals.result - b.totals.result)[0];

  return {
    periods: comparisonPeriods,
    rows,
    summary: {
      totalCredit,
      revenue,
      totalDebit,
      result,
      averageMargin,
      bestPeriod: best?.label ?? "-",
      worstPeriod: worst?.label ?? "-",
    },
  };
}

function buildComparisonPeriod(period: SelectablePeriod, entriesByCompetence: Map<string, DreEntryWithItems>): ComparisonPeriod {
  const entries = period.months.map((month) => entriesByCompetence.get(month)).filter((entry): entry is DreEntryWithItems => Boolean(entry));
  const subcategoryValues = new Map<string, { value: number; categoryType: DreCategoryType }>();

  entries.forEach((entry) => {
    entry.items.filter((item) => item.line_type === "subcategory").forEach((item) => {
      const itemCategoryType = effectiveCategoryType({ categoryType: item.category_type_snapshot, subcategoryIsReductive: item.subcategory_is_reductive ?? false });
      const key = subcategoryKey(itemCategoryType, item.category_name_snapshot, item.subcategory_name_snapshot ?? "");
      const current = subcategoryValues.get(key) ?? { value: 0, categoryType: itemCategoryType };
      current.value += Number(item.value || 0);
      subcategoryValues.set(key, current);
    });
  });

  const values = new Map<string, number>();
  subcategoryValues.forEach((item, key) => {
    values.set(key, item.value);
    const [, categoryType, categoryName] = key.split("::");
    const category = categoryKey(categoryType as DreCategoryType, categoryName);
    values.set(category, (values.get(category) ?? 0) + item.value);
  });

  const linesForTotals = Array.from(subcategoryValues.values()).map((item) => ({ lineType: "subcategory" as const, categoryType: item.categoryType, value: item.value }));
  const totals = calculateDreTotals(linesForTotals);
  const revenue = entries.reduce((sum, entry) => sum + calculateRevenueFromEntryItems(entry.items), 0);
  const netIncome = entries.reduce((sum, entry) => sum + calculateNetIncomeFromEntryItems(entry.items, entry.result), 0);
  values.set("total-credit", revenue);
  values.set("total-debit", totals.totalDebit);
  values.set("result", netIncome);
  values.set("margin", revenue > 0 ? (netIncome / revenue) * 100 : totals.marginPercentage);

  return {
    ...period,
    entries,
    values,
    totals: {
      revenue,
      totalCredit: totals.totalCredit,
      totalDebit: totals.totalDebit,
      result: netIncome,
      marginPercentage: revenue > 0 ? (netIncome / revenue) * 100 : totals.marginPercentage,
    },
    missingMonths: period.months.filter((month) => !entriesByCompetence.has(month)),
  };
}

function buildComparisonRows(periods: ComparisonPeriod[]) {
  const rows = new Map<string, ComparisonRow>();

  periods.forEach((period, periodIndex) => {
    period.entries.forEach((entry) => {
      entry.items.filter((item) => item.line_type === "subcategory").forEach((item) => {
        const itemCategoryType = effectiveCategoryType({ categoryType: item.category_type_snapshot, subcategoryIsReductive: item.subcategory_is_reductive ?? false });
        const category = categoryKey(itemCategoryType, item.category_name_snapshot);
        if (!rows.has(category)) {
          rows.set(category, {
            key: category,
            label: item.category_name_snapshot,
            lineType: "category",
            categoryType: itemCategoryType,
            displayOrder: periodIndex * 100000 + item.display_order,
          });
        }

        if (item.line_type === "subcategory" && item.subcategory_name_snapshot) {
          const subcategory = subcategoryKey(itemCategoryType, item.category_name_snapshot, item.subcategory_name_snapshot);
          if (!rows.has(subcategory)) {
            rows.set(subcategory, {
              key: subcategory,
              label: item.subcategory_name_snapshot,
              lineType: "subcategory",
              categoryType: itemCategoryType,
              parentKey: category,
              displayOrder: periodIndex * 100000 + item.display_order,
            });
          }
        }
      });
    });
  });

  return [
    ...Array.from(rows.values()).sort((a, b) => a.displayOrder - b.displayOrder),
    { key: "total-credit", label: "Faturamento", lineType: "total" as const, categoryType: "credit" as const, displayOrder: 900000 },
    { key: "total-debit", label: "Total de Debitos", lineType: "total" as const, categoryType: "debit" as const, displayOrder: 900001 },
    { key: "result", label: "Resultado", lineType: "total" as const, categoryType: "result" as const, displayOrder: 900002 },
    { key: "margin", label: "Margem de Lucro", lineType: "total" as const, categoryType: "margin" as const, displayOrder: 900003 },
  ];
}

function getRowValue(row: ComparisonRow, period: ComparisonPeriod) {
  return period.values.get(row.key) ?? 0;
}

function isGoodVariation(categoryType: ComparisonRow["categoryType"], difference: number) {
  if (difference === 0 || categoryType === "margin") return true;
  return categoryType === "credit" || categoryType === "result" ? difference > 0 : difference < 0;
}

function categoryKey(categoryType: DreCategoryType, categoryName: string) {
  return `cat::${categoryType}::${categoryName}`;
}

function subcategoryKey(categoryType: DreCategoryType, categoryName: string, subcategoryName: string) {
  return `sub::${categoryType}::${categoryName}::${subcategoryName}`;
}

function groupPeriodsByYear(periods: SelectablePeriod[]) {
  return periods.reduce<Record<string, SelectablePeriod[]>>((acc, period) => {
    acc[period.year] = [...(acc[period.year] ?? []), period];
    return acc;
  }, {});
}

function exportAnalysisPdf(result: AnalysisResult, showVariation: boolean) {
  const reportWindow = window.open("", "_blank", "width=1100,height=800");
  if (!reportWindow) {
    toast.error("Nao foi possivel abrir a janela de exportacao.");
    return;
  }

  const generatedAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date());
  reportWindow.document.write(`
    <!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>Analise de DRE</title>
    <style>
      @page { size: A4 landscape; margin: 12mm; }
      body { font-family: Inter, Arial, sans-serif; color: #172033; margin: 0; }
      h1 { color: #0f2b46; margin: 0; } .eyebrow { color: #b45309; font-size: 11px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; }
      .header { display:flex; justify-content:space-between; gap:20px; border-bottom:3px solid #0f2b46; padding-bottom:14px; margin-bottom:18px; }
      .cards { display:grid; grid-template-columns: repeat(6, 1fr); gap:8px; margin-bottom:18px; }
      .card { border:1px solid #dbe3ef; border-radius:8px; padding:10px; } .card span { display:block; color:#64748b; font-size:10px; margin-bottom:6px; } .card strong { font-size:13px; }
      table { width:100%; border-collapse:collapse; font-size:10px; } th { background:#0f2b46; color:#fff; padding:7px; text-align:right; } th:first-child, td:first-child { text-align:left; }
      td { border-bottom:1px solid #e2e8f0; padding:7px; text-align:right; } .cat, .total { font-weight:700; background:#f1f5f9; } .sub td:first-child { padding-left:22px; }
      .positive { color:#047857; } .negative { color:#b91c1c; } .meta { color:#64748b; font-size:11px; text-align:right; }
    </style></head><body>
      <section class="header"><div><p class="eyebrow">Gestor de DRE</p><h1>Analise Comparativa de DRE</h1></div><div class="meta">Gerado em ${escapeHtml(generatedAt)}<br />Periodos: ${escapeHtml(result.periods.map((period) => period.label).join(", "))}</div></section>
      <section class="cards">
        ${reportCard("Faturamento", formatCurrency(result.summary.revenue))}
        ${reportCard("Debitos", formatCurrency(result.summary.totalDebit))}
        ${reportCard("Resultado", formatCurrency(result.summary.result), result.summary.result >= 0 ? "positive" : "negative")}
        ${reportCard("Margem media", formatPercentage(result.summary.averageMargin))}
        ${reportCard("Melhor periodo", result.summary.bestPeriod)}
        ${reportCard("Pior periodo", result.summary.worstPeriod)}
      </section>
      ${comparisonTableHtml(result, showVariation)}
      <script>window.onload = () => { window.focus(); window.print(); };</script>
    </body></html>
  `);
  reportWindow.document.close();
}

function exportAnalysisExcel(result: AnalysisResult, showVariation: boolean) {
  const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body>${comparisonTableHtml(result, showVariation)}</body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "analise-dre.xls";
  link.click();
  URL.revokeObjectURL(url);
}

function comparisonTableHtml(result: AnalysisResult, showVariation: boolean) {
  return `<table><thead><tr><th>Categoria / Subcategoria</th>${result.periods.map((period, index) => `<th>${escapeHtml(period.label)}</th>${showVariation && index > 0 ? "<th>Var. anterior</th>" : ""}`).join("")}</tr></thead><tbody>
    ${result.rows.map((row) => `<tr class="${row.lineType === "category" ? "cat" : row.lineType === "subcategory" ? "sub" : "total"}"><td>${escapeHtml(row.label)}</td>${result.periods.map((period, index) => {
      const current = getRowValue(row, period);
      const previous = index > 0 ? getRowValue(row, result.periods[index - 1]) : 0;
      const variation = current - previous;
      return `<td>${row.categoryType === "margin" ? formatPercentage(current) : formatCurrency(current)}</td>${showVariation && index > 0 ? `<td class="${isGoodVariation(row.categoryType, variation) ? "positive" : "negative"}">${formatCurrency(variation)} / ${formatPercentage(variationPercentage(previous, current))}</td>` : ""}`;
    }).join("")}</tr>`).join("")}
  </tbody></table>`;
}

function reportCard(label: string, value: string, tone = "") {
  return `<div class="card"><span>${escapeHtml(label)}</span><strong class="${tone}">${escapeHtml(value)}</strong></div>`;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
