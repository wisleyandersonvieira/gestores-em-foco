import { describe, expect, it } from "vitest";

import {
  computeAbcCurve,
  computeAlerts,
  computeVariations,
  determineAlertLevel,
  generateAdvancedDreAnalysis,
  type AlertLevel,
} from "@/lib/dre-advanced-analysis";
import { buildDreAnalysisFromModel } from "@/lib/dre-analysis";
import type { DreAnalysisRow, DreAnalysisPeriod } from "@/lib/dre-analysis";
import type { DreEntryItem, DreEntryWithItems, DreModelWithLines } from "@/types/dre";

// ── Fixture helpers ────────────────────────────────────────────────────────────

function makeModel(): DreModelWithLines {
  return {
    id: "model",
    user_id: "user",
    name: "Modelo Teste",
    description: null,
    status: "active",
    created_at: "",
    updated_at: "",
    lines: [
      modelLine({ id: "l-rev-cat", category_id: "rev", line_type: "category", display_order: 0, category: cat("rev", "Receita Bruta", "credit", true) }),
      modelLine({ id: "l-sales", category_id: "rev", subcategory_id: "sales", line_type: "subcategory", parent_category_id: "rev", display_order: 1, category: cat("rev", "Receita Bruta", "credit", true), subcategory: sub("sales", "Vendas", false) }),
      modelLine({ id: "l-returns", category_id: "rev", subcategory_id: "returns", line_type: "subcategory", parent_category_id: "rev", display_order: 2, category: cat("rev", "Receita Bruta", "credit", true), subcategory: sub("returns", "Devolucoes", true) }),
      modelLine({ id: "l-gross", category_id: null, subcategory_id: null, line_type: "sum", sum_label: "Receita Liquida", display_order: 1000 }),
      modelLine({ id: "l-cost-cat", category_id: "costs", line_type: "category", display_order: 2000, category: cat("costs", "Custos", "debit", false) }),
      modelLine({ id: "l-cpv", category_id: "costs", subcategory_id: "cpv", line_type: "subcategory", parent_category_id: "costs", display_order: 2001, category: cat("costs", "Custos", "debit", false), subcategory: sub("cpv", "CPV", false) }),
      modelLine({ id: "l-exp-cat", category_id: "exp", line_type: "category", display_order: 3000, category: cat("exp", "Despesas Operacionais", "debit", false) }),
      modelLine({ id: "l-admin", category_id: "exp", subcategory_id: "admin", line_type: "subcategory", parent_category_id: "exp", display_order: 3001, category: cat("exp", "Despesas Operacionais", "debit", false), subcategory: sub("admin", "Administrativo", false) }),
      modelLine({ id: "l-freight", category_id: "exp", subcategory_id: "freight", line_type: "subcategory", parent_category_id: "exp", display_order: 3002, category: cat("exp", "Despesas Operacionais", "debit", false), subcategory: sub("freight", "Fretes", false) }),
      modelLine({ id: "l-net", category_id: null, subcategory_id: null, line_type: "sum", sum_label: "Lucro Liquido", display_order: 4000, is_net_income: true }),
    ],
  } as DreModelWithLines;
}

function makeEntry(competence: string, values: { sales: number; returns?: number; cpv: number; admin: number; freight: number }): DreEntryWithItems {
  const { sales, returns = 0, cpv, admin, freight } = values;
  const items: DreEntryItem[] = [
    item({ category_id: "rev", subcategory_id: "sales", category_name_snapshot: "Receita Bruta", subcategory_name_snapshot: "Vendas", category_type_snapshot: "credit", category_is_revenue: true, display_order: 1, value: sales }),
    item({ category_id: "rev", subcategory_id: "returns", category_name_snapshot: "Receita Bruta", subcategory_name_snapshot: "Devolucoes", category_type_snapshot: "credit", category_is_revenue: true, subcategory_is_reductive: true, display_order: 2, value: returns }),
    item({ category_id: "costs", subcategory_id: "cpv", category_name_snapshot: "Custos", subcategory_name_snapshot: "CPV", category_type_snapshot: "debit", display_order: 2001, value: cpv }),
    item({ category_id: "exp", subcategory_id: "admin", category_name_snapshot: "Despesas Operacionais", subcategory_name_snapshot: "Administrativo", category_type_snapshot: "debit", display_order: 3001, value: admin }),
    item({ category_id: "exp", subcategory_id: "freight", category_name_snapshot: "Despesas Operacionais", subcategory_name_snapshot: "Fretes", category_type_snapshot: "debit", display_order: 3002, value: freight }),
  ];
  return {
    id: `entry-${competence}`,
    user_id: "user",
    model_id: "model",
    competence,
    status: "finalized",
    total_credit: sales,
    total_debit: returns + cpv + admin + freight,
    result: sales - returns - cpv - admin - freight,
    margin_percentage: 0,
    created_at: "",
    updated_at: "",
    model: { id: "model", name: "Modelo Teste" },
    items,
  } as DreEntryWithItems;
}

