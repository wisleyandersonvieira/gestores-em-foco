import { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  BarChart2,
  CheckCircle,
  Download,
  Info,
  Loader2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatPercentage } from "@/lib/dre-calculations";
import {
  generateAdvancedDreAnalysis,
  type AdvancedAlert,
  type AdvancedDreAnalysis,
  type AdvancedRecommendation,
  type AdvancedVariationItem,
  type AlertLevel,
} from "@/lib/dre-advanced-analysis";
import type { DreAnalysisResult } from "@/lib/dre-analysis";
import { exportAdvancedDrePdf } from "@/lib/dre-advanced-pdf";

// ── Color palette ──────────────────────────────────────────────────────────────

const COLORS = {
  revenue: "#059669",
  expense: "#dc2626",
  neutral: "#6b7280",
  primary: "#0f2b46",
  amber: "#d97706",
  blue: "#2563eb",
  purple: "#7c3aed",
  teal: "#0d9488",
};

const CHART_COLORS = [COLORS.primary, COLORS.revenue, COLORS.amber, COLORS.blue, COLORS.purple, COLORS.teal, "#f59e0b", "#8b5cf6"];

// ── Helpers ────────────────────────────────────────────────────────────────────

function levelBadge(level: AlertLevel, className = "") {
  const map: Record<AlertLevel, { label: string; cls: string }> = {
    HIGH: { label: "ALTO", cls: "bg-red-100 text-red-800 border-red-200" },
    MEDIUM: { label: "MÉDIO", cls: "bg-amber-100 text-amber-800 border-amber-200" },
    LOW: { label: "BAIXO", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  };
  const { label, cls } = map[level];
  return <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-semibold ${cls} ${className}`}>{label}</span>;
}

function trendIcon(trend: "up" | "down" | "stable", isGoodWhenUp = true) {
  if (trend === "stable") return <span className="text-muted-foreground">—</span>;
  const isPositive = trend === "up" ? isGoodWhenUp : !isGoodWhenUp;
  return trend === "up"
    ? <TrendingUp className={`h-4 w-4 ${isPositive ? "text-emerald-600" : "text-red-600"}`} />
    : <TrendingDown className={`h-4 w-4 ${isPositive ? "text-emerald-600" : "text-red-600"}`} />;
}

function variationDisplay(variation: number, isGoodWhenPositive = true) {
  if (variation === 0) return <span className="text-muted-foreground text-xs">—</span>;
  const isGood = isGoodWhenPositive ? variation > 0 : variation < 0;
  const cls = isGood ? "text-emerald-600" : "text-red-600";
  return <span className={`text-xs font-semibold ${cls}`}>{variation > 0 ? "+" : ""}{formatPercentage(variation)}</span>;
}

function fallbackText(message?: string) {
  if (!message) return null;
  return <p className="flex min-h-16 items-center justify-center text-center text-sm text-muted-foreground">{message}</p>;
}

function alertIcon(iconName: string) {
  const map: Record<string, React.ReactNode> = {
    TrendingUp: <TrendingUp className="h-5 w-5" />,
    TrendingDown: <TrendingDown className="h-5 w-5" />,
    AlertTriangle: <AlertTriangle className="h-5 w-5" />,
    AlertCircle: <AlertCircle className="h-5 w-5" />,
    CheckCircle: <CheckCircle className="h-5 w-5" />,
    Info: <Info className="h-5 w-5" />,
  };
  return map[iconName] ?? <Info className="h-5 w-5" />;
}

function timelineLabel(t: "short" | "medium" | "long") {
  return t === "short" ? "Curto prazo (1–3 meses)" : t === "medium" ? "Médio prazo (3–6 meses)" : "Longo prazo (6–12 meses)";
}

const chartTooltipStyle = { fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" };

// ── Indicator Card ─────────────────────────────────────────────────────────────

function AdvancedIndicatorCard({
  title,
  value,
  formatted,
  variation,
  level,
  trend,
  isGoodWhenUp = true,
  isEstimated = false,
  fallbackMessage,
}: {
  title: string;
  value: number;
  formatted: string;
  variation: number | null;
  level: AlertLevel | null;
  trend: "up" | "down" | "stable";
  isGoodWhenUp?: boolean;
  isEstimated?: boolean;
  fallbackMessage?: string;
}) {
  return (
    <Card className={`border-primary/10 bg-white shadow-sm ${fallbackMessage ? "opacity-70" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-muted-foreground leading-tight">
            {title}
            {isEstimated && !fallbackMessage ? <span className="ml-1 text-[10px] text-amber-600">(estimado)</span> : null}
          </p>
          {!fallbackMessage && level ? (
            <div className="flex items-center gap-1 shrink-0">
              {variation !== null ? trendIcon(trend, isGoodWhenUp) : null}
              {levelBadge(level)}
            </div>
          ) : null}
        </div>
        {fallbackMessage ? fallbackText(fallbackMessage) : (
          <>
            <p className={`mt-2 text-2xl font-bold tabular-nums ${value < 0 ? "text-red-700" : value > 0 ? "text-foreground" : "text-muted-foreground"}`}>
              {formatted}
            </p>
            <div className="mt-1">{variation !== null ? variationDisplay(variation, isGoodWhenUp) : null}</div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Section 1: Executive Summary ───────────────────────────────────────────────

function ExecutiveSummarySection({ data }: { data: AdvancedDreAnalysis }) {
  const { executive_summary: es } = data;
  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-primary/60 mb-3">Diagnóstico Executivo</p>
          <div className="space-y-4 text-sm leading-relaxed text-foreground">
            <div>
              <p className="font-semibold text-primary mb-1">Visão Geral</p>
              <p>{es.overview}</p>
            </div>
            <div>
              <p className="font-semibold text-primary mb-1">Principal Ponto de Atenção</p>
              <p>{es.main_concern}</p>
            </div>
            {es.causes.length > 0 && (
              <div>
                <p className="font-semibold text-primary mb-1">Causas Identificadas</p>
                <ul className="list-disc list-inside space-y-1">
                  {es.causes.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}
            <div>
              <p className="font-semibold text-primary mb-1">Impacto Quantificado</p>
              <p>{es.impact}</p>
            </div>
            <div>
              <p className="font-semibold text-primary mb-1">Direcionamento</p>
              <p>{es.direction}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-2 text-xs text-muted-foreground">
        <p>Modelo: <span className="font-medium text-foreground">{data.metadata.model_name}</span></p>
        <p>Períodos analisados: <span className="font-medium text-foreground">{data.metadata.periods_count}</span></p>
        <p>Gerado em: <span className="font-medium text-foreground">{data.metadata.generated_at.toLocaleString("pt-BR")}</span></p>
      </div>
    </div>
  );
}

// ── Section 2: Indicators ──────────────────────────────────────────────────────

function IndicatorsSection({ data }: { data: AdvancedDreAnalysis }) {
  const { indicators: ind } = data;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <AdvancedIndicatorCard title="Faturamento" value={ind.revenue.value} formatted={formatCurrency(ind.revenue.value)} variation={ind.revenue.variation} level={ind.revenue.level} trend={ind.revenue.trend} fallbackMessage={ind.revenue.fallbackMessage} />
        <AdvancedIndicatorCard title="Lucro Líquido" value={ind.net_profit.value} formatted={formatCurrency(ind.net_profit.value)} variation={ind.net_profit.variation} level={ind.net_profit.level} trend={ind.net_profit.trend} fallbackMessage={ind.net_profit.fallbackMessage} />
        <AdvancedIndicatorCard title="Margem Líquida" value={ind.net_margin.value} formatted={formatPercentage(ind.net_margin.value)} variation={ind.net_margin.variation} level={ind.net_margin.level} trend={ind.net_margin.trend} fallbackMessage={ind.net_margin.fallbackMessage} />
        <AdvancedIndicatorCard title="Margem Bruta" value={ind.gross_margin.value} formatted={formatPercentage(ind.gross_margin.value)} variation={ind.gross_margin.variation} level={ind.gross_margin.level} trend={ind.gross_margin.trend} isEstimated={ind.gross_margin.is_estimated} fallbackMessage={ind.gross_margin.fallbackMessage} />
        <AdvancedIndicatorCard title="Margem Operacional" value={ind.operating_margin.value} formatted={formatPercentage(ind.operating_margin.value)} variation={ind.operating_margin.variation} level={ind.operating_margin.level} trend={ind.operating_margin.trend} isEstimated={ind.operating_margin.is_estimated} fallbackMessage={ind.operating_margin.fallbackMessage} />
        <AdvancedIndicatorCard title="EBITDA (Margem)" value={ind.ebitda.value} formatted={formatPercentage(ind.ebitda.value)} variation={ind.ebitda.variation} level={ind.ebitda.level} trend={ind.ebitda.trend} isEstimated={ind.ebitda.is_estimated} fallbackMessage={ind.ebitda.fallbackMessage} />
        <AdvancedIndicatorCard title="Total de Despesas" value={ind.total_expenses.value} formatted={formatCurrency(ind.total_expenses.value)} variation={ind.total_expenses.variation} level={ind.total_expenses.level} trend={ind.total_expenses.trend} isGoodWhenUp={false} fallbackMessage={ind.total_expenses.fallbackMessage} />
        <AdvancedIndicatorCard title="Índice de Eficiência" value={ind.efficiency_index.value} formatted={String(ind.efficiency_index.value.toFixed(2)) + "x"} variation={null} level={ind.efficiency_index.level} trend="stable" fallbackMessage={ind.efficiency_index.fallbackMessage} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className={`border-primary/10 bg-white ${ind.best_period.fallbackMessage ? "opacity-70" : ""}`}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Melhor período</p>
            {ind.best_period.fallbackMessage ? fallbackText(ind.best_period.fallbackMessage) : (
              <>
                <p className="font-bold mt-1">{ind.best_period.period}</p>
                <p className="text-sm text-emerald-700">{formatCurrency(ind.best_period.value)} · {formatPercentage(ind.best_period.margin)}</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className={`border-primary/10 bg-white ${ind.worst_period.fallbackMessage ? "opacity-70" : ""}`}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pior período</p>
            {ind.worst_period.fallbackMessage ? fallbackText(ind.worst_period.fallbackMessage) : (
              <>
                <p className="font-bold mt-1">{ind.worst_period.period}</p>
                <p className="text-sm text-red-700">{formatCurrency(ind.worst_period.value)} · {formatPercentage(ind.worst_period.margin)}</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className={`border-primary/10 bg-white ${ind.cumulative_variation.fallbackMessage ? "opacity-70" : ""}`}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Variação acumulada (receita)</p>
            {ind.cumulative_variation.fallbackMessage ? fallbackText(ind.cumulative_variation.fallbackMessage) : (
              <>
                <p className={`font-bold text-xl mt-1 tabular-nums ${ind.cumulative_variation.value >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                  {ind.cumulative_variation.value >= 0 ? "+" : ""}{formatPercentage(ind.cumulative_variation.value)}
                </p>
                {ind.cumulative_variation.level ? levelBadge(ind.cumulative_variation.level, "mt-1") : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {ind.efficiency_index.interpretation && (
        <div className="rounded-lg border bg-slate-50 p-3 text-sm text-muted-foreground">
          <strong className="text-foreground">Índice de eficiência:</strong> {ind.efficiency_index.interpretation}
        </div>
      )}
    </div>
  );
}

// ── Section 3: Variations ──────────────────────────────────────────────────────

function VariationsSection({ data }: { data: AdvancedDreAnalysis }) {
  const [showAll, setShowAll] = useState(false);
  const vars = data.variations;

  if (vars.length === 0) {
    return <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Selecione pelo menos 2 períodos para visualizar variações.</div>;
  }

  const displayed = showAll ? vars : vars.slice(0, 20);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Comparação entre o primeiro e o último período selecionado, ordenada por maior impacto financeiro absoluto. Exibindo {displayed.length} de {vars.length} variações.</p>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="min-w-40">Categoria</TableHead>
              <TableHead className="min-w-36">Subcategoria</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Período inicial</TableHead>
              <TableHead className="text-right">Período final</TableHead>
              <TableHead className="text-right">Var. %</TableHead>
              <TableHead className="text-right">Impacto R$</TableHead>
              <TableHead className="text-right">Impacto Margem</TableHead>
              <TableHead>Nível</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayed.map((v, i) => (
              <VariationRow key={i} v={v} />
            ))}
          </TableBody>
        </Table>
      </div>
      {!showAll && vars.length > 20 && (
        <Button variant="outline" size="sm" onClick={() => setShowAll(true)}>
          Ver todas as {vars.length} variações
        </Button>
      )}
    </div>
  );
}

function VariationRow({ v }: { v: AdvancedVariationItem }) {
  const impactColor = v.financial_impact > 0 && v.type === "expense"
    ? "text-red-700" : v.financial_impact < 0 && v.type === "expense"
      ? "text-emerald-700" : v.financial_impact > 0
        ? "text-emerald-700" : "text-red-700";
  const variationColor = v.variation_pct > 0 && v.type === "expense"
    ? "text-red-600" : v.variation_pct < 0 && v.type === "expense"
      ? "text-emerald-600" : v.variation_pct > 0
        ? "text-emerald-600" : "text-red-600";

  return (
    <TableRow className={v.level === "HIGH" ? "bg-red-50/40" : ""}>
      <TableCell className="text-sm font-medium">{v.category}</TableCell>
      <TableCell className="text-sm">{v.subcategory}</TableCell>
      <TableCell>
        <Badge variant={v.type === "revenue" ? "default" : "secondary"} className="text-xs">
          {v.type === "revenue" ? "Receita" : "Despesa"}
        </Badge>
      </TableCell>
      <TableCell className="text-right tabular-nums text-sm">{formatCurrency(v.previous_value)}</TableCell>
      <TableCell className="text-right tabular-nums text-sm">{formatCurrency(v.current_value)}</TableCell>
      <TableCell className={`text-right tabular-nums text-sm font-semibold ${variationColor}`}>
        {v.variation_pct > 0 ? "+" : ""}{formatPercentage(v.variation_pct)}
      </TableCell>
      <TableCell className={`text-right tabular-nums text-sm font-semibold ${impactColor}`}>
        {v.financial_impact > 0 ? "+" : ""}{formatCurrency(v.financial_impact)}
      </TableCell>
      <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
        {v.margin_impact > 0 ? "+" : ""}{formatPercentage(v.margin_impact)} p.p.
      </TableCell>
      <TableCell>{levelBadge(v.level)}</TableCell>
    </TableRow>
  );
}

// ── Section 4: ABC Curve ───────────────────────────────────────────────────────

function AbcCurveSection({ data }: { data: AdvancedDreAnalysis }) {
  const [view, setView] = useState<"expenses" | "revenue">("expenses");
  const [selectedClass, setSelectedClass] = useState<"A" | "B" | "C" | null>(null);
  const items = data.abc_curve[view];
  const { concentration_alert } = data.abc_curve;

  const classColors: Record<string, string> = { A: COLORS.primary, B: COLORS.amber, C: COLORS.neutral };
  const visibleItems = selectedClass ? items.filter((i) => i.class === selectedClass) : items;
  const paretoData = visibleItems.map((i) => ({ name: i.item.length > 20 ? i.item.slice(0, 18) + "…" : i.item, value: i.value, cumulative: i.cumulative_pct, class: i.class }));

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button size="sm" variant={view === "expenses" ? "default" : "outline"} onClick={() => { setView("expenses"); setSelectedClass(null); }}>Despesas</Button>
        <Button size="sm" variant={view === "revenue" ? "default" : "outline"} onClick={() => { setView("revenue"); setSelectedClass(null); }}>Receitas</Button>
      </div>

      {concentration_alert && view === "expenses" && (
        <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{concentration_alert}</p>
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhum dado disponível para curva ABC de {view === "expenses" ? "despesas" : "receitas"}.
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3 mb-2">
            {(["A", "B", "C"] as const).map((cls) => {
              const clsItems = items.filter((i) => i.class === cls);
              const total = clsItems.reduce((s, i) => s + i.pct, 0);
              return (
                <Card
                  key={cls}
                  className={`cursor-pointer border-primary/10 bg-white transition hover:border-primary/30 ${selectedClass === cls ? "ring-2 ring-primary/30" : ""}`}
                  onClick={() => setSelectedClass((current) => current === cls ? null : cls)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold" style={{ color: classColors[cls] }}>Classe {cls}</span>
                    </div>
                    <p className="text-sm mt-1">{clsItems.length} {clsItems.length === 1 ? "item" : "itens"} · {formatPercentage(total)} do total</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            {selectedClass ? `Exibindo somente itens da Classe ${selectedClass}. Clique novamente no card para voltar a exibir todas as classes.` : "Clique em uma classe para filtrar o gráfico e a tabela."}
          </p>

          {paretoData.length > 0 && (
            <Card className="border-primary/10 bg-white">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Gráfico de Pareto{selectedClass ? ` · Classe ${selectedClass}` : ""}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={paretoData} margin={{ top: 4, right: 40, bottom: 60, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v).replace("R$", "R$")} width={80} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip contentStyle={chartTooltipStyle} formatter={(value, name) => name === "cumulative" ? `${value}%` : formatCurrency(Number(value))} />
                    <Bar yAxisId="left" dataKey="value" name="Valor" radius={[3, 3, 0, 0]}>
                      {paretoData.map((entry, i) => (
                        <Cell key={i} fill={classColors[entry.class] ?? COLORS.neutral} />
                      ))}
                    </Bar>
                    <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke={COLORS.amber} strokeWidth={2} dot={false} name="% acumulado" />
                    <ReferenceLine yAxisId="right" y={80} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: "80%", fontSize: 10 }} />
                    <ReferenceLine yAxisId="right" y={95} stroke="#cbd5e1" strokeDasharray="4 4" label={{ value: "95%", fontSize: 10 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Item</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">% Individual</TableHead>
                  <TableHead className="text-right">% Acumulado</TableHead>
                  <TableHead>Classe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleItems.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm">{item.item}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.category}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{formatCurrency(item.value)}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{formatPercentage(item.pct)}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{formatPercentage(item.cumulative_pct)}</TableCell>
                    <TableCell>
                      <span className="font-bold text-sm" style={{ color: classColors[item.class] }}>Classe {item.class}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Section 5: Charts ──────────────────────────────────────────────────────────

function ChartInsight({ text }: { text: string }) {
  return <p className="mt-2 text-xs text-muted-foreground italic">{text}</p>;
}

function ChartsSection({ data }: { data: AdvancedDreAnalysis }) {
  const { charts_data: cd, metadata } = data;
  const hasMultiplePeriods = metadata.periods_count >= 2;
  const has3Periods = metadata.periods_count >= 3;

  const waterfallBarColor = (entry: { isTotal: boolean; up: number }) =>
    entry.isTotal ? COLORS.primary : entry.up > 0 ? COLORS.revenue : COLORS.expense;

  return (
    <div className="space-y-6">
      {/* Revenue evolution */}
      <Card className="border-primary/10 bg-white">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Evolução do Faturamento</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cd.revenue_evolution} margin={{ top: 4, right: 16, bottom: 4, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} width={90} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => formatCurrency(Number(v))} />
              <Bar dataKey="value" name="Faturamento" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <ChartInsight text={`Faturamento total acumulado: ${formatCurrency(cd.revenue_evolution.reduce((s, p) => s + p.value, 0))}.`} />
        </CardContent>
      </Card>

      {/* Margin evolution */}
      <Card className="border-primary/10 bg-white">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Evolução das Margens (%)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.margins.gross.map((g, i) => ({ period: g.period, gross: g.value, operating: data.margins.operating[i]?.value ?? 0, net: data.margins.net[i]?.value ?? 0 }))} margin={{ top: 4, right: 16, bottom: 4, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => `${v}%`} />
              <Legend iconType="line" wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="gross" stroke={COLORS.blue} strokeWidth={2} dot name="Bruta" />
              <Line type="monotone" dataKey="operating" stroke={COLORS.amber} strokeWidth={2} dot name="Operacional" />
              <Line type="monotone" dataKey="net" stroke={COLORS.revenue} strokeWidth={2.5} dot name="Líquida" />
              <ReferenceLine y={3} stroke={COLORS.expense} strokeDasharray="4 4" label={{ value: "Crítico 3%", fontSize: 10, fill: COLORS.expense }} />
            </LineChart>
          </ResponsiveContainer>
          {data.margins.insights[0] && <ChartInsight text={data.margins.insights[0]} />}
        </CardContent>
      </Card>

      {/* Waterfall */}
      {cd.waterfall.length > 0 && (
        <Card className="border-primary/10 bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Ponte de Resultado (Waterfall)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={cd.waterfall.map((w) => ({ ...w, name: w.name.length > 18 ? w.name.slice(0, 16) + "…" : w.name }))} margin={{ top: 4, right: 16, bottom: 60, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} width={90} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v, name) => name === "base" ? null : formatCurrency(Number(v))} />
                <Bar dataKey="base" stackId="w" fill="transparent" />
                <Bar dataKey="up" stackId="w" name="Receita/Ganho" fill={COLORS.revenue} radius={[3, 3, 0, 0]}>
                  {cd.waterfall.map((entry, i) => <Cell key={i} fill={entry.isTotal ? COLORS.primary : COLORS.revenue} />)}
                </Bar>
                <Bar dataKey="down" stackId="w" name="Despesa/Redução" fill={COLORS.expense} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <ChartInsight text="Do faturamento bruto ao resultado líquido, cada barra mostra o impacto consolidado de cada grupo nos períodos selecionados." />
          </CardContent>
        </Card>
      )}

      {/* Revenue vs Expenses */}
      {hasMultiplePeriods && (
        <Card className="border-primary/10 bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Receita vs. Despesas por Período</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={cd.revenue_vs_expenses} margin={{ top: 4, right: 16, bottom: 4, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} width={90} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => formatCurrency(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" name="Faturamento" fill={COLORS.primary} radius={[3, 3, 0, 0]} />
                <Bar dataKey="expenses" name="Despesas" fill={COLORS.expense} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top 5 expenses */}
      {cd.top_expenses.length > 0 && (
        <Card className="border-primary/10 bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top 5 Categorias de Despesa (períodos selecionados)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={cd.top_expenses} layout="vertical" margin={{ top: 4, right: 60, bottom: 4, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} width={90} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => formatCurrency(Number(v))} />
                <Bar dataKey="value" name="Valor" fill={COLORS.expense} radius={[0, 4, 4, 0]}>
                  {cd.top_expenses.map((_, i) => <Cell key={i} fill={CHART_COLORS[i] ?? COLORS.expense} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Expenses distribution (donut) */}
      {cd.expenses_distribution.length > 0 && (
        <Card className="border-primary/10 bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Distribuição de Despesas (períodos selecionados)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie data={cd.expenses_distribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={2}>
                    {cd.expenses_distribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2">
                {cd.expenses_distribution.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Net income evolution (3+ periods) */}
      {has3Periods && (
        <Card className="border-primary/10 bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Evolução do Lucro Líquido</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={cd.net_income_evolution} margin={{ top: 4, right: 16, bottom: 4, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} width={90} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => formatCurrency(Number(v))} />
                <ReferenceLine y={0} stroke="#94a3b8" />
                <Line type="monotone" dataKey="value" name="Lucro Líquido" stroke={COLORS.revenue} strokeWidth={2.5} dot />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Section 6: Margins ─────────────────────────────────────────────────────────

function MarginsSection({ data }: { data: AdvancedDreAnalysis }) {
  return (
    <div className="space-y-4">
      <Card className="border-primary/10 bg-white">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Evolução das Margens</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={data.margins.gross.map((g, i) => ({
                period: g.period,
                bruta: g.value,
                operacional: data.margins.operating[i]?.value ?? 0,
                liquida: data.margins.net[i]?.value ?? 0,
              }))}
              margin={{ top: 4, right: 16, bottom: 4, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => [`${v}%`]} />
              <Legend iconType="line" wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="bruta" stroke={COLORS.blue} strokeWidth={2} dot name="Bruta" />
              <Line type="monotone" dataKey="operacional" stroke={COLORS.amber} strokeWidth={2} dot name="Operacional" />
              <Line type="monotone" dataKey="liquida" stroke={COLORS.revenue} strokeWidth={2.5} dot name="Líquida" />
              <ReferenceLine y={3} stroke={COLORS.expense} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {data.margins.insights.map((insight, i) => (
          <div key={i} className="flex gap-2 rounded-lg border bg-slate-50 p-3 text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary/60" />
            <p>{insight}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Período</TableHead>
              <TableHead className="text-right">Margem Bruta</TableHead>
              <TableHead className="text-right">Margem Operacional</TableHead>
              <TableHead className="text-right">Margem Líquida</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.margins.net.map((n, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{n.period}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPercentage(data.margins.gross[i]?.value ?? 0)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPercentage(data.margins.operating[i]?.value ?? 0)}</TableCell>
                <TableCell className={`text-right tabular-nums font-semibold ${n.value < 3 ? "text-red-700" : n.value < 8 ? "text-amber-700" : "text-emerald-700"}`}>
                  {formatPercentage(n.value)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ── Section 7: Alerts ──────────────────────────────────────────────────────────

function AlertsSection({ data }: { data: AdvancedDreAnalysis }) {
  const { alerts } = data;

  if (alerts.length === 0) {
    return (
      <div className="flex gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <p>Nenhum alerta identificado para os períodos selecionados. A empresa apresenta comportamento financeiro estável.</p>
      </div>
    );
  }

  const alertBgMap: Record<AlertLevel, string> = {
    HIGH: "border-red-200 bg-red-50",
    MEDIUM: "border-amber-200 bg-amber-50",
    LOW: "border-emerald-200 bg-emerald-50",
  };

  const alertTextMap: Record<AlertLevel, string> = {
    HIGH: "text-red-900",
    MEDIUM: "text-amber-900",
    LOW: "text-emerald-900",
  };

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <AlertCard key={alert.id} alert={alert} bgCls={alertBgMap[alert.level]} textCls={alertTextMap[alert.level]} />
      ))}
    </div>
  );
}

function AlertCard({ alert, bgCls, textCls }: { alert: AdvancedAlert; bgCls: string; textCls: string }) {
  return (
    <div className={`rounded-lg border p-4 ${bgCls}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 shrink-0 ${textCls}`}>{alertIcon(alert.icon)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <p className={`font-semibold text-sm ${textCls}`}>{alert.title}</p>
            {levelBadge(alert.level)}
          </div>
          <p className={`text-sm ${textCls} opacity-90`}>{alert.description}</p>
          {alert.impact_description && (
            <p className={`text-xs mt-1 font-medium ${textCls} opacity-70`}>Impacto: {alert.impact_description}</p>
          )}
          <div className={`mt-2 rounded border-l-2 pl-3 text-xs ${textCls} opacity-80`} style={{ borderColor: "currentColor" }}>
            <strong>Recomendação:</strong> {alert.recommendation}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Section 8: Recommendations ─────────────────────────────────────────────────

function RecommendationsSection({ data }: { data: AdvancedDreAnalysis }) {
  const { recommendations } = data;

  if (recommendations.length === 0) {
    return <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhuma recomendação gerada. Análise com dados insuficientes para inferências.</div>;
  }

  const timelineBadgeMap: Record<AdvancedRecommendation["suggested_timeline"], string> = {
    short: "bg-red-100 text-red-800",
    medium: "bg-amber-100 text-amber-800",
    long: "bg-blue-100 text-blue-800",
  };

  return (
    <div className="space-y-4">
      {recommendations.map((rec) => (
        <div key={rec.priority} className="rounded-lg border border-primary/10 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">
              {rec.priority}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <p className="font-semibold text-sm text-primary">{rec.title}</p>
                <span className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold ${timelineBadgeMap[rec.suggested_timeline]}`}>
                  {timelineLabel(rec.suggested_timeline)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{rec.justification}</p>
              {rec.estimated_impact && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-xs text-emerald-800">
                  <strong>Impacto estimado:</strong> {rec.estimated_impact}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Loading skeleton ───────────────────────────────────────────────────────────

function AnalysisSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-6 w-48" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────────

type DreAdvancedAnalysisModalProps = {
  result: DreAnalysisResult;
  modelName: string;
  onClose: () => void;
};

export function DreAdvancedAnalysisModal({ result, modelName, onClose }: DreAdvancedAnalysisModalProps) {
  const [exportingPdf, setExportingPdf] = useState(false);

  const analysis = useMemo(() => {
    try {
      return generateAdvancedDreAnalysis(result, { modelName });
    } catch {
      return null;
    }
  }, [result, modelName]);

  async function handleExportPdf() {
    if (!analysis) return;
    setExportingPdf(true);
    try {
      await exportAdvancedDrePdf(analysis);
    } finally {
      setExportingPdf(false);
    }
  }

  const tabs = [
    { value: "summary", label: "Resumo Executivo" },
    { value: "indicators", label: "Indicadores" },
    { value: "variations", label: "Variações" },
    { value: "abc", label: "Curva ABC" },
    { value: "charts", label: "Gráficos" },
    { value: "margins", label: "Margens" },
    { value: "alerts", label: "Alertas" },
    { value: "recommendations", label: "Recomendações" },
  ];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[95vh] w-[98vw] max-w-7xl flex-col gap-0 overflow-hidden p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <BarChart2 className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-display text-lg font-semibold">Análise Detalhada de DRE</h2>
              <p className="text-xs text-muted-foreground">{modelName} · {result.periods.length} {result.periods.length === 1 ? "período" : "períodos"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void handleExportPdf()} disabled={!analysis || exportingPdf}>
              {exportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Exportar PDF
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {!analysis ? (
          <AnalysisSkeleton />
        ) : (
          <Tabs defaultValue="summary" className="flex min-h-0 flex-1 flex-col">
            <div className="border-b px-6 shrink-0">
              <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0 py-2">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="rounded-md px-3 py-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-white"
                  >
                    {tab.label}
                    {tab.value === "alerts" && analysis.alerts.filter((a) => a.level === "HIGH").length > 0 && (
                      <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">
                        {analysis.alerts.filter((a) => a.level === "HIGH").length}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
              <div className="p-6">
                <TabsContent value="summary" className="mt-0"><ExecutiveSummarySection data={analysis} /></TabsContent>
                <TabsContent value="indicators" className="mt-0"><IndicatorsSection data={analysis} /></TabsContent>
                <TabsContent value="variations" className="mt-0"><VariationsSection data={analysis} /></TabsContent>
                <TabsContent value="abc" className="mt-0"><AbcCurveSection data={analysis} /></TabsContent>
                <TabsContent value="charts" className="mt-0"><ChartsSection data={analysis} /></TabsContent>
                <TabsContent value="margins" className="mt-0"><MarginsSection data={analysis} /></TabsContent>
                <TabsContent value="alerts" className="mt-0"><AlertsSection data={analysis} /></TabsContent>
                <TabsContent value="recommendations" className="mt-0"><RecommendationsSection data={analysis} /></TabsContent>
              </div>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
