import { describe, expect, it } from "vitest";

import { buildManagerialDreReport, normalizeManagerialLabel } from "@/lib/dre-managerial-analysis";
import type { DreAnalysisResult, DreAnalysisRow } from "@/lib/dre-analysis";

describe("managerial DRE analysis", () => {
  it("classifies revenue drops and expense AV deterioration by managerial nature", () => {
    const report = buildManagerialDreReport(resultFixture(), "Modelo Teste");

    const revenue = report.rows.find((row) => row.normalizedLabel === "Receita Bruta");
    const expense = report.rows.find((row) => row.normalizedLabel === "Despesa com Pessoal");

    expect(revenue?.status).toBe("critical");
    expect(revenue?.variationLabel).toBe("-20,00%");
    expect(expense?.status).toBe("critical");
    expect(expense?.verticalPointVariation).toBe(5);
    expect(report.alerts.map((alert) => alert.normalizedLabel)).toContain("Receita Bruta");
    expect(report.alerts.map((alert) => alert.normalizedLabel)).toContain("Despesa com Pessoal");
  });

  it("uses explicit zero-base variation labels instead of reporting 100 percent", () => {
    const report = buildManagerialDreReport(resultFixture(), "Modelo Teste");

    const newLine = report.rows.find((row) => row.normalizedLabel === "Nova Receita");
    const zeroed = report.rows.find((row) => row.normalizedLabel === "Despesa Zerada");

    expect(newLine?.variationLabel).toBe("Novo lançamento");
    expect(newLine?.status).toBe("new");
    expect(zeroed?.variationLabel).toBe("Zerado no período");
    expect(zeroed?.status).toBe("zeroed");
  });

  it("normalizes common DRE label typos only for report display", () => {
    expect(normalizeManagerialLabel("Assitencia medica e social")).toBe("Assistência médica e social");
    expect(normalizeManagerialLabel("Lucro Líquido - LUCRO LIQUIDO")).toBe("Lucro Líquido");
  });
});

function resultFixture(): DreAnalysisResult {
  const periods = [
    {
      id: "2026-04",
      label: "Abril/2026",
      year: "2026",
      months: ["2026-04"],
      entries: [],
      missingMonths: [],
      totals: { revenue: 1000, totalCredit: 1000, totalDebit: 800, result: 200, marginPercentage: 20 },
    },
    {
      id: "2026-05",
      label: "Maio/2026",
      year: "2026",
      months: ["2026-05"],
      entries: [],
      missingMonths: [],
      totals: { revenue: 800, totalCredit: 800, totalDebit: 760, result: 40, marginPercentage: 5 },
    },
  ];

  const rows: DreAnalysisRow[] = [
    row("revenue", "Receita Bruta", "category", "credit", { "2026-04": { amount: 1000, verticalPercentage: 100 }, "2026-05": { amount: 800, verticalPercentage: 100 } }),
    row("new", "Nova Receita", "subcategory", "credit", { "2026-04": { amount: 0, verticalPercentage: 0 }, "2026-05": { amount: 80, verticalPercentage: 10 } }),
    row("expense", "Despesa com Pessoal", "subcategory", "debit", { "2026-04": { amount: 100, verticalPercentage: 10 }, "2026-05": { amount: 120, verticalPercentage: 15 } }),
    row("zeroed", "Despesa Zerada", "subcategory", "debit", { "2026-04": { amount: 50, verticalPercentage: 5 }, "2026-05": { amount: 0, verticalPercentage: 0 } }),
    row("net", "Lucro Liquido", "sum", "result", { "2026-04": { amount: 200, verticalPercentage: 20 }, "2026-05": { amount: 40, verticalPercentage: 5 } }, "net_profit"),
    row("margin", "Margem de Lucro", "total", "margin", { "2026-04": { amount: 20, verticalPercentage: 0 }, "2026-05": { amount: 5, verticalPercentage: 0 } }),
  ];

  return {
    periods,
    rows,
    summary: { totalCredit: 1800, revenue: 1800, totalDebit: 1560, result: 240, averageMargin: 12.5, bestPeriod: "Abril/2026", worstPeriod: "Maio/2026" },
  };
}

function row(
  key: string,
  label: string,
  lineType: DreAnalysisRow["lineType"],
  categoryType: DreAnalysisRow["categoryType"],
  values: DreAnalysisRow["values"],
  financialType: DreAnalysisRow["financialType"] = null,
): DreAnalysisRow {
  return {
    key,
    lineId: key,
    label,
    lineType,
    categoryType,
    financialType,
    level: lineType === "subcategory" ? 1 : 0,
    displayOrder: 1,
    isSumLine: lineType === "sum" || lineType === "total",
    isNetIncome: financialType === "net_profit",
    subcategoryIsReductive: false,
    values,
  };
}