function modelLine(overrides: Record<string, unknown>) {
  return { id: "line", user_id: "user", model_id: "model", category_id: null, subcategory_id: null, parent_category_id: null, line_type: "sum", sum_label: null, is_net_income: false, display_order: 0, created_at: "", updated_at: "", category: null, subcategory: null, ...overrides };
}

function cat(id: string, name: string, type: "credit" | "debit", isRevenue: boolean) {
  return { id, user_id: "user", name, type, is_revenue: isRevenue, status: "active", display_order: 0, created_at: "", updated_at: "" };
}

function sub(id: string, name: string, isReductive: boolean) {
  return { id, user_id: "user", category_id: "cat", name, is_reductive: isReductive, status: "active", display_order: 0, created_at: "", updated_at: "" };
}

function item(overrides: Partial<DreEntryItem>): DreEntryItem {
  return { id: "item", user_id: "user", dre_entry_id: "entry", category_id: "cat", subcategory_id: "sub", category_name_snapshot: "Cat", subcategory_name_snapshot: "Sub", category_type_snapshot: "credit", line_type: "subcategory", display_order: 1, value: 0, created_at: "", updated_at: "", category_is_revenue: false, is_net_income: false, subcategory_is_reductive: false, ...overrides };
}

function rowFixture(overrides: Partial<DreAnalysisRow>): DreAnalysisRow {
  return { key: "k", lineId: "k", label: "Item", lineType: "subcategory", categoryType: "debit", level: 1, displayOrder: 1, isSumLine: false, isNetIncome: false, values: {}, ...overrides };
}

function periodFixture(overrides: Partial<DreAnalysisPeriod>): DreAnalysisPeriod {
  return { id: "p1", label: "Jan/2026", year: "2026", months: ["2026-01"], entries: [], missingMonths: [], totals: { revenue: 100000, totalCredit: 100000, totalDebit: 85000, result: 15000, marginPercentage: 15 }, ...overrides };
}

// ── Tests: determineAlertLevel ─────────────────────────────────────────────────

describe("determineAlertLevel", () => {
  it("returns LOW when all metrics are below thresholds", () => {
    expect(determineAlertLevel(3, 1, 4)).toBe("LOW");
  });

  it("returns MEDIUM when variation is between 5% and 15%", () => {
    expect(determineAlertLevel(10, 1, 4)).toBe("MEDIUM");
  });

  it("returns HIGH when variation exceeds 15%", () => {
    expect(determineAlertLevel(20, 1, 4)).toBe("HIGH");
  });

  it("returns HIGH when impact on revenue exceeds 5%", () => {
    expect(determineAlertLevel(3, 6, 4)).toBe("HIGH");
  });

  it("returns MEDIUM when representativeness is between 5% and 15%", () => {
    expect(determineAlertLevel(3, 1, 10)).toBe("MEDIUM");
  });

  it("caps HIGH variation at MEDIUM when representativeness < 1%", () => {
    expect(determineAlertLevel(20, 1, 0.5)).toBe("MEDIUM");
  });

  it("elevation: takes the MAX of all three levels", () => {
    // impact HIGH, variation LOW, repr LOW → HIGH
    expect(determineAlertLevel(3, 7, 3)).toBe("HIGH");
  });

  it("all thresholds at exact boundaries", () => {
    expect(determineAlertLevel(5, 2, 5)).toBe("LOW");
    expect(determineAlertLevel(5.1, 2, 5)).toBe("MEDIUM");
    expect(determineAlertLevel(15.1, 2, 5)).toBe("HIGH");
  });
});

