import { formatCurrency, formatPercentage, roundCurrency, variationPercentage } from "@/lib/dre-calculations";
import type { DreAnalysisPeriod, DreAnalysisResult, DreAnalysisRow } from "@/lib/dre-analysis";
import type { DreFinancialType } from "@/types/dre";

// ── Types ──────────────────────────────────────────────────────────────────────

export type AlertLevel = "LOW" | "MEDIUM" | "HIGH";
export type AlertType = "warning" | "positive" | "info";

export type AdvancedIndicator = {
  value: number;
  variation: number | null;
  level: AlertLevel | null;
  trend: "up" | "down" | "stable";
  fallbackMessage?: string;
};

export type AdvancedMarginIndicator = {
  value: number;
  variation: number | null;
  level: AlertLevel | null;
  trend: "up" | "down" | "stable";
  is_estimated: boolean;
  fallbackMessage?: string;
};

export type AdvancedVariationItem = {
  category: string;
  subcategory: string;
  type: "revenue" | "expense" | "deduction";
  previous_value: number;
  current_value: number;
  variation_pct: number;
  financial_impact: number;
  margin_impact: number;
  level: AlertLevel;
};

export type AbcItem = {
  item: string;
  category: string;
  value: number;
  pct: number;
  cumulative_pct: number;
  class: "A" | "B" | "C";
};

export type AdvancedAlert = {
  id: string;
  icon: string;
  title: string;
  description: string;
  impact_value: number;
  impact_description: string;
  level: AlertLevel;
  type: AlertType;
  recommendation: string;
};

export type AdvancedRecommendation = {
  priority: number;
  title: string;
  justification: string;
  estimated_impact: string;
  suggested_timeline: "short" | "medium" | "long";
};

export type WaterfallItem = {
  name: string;
  base: number;
  up: number;
  down: number;
  total: number;
  isTotal: boolean;
};

export type PeriodChartPoint = { period: string; value: number };

export type MarginChartPoint = {
  period: string;
  gross: number;
  operating: number;
  net: number;
};

export type RevenueExpensePoint = {
  period: string;
  revenue: number;
  expenses: number;
  net_income: number;
};

export type AdvancedDreAnalysis = {
  executive_summary: {
    overview: string;
    main_concern: string;
    causes: string[];
    impact: string;
    direction: string;
    full_text: string;
  };
  indicators: {
    revenue: AdvancedIndicator;
    net_profit: AdvancedIndicator;
    gross_margin: AdvancedMarginIndicator;
    operating_margin: AdvancedMarginIndicator;
    net_margin: AdvancedMarginIndicator;
    ebitda: AdvancedMarginIndicator;
    total_expenses: AdvancedIndicator;
    best_period: { period: string; value: number; margin: number; fallbackMessage?: string };
    worst_period: { period: string; value: number; margin: number; fallbackMessage?: string };
    cumulative_variation: { value: number; level: AlertLevel | null; fallbackMessage?: string };
    efficiency_index: { value: number; level: AlertLevel | null; interpretation: string; fallbackMessage?: string };
  };
  variations: AdvancedVariationItem[];
  abc_curve: {
    expenses: AbcItem[];
    revenue: AbcItem[];
    concentration_alert: string | null;
  };
  charts_data: {
    revenue_evolution: PeriodChartPoint[];
    margin_evolution: MarginChartPoint[];
    waterfall: WaterfallItem[];
    expenses_distribution: Array<{ name: string; value: number }>;
    revenue_vs_expenses: RevenueExpensePoint[];
    top_expenses: Array<{ name: string; value: number }>;
    net_income_evolution: PeriodChartPoint[];
    expenses_evolution: PeriodChartPoint[];
  };
  margins: {
    gross: PeriodChartPoint[];
    operating: PeriodChartPoint[];
    net: PeriodChartPoint[];
    insights: string[];
  };
  alerts: AdvancedAlert[];
  recommendations: AdvancedRecommendation[];
  metadata: {
    periods_count: number;
    sector: string | null;
    has_targets: boolean;
    model_name: string;
    generated_at: Date;
    available_analyses: string[];
  };
};

type GenerateOptions = {
  modelName: string;
  sector?: string | null;
  hasTargets?: boolean;
};

// ── Level helpers ──────────────────────────────────────────────────────────────

export function determineAlertLevel(
  variationPct: number,
  impactOnRevenuePct: number,
  representativenessPct: number,
): AlertLevel {
  const toRank = (l: AlertLevel) => (l === "HIGH" ? 2 : l === "MEDIUM" ? 1 : 0);
  const fromRank = (r: number): AlertLevel => (r >= 2 ? "HIGH" : r >= 1 ? "MEDIUM" : "LOW");

  const variationLevel: AlertLevel = variationPct > 15 ? "HIGH" : variationPct > 5 ? "MEDIUM" : "LOW";
  const impactLevel: AlertLevel = impactOnRevenuePct > 5 ? "HIGH" : impactOnRevenuePct > 2 ? "MEDIUM" : "LOW";
  const reprLevel: AlertLevel = representativenessPct > 15 ? "HIGH" : representativenessPct > 5 ? "MEDIUM" : "LOW";

  let result = fromRank(Math.max(toRank(variationLevel), toRank(impactLevel), toRank(reprLevel)));

  // Elevation rule: HIGH variation but item represents < 1% → cap at MEDIUM
  if (variationLevel === "HIGH" && representativenessPct < 1) result = "MEDIUM";

  return result;
}

function trendDirection(values: number[]): "up" | "down" | "stable" {
  if (values.length < 2) return "stable";
  const first = values[0];
  const last = values[values.length - 1];
  const change = Math.abs(first) > 0 ? ((last - first) / Math.abs(first)) * 100 : 0;
  if (change > 3) return "up";
  if (change < -3) return "down";
  return "stable";
}

function indicatorLevel(variationPct: number, isGoodWhenUp: boolean): AlertLevel {
  const abs = Math.abs(variationPct);
  if (abs <= 5) return "LOW";
  if (abs <= 15) return "MEDIUM";
  return isGoodWhenUp && variationPct < 0 ? "HIGH" : !isGoodWhenUp && variationPct > 0 ? "HIGH" : "MEDIUM";
}

function marginLevel(value: number, lowThreshold: number, mediumThreshold: number): AlertLevel {
  if (value < 0) return "HIGH";
  if (value >= lowThreshold) return "LOW";
  if (value >= mediumThreshold) return "MEDIUM";
  return "HIGH";
}

function efficiencyLevel(value: number): AlertLevel {
  if (value >= 1.1) return "LOW";
  if (value >= 0.9) return "MEDIUM";
  return "HIGH";
}

