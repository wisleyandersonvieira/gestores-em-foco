import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import type React from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { TooltipProps } from "recharts";
import { ArrowDown, ArrowUp, Download } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

import { DreLayout } from "@/components/dre/dre-layout";
import { CompetenceMultiFilter, formatCurrency } from "@/components/dre/dre-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { buildDreAnalysisFromModel, type DreAnalysisResult } from "@/lib/dre-analysis";
import { exportDashboardDrePdf } from "@/lib/dre-dashboard-pdf";
import { calculateEffectiveTotalsFromEntryItems, currentCompetence, formatCompetence, formatPercentage } from "@/lib/dre-calculations";
import { generateAdvancedDreAnalysis, type AdvancedAlert, type AdvancedDreAnalysis, type AlertLevel } from "@/lib/dre-advanced-analysis";
import { getDreEntriesWithItems, getDreModelWithLines, listDreEntries } from "@/lib/dre-service";
import type { DreEntryWithItems, DreEntryWithModel, DreModelWithLines } from "@/types/dre";

type DashboardChartPoint = {
  period: string;
  revenue: number;
  netIncome: number;
  margin: number;
};

const DreAdvancedAnalysisModal = lazy(() =>
  import("@/components/dre/DreAdvancedAnalysisModal").then((module) => ({ default: module.DreAdvancedAnalysisModal })),
);

export default function DreDashboardPage() {
  return <DreLayout>{(user) => <DreDashboardContent userId={user.id} />}</DreLayout>;
}