// ── Tests: ABC Curve ───────────────────────────────────────────────────────────

describe("computeAbcCurve", () => {
  const periodId = "p1";
  const catLabels: Record<string, string> = { "category::exp::0": "Despesas Operacionais" };

  it("classifies items correctly into A/B/C", () => {
    const rows: DreAnalysisRow[] = [
      rowFixture({ key: "k1", label: "CPV", categoryType: "debit", parentKey: "category::exp::0", values: { [periodId]: { amount: 5000, verticalPercentage: 0 } } }),
      rowFixture({ key: "k2", label: "Admin", categoryType: "debit", parentKey: "category::exp::0", values: { [periodId]: { amount: 2000, verticalPercentage: 0 } } }),
      rowFixture({ key: "k3", label: "Marketing", categoryType: "debit", parentKey: "category::exp::0", values: { [periodId]: { amount: 1000, verticalPercentage: 0 } } }),
      rowFixture({ key: "k4", label: "Outros", categoryType: "debit", parentKey: "category::exp::0", values: { [periodId]: { amount: 200, verticalPercentage: 0 } } }),
      rowFixture({ key: "k5", label: "Miscel", categoryType: "debit", parentKey: "category::exp::0", values: { [periodId]: { amount: 100, verticalPercentage: 0 } } }),
    ];

    const { expenses } = computeAbcCurve(rows, periodId, catLabels);

    // CPV = 5000 = 60.7% → class A (cumulative 60.7%)
    expect(expenses[0].item).toBe("CPV");
    expect(expenses[0].class).toBe("A");

    // Admin = 2000 = 24.3% → cumulative 85% → class B
    expect(expenses[1].item).toBe("Admin");
    expect(expenses[1].class).toBe("B");
  });

  it("returns empty when no expense rows", () => {
    const { expenses } = computeAbcCurve([], periodId, {});
    expect(expenses).toHaveLength(0);
  });

  it("generates concentration alert when ≤ 3 class-A items represent > 70%", () => {
    // k1=4000 (40%), k2=3500 (35%) → both class A, combined = 75% > 70% → alert
    const rows: DreAnalysisRow[] = [
      rowFixture({ key: "k1", label: "Custo Principal", categoryType: "debit", values: { [periodId]: { amount: 4000, verticalPercentage: 0 } } }),
      rowFixture({ key: "k2", label: "Custo B", categoryType: "debit", values: { [periodId]: { amount: 3500, verticalPercentage: 0 } } }),
      rowFixture({ key: "k3", label: "Custo C", categoryType: "debit", values: { [periodId]: { amount: 1500, verticalPercentage: 0 } } }),
      rowFixture({ key: "k4", label: "Custo D", categoryType: "debit", values: { [periodId]: { amount: 700, verticalPercentage: 0 } } }),
      rowFixture({ key: "k5", label: "Custo E", categoryType: "debit", values: { [periodId]: { amount: 300, verticalPercentage: 0 } } }),
    ];

    const { concentration_alert } = computeAbcCurve(rows, periodId, {});
    expect(concentration_alert).not.toBeNull();
    expect(concentration_alert).toContain("concentram");
  });

  it("does not generate concentration alert when class A has many items", () => {
    const rows: DreAnalysisRow[] = Array.from({ length: 10 }, (_, i) =>
      rowFixture({ key: `k${i}`, label: `Item ${i}`, categoryType: "debit", values: { [periodId]: { amount: 1000, verticalPercentage: 0 } } }),
    );
    const { concentration_alert } = computeAbcCurve(rows, periodId, {});
    expect(concentration_alert).toBeNull();
  });

  it("sorts revenue items separately from expense items", () => {
    const rows: DreAnalysisRow[] = [
      rowFixture({ key: "r1", label: "Vendas", categoryType: "credit", values: { [periodId]: { amount: 8000, verticalPercentage: 0 } } }),
      rowFixture({ key: "r2", label: "Servicos", categoryType: "credit", values: { [periodId]: { amount: 2000, verticalPercentage: 0 } } }),
      rowFixture({ key: "e1", label: "CPV", categoryType: "debit", values: { [periodId]: { amount: 5000, verticalPercentage: 0 } } }),
    ];
    const { revenue, expenses } = computeAbcCurve(rows, periodId, {});
    expect(revenue).toHaveLength(2);
    expect(expenses).toHaveLength(1);
  });

  it("cumulative percentage reaches 100 for the last item", () => {
    const rows: DreAnalysisRow[] = [
      rowFixture({ key: "k1", label: "A", categoryType: "debit", values: { [periodId]: { amount: 300, verticalPercentage: 0 } } }),
      rowFixture({ key: "k2", label: "B", categoryType: "debit", values: { [periodId]: { amount: 200, verticalPercentage: 0 } } }),
      rowFixture({ key: "k3", label: "C", categoryType: "debit", values: { [periodId]: { amount: 100, verticalPercentage: 0 } } }),
    ];
    const { expenses } = computeAbcCurve(rows, periodId, {});
    expect(expenses[expenses.length - 1].cumulative_pct).toBeCloseTo(100, 0);
  });
});

