import {
  calculateDreTotals,
  calculateRevenueFromLines,
  calculateSumLineValue,
  effectiveCategoryType,
  formatCompetence,
  formatCurrency,
  formatPercentage,
  resolveDreDisplayLines,
  roundCurrency,
  variationPercentage,
} from "@/lib/dre-calculations";
import type { DreCategoryType, DreDraftLine, DreEntryWithItems, DreModelWithLines } from "@/types/dre";

export type DreAnalysisType = "monthly" | "quarterly" | "semester";

export type DreAnalysisPeriodInput = {
  id: string;
  label: string;
  year: string;
  months: string[];
};

export type DreAnalysisValue = {
  amount: number;
  verticalPercentage: number;
};

export type DreAnalysisPeriod = DreAnalysisPeriodInput & {
  entries: DreEntryWithItems[];
  totals: {
    revenue: number;
    totalCredit: number;
    totalDebit: number;
    result: number;
    marginPercentage: number;
  };
  missingMonths: string[];
};

export type DreAnalysisRow = {
  key: string;
  lineId: string;
  label: string;
  lineType: "category" | "subcategory" | "sum" | "total";
  categoryType: DreCategoryType | "result" | "margin";
  level: 0 | 1;
  displayOrder: number;
  parentKey?: string;
  isSumLine: boolean;
  isNetIncome: boolean;
  subcategoryIsReductive: boolean;
  values: Record<string, DreAnalysisValue>;
};

