import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { BarChart2, ChevronDown, Download, FileSpreadsheet, Minus, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { DreLayout } from "@/components/dre/dre-layout";
import { IndicatorCard, formatCurrency } from "@/components/dre/dre-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCompetence, formatPercentage, variationPercentage } from "@/lib/dre-calculations";
import {
  buildDreAnalysisFromModel,
  buildSelectableDreAnalysisPeriods,
  dreAnalysisTableHtml,
  formatDreAnalysisRowLabel,
  isGoodDreAnalysisVariation,
  type DreAnalysisPeriod,
  type DreAnalysisPeriodInput,
  type DreAnalysisResult,
  type DreAnalysisRow,
  type DreAnalysisType,
} from "@/lib/dre-analysis";
import { getDreEntriesWithItems, getDreModelWithLines, listDreEntriesByModelAndYears, listDreModels } from "@/lib/dre-service";
import type { DreEntryWithModel, DreModel } from "@/types/dre";

type AnalysisType = DreAnalysisType;
type SelectablePeriod = DreAnalysisPeriodInput;
type AnalysisResult = DreAnalysisResult;

const DreAdvancedAnalysisModal = lazy(() =>
  import("@/components/dre/DreAdvancedAnalysisModal").then((module) => ({ default: module.DreAdvancedAnalysisModal })),
);

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
  const [showVerticalAnalysis, setShowVerticalAnalysis] = useState(false);
  const [availableEntries, setAvailableEntries] = useState<DreEntryWithModel[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAdvancedAnalysis, setShowAdvancedAnalysis] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<"pdf" | "pdf-synthetic" | "excel" | null>(null);

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
  const selectablePeriods = useMemo(() => buildSelectableDreAnalysisPeriods(analysisType, years, availableEntries.map((entry) => entry.competence)), [analysisType, availableEntries, years]);
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
      const entryIds = selectedPeriods.flatMap((period) => period.months)
        .map((competence) => availableEntries.find((entry) => entry.competence === competence))
        .filter((entry): entry is DreEntryWithModel => Boolean(entry))
        .map((entry) => entry.id);
      const detailedEntries = await getDreEntriesWithItems(userId, entryIds);
      const model = await getDreModelWithLines(userId, modelId);
      setResult(buildDreAnalysisFromModel({ model, periods: selectedPeriods, entries: detailedEntries }));
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
    setShowVerticalAnalysis(false);
    setAvailableEntries([]);
    setSelectedIds([]);
    setResult(null);
  }

  async function runExport(format: "pdf" | "pdf-synthetic" | "excel") {
    if (!result || exportingFormat) return;
    setExportingFormat(format);
    try {
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => {
          if (format === "pdf") exportAnalysisPdf(result, showVariation, showVerticalAnalysis);
          if (format === "pdf-synthetic") exportAnalysisPdfSynthetic(result, showVariation, showVerticalAnalysis);
          if (format === "excel") exportAnalysisExcel(result, showVariation, showVerticalAnalysis);
          resolve();
        });
      });
    } finally {
      setExportingFormat(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Analise de DRE</h1>
        <p className="mt-1 text-sm text-muted-foreground">Compare DREs por mes, trimestre ou semestre usando a estrutura historica salva nos lancamentos.</p>
      </div>

      <Card className="border-primary/10 bg-white/90">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Filtros da analise</CardTitle>
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            onClick={clearFilters}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Limpar filtros
          </button>
        </CardHeader>
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

          <div className="space-y-3">
            <div>
              <Label>Ano(s)</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {availableYears.map((year) => (
                  <label key={year} className="flex cursor-pointer items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm">
                    <Checkbox checked={years.includes(year)} onCheckedChange={(checked) => toggleYear(year, Boolean(checked))} />
                    {year}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border bg-white px-4 py-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Switch checked={includeDrafts} onCheckedChange={setIncludeDrafts} />
                <span>Incluir DREs em rascunho</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Switch checked={showVariation} onCheckedChange={setShowVariation} />
                <span>Exibir variacao entre periodos</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Switch checked={showVerticalAnalysis} onCheckedChange={setShowVerticalAnalysis} />
                <span>Analise vertical</span>
              </label>
            </div>
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

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" disabled={!result} className="gap-1">
                  <Download className="h-4 w-4" />
                  Exportar
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled={Boolean(exportingFormat)} onClick={() => void runExport("pdf")}>
                  <Download className="h-4 w-4" />{exportingFormat === "pdf" ? "Gerando PDF..." : "Exportar PDF (Analitica)"}
                </DropdownMenuItem>
                <DropdownMenuItem disabled={Boolean(exportingFormat)} onClick={() => void runExport("pdf-synthetic")}>
                  <Download className="h-4 w-4" />{exportingFormat === "pdf-synthetic" ? "Gerando PDF..." : "Exportar PDF (Sintetica)"}
                </DropdownMenuItem>
                <DropdownMenuItem disabled={Boolean(exportingFormat)} onClick={() => void runExport("excel")}>
                  <FileSpreadsheet className="h-4 w-4" />{exportingFormat === "excel" ? "Gerando Excel..." : "Exportar Excel"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" disabled={!result} onClick={() => setShowAdvancedAnalysis(true)}>
              <BarChart2 className="h-4 w-4" />Analise Detalhada
            </Button>
            <Button disabled={!canGenerate || loading} onClick={() => void generateAnalysis()}>
              {loading ? "Gerando..." : "Gerar Analise"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {showAdvancedAnalysis && result ? (
        <Suspense fallback={null}>
          <DreAdvancedAnalysisModal
            result={result}
            modelName={models.find((m) => m.id === modelId)?.name ?? ""}
            onClose={() => setShowAdvancedAnalysis(false)}
          />
        </Suspense>
      ) : null}

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

          <ComparisonTable result={result} showVariation={showVariation} showVerticalAnalysis={showVerticalAnalysis} />
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

function ComparisonTable({ result, showVariation, showVerticalAnalysis }: { result: AnalysisResult; showVariation: boolean; showVerticalAnalysis: boolean }) {
  const categoryKeys = useMemo(
    () => result.rows
      .filter((row) => row.lineType === "category" && result.rows.some((candidate) => candidate.lineType === "subcategory" && candidate.parentKey === row.key))
      .map((row) => row.key),
    [result.rows],
  );
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());
  const allExpanded = categoryKeys.length > 0 && expandedKeys.size === categoryKeys.length;
  const visibleRows = useMemo(
    () => result.rows.filter((row) => row.lineType !== "subcategory" || Boolean(row.parentKey && expandedKeys.has(row.parentKey))),
    [expandedKeys, result.rows],
  );

  useEffect(() => {
    setExpandedKeys(new Set());
  }, [result]);

  function toggleCategory(categoryKey: string) {
    setExpandedKeys((current) => {
      const next = new Set(current);
      if (next.has(categoryKey)) {
        next.delete(categoryKey);
      } else {
        next.add(categoryKey);
      }
      return next;
    });
  }

  function toggleAllCategories() {
    setExpandedKeys(allExpanded ? new Set() : new Set(categoryKeys));
  }

  return (
    <Card className="border-primary/10 bg-white/90">
      <CardHeader><CardTitle>Tabela Comparativa</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <Table className="min-w-[920px]">
          <TableHeader className="sticky top-0 z-10 bg-white">
            <TableRow>
              <TableHead className="sticky left-0 z-20 min-w-72 bg-white">
                <div className="flex items-center gap-2">
                  <span>Categoria / Subcategoria</span>
                  <button
                    type="button"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onClick={toggleAllCategories}
                    aria-label={allExpanded ? "Recolher todas as subcategorias" : "Expandir todas as subcategorias"}
                    title={allExpanded ? "Recolher todas" : "Expandir todas"}
                  >
                    {allExpanded ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </TableHead>
              {result.periods.map((period, index) => (
                <ColumnHeaders key={period.id} period={period} index={index} showVariation={showVariation} />
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((row) => (
              <TableRow key={row.key} className={row.lineType === "category" ? "bg-muted/70" : row.isNetIncome ? "bg-primary/10" : row.isSumLine ? "bg-primary/5" : ""}>
                <TableCell className={`sticky left-0 z-10 bg-inherit ${row.level === 1 ? "pl-10 text-sm" : "font-semibold"} ${row.isNetIncome ? "text-primary" : ""}`}>
                  <div className="flex items-center gap-2">
                    {categoryKeys.includes(row.key) ? (
                      <button
                        type="button"
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                        onClick={() => toggleCategory(row.key)}
                        aria-label={expandedKeys.has(row.key) ? `Recolher subcategorias de ${row.label}` : `Expandir subcategorias de ${row.label}`}
                        title={expandedKeys.has(row.key) ? "Recolher subcategorias" : "Expandir subcategorias"}
                      >
                        {expandedKeys.has(row.key) ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      </button>
                    ) : row.lineType === "category" ? <span className="h-6 w-6 shrink-0" /> : null}
                    <span>{formatDreAnalysisRowLabel(row)}</span>
                  </div>
                  {row.isNetIncome ? <Badge className="ml-2" variant="secondary">LUCRO LÍQUIDO</Badge> : null}
                </TableCell>
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
                      showVerticalAnalysis={showVerticalAnalysis}
                      verticalPercentage={getRowVerticalPercentage(row, period)}
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

function ColumnHeaders({ period, index, showVariation }: { period: DreAnalysisPeriod; index: number; showVariation: boolean }) {
  return (
    <>
      <TableHead className="min-w-36 text-right">{period.label}</TableHead>
      {showVariation && index > 0 ? <TableHead className="min-w-44 text-right">Var. anterior</TableHead> : null}
    </>
  );
}

function ValueCells({
  row,
  value,
  variation,
  previous,
  showVariation,
  showVerticalAnalysis,
  verticalPercentage,
}: {
  row: DreAnalysisRow;
  value: number;
  variation: number;
  previous: number;
  showVariation: boolean;
  showVerticalAnalysis: boolean;
  verticalPercentage: number;
}) {
  const formatted = row.categoryType === "margin" ? formatPercentage(value) : formatCurrency(value);
  const variationClass = variation === 0 ? "text-muted-foreground" : isGoodDreAnalysisVariation(row.categoryType, variation) ? "text-emerald-700" : "text-red-700";
  return (
    <>
      <TableCell className={`text-right font-medium tabular-nums ${row.categoryType === "result" ? value >= 0 ? "text-emerald-700" : "text-red-700" : ""}`}>
        <span>{formatted}</span>
        {showVerticalAnalysis && row.categoryType !== "margin" ? <span className="mt-1 block text-xs font-semibold text-muted-foreground">{formatPercentage(verticalPercentage)}</span> : null}
      </TableCell>
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

function getRowValue(row: DreAnalysisRow, period: DreAnalysisPeriod) {
  return row.values[period.id]?.amount ?? 0;
}

function getRowVerticalPercentage(row: DreAnalysisRow, period: DreAnalysisPeriod) {
  return row.values[period.id]?.verticalPercentage ?? 0;
}

function groupPeriodsByYear(periods: SelectablePeriod[]) {
  return periods.reduce<Record<string, SelectablePeriod[]>>((acc, period) => {
    acc[period.year] = [...(acc[period.year] ?? []), period];
    return acc;
  }, {});
}

function exportAnalysisPdf(result: AnalysisResult, showVariation: boolean, showVerticalAnalysis: boolean) {
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
      ${dreAnalysisTableHtml(result, showVariation, showVerticalAnalysis)}
      <script>window.onload = () => { window.focus(); window.print(); };</script>
    </body></html>
  `);
  reportWindow.document.close();
}

function exportAnalysisPdfSynthetic(result: AnalysisResult, showVariation: boolean, showVerticalAnalysis: boolean) {
  const syntheticResult = { ...result, rows: result.rows.filter((row) => row.lineType !== "subcategory") };
  const reportWindow = window.open("", "_blank", "width=1100,height=800");
  if (!reportWindow) {
    toast.error("Nao foi possivel abrir a janela de exportacao.");
    return;
  }

  const generatedAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date());
  reportWindow.document.write(`
    <!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>Analise de DRE (Sintetica)</title>
    <style>
      @page { size: A4 landscape; margin: 12mm; }
      body { font-family: Inter, Arial, sans-serif; color: #172033; margin: 0; }
      h1 { color: #0f2b46; margin: 0; } .eyebrow { color: #b45309; font-size: 11px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; }
      .header { display:flex; justify-content:space-between; gap:20px; border-bottom:3px solid #0f2b46; padding-bottom:14px; margin-bottom:18px; }
      .cards { display:grid; grid-template-columns: repeat(6, 1fr); gap:8px; margin-bottom:18px; }
      .card { border:1px solid #dbe3ef; border-radius:8px; padding:10px; } .card span { display:block; color:#64748b; font-size:10px; margin-bottom:6px; } .card strong { font-size:13px; }
      table { width:100%; border-collapse:collapse; font-size:10px; } th { background:#0f2b46; color:#fff; padding:7px; text-align:right; } th:first-child, td:first-child { text-align:left; }
      td { border-bottom:1px solid #e2e8f0; padding:7px; text-align:right; } .cat, .total { font-weight:700; background:#f1f5f9; }
      .positive { color:#047857; } .negative { color:#b91c1c; } .meta { color:#64748b; font-size:11px; text-align:right; }
    </style></head><body>
      <section class="header"><div><p class="eyebrow">Gestor de DRE</p><h1>Analise Comparativa de DRE (Sintetica)</h1></div><div class="meta">Gerado em ${escapeHtml(generatedAt)}<br />Periodos: ${escapeHtml(result.periods.map((period) => period.label).join(", "))}</div></section>
      <section class="cards">
        ${reportCard("Faturamento", formatCurrency(result.summary.revenue))}
        ${reportCard("Debitos", formatCurrency(result.summary.totalDebit))}
        ${reportCard("Resultado", formatCurrency(result.summary.result), result.summary.result >= 0 ? "positive" : "negative")}
        ${reportCard("Margem media", formatPercentage(result.summary.averageMargin))}
        ${reportCard("Melhor periodo", result.summary.bestPeriod)}
        ${reportCard("Pior periodo", result.summary.worstPeriod)}
      </section>
      ${dreAnalysisTableHtml(syntheticResult, showVariation, showVerticalAnalysis)}
      <script>window.onload = () => { window.focus(); window.print(); };</script>
    </body></html>
  `);
  reportWindow.document.close();
}

function exportAnalysisExcel(result: AnalysisResult, showVariation: boolean, showVerticalAnalysis: boolean) {
  const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body>${dreAnalysisTableHtml(result, showVariation, showVerticalAnalysis)}</body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "analise-dre.xls";
  link.click();
  URL.revokeObjectURL(url);
}

function reportCard(label: string, value: string, tone = "") {
  return `<div class="card"><span>${escapeHtml(label)}</span><strong class="${tone}">${escapeHtml(value)}</strong></div>`;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