// ── Tests: computeVariations ───────────────────────────────────────────────────

describe("computeVariations", () => {
  const catLabels = { "category::exp::0": "Despesas Operacionais" };

  it("returns empty array with single period", () => {
    const rows = [rowFixture({ key: "k1", categoryType: "debit", values: { p1: { amount: 1000, verticalPercentage: 0 } } })];
    const period = periodFixture({ id: "p1" });
    expect(computeVariations(rows, period, null, catLabels)).toHaveLength(0);
  });

  it("computes correct variation percentage and financial impact", () => {
    const rows = [
      rowFixture({ key: "k1", label: "Fretes", categoryType: "debit", parentKey: "category::exp::0", values: { p1: { amount: 1000, verticalPercentage: 0 }, p2: { amount: 1300, verticalPercentage: 0 } } }),
    ];
    const prevPeriod = periodFixture({ id: "p1", totals: { revenue: 10000, totalCredit: 10000, totalDebit: 8000, result: 2000, marginPercentage: 20 } });
    const currPeriod = periodFixture({ id: "p2", totals: { revenue: 10000, totalCredit: 10000, totalDebit: 8300, result: 1700, marginPercentage: 17 } });

    const vars = computeVariations(rows, currPeriod, prevPeriod, catLabels);

    expect(vars).toHaveLength(1);
    expect(vars[0].variation_pct).toBe(30); // (1300 - 1000) / 1000 * 100
    expect(vars[0].financial_impact).toBe(300); // 1300 - 1000
    expect(vars[0].margin_impact).toBe(3); // 300 / 10000 * 100
  });

  it("assigns HIGH level when variation > 15% and impact > 5%", () => {
    const rows = [
      rowFixture({ key: "k1", label: "Custo X", categoryType: "debit", values: { p1: { amount: 500, verticalPercentage: 0 }, p2: { amount: 1100, verticalPercentage: 0 } } }),
    ];
    const prevPeriod = periodFixture({ id: "p1", totals: { revenue: 10000, totalCredit: 10000, totalDebit: 5000, result: 5000, marginPercentage: 50 } });
    const currPeriod = periodFixture({ id: "p2", totals: { revenue: 10000, totalCredit: 10000, totalDebit: 5600, result: 4400, marginPercentage: 44 } });

    const vars = computeVariations(rows, currPeriod, prevPeriod, catLabels);
    expect(vars[0].level).toBe("HIGH");
  });

  it("sorts by absolute financial impact descending", () => {
    const rows = [
      rowFixture({ key: "k1", label: "Pequeno", categoryType: "debit", values: { p1: { amount: 100, verticalPercentage: 0 }, p2: { amount: 200, verticalPercentage: 0 } } }),
      rowFixture({ key: "k2", label: "Grande", categoryType: "debit", values: { p1: { amount: 5000, verticalPercentage: 0 }, p2: { amount: 7000, verticalPercentage: 0 } } }),
    ];
    const prev = periodFixture({ id: "p1" });
    const curr = periodFixture({ id: "p2" });
    const vars = computeVariations(rows, curr, prev, catLabels);

    expect(vars[0].subcategory).toBe("Grande");
    expect(vars[1].subcategory).toBe("Pequeno");
  });

  it("identifies revenue rows as type 'revenue'", () => {
    const rows = [
      rowFixture({ key: "r1", label: "Vendas", categoryType: "credit", values: { p1: { amount: 5000, verticalPercentage: 0 }, p2: { amount: 4000, verticalPercentage: 0 } } }),
    ];
    const vars = computeVariations(rows, periodFixture({ id: "p2" }), periodFixture({ id: "p1" }), {});
    expect(vars[0].type).toBe("revenue");
  });
});