function safePercentage(numerator: number, denominator: number) {
  return denominator > 0 ? roundCurrency((numerator / denominator) * 100) : 0;
}

function metricVariation(previous: number | undefined, current: number) {
  return previous !== undefined && previous !== 0 ? variationPercentage(previous, current) : 0;
}

// ── Computation helpers ────────────────────────────────────────────────────────

function getSubcategoryRows(rows: DreAnalysisRow[]) {
  return rows.filter((r) => r.lineType === "subcategory");
}

function getUserSumRows(rows: DreAnalysisRow[]) {
  return rows.filter((r) => r.lineType === "sum").sort((a, b) => a.displayOrder - b.displayOrder);
}

function getFinancialRow(rows: DreAnalysisRow[], financialType: DreFinancialType) {
  return rows.find((r) => r.lineType === "sum" && r.financialType === financialType);
}

function financialValuesByPeriod(row: DreAnalysisRow | undefined, periods: DreAnalysisPeriod[]) {
  if (!row) return null;
  return Object.fromEntries(periods.map((p) => [p.id, row.values[p.id]?.amount ?? 0]));
}

function fallbackIndicator(message: string): AdvancedIndicator {
  return { value: 0, variation: null, level: null, trend: "stable", fallbackMessage: message };
}

function fallbackMarginIndicator(message: string): AdvancedMarginIndicator {
  return { value: 0, variation: null, level: null, trend: "stable", is_estimated: false, fallbackMessage: message };
}

function computePeriodExpenses(periods: DreAnalysisPeriod[], expenseRows: DreAnalysisRow[]): Record<string, number> {
  return Object.fromEntries(
    periods.map((p) => [p.id, expenseRows.reduce((sum, r) => sum + (r.values[p.id]?.amount ?? 0), 0)]),
  );
}

function categoryLabelMap(rows: DreAnalysisRow[]): Record<string, string> {
  return Object.fromEntries(rows.filter((r) => r.lineType === "category").map((r) => [r.key, r.label]));
}

// ── Variations ─────────────────────────────────────────────────────────────────

export function computeVariations(
  subcategoryRows: DreAnalysisRow[],
  currentPeriod: DreAnalysisPeriod,
  previousPeriod: DreAnalysisPeriod | null,
  categoryLabels: Record<string, string>,
): AdvancedVariationItem[] {
  if (!previousPeriod) return [];

  const currentRevenue = currentPeriod.totals.revenue;

  return subcategoryRows
    .map((row): AdvancedVariationItem => {
      const current = row.values[currentPeriod.id]?.amount ?? 0;
      const previous = row.values[previousPeriod.id]?.amount ?? 0;
      const impact = current - previous;
      const varPct = variationPercentage(previous, current);
      const marginImpact = currentRevenue > 0 ? roundCurrency((impact / currentRevenue) * 100) : 0;
      const reprPct = currentRevenue > 0 ? (current / currentRevenue) * 100 : 0;
      const level = determineAlertLevel(Math.abs(varPct), Math.abs(marginImpact), reprPct);
      const parentLabel = categoryLabels[row.parentKey ?? ""] ?? "";

      return {
        category: parentLabel,
        subcategory: row.label,
        type: row.categoryType === "credit" ? "revenue" : "expense",
        previous_value: previous,
        current_value: current,
        variation_pct: varPct,
        financial_impact: impact,
        margin_impact: marginImpact,
        level,
      };
    })
    .filter((v) => v.previous_value !== 0 || v.current_value !== 0)
    .sort((a, b) => Math.abs(b.financial_impact) - Math.abs(a.financial_impact));
}

// ── ABC Curve ──────────────────────────────────────────────────────────────────

export function computeAbcCurve(
  subcategoryRows: DreAnalysisRow[],
  currentPeriodId: string,
  categoryLabels: Record<string, string>,
): AdvancedDreAnalysis["abc_curve"] {
  const toItems = (rows: DreAnalysisRow[]): AbcItem[] => {
    const raw = rows
      .map((r) => ({ item: r.label, category: categoryLabels[r.parentKey ?? ""] ?? "", value: r.values[currentPeriodId]?.amount ?? 0 }))
      .filter((i) => i.value > 0)
      .sort((a, b) => b.value - a.value);

    const total = raw.reduce((s, i) => s + i.value, 0);
    let cumulative = 0;

    return raw.map((i) => {
      const pct = total > 0 ? roundCurrency((i.value / total) * 100) : 0;
      cumulative += i.value / (total || 1);
      const cumulativePct = roundCurrency(cumulative * 100);
      const cls: "A" | "B" | "C" = cumulativePct <= 80 ? "A" : cumulativePct <= 95 ? "B" : "C";
      return { ...i, pct, cumulative_pct: cumulativePct, class: cls };
    });
  };

  const expenseItems = toItems(subcategoryRows.filter((r) => r.categoryType === "debit"));
  const revenueItems = toItems(subcategoryRows.filter((r) => r.categoryType === "credit"));

  const classA = expenseItems.filter((i) => i.class === "A");
  let concentration_alert: string | null = null;
  if (classA.length > 0 && classA.length <= 3) {
    const topPct = roundCurrency(classA.reduce((s, i) => s + i.pct, 0));
    if (topPct > 70) {
      concentration_alert = `${classA.length} ${classA.length === 1 ? "item" : "itens"} da classe A concentram ${formatPercentage(topPct)} das despesas totais. Essa concentração representa risco operacional — qualquer aumento nesses itens comprime diretamente a margem.`;
    }
  }

  return { expenses: expenseItems, revenue: revenueItems, concentration_alert };
}

// ── Waterfall ──────────────────────────────────────────────────────────────────

function buildWaterfallData(rows: DreAnalysisRow[], currentPeriodId: string): WaterfallItem[] {
  const ordered = rows
    .filter((r) => r.lineType === "category" || r.lineType === "sum")
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const items: WaterfallItem[] = [];
  let running = 0;

  for (const row of ordered) {
    const amount = row.values[currentPeriodId]?.amount ?? 0;

    if (row.lineType === "sum") {
      const total = amount;
      items.push({ name: row.label, base: 0, up: Math.max(0, total), down: Math.abs(Math.min(0, total)), total, isTotal: true });
      running = total;
    } else {
      const isCredit = row.categoryType === "credit";
      const impact = isCredit ? amount : -amount;
      const newRunning = running + impact;
      if (isCredit) {
        items.push({ name: row.label, base: running, up: amount, down: 0, total: newRunning, isTotal: false });
      } else {
        items.push({ name: row.label, base: newRunning, up: 0, down: amount, total: newRunning, isTotal: false });
      }
      running = newRunning;
    }
  }

  return items;
}