export type DreAnalysisResult = {
  periods: DreAnalysisPeriod[];
  rows: DreAnalysisRow[];
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

type BuildDreAnalysisParams = {
  model: DreModelWithLines;
  periods: DreAnalysisPeriodInput[];
  entries: DreEntryWithItems[];
};

export function buildDreAnalysisFromModel({ model, periods, entries }: BuildDreAnalysisParams): DreAnalysisResult {
  const modelLines = modelToDraftLines(model);
  const entriesByCompetence = new Map(entries.map((entry) => [entry.competence, entry]));
  const periodLines = new Map<string, DreDraftLine[]>();
  const comparisonPeriods = periods.map((period) => {
    const lines = buildPeriodLines(modelLines, period, entriesByCompetence);
    periodLines.set(period.id, lines);
    return buildAnalysisPeriod(period, lines, entriesByCompetence);
  });
  const rows = buildRowsFromModel(modelLines, comparisonPeriods, periodLines);
  const revenue = comparisonPeriods.reduce((sum, period) => sum + period.totals.revenue, 0);
  const totalCredit = comparisonPeriods.reduce((sum, period) => sum + period.totals.totalCredit, 0);
  const totalDebit = comparisonPeriods.reduce((sum, period) => sum + period.totals.totalDebit, 0);
  const result = comparisonPeriods.reduce((sum, period) => sum + period.totals.result, 0);
  const averageMargin = comparisonPeriods.length ? roundCurrency(comparisonPeriods.reduce((sum, period) => sum + period.totals.marginPercentage, 0) / comparisonPeriods.length) : 0;
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

function buildAnalysisPeriod(
  period: DreAnalysisPeriodInput,
  lines: DreDraftLine[],
  entriesByCompetence: Map<string, DreEntryWithItems>,
): DreAnalysisPeriod {
  const entries = period.months.map((month) => entriesByCompetence.get(month)).filter((entry): entry is DreEntryWithItems => Boolean(entry));
  const totals = calculateDreTotals(lines);
  const revenue = calculateRevenueFromLines(lines);
  const displayLines = resolveDreDisplayLines(lines);
  const netIncomeLine = displayLines.find((line) => line.lineType === "sum" && line.isNetIncome);
  const result = roundCurrency(netIncomeLine?.displayValue ?? totals.result);
  const marginPercentage = revenue > 0 ? roundCurrency((result / revenue) * 100) : totals.marginPercentage;

  return {
    ...period,
    entries,
    totals: {
      revenue,
      totalCredit: totals.totalCredit,
      totalDebit: totals.totalDebit,
      result,
      marginPercentage,
    },
    missingMonths: period.months.filter((month) => !entriesByCompetence.has(month)),
  };
}

function buildPeriodLines(
  modelLines: DreDraftLine[],
  period: DreAnalysisPeriodInput,
  entriesByCompetence: Map<string, DreEntryWithItems>,
) {
  const subcategoryValues = new Map<string, number>();

  period.months.forEach((month) => {
    const entry = entriesByCompetence.get(month);
    entry?.items.filter((item) => item.line_type === "subcategory").forEach((item) => {
      const key = subcategoryValueKey(item.category_id, item.subcategory_id);
      subcategoryValues.set(key, (subcategoryValues.get(key) ?? 0) + Number(item.value || 0));
    });
  });

  const lines = modelLines.map((line) => ({
    ...line,
    value: line.lineType === "subcategory" ? subcategoryValues.get(subcategoryValueKey(line.categoryId, line.subcategoryId)) ?? 0 : 0,
  }));

  return lines.map((line, index) => ({
    ...line,
    value: line.lineType === "category" ? calculateCategoryTotalFromModel(line.categoryId, lines) : line.lineType === "sum" ? calculateSumLineValue(index, lines) : line.value,
  }));
}

function buildRowsFromModel(
  modelLines: DreDraftLine[],
  periods: DreAnalysisPeriod[],
  periodLines: Map<string, DreDraftLine[]>,
) {
  const rows = modelLines.map((line, index): DreAnalysisRow => {
    const key = modelLineKey(line.categoryId, line.subcategoryId, line.lineType, line.displayOrder);
    const values = Object.fromEntries(periods.map((period) => {
      const lineForPeriod = periodLines.get(period.id)?.[index];
      const amount = roundCurrency(lineForPeriod?.value ?? 0);
      return [period.id, { amount, verticalPercentage: calculateVerticalPercentage(amount, period.totals.revenue) }];
    }));

    return {
      key,
      lineId: key,
      label: line.lineType === "category" || line.lineType === "sum" ? line.categoryName : line.subcategoryName ?? "",
      lineType: line.lineType,
      categoryType: line.isNetIncome ? "result" : line.categoryType,
      level: line.lineType === "subcategory" ? 1 : 0,
      displayOrder: line.displayOrder,
      parentKey: line.lineType === "subcategory" ? modelLineKey(line.categoryId, null, "category", Math.floor(line.displayOrder / 1000) * 1000) : undefined,
      isSumLine: line.lineType === "sum",
      isNetIncome: line.lineType === "sum" && line.isNetIncome,
      subcategoryIsReductive: line.lineType === "subcategory" && line.subcategoryIsReductive,
      values,
    };
  });

  return [
    ...rows,
    buildTotalRow("total-revenue", "Faturamento", "credit", 900000, periods, (period) => period.totals.revenue),
    buildTotalRow("total-debit", "Total de Debitos", "debit", 900001, periods, (period) => period.totals.totalDebit),
    buildTotalRow("result", "Resultado", "result", 900002, periods, (period) => period.totals.result),
    buildTotalRow("margin", "Margem de Lucro", "margin", 900003, periods, (period) => period.totals.marginPercentage),
  ];
}

function buildTotalRow(
  key: string,
  label: string,
  categoryType: DreAnalysisRow["categoryType"],
  displayOrder: number,
  periods: DreAnalysisPeriod[],
  getAmount: (period: DreAnalysisPeriod) => number,
  isNetIncome = false,
): DreAnalysisRow {
  const values = Object.fromEntries(periods.map((period) => {
    const amount = roundCurrency(getAmount(period));
    return [period.id, { amount, verticalPercentage: categoryType === "margin" ? 0 : calculateVerticalPercentage(amount, period.totals.revenue) }];
  }));

  return {
    key,
    lineId: key,
    label,
    lineType: "total",
    categoryType,
    level: 0,
    displayOrder,
    isSumLine: true,
    isNetIncome,
    subcategoryIsReductive: false,
    values,
  };
}

function modelToDraftLines(model: DreModelWithLines): DreDraftLine[] {
  return [...model.lines].sort((a, b) => a.display_order - b.display_order).map((line) => ({
    categoryId: line.category_id,
    subcategoryId: line.subcategory_id,
    categoryName: line.line_type === "sum" ? line.sum_label ?? "Subtotal" : line.category?.name ?? "Categoria",
    subcategoryName: line.subcategory?.name ?? null,
    categoryType: line.category?.type ?? "debit",
    categoryIsRevenue: line.category?.is_revenue ?? false,
    isNetIncome: line.is_net_income ?? false,
    subcategoryIsReductive: line.subcategory?.is_reductive ?? false,
    lineType: line.line_type,
    displayOrder: line.display_order,
    value: 0,
  }));
}

function calculateCategoryTotalFromModel(categoryId: string | null, lines: DreDraftLine[]) {
  if (!categoryId) return 0;

  const categoryType = lines.find((line) => line.categoryId === categoryId)?.categoryType ?? "debit";
  const signedTotal = lines
    .filter((line) => line.lineType === "subcategory" && line.categoryId === categoryId)
    .reduce((sum, line) => sum + (effectiveCategoryType(line) === "credit" ? Number(line.value || 0) : -Number(line.value || 0)), 0);

  return roundCurrency(categoryType === "credit" ? signedTotal : signedTotal * -1);
}

function calculateVerticalPercentage(amount: number, revenue: number) {
  if (!revenue) return 0;
  return roundCurrency((amount / revenue) * 100);
}

function modelLineKey(categoryId: string | null, subcategoryId: string | null, lineType: DreDraftLine["lineType"], displayOrder: number) {
  if (lineType === "category") return `category::${categoryId ?? "none"}::${displayOrder}`;
  if (lineType === "subcategory") return `subcategory::${categoryId ?? "none"}::${subcategoryId ?? "none"}::${displayOrder}`;
  return `sum::${displayOrder}`;
}

function subcategoryValueKey(categoryId: string | null, subcategoryId: string | null) {
  return `subcategory-value::${categoryId ?? "none"}::${subcategoryId ?? "none"}`;
}

export function buildSelectableDreAnalysisPeriods(type: DreAnalysisType, years: string[], competences: string[]): DreAnalysisPeriodInput[] {
  const entryCompetences = new Set(competences);

  if (type === "monthly") {
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

export function dreAnalysisTableHtml(result: DreAnalysisResult, showVariation: boolean, showVerticalAnalysis: boolean) {
  return `<table><thead><tr><th>Categoria / Subcategoria</th>${result.periods.map((period, index) => `<th>${escapeHtml(period.label)}</th>${showVariation && index > 0 ? "<th>Var. anterior</th>" : ""}`).join("")}</tr></thead><tbody>
    ${result.rows.map((row) => `<tr class="${row.lineType === "category" ? "cat" : row.lineType === "subcategory" ? "sub" : "total"}"><td>${escapeHtml(formatDreAnalysisRowLabel(row))}${row.isNetIncome ? " - LUCRO LIQUIDO" : ""}</td>${result.periods.map((period, index) => {
      const current = row.values[period.id]?.amount ?? 0;
      const previous = index > 0 ? result.rows.find((candidate) => candidate.key === row.key)?.values[result.periods[index - 1].id]?.amount ?? 0 : 0;
      const variation = current - previous;
      const value = row.categoryType === "margin" ? formatPercentage(current) : formatCurrency(current);
      const vertical = showVerticalAnalysis && row.categoryType !== "margin" ? `<br /><small>${formatPercentage(row.values[period.id]?.verticalPercentage ?? 0)}</small>` : "";
      return `<td>${value}${vertical}</td>${showVariation && index > 0 ? `<td class="${isGoodDreAnalysisVariation(row.categoryType, variation) ? "positive" : "negative"}">${formatCurrency(variation)} / ${formatPercentage(variationPercentage(previous, current))}</td>` : ""}`;
    }).join("")}</tr>`).join("")}
  </tbody></table>`;
}

export function formatDreAnalysisRowLabel(row: Pick<DreAnalysisRow, "label" | "lineType" | "subcategoryIsReductive">) {
  return row.lineType === "subcategory" && row.subcategoryIsReductive ? `${row.label} (redutora)` : row.label;
}

export function isGoodDreAnalysisVariation(categoryType: DreAnalysisRow["categoryType"], difference: number) {
  if (difference === 0 || categoryType === "margin") return true;
  return categoryType === "credit" || categoryType === "result" ? difference > 0 : difference < 0;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