// ── Tests: computeAlerts ───────────────────────────────────────────────────────

describe("computeAlerts", () => {
  it("generates HIGH alert when expenses grow faster than revenue by >3%", () => {
    const curr = periodFixture({ id: "p2", totals: { revenue: 105000, totalCredit: 105000, totalDebit: 95000, result: 10000, marginPercentage: 9.5 } });
    const prev = periodFixture({ id: "p1", totals: { revenue: 100000, totalCredit: 100000, totalDebit: 80000, result: 20000, marginPercentage: 20 } });

    const alerts = computeAlerts({
      periods: [prev, curr],
      currentPeriod: curr,
      previousPeriod: prev,
      currentExpenses: 95000,   // +18.75%
      previousExpenses: 80000,
      subcategoryRows: [],
      expenseRows: [],
      variations: [],
    });

    const expenseGrowthAlert = alerts.find((a) => a.title.includes("Despesas crescendo acima"));
    expect(expenseGrowthAlert).toBeDefined();
    expect(expenseGrowthAlert?.level).toBe("HIGH");
  });

  it("generates HIGH alert when margin drops more than 3 pp", () => {
    const curr = periodFixture({ id: "p2", totals: { revenue: 100000, totalCredit: 100000, totalDebit: 90000, result: 10000, marginPercentage: 10 } });
    const prev = periodFixture({ id: "p1", totals: { revenue: 100000, totalCredit: 100000, totalDebit: 86000, result: 14000, marginPercentage: 14 } });

    const alerts = computeAlerts({
      periods: [prev, curr],
      currentPeriod: curr,
      previousPeriod: prev,
      currentExpenses: 90000,
      previousExpenses: 86000,
      subcategoryRows: [],
      expenseRows: [],
      variations: [],
    });

    const marginAlert = alerts.find((a) => a.title.includes("Queda significativa de margem"));
    expect(marginAlert).toBeDefined();
    expect(marginAlert?.level).toBe("HIGH");
  });

  it("generates MEDIUM alert when margin drops between 1 and 3 pp", () => {
    // marginDrop = 14.5 - 12.5 = 2 pp → > 1 and < 3 → MEDIUM
    const curr = periodFixture({ id: "p2", totals: { revenue: 100000, totalCredit: 100000, totalDebit: 87500, result: 12500, marginPercentage: 12.5 } });
    const prev = periodFixture({ id: "p1", totals: { revenue: 100000, totalCredit: 100000, totalDebit: 85500, result: 14500, marginPercentage: 14.5 } });

    const alerts = computeAlerts({
      periods: [prev, curr],
      currentPeriod: curr,
      previousPeriod: prev,
      currentExpenses: 87000,
      previousExpenses: 86000,
      subcategoryRows: [],
      expenseRows: [],
      variations: [],
    });

    const marginAlert = alerts.find((a) => a.title.includes("Redução moderada de margem"));
    expect(marginAlert).toBeDefined();
    expect(marginAlert?.level).toBe("MEDIUM");
  });

  it("generates HIGH alert when net margin is below 3%", () => {
    const curr = periodFixture({ id: "p1", totals: { revenue: 100000, totalCredit: 100000, totalDebit: 97500, result: 2500, marginPercentage: 2.5 } });

    const alerts = computeAlerts({
      periods: [curr],
      currentPeriod: curr,
      previousPeriod: null,
      currentExpenses: 97500,
      previousExpenses: 0,
      subcategoryRows: [],
      expenseRows: [],
      variations: [],
    });

    const criticalAlert = alerts.find((a) => a.title.includes("nível crítico"));
    expect(criticalAlert).toBeDefined();
    expect(criticalAlert?.level).toBe("HIGH");
  });

  it("generates positive alert when expenses grow below revenue by > 5%", () => {
    const curr = periodFixture({ id: "p2", totals: { revenue: 115000, totalCredit: 115000, totalDebit: 85500, result: 29500, marginPercentage: 25.7 } });
    const prev = periodFixture({ id: "p1", totals: { revenue: 100000, totalCredit: 100000, totalDebit: 85000, result: 15000, marginPercentage: 15 } });

    const alerts = computeAlerts({
      periods: [prev, curr],
      currentPeriod: curr,
      previousPeriod: prev,
      currentExpenses: 85500,
      previousExpenses: 85000,
      subcategoryRows: [],
      expenseRows: [],
      variations: [],
    });

    const efficiencyAlert = alerts.find((a) => a.type === "positive");
    expect(efficiencyAlert).toBeDefined();
  });

  it("orders alerts: HIGH first, then MEDIUM, then LOW", () => {
    const curr = periodFixture({ id: "p2", totals: { revenue: 100000, totalCredit: 100000, totalDebit: 97500, result: 2500, marginPercentage: 2.5 } });
    const prev = periodFixture({ id: "p1", totals: { revenue: 100000, totalCredit: 100000, totalDebit: 86000, result: 14000, marginPercentage: 14 } });

    const alerts = computeAlerts({
      periods: [prev, curr],
      currentPeriod: curr,
      previousPeriod: prev,
      currentExpenses: 97500,
      previousExpenses: 86000,
      subcategoryRows: [],
      expenseRows: [],
      variations: [],
    });

    const levels = alerts.map((a) => a.level);
    const levelRank: Record<AlertLevel, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    for (let i = 0; i < levels.length - 1; i++) {
      expect(levelRank[levels[i]]).toBeLessThanOrEqual(levelRank[levels[i + 1]]);
    }
  });
});