// ── Alerts ─────────────────────────────────────────────────────────────────────

export function computeAlerts(params: {
  periods: DreAnalysisPeriod[];
  currentPeriod: DreAnalysisPeriod;
  previousPeriod: DreAnalysisPeriod | null;
  currentExpenses: number;
  previousExpenses: number;
  subcategoryRows: DreAnalysisRow[];
  expenseRows: DreAnalysisRow[];
  variations: AdvancedVariationItem[];
}): AdvancedAlert[] {
  const { periods, currentPeriod, previousPeriod, currentExpenses, previousExpenses, expenseRows, variations } = params;
  const alerts: AdvancedAlert[] = [];
  let id = 0;
  const nid = () => String(++id);

  const curr = currentPeriod.totals;
  const prev = previousPeriod?.totals;

  // Alert: expenses growing faster than revenue
  if (prev && prev.revenue > 0 && previousExpenses > 0) {
    const revGrowth = variationPercentage(prev.revenue, curr.revenue);
    const expGrowth = variationPercentage(previousExpenses, currentExpenses);
    if (expGrowth > revGrowth + 3 && expGrowth > 5) {
      alerts.push({
        id: nid(),
        icon: "TrendingUp",
        title: "Despesas crescendo acima do faturamento",
        description: `As despesas cresceram ${formatPercentage(expGrowth)} enquanto o faturamento cresceu ${formatPercentage(revGrowth)} no período — a diferença de ${formatPercentage(expGrowth - revGrowth)} comprime diretamente a margem operacional.`,
        impact_value: currentExpenses - previousExpenses,
        impact_description: `${formatCurrency(Math.abs(currentExpenses - previousExpenses))} a mais em despesas`,
        level: "HIGH",
        type: "warning",
        recommendation: "Identifique as categorias com maior crescimento absoluto e estabeleça metas de contenção. Negocie contratos ou revise processos internos.",
      });
    }
  }

  // Alert: significant margin drop
  if (prev) {
    const marginDrop = prev.marginPercentage - curr.marginPercentage;
    const impactR$ = curr.revenue > 0 ? Math.abs((marginDrop / 100) * curr.revenue) : 0;
    if (marginDrop > 3) {
      alerts.push({
        id: nid(),
        icon: "AlertTriangle",
        title: "Queda significativa de margem",
        description: `A margem líquida recuou ${formatPercentage(marginDrop)} — de ${formatPercentage(prev.marginPercentage)} para ${formatPercentage(curr.marginPercentage)}. Em termos financeiros, isso representa ${formatCurrency(impactR$)} a menos retidos sobre o faturamento.`,
        impact_value: impactR$,
        impact_description: `${formatCurrency(impactR$)} de impacto na margem`,
        level: "HIGH",
        type: "warning",
        recommendation: "Revise as categorias com maior crescimento percentual. Priorize ações nas despesas com maior impacto absoluto sobre o faturamento.",
      });
    } else if (marginDrop > 1) {
      alerts.push({
        id: nid(),
        icon: "TrendingDown",
        title: "Redução moderada de margem",
        description: `A margem líquida reduziu ${formatPercentage(marginDrop)} (de ${formatPercentage(prev.marginPercentage)} para ${formatPercentage(curr.marginPercentage)}). Impacto estimado de ${formatCurrency(impactR$)} sobre o resultado.`,
        impact_value: impactR$,
        impact_description: `${formatCurrency(impactR$)} de impacto estimado`,
        level: "MEDIUM",
        type: "warning",
        recommendation: "Monitore as categorias com crescimento acima de 5% e avalie oportunidades de eficiência operacional antes que a tendência se agrave.",
      });
    } else if (marginDrop < -2) {
      alerts.push({
        id: nid(),
        icon: "TrendingUp",
        title: "Melhoria operacional",
        description: `A margem líquida melhorou ${formatPercentage(Math.abs(marginDrop))} no período (de ${formatPercentage(prev.marginPercentage)} para ${formatPercentage(curr.marginPercentage)}).`,
        impact_value: impactR$,
        impact_description: `${formatCurrency(impactR$)} a mais retidos`,
        level: "LOW",
        type: "positive",
        recommendation: "Mantenha as práticas que geraram essa melhoria e expanda para outras áreas quando possível.",
      });
    }
  }

  // Alert: expense concentration > 40%
  if (curr.revenue > 0 || currentExpenses > 0) {
    const expenseTotal = currentExpenses;
    for (const row of expenseRows) {
      const amount = row.values[currentPeriod.id]?.amount ?? 0;
      const pct = expenseTotal > 0 ? (amount / expenseTotal) * 100 : 0;
      if (pct > 40) {
        alerts.push({
          id: nid(),
          icon: "AlertCircle",
          title: "Concentração excessiva de custos",
          description: `A categoria "${row.label}" representa ${formatPercentage(pct)} das despesas totais (${formatCurrency(amount)}). Concentração acima de 40% em um único item cria dependência e risco operacional.`,
          impact_value: amount,
          impact_description: `${formatCurrency(amount)} — ${formatPercentage(pct)} das despesas`,
          level: "HIGH",
          type: "warning",
          recommendation: `Diversifique fornecedores ou explore alternativas para reduzir a dependência de "${row.label}". Considere estratégias de substituição ou negociação de volumes.`,
        });
        break;
      }
    }
  }

  // Alert: atypical expense growth (> 20%) without proportional revenue growth
  const atypicalExpenses = variations.filter((v) => v.type === "expense" && v.variation_pct > 20 && v.current_value > 0);
  const revenueGrowth = prev && prev.revenue > 0 ? variationPercentage(prev.revenue, curr.revenue) : 0;
  for (const v of atypicalExpenses.slice(0, 2)) {
    if (v.variation_pct > revenueGrowth + 10) {
      alerts.push({
        id: nid(),
        icon: "AlertTriangle",
        title: `Crescimento atípico em ${v.subcategory}`,
        description: `"${v.subcategory}" cresceu ${formatPercentage(v.variation_pct)} (de ${formatCurrency(v.previous_value)} para ${formatCurrency(v.current_value)}) sem crescimento proporcional de receita (${formatPercentage(revenueGrowth)}). Impacto de ${formatCurrency(Math.abs(v.financial_impact))} na margem.`,
        impact_value: Math.abs(v.financial_impact),
        impact_description: `${formatCurrency(Math.abs(v.financial_impact))} de impacto adicional`,
        level: "HIGH",
        type: "warning",
        recommendation: `Investigue as causas do crescimento em "${v.subcategory}". Avalie se é estrutural (novo contrato, reajuste) ou pontual (despesa extraordinária).`,
      });
    }
  }

  // Alert: revenue concentration in ≤ 2 categories > 80%
  const revenueRows = params.subcategoryRows.filter((r) => r.categoryType === "credit");
  const totalRevenue = curr.revenue;
  if (totalRevenue > 0 && revenueRows.length > 0) {
    const sorted = [...revenueRows].sort((a, b) => (b.values[currentPeriod.id]?.amount ?? 0) - (a.values[currentPeriod.id]?.amount ?? 0));
    let top2 = 0;
    const top2Names: string[] = [];
    for (const r of sorted.slice(0, 2)) {
      const amt = r.values[currentPeriod.id]?.amount ?? 0;
      top2 += amt;
      if (amt > 0) top2Names.push(r.label);
    }
    const top2Pct = totalRevenue > 0 ? (top2 / totalRevenue) * 100 : 0;
    if (top2Pct > 80 && revenueRows.length > 2) {
      alerts.push({
        id: nid(),
        icon: "Info",
        title: "Risco de dependência de receita",
        description: `${top2Names.join(" e ")} respondem por ${formatPercentage(top2Pct)} da receita total. Concentração elevada aumenta o risco caso esses itens reduzam.`,
        impact_value: top2,
        impact_description: `${formatCurrency(top2)} — ${formatPercentage(top2Pct)} da receita`,
        level: "MEDIUM",
        type: "warning",
        recommendation: "Avalie estratégias de diversificação de receita para reduzir dependência dos principais produtos ou clientes.",
      });
    }
  }

  // Alert: expenses growing below revenue (efficiency gain)
  if (prev && prev.revenue > 0 && previousExpenses > 0) {
    const revGrowth = variationPercentage(prev.revenue, curr.revenue);
    const expGrowth = variationPercentage(previousExpenses, currentExpenses);
    if (revGrowth > expGrowth + 5 && revGrowth > 0) {
      alerts.push({
        id: nid(),
        icon: "CheckCircle",
        title: "Ganho de eficiência operacional",
        description: `O faturamento cresceu ${formatPercentage(revGrowth)} enquanto as despesas cresceram apenas ${formatPercentage(expGrowth)} — um diferencial de ${formatPercentage(revGrowth - expGrowth)} que melhora a margem operacional.`,
        impact_value: Math.abs(currentExpenses - previousExpenses),
        impact_description: `Alavancagem de ${formatPercentage(revGrowth - expGrowth)} entre receita e despesa`,
        level: "LOW",
        type: "positive",
        recommendation: "Mantenha a disciplina de custos que gerou esse resultado. Documente as práticas para replicação em outras áreas.",
      });
    }
  }

  // Alert: net margin below 3% (critical)
  if (curr.marginPercentage < 3 && curr.revenue > 0) {
    alerts.push({
      id: nid(),
      icon: "AlertTriangle",
      title: "Margem líquida em nível crítico",
      description: `A margem líquida está em ${formatPercentage(curr.marginPercentage)}, abaixo do limiar de 3% recomendado. Qualquer aumento inesperado de custo pode transformar o período em prejuízo.`,
      impact_value: curr.result,
      impact_description: `Lucro líquido de ${formatCurrency(curr.result)} sobre ${formatCurrency(curr.revenue)}`,
      level: "HIGH",
      type: "warning",
      recommendation: "Prioridade máxima: reduza imediatamente as despesas com maior impacto absoluto e avalie possibilidade de reajuste de preços.",
    });
  }

  // Check multiple MEDIUM variations in same direction → elevate to consolidated HIGH
  const risingExpenses = variations.filter((v) => v.type === "expense" && v.level === "MEDIUM" && v.variation_pct > 0);
  if (risingExpenses.length >= 4) {
    const totalImpact = risingExpenses.reduce((s, v) => s + Math.abs(v.financial_impact), 0);
    alerts.push({
      id: nid(),
      icon: "AlertTriangle",
      title: "Múltiplas despesas em crescimento simultâneo",
      description: `${risingExpenses.length} categorias de despesa apresentam crescimento simultâneo, com impacto combinado de ${formatCurrency(totalImpact)}. Mesmo que individualmente sejam MÉDIO, o efeito consolidado é ALTO.`,
      impact_value: totalImpact,
      impact_description: `${formatCurrency(totalImpact)} de impacto combinado`,
      level: "HIGH",
      type: "warning",
      recommendation: "Realize uma revisão abrangente de contratos e processos. O crescimento simultâneo sugere pressão inflacionária ou ineficiência sistêmica.",
    });
  }

  // Multiple periods trend alert
  if (periods.length >= 3) {
    const margins = periods.map((p) => p.totals.marginPercentage);
    const trend = trendDirection(margins);
    if (trend === "down") {
      const first = margins[0];
      const last = margins[margins.length - 1];
      alerts.push({
        id: nid(),
        icon: "TrendingDown",
        title: "Tendência de queda de margem nos últimos períodos",
        description: `A margem líquida recuou de ${formatPercentage(first)} para ${formatPercentage(last)} ao longo de ${periods.length} períodos — uma tendência decrescente que requer atenção estrutural.`,
        impact_value: Math.abs(last - first),
        impact_description: `Queda acumulada de ${formatPercentage(Math.abs(first - last))} na margem`,
        level: "MEDIUM",
        type: "warning",
        recommendation: "Analise as causas da tendência decrescente. Verifique se há correlação com aumento de custos fixos ou redução de preços.",
      });
    }
  }

  const levelOrder: Record<AlertLevel, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return alerts.sort((a, b) => {
    if (levelOrder[a.level] !== levelOrder[b.level]) return levelOrder[a.level] - levelOrder[b.level];
    return Math.abs(b.impact_value) - Math.abs(a.impact_value);
  });
}

