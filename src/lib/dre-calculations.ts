import type { DreCategory, DreCategoryType, DreDisplayLine, DreDraftLine, DreEntry, DreEntryItem, DreModelLine, DreTotals } from "@/types/dre";

export const DRE_PRODUCT_KEY = "gestor-dre";
export const DRE_PRODUCT_NAME = "Gestor de DRE";

export const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function currentCompetence() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function formatCompetence(competence: string) {
  const [year, month] = competence.split("-");
  const monthIndex = Number(month) - 1;
  return `${monthNames[monthIndex] ?? month}/${year}`;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

export function formatPercentage(value: number) {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value || 0)}%`;
}

export function parseCurrencyInput(value: string) {
  const normalized = value.replace(/\s/g, "").replace("R$", "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toCurrencyInput(value: number) {
  return formatCurrency(value).replace(/\u00a0/g, " ");
}

export function resolveFinancialBehavior(categoryType: DreCategoryType, isReductive: boolean): DreCategoryType {
  if (!isReductive) {
    return categoryType;
  }

  return categoryType === "debit" ? "credit" : "debit";
}

export function effectiveCategoryType(line: Pick<DreDraftLine, "categoryType" | "subcategoryIsReductive">): DreCategoryType {
  return resolveFinancialBehavior(line.categoryType, line.subcategoryIsReductive);
}

export function getNetIncomeLine<T extends { is_net_income?: boolean | null; line_type?: string | null }>(modelLines: T[]) {
  return modelLines.find((line) => line.is_net_income === true && line.line_type === "sum");
}

export function assertSingleNetIncomeLine(modelLines: Array<Pick<DreModelLine, "is_net_income" | "line_type">>) {
  const markedLines = modelLines.filter((line) => line.is_net_income === true);
  if (markedLines.some((line) => line.line_type !== "sum")) {
    throw new Error("Apenas linhas de soma podem representar o lucro liquido.");
  }
  if (markedLines.length > 1) {
    throw new Error("Selecione apenas uma linha de soma como lucro liquido.");
  }
}

export function getRevenueCategories<T extends Pick<DreCategory, "is_revenue" | "type">>(categories: T[]) {
  return categories.filter((category) => category.is_revenue === true && category.type === "credit");
}

export function validateRevenueCategory(category: Pick<DreCategory, "is_revenue" | "type">) {
  if (category.is_revenue && category.type !== "credit") {
    throw new Error("Apenas categorias de credito podem compor o faturamento.");
  }
}

function signedLineValue(line: Pick<DreDraftLine, "categoryType" | "subcategoryIsReductive" | "value">) {
  const value = Number(line.value || 0);
  return effectiveCategoryType(line) === "credit" ? value : -value;
}

type CalculableLine = Pick<DreDraftLine, "lineType" | "categoryType" | "value"> & {
  categoryIsRevenue?: boolean;
  subcategoryIsReductive?: boolean;
};

export function calculateDreTotals(lines: CalculableLine[]): DreTotals {
  const subcategoryLines = lines.filter((line) => line.lineType === "subcategory");
  const totalCredit = roundCurrency(subcategoryLines.filter((line) => effectiveCategoryType({ ...line, subcategoryIsReductive: line.subcategoryIsReductive ?? false }) === "credit").reduce((sum, line) => sum + Number(line.value || 0), 0));
  const totalDebit = roundCurrency(subcategoryLines.filter((line) => effectiveCategoryType({ ...line, subcategoryIsReductive: line.subcategoryIsReductive ?? false }) === "debit").reduce((sum, line) => sum + Number(line.value || 0), 0));
  const result = roundCurrency(totalCredit - totalDebit);
  const revenue = roundCurrency(subcategoryLines.filter((line) => line.categoryIsRevenue).reduce((sum, line) => sum + Number(line.value || 0), 0));
  const marginBase = revenue > 0 ? revenue : totalCredit;
  const marginPercentage = marginBase > 0 ? roundCurrency((result / marginBase) * 100) : 0;

  return { totalCredit, totalDebit, result, marginPercentage };
}

export function calculateRevenueFromLines(lines: Array<Pick<DreDraftLine, "lineType" | "categoryIsRevenue" | "value">>) {
  return roundCurrency(
    lines
      .filter((line) => line.lineType === "subcategory" && line.categoryIsRevenue)
      .reduce((sum, line) => sum + Number(line.value || 0), 0),
  );
}

export function calculateNetIncomeFromLines(lines: Array<Pick<DreDraftLine, "lineType" | "isNetIncome" | "value">>, fallback: number) {
  const netIncomeLine = lines.find((line) => line.lineType === "sum" && line.isNetIncome);
  return roundCurrency(netIncomeLine ? Number(netIncomeLine.value || 0) : fallback);
}

export function calculateRevenueFromEntryItems(items: DreEntryItem[]) {
  return roundCurrency(
    items
      .filter((item) => item.line_type === "subcategory" && item.category_is_revenue)
      .reduce((sum, item) => sum + Number(item.value || 0), 0),
  );
}

export function calculateEffectiveTotalsFromEntryItems(items: DreEntryItem[]): DreTotals {
  return calculateDreTotals(
    items.map((item) => ({
      lineType: item.line_type,
      categoryType: item.category_type_snapshot,
      subcategoryIsReductive: item.subcategory_is_reductive ?? false,
      value: Number(item.value || 0),
    })),
  );
}

export function calculateNetIncomeFromEntryItems(items: DreEntryItem[], fallback: number) {
  const netIncomeLine = items.find((item) => item.line_type === "sum" && item.is_net_income);
  return roundCurrency(netIncomeLine ? Number(netIncomeLine.value || 0) : fallback);
}

export function calculateCategoryTotal(categoryId: string | null, lines: DreDraftLine[]) {
  if (!categoryId) return 0;

  const categoryType = lines.find((line) => line.categoryId === categoryId)?.categoryType ?? "debit";
  const signedTotal = lines
    .filter((line) => line.lineType === "subcategory" && line.categoryId === categoryId)
    .reduce((sum, line) => sum + signedLineValue(line), 0);

  return roundCurrency(categoryType === "credit" ? signedTotal : signedTotal * -1);
}

export function calculateSumLineValue(lineIndex: number, lines: DreDraftLine[]) {
  const previousSubcategoryLines = lines.slice(0, lineIndex).filter((line) => line.lineType === "subcategory");
  return roundCurrency(previousSubcategoryLines.reduce((sum, line) => sum + signedLineValue(line), 0));
}

export function entryItemsToDraftLines(items: DreEntryItem[]): DreDraftLine[] {
  return items.map((item) => ({
    categoryId: item.category_id,
    subcategoryId: item.subcategory_id,
    categoryName: item.category_name_snapshot,
    subcategoryName: item.subcategory_name_snapshot,
    categoryType: item.category_type_snapshot,
    categoryIsRevenue: item.category_is_revenue ?? false,
    isNetIncome: item.is_net_income ?? false,
    subcategoryIsReductive: item.subcategory_is_reductive ?? false,
    lineType: item.line_type,
    displayOrder: item.display_order,
    value: Number(item.value || 0),
  }));
}

export function resolveDreDisplayLines(lines: DreDraftLine[]): DreDisplayLine[] {
  return lines.map((line, index) => ({
    ...line,
    description: line.lineType === "category" || line.lineType === "sum" ? line.categoryName : line.subcategoryName ?? "",
    displayValue: line.lineType === "category" ? calculateCategoryTotal(line.categoryId, lines) : line.lineType === "sum" ? calculateSumLineValue(index, lines) : line.value,
  }));
}

export function calculateEntryTotals(entry: DreEntry, items: DreEntryItem[]) {
  const totals = calculateDreTotals(
    items.map((item) => ({
      lineType: item.line_type,
      categoryType: item.category_type_snapshot,
      categoryIsRevenue: item.category_is_revenue ?? false,
      subcategoryIsReductive: item.subcategory_is_reductive ?? false,
      value: Number(item.value || 0),
    })),
  );

  return {
    ...entry,
    total_credit: totals.totalCredit,
    total_debit: totals.totalDebit,
    result: calculateNetIncomeFromEntryItems(items, totals.result),
    margin_percentage: calculateRevenueFromEntryItems(items) > 0 ? roundCurrency((calculateNetIncomeFromEntryItems(items, totals.result) / calculateRevenueFromEntryItems(items)) * 100) : totals.marginPercentage,
  };
}

export function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function competenceOptionsAroundCurrent() {
  const now = new Date();
  const options: string[] = [];

  for (let offset = -12; offset <= 12; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    options.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  }

  return options;
}

export function variationPercentage(previous: number, current: number) {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return roundCurrency(((current - previous) / Math.abs(previous)) * 100);
}