// ── Tests: generateAdvancedDreAnalysis (integration) ──────────────────────────

describe("generateAdvancedDreAnalysis — 1 period", () => {
  it("works with a single period — no variations, no trend comparison", () => {
    const model = makeModel();
    const entry = makeEntry("2026-01", { sales: 100000, cpv: 40000, admin: 10000, freight: 5000 });
    const result = buildDreAnalysisFromModel({ model, periods: [{ id: "2026-01", label: "Janeiro/2026", year: "2026", months: ["2026-01"] }], entries: [entry] });

    const analysis = generateAdvancedDreAnalysis(result, { modelName: "Modelo Teste" });

    expect(analysis.variations).toHaveLength(0); // no prev period
    expect(analysis.metadata.periods_count).toBe(1);
    expect(analysis.indicators.revenue.value).toBe(100000);
    expect(analysis.abc_curve.expenses.length).toBeGreaterThan(0);
  });

  it("computes total expenses from debit subcategory rows only", () => {
    const model = makeModel();
    const entry = makeEntry("2026-01", { sales: 100000, cpv: 40000, admin: 10000, freight: 5000 });
    const result = buildDreAnalysisFromModel({ model, periods: [{ id: "2026-01", label: "Jan/2026", year: "2026", months: ["2026-01"] }], entries: [entry] });

    const analysis = generateAdvancedDreAnalysis(result, { modelName: "Modelo Teste" });

    // expenses = CPV(40000) + Admin(10000) + Fretes(5000)
    expect(analysis.indicators.total_expenses.value).toBe(55000);
  });

  it("computes net income using the configured net income line", () => {
    const model = makeModel();
    const entry = makeEntry("2026-01", { sales: 100000, returns: 5000, cpv: 40000, admin: 10000, freight: 5000 });
    const result = buildDreAnalysisFromModel({ model, periods: [{ id: "2026-01", label: "Jan/2026", year: "2026", months: ["2026-01"] }], entries: [entry] });

    const analysis = generateAdvancedDreAnalysis(result, { modelName: "Modelo Teste" });

    // revenue = sales(100000) - returns(5000) = 95000
    // net income = revenue - cpv - admin - freight = 95000 - 40000 - 10000 - 5000 = 40000
    expect(analysis.indicators.revenue.value).toBe(95000);
    expect(analysis.indicators.net_profit.value).toBe(40000);
  });

  it("handles reductive subcategories correctly in revenue calculation", () => {
    const model = makeModel();
    const entry = makeEntry("2026-01", { sales: 100000, returns: 10000, cpv: 30000, admin: 5000, freight: 5000 });
    const result = buildDreAnalysisFromModel({ model, periods: [{ id: "2026-01", label: "Jan/2026", year: "2026", months: ["2026-01"] }], entries: [entry] });

    const analysis = generateAdvancedDreAnalysis(result, { modelName: "M" });

    // Net revenue = 100000 - 10000 = 90000
    expect(analysis.indicators.revenue.value).toBe(90000);
  });
});