// ── Recommendations ────────────────────────────────────────────────────────────

export function computeRecommendations(
  alerts: AdvancedAlert[],
  variations: AdvancedVariationItem[],
  currentPeriod: DreAnalysisPeriod,
): AdvancedRecommendation[] {
  const recs: AdvancedRecommendation[] = [];
  const revenue = currentPeriod.totals.revenue;

  // From HIGH alerts with specific data
  const highExpenseVariations = variations
    .filter((v) => v.type === "expense" && v.level === "HIGH" && v.variation_pct > 10 && v.financial_impact > 0)
    .slice(0, 3);

  highExpenseVariations.forEach((v) => {
    const potentialSaving = Math.abs(v.financial_impact) * 0.5;
    const marginRecovery = revenue > 0 ? roundCurrency((potentialSaving / revenue) * 100) : 0;
    recs.push({
      priority: recs.length + 1,
      title: `Renegociar ou otimizar custos em "${v.subcategory}"`,
      justification: `"${v.subcategory}" cresceu ${formatPercentage(v.variation_pct)} (de ${formatCurrency(v.previous_value)} para ${formatCurrency(v.current_value)}) enquanto o faturamento não acompanhou proporcionalmente. Impacto direto de ${formatCurrency(Math.abs(v.financial_impact))} na margem.`,
      estimated_impact: potentialSaving > 0 ? `Recuperação estimada de ${formatCurrency(potentialSaving)} (${formatPercentage(marginRecovery)} p.p. de margem) caso o crescimento seja contido em 50%.` : "Impacto a quantificar após diagnóstico operacional.",
      suggested_timeline: "short",
    });
  });

  // Revenue growth recommendation
  const revenueVars = variations.filter((v) => v.type === "revenue" && v.variation_pct < -5);
  if (revenueVars.length > 0) {
    const topRevDrop = revenueVars[0];
    recs.push({
      priority: recs.length + 1,
      title: `Recuperar receita em "${topRevDrop.subcategory}"`,
      justification: `A linha de receita "${topRevDrop.subcategory}" recuou ${formatPercentage(Math.abs(topRevDrop.variation_pct))} — uma redução de ${formatCurrency(Math.abs(topRevDrop.financial_impact))} que pressiona diretamente o resultado.`,
      estimated_impact: `Recuperar 50% da perda representaria ${formatCurrency(Math.abs(topRevDrop.financial_impact) * 0.5)} adicionais no resultado e ${formatPercentage(Math.abs(topRevDrop.margin_impact) * 0.5)} p.p. de margem.`,
      suggested_timeline: "short",
    });
  }

  // Structural cost reduction for critical margin
  if (currentPeriod.totals.marginPercentage < 5 && revenue > 0) {
    recs.push({
      priority: recs.length + 1,
      title: "Revisão estrutural de custos (margem crítica)",
      justification: `Com margem líquida de ${formatPercentage(currentPeriod.totals.marginPercentage)}, a empresa opera em zona de risco. Qualquer variação inesperada pode gerar prejuízo. É necessária uma revisão abrangente da estrutura de custos.`,
      estimated_impact: "Cada 1 p.p. de redução no índice de despesas/faturamento representa " + formatCurrency(revenue * 0.01) + " de melhoria no resultado líquido.",
      suggested_timeline: "short",
    });
  }

  // Fixed costs alert
  const highExpenses = variations.filter((v) => v.type === "expense" && v.level !== "LOW");
  if (highExpenses.length > 3) {
    recs.push({
      priority: recs.length + 1,
      title: "Auditoria de contratos e despesas recorrentes",
      justification: `${highExpenses.length} categorias de despesa apresentam variação relevante. Uma auditoria dos contratos recorrentes pode identificar economia estrutural sem impacto operacional.`,
      estimated_impact: "Reduções típicas de 10% a 20% em contratos renegociados representariam ganho de margem sem redução de capacidade operacional.",
      suggested_timeline: "medium",
    });
  }

  // Revenue diversification
  if (alerts.some((a) => a.title.includes("dependência de receita"))) {
    recs.push({
      priority: recs.length + 1,
      title: "Diversificação de fontes de receita",
      justification: "A concentração elevada de receita em poucos itens aumenta o risco operacional. Uma estratégia de diversificação reduz a vulnerabilidade a variações externas.",
      estimated_impact: "Diversificação para novas linhas de produto/serviço pode reduzir o risco em 20% a 40% mesmo sem aumento imediato de receita.",
      suggested_timeline: "long",
    });
  }

  // Cap at 7 recommendations, re-rank
  return recs.slice(0, 7).map((r, i) => ({ ...r, priority: i + 1 }));
}

