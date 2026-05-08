import type { DreDraftLine, DreEntry, DreEntryItem, DreTotals } from "@/types/dre";

export const DRE_PRODUCT_KEY = "dre_facil";
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

export function calculateDreTotals(lines: Array<Pick<DreDraftLine, "lineType" | "categoryType" | "value">>): DreTotals {
  const subcategoryLines = lines.filter((line) => line.lineType === "subcategory");
  const totalCredit = roundCurrency(subcategoryLines.filter((line) => line.categoryType === "credit").reduce((sum, line) => sum + Number(line.value || 0), 0));
  const totalDebit = roundCurrency(subcategoryLines.filter((line) => line.categoryType === "debit").reduce((sum, line) => sum + Number(line.value || 0), 0));
  const result = roundCurrency(totalCredit - totalDebit);
  const marginPercentage = totalCredit > 0 ? roundCurrency((result / totalCredit) * 100) : 0;

  return { totalCredit, totalDebit, result, marginPercentage };
}

export function calculateCategoryTotal(categoryId: string | null, lines: DreDraftLine[]) {
  if (!categoryId) return 0;

  return roundCurrency(
    lines
      .filter((line) => line.lineType === "subcategory" && line.categoryId === categoryId)
      .reduce((sum, line) => sum + Number(line.value || 0), 0),
  );
}

export function calculateEntryTotals(entry: DreEntry, items: DreEntryItem[]) {
  const totals = calculateDreTotals(
    items.map((item) => ({
      lineType: item.line_type,
      categoryType: item.category_type_snapshot,
      value: Number(item.value || 0),
    })),
  );

  return {
    ...entry,
    total_credit: totals.totalCredit,
    total_debit: totals.totalDebit,
    result: totals.result,
    margin_percentage: totals.marginPercentage,
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