describe("generateAdvancedDreAnalysis — 2 periods", () => {
  it("computes variations between current and previous period", () => {
    const model = makeModel();
    const entries = [
      makeEntry("2026-01", { sales: 100000, cpv: 40000, admin: 10000, freight: 5000 }),
      makeEntry("2026-02", { sales: 100000, cpv: 40000, admin: 10000, freight: 7000 }), // freight +2000
    ];
    const result = buildDreAnalysisFromModel({
      model,
      periods: [
        { id: "2026-01", label: "Jan/2026", year: "2026", months: ["2026-01"] },
        { id: "2026-02", label: "Fev/2026", year: "2026", months: ["2026-02"] },
      ],
      entries,
    });

    const analysis = generateAdvancedDreAnalysis(result, { modelName: "M" });

    const freightVar = analysis.variations.find((v) => v.subcategory === "Fretes");
    expect(freightVar).toBeDefined();
    expect(freightVar?.financial_impact).toBe(2000);
    expect(freightVar?.variation_pct).toBe(40);
  });

  it("computes efficiency index correctly when expenses grow slower than revenue", () => {
    const model = makeModel();
    const entries = [
      makeEntry("2026-01", { sales: 100000, cpv: 40000, admin: 10000, freight: 5000 }),
      makeEntry("2026-02", { sales: 120000, cpv: 41000, admin: 10200, freight: 5100 }), // revenue +20%, expenses ~+1.9%
    ];
    const result = buildDreAnalysisFromModel({
      model,
      periods: [
        { id: "2026-01", label: "Jan/2026", year: "2026", months: ["2026-01"] },
        { id: "2026-02", label: "Fev/2026", year: "2026", months: ["2026-02"] },
      ],
      entries,
    });

    const analysis = generateAdvancedDreAnalysis(result, { modelName: "M" });

    // Revenue grew ~20%, expenses grew ~1.9% → efficiency > 1
    expect(analysis.indicators.efficiency_index.value).toBeGreaterThan(1);
    expect(analysis.indicators.efficiency_index.level).toBe("LOW");
  });

  it("generates alerts when expenses grow much faster than revenue", () => {
    const model = makeModel();
    const entries = [
      makeEntry("2026-01", { sales: 100000, cpv: 40000, admin: 10000, freight: 5000 }),
      makeEntry("2026-02", { sales: 101000, cpv: 55000, admin: 12000, freight: 8000 }), // revenue +1%, expenses +28%
    ];
    const result = buildDreAnalysisFromModel({
      model,
      periods: [
        { id: "2026-01", label: "Jan/2026", year: "2026", months: ["2026-01"] },
        { id: "2026-02", label: "Fev/2026", year: "2026", months: ["2026-02"] },
      ],
      entries,
    });

    const analysis = generateAdvancedDreAnalysis(result, { modelName: "M" });

    expect(analysis.alerts.some((a) => a.level === "HIGH")).toBe(true);
  });

  it("executive summary contains quantified data when 2 periods", () => {
    const model = makeModel();
    const entries = [
      makeEntry("2026-01", { sales: 100000, cpv: 40000, admin: 10000, freight: 5000 }),
      makeEntry("2026-02", { sales: 110000, cpv: 40000, admin: 10000, freight: 5000 }),
    ];
    const result = buildDreAnalysisFromModel({
      model,
      periods: [
        { id: "2026-01", label: "Jan/2026", year: "2026", months: ["2026-01"] },
        { id: "2026-02", label: "Fev/2026", year: "2026", months: ["2026-02"] },
      ],
      entries,
    });

    const analysis = generateAdvancedDreAnalysis(result, { modelName: "Modelo" });
    expect(analysis.executive_summary.overview).toContain("R$");
    expect(analysis.executive_summary.full_text.length).toBeGreaterThan(100);
  });
});