// ── Executive Summary ──────────────────────────────────────────────────────────

function generateExecutiveSummary(params: {
  currentPeriod: DreAnalysisPeriod;
  previousPeriod: DreAnalysisPeriod | null;
  periods: DreAnalysisPeriod[];
  currentExpenses: number;
  alerts: AdvancedAlert[];
  variations: AdvancedVariationItem[];
  topRecommendation: AdvancedRecommendation | null;
}): AdvancedDreAnalysis["executive_summary"] {
  const { currentPeriod, previousPeriod, periods, currentExpenses, alerts, variations, topRecommendation } = params;
  const curr = currentPeriod.totals;
  const prev = previousPeriod?.totals;

  // Overview
  let overview = "";
  if (!prev) {
    overview = `A empresa apresentou faturamento de ${formatCurrency(curr.revenue)} e margem líquida de ${formatPercentage(curr.marginPercentage)} no período analisado. O resultado líquido foi de ${formatCurrency(curr.result)}.`;
  } else {
    const revVar = variationPercentage(prev.revenue, curr.revenue);
    const revTrend = revVar > 2 ? `crescimento de ${formatPercentage(revVar)}` : revVar < -2 ? `retração de ${formatPercentage(Math.abs(revVar))}` : "estabilidade";
    const marginDelta = curr.marginPercentage - prev.marginPercentage;
    const marginTrend = marginDelta > 0.5 ? `melhorou ${formatPercentage(marginDelta)}` : marginDelta < -0.5 ? `recuou ${formatPercentage(Math.abs(marginDelta))}` : "manteve-se estável";
    overview = `A empresa apresentou ${revTrend} no faturamento, atingindo ${formatCurrency(curr.revenue)}. A margem líquida ${marginTrend}, chegando a ${formatPercentage(curr.marginPercentage)}.`;
  }

  // Main concern
  const highAlerts = alerts.filter((a) => a.level === "HIGH" && a.type === "warning");
  const main_concern = highAlerts.length > 0
    ? highAlerts[0].title + ": " + highAlerts[0].description
    : alerts.length > 0
      ? alerts[0].title + ": " + alerts[0].description
      : "Nenhum ponto crítico identificado no período analisado.";

  // Causes
  const topExpenseVariations = variations
    .filter((v) => v.type === "expense" && v.variation_pct > 0 && (v.level === "HIGH" || v.level === "MEDIUM"))
    .slice(0, 3);

  const causes: string[] = topExpenseVariations.map((v) =>
    `${v.subcategory} cresceu ${formatPercentage(v.variation_pct)} (de ${formatCurrency(v.previous_value)} para ${formatCurrency(v.current_value)}), adicionando ${formatCurrency(Math.abs(v.financial_impact))} em custos`,
  );
  if (causes.length === 0 && variations.length > 0) {
    causes.push("Variações distribuídas entre múltiplos itens sem um fator dominante identificado.");
  }

  // Impact
  const totalImpact = topExpenseVariations.reduce((s, v) => s + Math.abs(v.financial_impact), 0);
  const marginImpact = curr.revenue > 0 ? roundCurrency((totalImpact / curr.revenue) * 100) : 0;
  const impact = totalImpact > 0
    ? `O impacto combinado das principais variações de custo foi de ${formatCurrency(totalImpact)}, representando ${formatPercentage(marginImpact)} p.p. de compressão de margem.`
    : prev
      ? `O resultado líquido variou de ${formatCurrency(prev.result)} para ${formatCurrency(curr.result)} entre os períodos.`
      : `O resultado líquido do período foi de ${formatCurrency(curr.result)}.`;

  // Direction (projection for 3+ periods)
  let direction = topRecommendation ? `Ação prioritária: ${topRecommendation.title}. ${topRecommendation.justification}` : "Mantenha o monitoramento mensal dos indicadores de margem e despesa.";
  if (periods.length >= 3) {
    const marginValues = periods.map((p) => p.totals.marginPercentage);
    const trend = trendDirection(marginValues);
    if (trend === "down") {
      const projected = roundCurrency(curr.marginPercentage + (curr.marginPercentage - (previousPeriod?.totals.marginPercentage ?? curr.marginPercentage)));
      direction = `Se mantida a trajetória atual, a margem líquida projetada para o próximo período é de ${formatPercentage(projected)}. ` + direction;
    }
  }

  const full_text = [overview, main_concern, causes.join(". "), impact, direction].filter(Boolean).join("\n\n");

  return { overview, main_concern, causes, impact, direction, full_text };
}

