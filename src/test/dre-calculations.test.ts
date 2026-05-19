import { describe, expect, it } from "vitest";

import {
  calculateCategoryTotal,
  calculateDreTotals,
  calculateSumLineValue,
  resolveFinancialBehavior,
} from "@/lib/dre-calculations";
import type { DreDraftLine } from "@/types/dre";

function line(overrides: Partial<DreDraftLine>): DreDraftLine {
  return {
    categoryId: "cat-1",
    subcategoryId: "sub-1",
    categoryName: "Categoria",
    subcategoryName: "Subcategoria",
    categoryType: "debit",
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