describe("generateAdvancedDreAnalysis — EBITDA", () => {
  it("marks EBITDA as estimated when no D&A/interest categories are tagged", () => {
    const model = makeModel();
    const entry = makeEntry("2026-01", { sales: 100000, cpv: 40000, admin: 10000, freight: 5000 });
    const result = buildDreAnalysisFromModel({ model, periods: [{ id: "2026-01", label: "Jan/2026", year: "2026", months: ["2026-01"] }], entries: [entry] });

    const analysis = generateAdvancedDreAnalysis(result, { modelName: "M" });
    expect(analysis.indicators.ebitda.is_estimated).toBe(true);
  });
});

describe("generateAdvancedDreAnalysis — metadata and available analyses", () => {
  it("includes only period-appropriate analyses in available_analyses", () => {
    const model = makeModel();
    const singleEntry = makeEntry("2026-01", { sales: 100000, cpv: 40000, admin: 10000, freight: 5000 });
    const singleResult = buildDreAnalysisFromModel({ model, periods: [{ id: "2026-01", label: "Jan/2026", year: "2026", months: ["2026-01"] }], entries: [singleEntry] });
    const singleAnalysis = generateAdvancedDreAnalysis(singleResult, { modelName: "M" });

    expect(singleAnalysis.metadata.available_analyses).not.toContain("variations");
    expect(singleAnalysis.metadata.available_analyses).toContain("abc_curve");
    expect(singleAnalysis.metadata.available_analyses).toContain("indicators");
  });

  it("includes trend analysis when 3+ periods are available", () => {
    const model = makeModel();
    const entries = [
      makeEntry("2026-01", { sales: 100000, cpv: 40000, admin: 10000, freight: 5000 }),
      makeEntry("2026-02", { sales: 105000, cpv: 41000, admin: 10000, freight: 5000 }),
      makeEntry("2026-03", { sales: 110000, cpv: 42000, admin: 10000, freight: 5000 }),
    ];
    const result = buildDreAnalysisFromModel({
      model,
      periods: [
        { id: "2026-01", label: "Jan/2026", year: "2026", months: ["2026-01"] },
        { id: "2026-02", label: "Fev/2026", year: "2026", months: ["2026-02"] },
        { id: "2026-03", label: "Mar/2026", year: "2026", months: ["2026-03"] },
      ],
      entries,
    });

    const analysis = generateAdvancedDreAnalysis(result, { modelName: "M" });
    expect(analysis.metadata.available_analyses).toContain("trend");
    expect(analysis.metadata.periods_count).toBe(3);
  });
});

describe("generateAdvancedDreAnalysis — recommendations", () => {
  it("generates specific recommendations with numeric data (not generic)", () => {
    const model = makeModel();
    const entries = [
      makeEntry("2026-01", { sales: 100000, cpv: 40000, admin: 10000, freight: 5000 }),
      makeEntry("2026-02", { sales: 102000, cpv: 40000, admin: 10000, freight: 8000 }), // freight +60%
    ];
    const result = buildDreAnalysisFromModel({
      model,
      periods: [
        { id: "2026-01", label: "Jan/2026", year: "2026", months: ["2026-01"] },
        { id: "2026-02", label: "Fev/2026", year: "2026", months: ["2026-02"] },
      ],
      entries,
    });

    const analysis = generateAdvancedDreAnalysis(result, { modelName: "M" });
    const rec = analysis.recommendations[0];

    // Justification must contain currency amounts (not generic)
    expect(rec?.justification).toMatch(/R\$\s*[\d.,]+/);
  });
});

describe("generateAdvancedDreAnalysis — DRE model rule compliance", () => {
  it("uses configured net income line, not the last sum line", () => {
    const model = makeModel();
    const entry = makeEntry("2026-01", { sales: 100000, returns: 5000, cpv: 40000, admin: 10000, freight: 5000 });
    const result = buildDreAnalysisFromModel({ model, periods: [{ id: "2026-01", label: "Jan/2026", year: "2026", months: ["2026-01"] }], entries: [entry] });

    const analysis = generateAdvancedDreAnalysis(result, { modelName: "M" });

    // Net income = revenue(95000) - cpv(40000) - admin(10000) - freight(5000) = 40000
    // "Receita Liquida" sum line = 95000 (first sum, not net income)
    // "Lucro Liquido" = 40000 (is_net_income = true)
    expect(analysis.indicators.net_profit.value).toBe(40000);
  });
});
