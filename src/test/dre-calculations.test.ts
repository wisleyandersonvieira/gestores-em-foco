import { describe, expect, it } from "vitest";

import {
  calculateCategoryTotal,
  calculateDreTotals,
  calculateEffectiveTotalsFromEntryItems,
  calculateNetIncomeFromEntryItems,
  calculateRevenueFromEntryItems,
  getNetIncomeLine,
  getRevenueCategories,
  calculateSumLineValue,
  resolveFinancialBehavior,
  validateRevenueCategory,
} from "@/lib/dre-calculations";
import type { DreDraftLine, DreEntryItem } from "@/types/dre";

function line(overrides: Partial<DreDraftLine>): DreDraftLine {
  return {
    categoryId: "cat-1",
    subcategoryId: "sub-1",
    categoryName: "Categoria",
    subcategoryName: "Subcategoria",
    categoryType: "debit",
    categoryIsRevenue: false,
    isNetIncome: false,
    subcategoryIsReductive: false,
    lineType: "subcategory",
    displayOrder: 1,
    value: 1000,
    ...overrides,
  };
}

describe("DRE reductive subcategories", () => {
  it("keeps debit behavior for a normal debit category subcategory", () => {
    expect(resolveFinancialBehavior("debit", false)).toBe("debit");
    expect(calculateDreTotals([line({ categoryType: "debit", subcategoryIsReductive: false })])).toMatchObject({
      totalCredit: 0,
      totalDebit: 1000,
      result: -1000,
    });
  });

  it("inverts debit category subcategory behavior when reductive", () => {
    expect(resolveFinancialBehavior("debit", true)).toBe("credit");
    expect(calculateDreTotals([line({ categoryType: "debit", subcategoryIsReductive: true })])).toMatchObject({
      totalCredit: 1000,
      totalDebit: 0,
      result: 1000,
    });
  });

  it("keeps credit behavior for a normal credit category subcategory", () => {
    expect(resolveFinancialBehavior("credit", false)).toBe("credit");
    expect(calculateDreTotals([line({ categoryType: "credit", subcategoryIsReductive: false })])).toMatchObject({
      totalCredit: 1000,
      totalDebit: 0,
      result: 1000,
    });
  });

  it("inverts credit category subcategory behavior when reductive", () => {
    expect(resolveFinancialBehavior("credit", true)).toBe("debit");
    expect(calculateDreTotals([line({ categoryType: "credit", subcategoryIsReductive: true })])).toMatchObject({
      totalCredit: 0,
      totalDebit: 1000,
      result: -1000,
    });
  });

  it("only inverts the marked subcategory in category totals, KPIs, charts and exports", () => {
    const lines = [
      line({ subcategoryId: "rent", subcategoryName: "Aluguel", value: 1000 }),
      line({ subcategoryId: "energy", subcategoryName: "Energia", value: 500 }),
      line({ subcategoryId: "discounts", subcategoryName: "Descontos Recebidos", subcategoryIsReductive: true, value: 200 }),
    ];

    expect(calculateDreTotals(lines)).toMatchObject({
      totalCredit: 200,
      totalDebit: 1500,
      result: -1300,
    });
    expect(calculateCategoryTotal("cat-1", lines)).toBe(1300);
    expect(calculateSumLineValue(3, lines)).toBe(-1300);
  });
});

describe("DRE net income and revenue configuration", () => {
  it("gets the configured net income sum line instead of assuming the last line", () => {
    const lines = [
      { line_type: "sum", is_net_income: true, display_order: 3000 },
      { line_type: "sum", is_net_income: false, display_order: 9000 },
    ];

    expect(getNetIncomeLine(lines)?.display_order).toBe(3000);
  });

  it("sums only configured revenue categories", () => {
    const categories = [
      { type: "credit" as const, is_revenue: true, name: "Receita de Serviços" },
      { type: "credit" as const, is_revenue: false, name: "Receitas Financeiras" },
      { type: "debit" as const, is_revenue: false, name: "Custos" },
    ];

    expect(getRevenueCategories(categories).map((category) => category.name)).toEqual(["Receita de Serviços"]);
  });

  it("does not allow debit categories to compose revenue", () => {
    expect(() => validateRevenueCategory({ type: "debit", is_revenue: true })).toThrow("Apenas categorias de credito");
  });

  it("uses revenue categories and configured net income for KPI margins", () => {
    const items = [
      item({ category_id: "services", category_type_snapshot: "credit", category_is_revenue: true, value: 1000 }),
      item({ category_id: "finance", category_type_snapshot: "credit", category_is_revenue: false, value: 300 }),
      item({ category_id: "costs", category_type_snapshot: "debit", value: 400 }),
      item({ line_type: "sum", category_id: null, category_name_snapshot: "Lucro Líquido", is_net_income: true, value: 250 }),
      item({ line_type: "sum", category_id: null, category_name_snapshot: "Outra soma", is_net_income: false, value: 999 }),
    ];

    expect(calculateRevenueFromEntryItems(items)).toBe(1000);
    expect(calculateNetIncomeFromEntryItems(items, 900)).toBe(250);
  });

  it("calculates dashboard totals with debit category reductive subcategory as credit", () => {
    const items = [
      item({ category_id: "expenses", category_type_snapshot: "debit", subcategory_id: "rent", subcategory_is_reductive: false, value: 1000 }),
      item({ category_id: "expenses", category_type_snapshot: "debit", subcategory_id: "energy", subcategory_is_reductive: false, value: 500 }),
      item({ category_id: "expenses", category_type_snapshot: "debit", subcategory_id: "discounts", subcategory_is_reductive: true, value: 200 }),
    ];

    expect(calculateEffectiveTotalsFromEntryItems(items)).toMatchObject({
      totalCredit: 200,
      totalDebit: 1500,
      result: -1300,
    });
  });

  it("calculates dashboard totals with credit category reductive subcategory as debit", () => {
    const items = [
      item({ category_id: "sales", category_type_snapshot: "credit", subcategory_id: "services", subcategory_is_reductive: false, value: 1000 }),
      item({ category_id: "sales", category_type_snapshot: "credit", subcategory_id: "returns", subcategory_is_reductive: true, value: 150 }),
    ];

    expect(calculateEffectiveTotalsFromEntryItems(items)).toMatchObject({
      totalCredit: 1000,
      totalDebit: 150,
      result: 850,
    });
  });
});

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
    value: 1000,
    created_at: "",
    updated_at: "",
    category_is_revenue: false,
    is_net_income: false,
    subcategory_is_reductive: false,
    ...overrides,
  };
}
