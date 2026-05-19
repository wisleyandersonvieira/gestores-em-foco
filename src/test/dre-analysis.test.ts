import { describe, expect, it } from "vitest";

import { buildDreAnalysisFromModel, dreAnalysisTableHtml } from "@/lib/dre-analysis";
import type { DreEntryItem, DreEntryWithItems, DreModelWithLines } from "@/types/dre";

describe("DRE analysis from model", () => {
  it("respects model order and includes configured sum lines", () => {
    const result = buildDreAnalysisFromModel({
      model: modelFixture(),
      periods: [{ id: "2026-03", label: "Marco/2026", year: "2026", months: ["2026-03"] }],
      entries: [entryFixture("2026-03", { sales: 1000, returns: 100, costs: 300 })],
    });

    expect(result.rows.map((row) => row.label).slice(0, 8)).toEqual([
      "Receita Bruta",
      "Vendas",
      "Devolucoes",
      "Receita Liquida",
      "Custos",
      "CPV",
      "Lucro Bruto",
      "Outra soma",
    ]);
    expect(result.rows.find((row) => row.label === "Receita Liquida")?.values["2026-03"].amount).toBe(900);
    expect(result.rows.find((row) => row.label === "Lucro Bruto")?.values["2026-03"].amount).toBe(600);
  });

  it("uses the configured net income line for cards instead of assuming the last line", () => {
    const result = buildDreAnalysisFromModel({
      model: modelFixture(),
      periods: [
        { id: "2026-03", label: "Marco/2026", year: "2026", months: ["2026-03"] },
        { id: "2026-04", label: "Abril/2026", year: "2026", months: ["2026-04"] },
      ],
      entries: [
        entryFixture("2026-03", { sales: 1000, returns: 100, costs: 300 }),
        entryFixture("2026-04", { sales: 2000, returns: 0, costs: 600 }),
      ],
    });

    expect(result.rows.find((row) => row.label === "Lucro Bruto")?.isNetIncome).toBe(true);
    expect(result.rows.find((row) => row.label === "Outra soma")?.isNetIncome).toBe(false);
    expect(result.summary.result).toBe(2000);
    expect(result.summary.bestPeriod).toBe("Abril/2026");
    expect(result.summary.worstPeriod).toBe("Marco/2026");
  });

  it("uses configured revenue categories and reductive subcategories as the vertical-analysis base", () => {
    const result = buildDreAnalysisFromModel({
      model: modelFixture(),
      periods: [{ id: "2026-03", label: "Marco/2026", year: "2026", months: ["2026-03"] }],
      entries: [entryFixture("2026-03", { sales: 1000, returns: 100, costs: 300 })],
    });
    const revenueRow = result.rows.find((row) => row.label === "Faturamento");
    const netIncomeRow = result.rows.find((row) => row.label === "Lucro Bruto");

    expect(result.summary.revenue).toBe(900);
    expect(revenueRow?.values["2026-03"].amount).toBe(900);
    expect(netIncomeRow?.values["2026-03"].verticalPercentage).toBe(66.67);
  });

  it("keeps vertical analysis stable when period revenue is zero", () => {
    const result = buildDreAnalysisFromModel({
      model: modelFixture(),
      periods: [{ id: "2026-05", label: "Maio/2026", year: "2026", months: ["2026-05"] }],
      entries: [entryFixture("2026-05", { sales: 0, returns: 0, costs: 300 })],
    });

    expect(result.summary.revenue).toBe(0);
    expect(result.rows.find((row) => row.label === "CPV")?.values["2026-05"].verticalPercentage).toBe(0);
  });

  it("exports vertical percentages in the shared PDF/Excel table HTML when enabled", () => {
    const result = buildDreAnalysisFromModel({
      model: modelFixture(),
      periods: [{ id: "2026-03", label: "Marco/2026", year: "2026", months: ["2026-03"] }],
      entries: [entryFixture("2026-03", { sales: 1000, returns: 100, costs: 300 })],
    });

    expect(dreAnalysisTableHtml(result, false, true)).toContain("<small>66,67%</small>");
    expect(dreAnalysisTableHtml(result, false, false)).not.toContain("<small>66,67%</small>");
  });
});