// ── Margin Insights ────────────────────────────────────────────────────────────

function generateMarginInsights(
  grossByPeriod: Record<string, number>,
  operatingByPeriod: Record<string, number>,
  periods: DreAnalysisPeriod[],
  isEstimated: boolean,
): string[] {
  const insights: string[] = [];
  if (periods.length === 0) return insights;

  const current = periods[periods.length - 1];
  const grossValues = periods.map((p) => grossByPeriod[p.id] ?? 0);
  const operatingValues = periods.map((p) => operatingByPeriod[p.id] ?? 0);
  const netValues = periods.map((p) => p.totals.marginPercentage);

  const grossTrend = trendDirection(grossValues);
  const netTrend = trendDirection(netValues);

  const trendLabel = (t: "up" | "down" | "stable") => (t === "up" ? "crescente" : t === "down" ? "decrescente" : "estável");

  insights.push(`Margem bruta: tendência ${trendLabel(grossTrend)}${isEstimated ? " (estimada — configure linhas de D&A e juros no modelo para maior precisão)" : ""}.`);
  insights.push(`Margem líquida: tendência ${trendLabel(netTrend)}.`);

  const currentGross = grossByPeriod[current.id] ?? 0;
  const currentNet = current.totals.marginPercentage;
  const gapGrossNet = roundCurrency(currentGross - currentNet);
  if (gapGrossNet > 20) {
    insights.push(`A diferença de ${formatPercentage(gapGrossNet)} entre margem bruta e líquida indica que as despesas operacionais e financeiras consomem uma parcela significativa do faturamento.`);
  }

  if (currentNet < 3) {
    insights.push(`ALERTA: margem líquida de ${formatPercentage(currentNet)} está abaixo de 3% — nível crítico de risco operacional.`);
  }

  if (periods.length >= 2) {
    const prev = periods[periods.length - 2];
    const prevGross = grossByPeriod[prev.id] ?? 0;
    const gapChange = (currentGross - currentNet) - (prevGross - prev.totals.marginPercentage);
    if (gapChange > 2) {
      insights.push(`A diferença entre margem bruta e líquida aumentou ${formatPercentage(gapChange)} — as despesas operacionais estão consumindo proporcionalmente mais do faturamento.`);
    }
  }

  if (!isEstimated && operatingValues.some((v) => v > 0)) {
    const opTrend = trendDirection(operatingValues);
    insights.push(`Margem operacional: tendência ${trendLabel(opTrend)}.`);
  }

  return insights;
}

// ── Main export ────────────────────────────────────────────────────────────────