function DreDashboardContent({ userId }: { userId: string }) {
  const [selectedCompetences, setSelectedCompetences] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const lastMonth = Math.max(1, now.getMonth());
    return Array.from({ length: lastMonth }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  });
  const [entries, setEntries] = useState<DreEntryWithModel[]>([]);
  const [entriesWithItems, setEntriesWithItems] = useState<DreEntryWithItems[]>([]);
  const [model, setModel] = useState<DreModelWithLines | null>(null);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [showAdvancedAnalysis, setShowAdvancedAnalysis] = useState(false);

  useEffect(() => {
    setIsLoadingEntries(true);
    void listDreEntries(userId)
      .then(setEntries)
      .catch((error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel carregar dashboard."))
      .finally(() => setIsLoadingEntries(false));
  }, [userId]);

  const selectedEntries = useMemo(
    () => entries.filter((entry) => selectedCompetences.includes(entry.competence) && entry.status === "finalized"),
    [entries, selectedCompetences],
  );

  const primaryModelId = useMemo(() => {
    const sorted = [...selectedEntries].sort((a, b) => b.competence.localeCompare(a.competence));
    return sorted[0]?.model_id ?? "";
  }, [selectedEntries]);

  const selectedEntriesForModel = useMemo(
    () => selectedEntries.filter((entry) => entry.model_id === primaryModelId).sort((a, b) => a.competence.localeCompare(b.competence)),
    [primaryModelId, selectedEntries],
  );

  useEffect(() => {
    setEntriesWithItems([]);
    if (selectedEntriesForModel.length === 0) return;

    async function loadItems() {
      const detailed = await getDreEntriesWithItems(userId, selectedEntriesForModel.map((entry) => entry.id));
      setEntriesWithItems(detailed.sort((a, b) => a.competence.localeCompare(b.competence)));
    }

    void loadItems().catch(() => setEntriesWithItems([]));
  }, [selectedEntriesForModel, userId]);

  useEffect(() => {
    setModel(null);
    if (!primaryModelId) return;

    void getDreModelWithLines(userId, primaryModelId)
      .then(setModel)
      .catch((error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel carregar o modelo do dashboard."));
  }, [primaryModelId, userId]);

  const fallbackTotals = useMemo(() => {
    const effectiveTotals = entriesWithItems.map((entry) => calculateEffectiveTotalsFromEntryItems(entry.items));
    const revenue = effectiveTotals.reduce((sum, entryTotals) => sum + entryTotals.totalCredit, 0);
    const result = effectiveTotals.reduce((sum, entryTotals) => sum + entryTotals.result, 0);
    const margin = revenue > 0 ? (result / revenue) * 100 : 0;
    return { revenue, result, margin };
  }, [entriesWithItems]);

  const analysisResult = useMemo<DreAnalysisResult | null>(() => {
    if (!model || entriesWithItems.length === 0) return null;
    const periods = entriesWithItems.map((entry) => ({
      id: entry.competence,
      label: formatCompetence(entry.competence),
      year: entry.competence.slice(0, 4),
      months: [entry.competence],
    }));
    return buildDreAnalysisFromModel({ model, periods, entries: entriesWithItems });
  }, [entriesWithItems, model]);

  const advancedAnalysis = useMemo<AdvancedDreAnalysis | null>(() => {
    if (!analysisResult || !model) return null;
    return generateAdvancedDreAnalysis(analysisResult, { modelName: model.name });
  }, [analysisResult, model]);

  const hasSinglePeriod = (advancedAnalysis?.metadata.periods_count ?? entriesWithItems.length) <= 1;
  const indicators = advancedAnalysis?.indicators;
  const revenueValue = indicators?.revenue.value ?? fallbackTotals.revenue;
  const netProfitValue = indicators?.net_profit.fallbackMessage ? fallbackTotals.result : indicators?.net_profit.value ?? fallbackTotals.result;
  const netMarginValue = indicators?.net_margin.fallbackMessage ? fallbackTotals.margin : indicators?.net_margin.value ?? fallbackTotals.margin;
  const grossMarginUnavailable = Boolean(indicators?.gross_margin.fallbackMessage);
  const operationalEfficiency = revenueValue > 0 ? Math.round((netProfitValue / revenueValue) * 100) : 0;

  const chartData = useMemo<DashboardChartPoint[]>(() => {
    if (advancedAnalysis) {
      return advancedAnalysis.charts_data.revenue_vs_expenses.map((point, index) => ({
        period: point.period,
        revenue: point.revenue,
        netIncome: point.net_income,
        margin: advancedAnalysis.margins.net[index]?.value ?? 0,
      }));
    }

    return entriesWithItems.map((entry) => {
      const totals = calculateEffectiveTotalsFromEntryItems(entry.items);
      const revenue = totals.totalCredit;
      const netIncome = totals.result;
      return {
        period: formatCompetence(entry.competence),
        revenue,
        netIncome,
        margin: revenue > 0 ? (netIncome / revenue) * 100 : 0,
      };
    });
  }, [advancedAnalysis, entriesWithItems]);

  const analyzedPeriod = chartData[0];
  const topAlerts = useMemo(() => {
    const levelOrder: Record<AlertLevel, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return [...(advancedAnalysis?.alerts ?? [])]
      .sort((a, b) => {
        if (levelOrder[a.level] !== levelOrder[b.level]) return levelOrder[a.level] - levelOrder[b.level];
        return Math.abs(b.impact_value) - Math.abs(a.impact_value);
      })
      .slice(0, 3);
  }, [advancedAnalysis]);

  const modelNotice = selectedEntries.length > selectedEntriesForModel.length
    ? "O dashboard considera o modelo mais recente entre as competencias selecionadas para manter consistencia com a analise detalhada."
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Indicadores acionáveis dos DREs finalizados nas competências selecionadas.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            if (!entriesWithItems.length) {
              toast.error("Nao ha dados suficientes para gerar o PDF com os filtros selecionados.");
              return;
            }
            exportDashboardDrePdf({
              selectedCompetences,
              modelName: model?.name ?? null,
              revenueValue,
              netProfitValue,
              netMarginValue,
              grossMarginValue: indicators?.gross_margin.value ?? null,
              grossMarginUnavailable,
              indicators: indicators ?? null,
              operationalEfficiency,
              hasSinglePeriod,
              analyzedPeriodLabel: analyzedPeriod?.period ?? null,
              analyzedPeriodMargin: analyzedPeriod?.margin ?? null,
              chartData,
              alerts: advancedAnalysis?.alerts ?? [],
              advancedAnalysis,
            });
          }}
        >
          <Download className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      {!isLoadingEntries && entries.length === 0 ? (
        <Card className="border-primary/10 bg-white/90">
          <CardContent className="flex flex-col gap-5 p-6 sm:items-start">
            <div>
              <h2 className="font-display text-2xl font-semibold">Seu modelo de DRE já está pronto</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Criamos uma estrutura gerencial padrão para você começar. Agora basta lançar os valores da competência desejada.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/dre-facil/cadastrar">Lançar primeira DRE</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/dre-facil/modelos">Editar modelo</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/dre-facil/categorias">Ver categorias</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-primary/10 bg-white/90">
        <CardContent className="grid gap-2 p-5 sm:max-w-sm">
          <CompetenceMultiFilter selected={selectedCompetences} onChange={(items) => setSelectedCompetences(items.length ? items : [currentCompetence()])} />
          {modelNotice ? <p className="text-xs text-amber-700">{modelNotice}</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Faturamento"
          value={formatCurrency(revenueValue)}
          detail={<VariationDetail variation={hasSinglePeriod ? null : indicators?.revenue.variation ?? null} />}
        />
        <MetricCard
          title="Lucro Líquido"
          value={formatCurrency(netProfitValue)}
          valueTone={netProfitValue >= 0 ? "positive" : "negative"}
          detail={<VariationDetail variation={hasSinglePeriod ? null : indicators?.net_profit.variation ?? null} />}
        />
        <MetricCard
          title="Margem de Lucro"
          value={formatPercentage(netMarginValue)}
          detail={indicators?.net_margin.level ? levelBadge(indicators.net_margin.level) : <span className="text-muted-foreground">—</span>}
        />
        <MetricCard
          title="Margem Bruta"
          value={grossMarginUnavailable ? "—" : formatPercentage(indicators?.gross_margin.value ?? 0)}
          detail={grossMarginUnavailable ? <span className="text-amber-700">Ajuste o modelo de DRE</span> : indicators?.gross_margin.level ? levelBadge(indicators.gross_margin.level) : <span className="text-muted-foreground">—</span>}
        />
      </div>

      <div className={`grid gap-4 ${hasSinglePeriod ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
        <MetricCard
          title="Eficiência operacional"
          value={`De cada R$ 100 faturados, R$ ${operationalEfficiency} chegam ao lucro`}
          compact
        />
        {hasSinglePeriod ? (
          <MetricCard
            title="Período analisado"
            value={analyzedPeriod ? `${analyzedPeriod.period} · ${formatPercentage(analyzedPeriod.margin)}` : "—"}
            compact
          />
        ) : (
          <>
            <MetricCard
              title="Melhor mês"
              value={indicators?.best_period.fallbackMessage ? "—" : `${indicators?.best_period.period ?? "—"} · ${formatPercentage(indicators?.best_period.margin ?? 0)}`}
              compact
            />
            <MetricCard
              title="Pior mês"
              value={indicators?.worst_period.fallbackMessage ? "—" : `${indicators?.worst_period.period ?? "—"} · ${formatPercentage(indicators?.worst_period.margin ?? 0)}`}
              compact
            />
          </>
        )}
      </div>

      <ChartCard title="Evolução da margem de lucro">
        {chartData.length === 0 ? (
          <EmptyState>Sem dados finalizados para exibir a evolução.</EmptyState>
        ) : hasSinglePeriod ? (
          <ChartContainer className="aspect-auto h-[150px] w-full sm:h-[200px]" config={{ margin: { label: "Margem", color: "#0f2b46" } }}>
            <BarChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="period" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(value) => `${Number(value).toFixed(0)}%`} width={42} />
              <ChartTooltip content={<MarginTooltip />} />
              <Bar dataKey="margin" fill="var(--color-margin)" radius={6} />
            </BarChart>
          </ChartContainer>
        ) : (
          <ChartContainer className="aspect-auto h-[150px] w-full sm:h-[200px]" config={{ margin: { label: "Margem", color: "#0f2b46" } }}>
            <AreaChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="marginGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-margin)" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="var(--color-margin)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="period" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(value) => `${Number(value).toFixed(0)}%`} width={42} />
              <ChartTooltip content={<MarginTooltip />} />
              <Area type="monotone" dataKey="margin" stroke="var(--color-margin)" strokeWidth={2.5} fill="url(#marginGradient)" dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ChartContainer>
        )}
      </ChartCard>

      <ChartCard title="Alertas prioritários">
        {topAlerts.length === 0 ? (
          <EmptyState>Nenhum alerta identificado para os períodos selecionados.</EmptyState>
        ) : (
          <div className="space-y-3">
            {topAlerts.map((alert) => (
              <PriorityAlert key={alert.id} alert={alert} />
            ))}
          </div>
        )}
        <div className="mt-5 flex justify-center">
          <Button variant="link" disabled={!analysisResult} onClick={() => setShowAdvancedAnalysis(true)} className="px-0">
            Ver análise completa →
          </Button>
        </div>
      </ChartCard>

      {showAdvancedAnalysis && analysisResult && model ? (
        <Suspense fallback={null}>
          <DreAdvancedAnalysisModal
            result={analysisResult}
            modelName={model.name}
            onClose={() => setShowAdvancedAnalysis(false)}
          />
        </Suspense>
      ) : null}
    </div>
  );
}

function MetricCard({
  title,
  value,
  detail,
  valueTone = "neutral",
  compact = false,
}: {
  title: string;
  value: string;
  detail?: React.ReactNode;
  valueTone?: "neutral" | "positive" | "negative";
  compact?: boolean;
}) {
  const toneClass = valueTone === "positive" ? "text-emerald-700" : valueTone === "negative" ? "text-red-700" : "text-foreground";

  return (
    <Card className="border-primary/10 bg-white/90 shadow-sm">
      <CardHeader className="space-y-2 pb-3">
        <p className="text-sm text-muted-foreground">{title}</p>
        <CardTitle className={`${compact ? "text-lg leading-snug" : "text-xl sm:text-2xl"} ${toneClass}`}>{value}</CardTitle>
      </CardHeader>
      {detail ? <CardContent className="pt-0 text-xs">{detail}</CardContent> : null}
    </Card>
  );
}

function VariationDetail({ variation }: { variation: number | null }) {
  if (variation === null) return <span className="text-muted-foreground">—</span>;
  const isPositive = variation >= 0;
  const Icon = isPositive ? ArrowUp : ArrowDown;
  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${isPositive ? "text-emerald-700" : "text-red-700"}`}>
      <Icon className="h-3.5 w-3.5" />
      {isPositive ? "+" : ""}
      {formatPercentage(variation)}
    </span>
  );
}

function levelBadge(level: AlertLevel) {
  const map: Record<AlertLevel, { label: string; cls: string }> = {
    HIGH: { label: "ALTO", cls: "bg-red-100 text-red-800 border-red-200" },
    MEDIUM: { label: "MÉDIO", cls: "bg-amber-100 text-amber-800 border-amber-200" },
    LOW: { label: "BAIXO", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  };
  const item = map[level];
  return <Badge variant="outline" className={item.cls}>{item.label}</Badge>;
}

function PriorityAlert({ alert }: { alert: AdvancedAlert }) {
  const icon = alert.level === "HIGH" ? "🔴" : alert.level === "MEDIUM" ? "🟡" : "🟢";
  const levelLabel = alert.level === "HIGH" ? "ALTO" : alert.level === "MEDIUM" ? "MÉDIO" : "BAIXO";

  return (
    <div className="grid gap-1 rounded-lg border bg-white px-4 py-3 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-3">
      <span className="text-sm font-semibold">{icon} {levelLabel}</span>
      <p className="min-w-0 truncate font-medium">{alert.title}</p>
      <p className="text-sm text-muted-foreground sm:text-right">{alert.impact_description}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-primary/10 bg-white/90">
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">{children}</div>;
}

function MarginTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as DashboardChartPoint | undefined;
  if (!point) return null;

  return (
    <div className="grid min-w-48 gap-1.5 rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold">{point.period}</p>
      <p className="flex justify-between gap-4"><span className="text-muted-foreground">Faturamento</span><span className="font-mono">{formatCurrency(point.revenue)}</span></p>
      <p className="flex justify-between gap-4"><span className="text-muted-foreground">Lucro</span><span className="font-mono">{formatCurrency(point.netIncome)}</span></p>
      <p className="flex justify-between gap-4"><span className="text-muted-foreground">Margem</span><span className="font-mono">{formatPercentage(point.margin)}</span></p>
    </div>
  );
}

