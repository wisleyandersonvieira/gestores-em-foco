import type { Tables } from "@/integrations/supabase/types";

export type DreCategory = Tables<"dre_categories">;
export type DreSubcategory = Tables<"dre_subcategories">;
export type DreModel = Tables<"dre_models">;
export type DreModelLine = Tables<"dre_model_lines">;
export type DreEntry = Tables<"dre_entries">;
export type DreEntryItem = Tables<"dre_entry_items">;
export type ProductSubscription = Tables<"product_subscriptions">;

export type DreCategoryType = DreCategory["type"];
export type DreRecordStatus = DreCategory["status"];
export type DreEntryStatus = DreEntry["status"];

export type DreSubcategoryWithCategory = DreSubcategory & {
  category?: Pick<DreCategory, "id" | "name" | "type" | "status"> | null;
};

export type DreModelLineWithRefs = DreModelLine & {
  category?: DreCategory | null;
  subcategory?: DreSubcategory | null;
};

export type DreModelWithLines = DreModel & {
  lines: DreModelLineWithRefs[];
};

export type DreEntryWithModel = DreEntry & {
  model?: Pick<DreModel, "id" | "name"> | null;
};

export type DreEntryWithItems = DreEntryWithModel & {
  items: DreEntryItem[];
};

export type DreModelBuilderCategory = {
  kind: "category";
  categoryId: string;
  subcategoryIds: string[];
};

export type DreModelBuilderSum = {
  kind: "sum";
  id: string;
  label: string;
};

export type DreModelBuilderLine = DreModelBuilderCategory | DreModelBuilderSum;

export type DreDraftLine = {
  categoryId: string | null;
  subcategoryId: string | null;
  categoryName: string;
  subcategoryName: string | null;
  categoryType: DreCategoryType;
  lineType: "category" | "subcategory" | "sum";
  displayOrder: number;
  value: number;
};

export type DreTotals = {
  totalCredit: number;
  totalDebit: number;
  result: number;
  marginPercentage: number;
};