export function generateAdvancedDreAnalysis(
  result: DreAnalysisResult,
  options: GenerateOptions,
): AdvancedDreAnalysis {
  const { periods, rows } = result;
  const periodsCount = periods.length;
  const currentPeriod = periods[periodsCount - 1];
  const previousPeriod = periodsCount > 1 ? periods[periodsCount - 2] : null;
  const firstPeriod = periods[0];

  if (!currentPeriod) {
    throw new Error("Nenhum período disponível para análise.");
  }

  const subcategoryRows = getSubcategoryRows(rows);
  const expenseRows = subcategoryRows.filter((r) => r.categoryType === "debit");
  const userSumRows = getUserSumRows(rows);
  const catLabels = categoryLabelMap(rows);
  const modelFallback = "Ajuste o modelo de DRE para exibir este indicador";
  const periodFallback = "Selecione 2 ou mais períodos";

  // Expenses per period
  const periodExpenses = computePeriodExpenses(periods, expenseRows);
  const currentExpenses = periodExpenses[currentPeriod.id] ?? 0;
  const previousExpenses = periodExpenses[previousPeriod?.id ?? ""] ?? 0;

  const revenueLineValues = financialValuesByPeriod(getFinancialRow(userSumRows, "revenue"), periods);
  const grossProfitValues = financialValuesByPeriod(getFinancialRow(userSumRows, "gross_profit"), periods);
  const operatingResultValues = financialValuesByPeriod(getFinancialRow(userSumRows, "operating_result"), periods);
  const preTaxProfitValues = financialValuesByPeriod(getFinancialRow(userSumRows, "pre_tax_profit"), periods);
  const netProfitValues = financialValuesByPeriod(getFinancialRow(userSumRows, "net_profit"), periods);
  const ebitdaSourceValues = preTaxProfitValues ?? operatingResultValues;

  // Revenue indicator
  const currentRevenue = currentPeriod.totals.revenue;
  const previousRevenue = previousPeriod?.totals.revenue ?? 0;
  const revenueVariation = previousPeriod && previousRevenue > 0 ? variationPercentage(previousRevenue, currentRevenue) : null;
  const revenueValues = periods.map((p) => p.totals.revenue);

  // Net profit indicator
  const currentResult = netProfitValues?.[currentPeriod.id] ?? 0;
  const previousResult = previousPeriod && netProfitValues ? netProfitValues[previousPeriod.id] ?? 0 : undefined;
  const resultVariation = netProfitValues && previousResult !== undefined && previousResult !== 0 ? variationPercentage(previousResult, currentResult) : null;

  // Total expenses indicator
  const totalExpensesByPeriod = netProfitValues
    ? Object.fromEntries(periods.map((p) => [p.id, roundCurrency(p.totals.revenue - (netProfitValues[p.id] ?? 0))]))
    : null;
  const currentTotalExpenses = totalExpensesByPeriod?.[currentPeriod.id] ?? 0;
  const previousTotalExpenses = previousPeriod && totalExpensesByPeriod ? totalExpensesByPeriod[previousPeriod.id] ?? 0 : undefined;
  const expVariation = totalExpensesByPeriod && previousTotalExpenses !== undefined && previousTotalExpenses !== 0
    ? variationPercentage(previousTotalExpenses, currentTotalExpenses)
    : null;
  const expValues = periods.map((p) => totalExpensesByPeriod?.[p.id] ?? periodExpenses[p.id] ?? 0);

  // Net margin
  const netMarginByPeriod = netProfitValues
    ? Object.fromEntries(periods.map((p) => [p.id, safePercentage(netProfitValues[p.id] ?? 0, p.totals.revenue)]))
    : null;
  const currentNetMargin = netMarginByPeriod?.[currentPeriod.id] ?? 0;
  const previousNetMargin = previousPeriod && netMarginByPeriod ? netMarginByPeriod[previousPeriod.id] : undefined;
  const netMarginVariation = netMarginByPeriod ? metricVariation(previousNetMargin, currentNetMargin) : null;
  const netMarginValues = periods.map((p) => netMarginByPeriod?.[p.id] ?? p.totals.marginPercentage);

  // Gross margin
  const grossPerPeriod = grossProfitValues && revenueLineValues
    ? Object.fromEntries(periods.map((p) => [p.id, safePercentage(grossProfitValues[p.id] ?? 0, revenueLineValues[p.id] ?? 0)]))
    : null;
  const currentGrossMargin = grossPerPeriod?.[currentPeriod.id] ?? 0;
  const previousGrossMargin = previousPeriod && grossPerPeriod ? grossPerPeriod[previousPeriod.id] : undefined;
  const grossMarginVariation = grossPerPeriod ? metricVariation(previousGrossMargin, currentGrossMargin) : null;
  const grossMarginValues = periods.map((p) => grossPerPeriod?.[p.id] ?? 0);

  // Operating margin
  const operatingPerPeriod = operatingResultValues && revenueLineValues
    ? Object.fromEntries(periods.map((p) => [p.id, safePercentage(operatingResultValues[p.id] ?? 0, revenueLineValues[p.id] ?? 0)]))
    : null;
  const currentOpMargin = operatingPerPeriod?.[currentPeriod.id] ?? 0;
  const previousOpMargin = previousPeriod && operatingPerPeriod ? operatingPerPeriod[previousPeriod.id] : undefined;
  const opMarginVariation = operatingPerPeriod ? metricVariation(previousOpMargin, currentOpMargin) : null;
  const opMarginValues = periods.map((p) => operatingPerPeriod?.[p.id] ?? 0);

  // EBITDA (estimated from pre-tax profit, falling back to operating result)
  const ebitdaByPeriod = ebitdaSourceValues
    ? Object.fromEntries(periods.map((p) => [p.id, safePercentage(ebitdaSourceValues[p.id] ?? 0, revenueLineValues?.[p.id] ?? p.totals.revenue)]))
    : null;
  const currentEbitdaMargin = ebitdaByPeriod?.[currentPeriod.id] ?? 0;
  const previousEbitdaMargin = previousPeriod && ebitdaByPeriod ? ebitdaByPeriod[previousPeriod.id] : undefined;
  const ebitdaVariation = ebitdaByPeriod ? metricVariation(previousEbitdaMargin, currentEbitdaMargin) : null;
  const ebitdaValues = periods.map((p) => ebitdaByPeriod?.[p.id] ?? 0);

  // Best/worst periods
  const sortedByMargin = netMarginByPeriod ? [...periods].sort((a, b) => (netMarginByPeriod[b.id] ?? 0) - (netMarginByPeriod[a.id] ?? 0)) : [];
  const best = sortedByMargin[0];
  const worst = sortedByMargin[sortedByMargin.length - 1];

  // Cumulative variation
  const cumRevVar = firstPeriod && periodsCount > 1 ? variationPercentage(firstPeriod.totals.revenue, currentRevenue) : 0;

  // Efficiency index
  const revGrowth = previousRevenue > 0 ? variationPercentage(previousRevenue, currentRevenue) : 0;
  const expGrowth = previousExpenses > 0 ? variationPercentage(previousExpenses, currentExpenses) : 0;
  const efficiencyRaw = expGrowth !== 0 ? roundCurrency(revGrowth / expGrowth) : revGrowth > 0 ? 9.99 : 1;
  const efficiencyIndicatorLevel = efficiencyLevel(efficiencyRaw);
  const efficiencyInterp = efficiencyRaw >= 1
    ? `Receita crescendo ${formatPercentage(revGrowth - expGrowth)} acima das despesas — ganho de eficiência.`
    : `Despesas crescendo ${formatPercentage(expGrowth - revGrowth)} acima da receita — compressão de margem.`;
  const revenueIndicatorLevel = revenueVariation === null ? null : indicatorLevel(revenueVariation, true);
  const netProfitIndicatorLevel = resultVariation === null ? null : indicatorLevel(resultVariation, true);
  const expenseIndicatorLevel = expVariation === null ? null : indicatorLevel(expVariation, false);

  // Variations
  const variations = computeVariations(subcategoryRows, currentPeriod, previousPeriod, catLabels);

  // ABC Curve
  const abc_curve = computeAbcCurve(subcategoryRows, currentPeriod.id, catLabels);

  // Alerts
  const alerts = computeAlerts({
    periods,
    currentPeriod,
    previousPeriod,
    currentExpenses,
    previousExpenses,
    subcategoryRows,
    expenseRows,
    variations,
  });

  // Recommendations
  const recommendations = computeRecommendations(alerts, variations, currentPeriod);

  // Executive summary
  const executive_summary = generateExecutiveSummary({
    currentPeriod,
    previousPeriod,
    periods,
    currentExpenses,
    alerts,
    variations,
    topRecommendation: recommendations[0] ?? null,
  });

  // Charts data
  const revenue_evolution: PeriodChartPoint[] = periods.map((p) => ({ period: p.label, value: p.totals.revenue }));
  const net_income_evolution: PeriodChartPoint[] = periods.map((p) => ({ period: p.label, value: netProfitValues?.[p.id] ?? p.totals.result }));
  const expenses_evolution: PeriodChartPoint[] = periods.map((p) => ({ period: p.label, value: totalExpensesByPeriod?.[p.id] ?? periodExpenses[p.id] ?? 0 }));
  const margin_evolution: MarginChartPoint[] = periods.map((p) => ({
    period: p.label,
    gross: grossPerPeriod?.[p.id] ?? 0,
    operating: operatingPerPeriod?.[p.id] ?? 0,
    net: netMarginByPeriod?.[p.id] ?? p.totals.marginPercentage,
  }));
  const revenue_vs_expenses: RevenueExpensePoint[] = periods.map((p) => ({
    period: p.label,
    revenue: p.totals.revenue,
    expenses: totalExpensesByPeriod?.[p.id] ?? periodExpenses[p.id] ?? 0,
    net_income: netProfitValues?.[p.id] ?? p.totals.result,
  }));

  const topExpensesForChart = [...expenseRows]
    .sort((a, b) => (b.values[currentPeriod.id]?.amount ?? 0) - (a.values[currentPeriod.id]?.amount ?? 0))
    .slice(0, 5)
    .map((r) => ({ name: r.label, value: r.values[currentPeriod.id]?.amount ?? 0 }));

  const expensesDistribution = [...expenseRows]
    .map((r) => ({ name: r.label, value: r.values[currentPeriod.id]?.amount ?? 0 }))
    .filter((i) => i.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const waterfall = buildWaterfallData(rows, currentPeriod.id);

  // Margin data for section
  const grossMarginMap = grossPerPeriod ?? {};
  const operatingMarginMap = operatingPerPeriod ?? {};
  const netMarginMap = netMarginByPeriod ?? Object.fromEntries(periods.map((p) => [p.id, p.totals.marginPercentage]));
  const gross: PeriodChartPoint[] = periods.map((p) => ({ period: p.label, value: grossMarginMap[p.id] ?? 0 }));
  const operating: PeriodChartPoint[] = periods.map((p) => ({ period: p.label, value: operatingMarginMap[p.id] ?? 0 }));
  const net: PeriodChartPoint[] = periods.map((p) => ({ period: p.label, value: netMarginMap[p.id] ?? 0 }));
  const marginInsights = generateMarginInsights(grossMarginMap, operatingMarginMap, periods, !grossPerPeriod || !operatingPerPeriod);

  // Available analyses
  const available_analyses = ["abc_curve", "distribution", "indicators", "waterfall"];
  if (periodsCount >= 2) available_analyses.push("variations", "comparison", "margin_evolution", "revenue_vs_expenses");
  if (periodsCount >= 3) available_analyses.push("trend", "net_income_evolution", "expenses_evolution");
  if (periodsCount >= 7) available_analyses.push("seasonality");

  return {
    executive_summary,
    indicators: {
      revenue: { value: currentRevenue, variation: revenueVariation, level: revenueIndicatorLevel, trend: trendDirection(revenueValues) },
      net_profit: netProfitValues
        ? { value: currentResult, variation: resultVariation, level: netProfitIndicatorLevel, trend: trendDirection(periods.map((p) => netProfitValues[p.id] ?? 0)) }
        : fallbackIndicator(modelFallback),
      gross_margin: grossPerPeriod
        ? { value: currentGrossMargin, variation: grossMarginVariation, level: marginLevel(currentGrossMargin, 40, 25), trend: trendDirection(grossMarginValues), is_estimated: false }
        : fallbackMarginIndicator(modelFallback),
      operating_margin: operatingPerPeriod
        ? { value: currentOpMargin, variation: opMarginVariation, level: marginLevel(currentOpMargin, 15, 5), trend: trendDirection(opMarginValues), is_estimated: false }
        : fallbackMarginIndicator(modelFallback),
      net_margin: netMarginByPeriod
        ? { value: currentNetMargin, variation: netMarginVariation, level: marginLevel(currentNetMargin, 10, 5), trend: trendDirection(netMarginValues), is_estimated: false }
        : fallbackMarginIndicator(modelFallback),
      ebitda: ebitdaByPeriod
        ? { value: currentEbitdaMargin, variation: ebitdaVariation, level: marginLevel(currentEbitdaMargin, 15, 8), trend: trendDirection(ebitdaValues), is_estimated: true }
        : fallbackMarginIndicator(modelFallback),
      total_expenses: totalExpensesByPeriod
        ? { value: currentTotalExpenses, variation: expVariation, level: expenseIndicatorLevel, trend: trendDirection(expValues) }
        : fallbackIndicator(modelFallback),
      best_period: periodsCount >= 2 && netMarginByPeriod && best
        ? { period: best.label, value: netProfitValues?.[best.id] ?? best.totals.result, margin: netMarginByPeriod[best.id] ?? 0 }
        : { period: "-", value: 0, margin: 0, fallbackMessage: periodsCount < 2 ? periodFallback : modelFallback },
      worst_period: periodsCount >= 2 && netMarginByPeriod && worst
        ? { period: worst.label, value: netProfitValues?.[worst.id] ?? worst.totals.result, margin: netMarginByPeriod[worst.id] ?? 0 }
        : { period: "-", value: 0, margin: 0, fallbackMessage: periodsCount < 2 ? periodFallback : modelFallback },
      cumulative_variation: periodsCount >= 2 ? { value: cumRevVar, level: indicatorLevel(cumRevVar, true) } : { value: 0, level: null, fallbackMessage: periodFallback },
      efficiency_index: periodsCount >= 2 ? { value: efficiencyRaw, level: efficiencyIndicatorLevel, interpretation: efficiencyInterp } : { value: 0, level: null, interpretation: "", fallbackMessage: periodFallback },
    },
    variations,
    abc_curve,
    charts_data: {
      revenue_evolution,
      margin_evolution,
      waterfall,
      expenses_distribution: expensesDistribution,
      revenue_vs_expenses,
      top_expenses: topExpensesForChart,
      net_income_evolution,
      expenses_evolution,
    },
    margins: { gross, operating, net, insights: marginInsights },
    alerts,
    recommendations,
    metadata: {
      periods_count: periodsCount,
      sector: options.sector ?? null,
      has_targets: options.hasTargets ?? false,
      model_name: options.modelName,
      generated_at: new Date(),
      available_analyses,
    },
  };
}