function modelFixture(): DreModelWithLines {
  return {
    id: "model",
    user_id: "user",
    name: "Modelo",
    description: null,
    status: "active",
    created_at: "",
    updated_at: "",
    lines: [
      modelLine({ id: "line-revenue", category_id: "revenue", line_type: "category", display_order: 0, category: category("revenue", "Receita Bruta", "credit", true) }),
      modelLine({ id: "line-sales", category_id: "revenue", subcategory_id: "sales", line_type: "subcategory", parent_category_id: "revenue", display_order: 1, category: category("revenue", "Receita Bruta", "credit", true), subcategory: subcategory("sales", "Vendas", false) }),
      modelLine({ id: "line-returns", category_id: "revenue", subcategory_id: "returns", line_type: "subcategory", parent_category_id: "revenue", display_order: 2, category: category("revenue", "Receita Bruta", "credit", true), subcategory: subcategory("returns", "Devolucoes", true) }),
      modelLine({ id: "line-net-revenue", category_id: null, subcategory_id: null, line_type: "sum", sum_label: "Receita Liquida", display_order: 1000 }),
      modelLine({ id: "line-costs", category_id: "costs", line_type: "category", display_order: 2000, category: category("costs", "Custos", "debit", false) }),
      modelLine({ id: "line-cpv", category_id: "costs", subcategory_id: "cpv", line_type: "subcategory", parent_category_id: "costs", display_order: 2001, category: category("costs", "Custos", "debit", false), subcategory: subcategory("cpv", "CPV", false) }),
      modelLine({ id: "line-net-income", category_id: null, subcategory_id: null, line_type: "sum", sum_label: "Lucro Bruto", display_order: 3000, is_net_income: true }),
      modelLine({ id: "line-last", category_id: null, subcategory_id: null, line_type: "sum", sum_label: "Outra soma", display_order: 4000 }),
    ],
  } as DreModelWithLines;
}

function entryFixture(competence: string, values: { sales: number; returns: number; costs: number }): DreEntryWithItems {
  const items = [
    item({ category_id: "revenue", subcategory_id: "sales", category_name_snapshot: "Receita Bruta", subcategory_name_snapshot: "Vendas", category_type_snapshot: "credit", category_is_revenue: true, display_order: 1, value: values.sales }),
    item({ category_id: "revenue", subcategory_id: "returns", category_name_snapshot: "Receita Bruta", subcategory_name_snapshot: "Devolucoes", category_type_snapshot: "credit", category_is_revenue: true, subcategory_is_reductive: true, display_order: 2, value: values.returns }),
    item({ category_id: "costs", subcategory_id: "cpv", category_name_snapshot: "Custos", subcategory_name_snapshot: "CPV", category_type_snapshot: "debit", display_order: 2001, value: values.costs }),
  ];

  return {
    id: `entry-${competence}`,
    user_id: "user",
    model_id: "model",
    competence,
    status: "finalized",
    total_credit: values.sales,
    total_debit: values.returns + values.costs,
    result: values.sales - values.returns - values.costs,
    margin_percentage: 0,
    created_at: "",
    updated_at: "",
    model: { id: "model", name: "Modelo" },
    items,
  } as DreEntryWithItems;
}

function modelLine(overrides: Record<string, unknown>) {
  return {
    id: "line",
    user_id: "user",
    model_id: "model",
    category_id: null,
    subcategory_id: null,
    parent_category_id: null,
    line_type: "sum",
    sum_label: null,
    is_net_income: false,
    display_order: 0,
    created_at: "",
    updated_at: "",
    category: null,
    subcategory: null,
    ...overrides,
  };
}

function category(id: string, name: string, type: "credit" | "debit", isRevenue: boolean) {
  return { id, user_id: "user", name, type, is_revenue: isRevenue, status: "active", display_order: 0, created_at: "", updated_at: "" };
}

function subcategory(id: string, name: string, isReductive: boolean) {
  return { id, user_id: "user", category_id: "category", name, is_reductive: isReductive, status: "active", display_order: 0, created_at: "", updated_at: "" };
}

function item(overrides: Partial<DreEntryItem>): DreEntryItem {
  return {
    id: "item",
    user_id: "user",
    dre_entry_id: "entry",
    category_id: "cat",
    subcategory_id: "sub",
    category_name_snapshot: "Categoria",
    subcategory_name_snapshot: "Subcategoria",
    category_type_snapshot: "credit",
    line_type: "subcategory",
    display_order: 1,
    value: 0,
    created_at: "",
    updated_at: "",
    category_is_revenue: false,
    is_net_income: false,
    subcategory_is_reductive: false,
    ...overrides,
  };
}
