import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import {
  assertSingleNetIncomeLine,
  calculateCategoryTotal,
  calculateDreTotals,
  calculateNetIncomeFromEntryItems,
  calculateNetIncomeFromLines,
  calculateRevenueFromEntryItems,
  calculateRevenueFromLines,
  calculateSumLineValue,
  roundCurrency,
  validateRevenueCategory,
} from "@/lib/dre-calculations";
import type {
  DreCategory,
  DreDraftLine,
  DreEntryStatus,
  DreEntryWithItems,
  DreEntryWithModel,
  DreModelBuilderLine,
  DreModelWithLines,
  DreRecordStatus,
  DreSubcategory,
  DreSubcategoryWithCategory,
} from "@/types/dre";

type DefaultDreStructureResult = {
  created: boolean;
  model_id: string | null;
};

/**
 * O PostgREST do Supabase limita cada resposta a no máximo 1000 linhas.
 * Este helper itera por páginas usando `.range(from, to)` até trazer todos
 * os registros, garantindo que listagens grandes (DREs com muitos meses,
 * itens, linhas de modelo etc.) nunca sejam truncadas silenciosamente.
 *
 * O builder recebe (from, to) e deve retornar a query JÁ filtrada por usuário,
 * para que cada página continue restrita ao escopo correto.
 */
const PAGE_SIZE = 1000;
async function fetchAllPaginated<T>(
  buildPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  for (let page = 0; page < 200; page += 1) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await buildPage(from, to);
    if (error) throw error;
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

export async function ensureDefaultDreStructure() {
  const { data, error } = await supabase.rpc("create_default_dre_structure" as any);
  if (error) {
    throw new Error("Não foi possível preparar o modelo padrão. Tente novamente.");
  }

  const result = Array.isArray(data) ? data[0] : data;
  return (result ?? { created: false, model_id: null }) as DefaultDreStructureResult;
}

export async function createDefaultDreCategories(userId: string) {
  void userId;
  await ensureDefaultDreStructure();
}

export async function listDreCategories(userId: string) {
  try {
    return await fetchAllPaginated<DreCategory>((from, to) =>
      supabase
        .from("dre_categories")
        .select("*")
        .eq("user_id", userId)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true })
        .range(from, to),
    );
  } catch {
    throw new Error("Nao foi possivel carregar categorias.");
  }
}

export async function saveDreCategory(payload: TablesInsert<"dre_categories"> | TablesUpdate<"dre_categories">) {
  const name = String(payload.name ?? "").trim();
  if (!name) throw new Error("Informe o nome da categoria.");
  const categoryPayload = {
    display_order: payload.display_order ?? 0,
    is_revenue: payload.type === "credit" ? payload.is_revenue ?? false : false,
    name,
    status: payload.status ?? "active",
    type: payload.type ?? "debit",
    user_id: payload.user_id,
  };
  validateRevenueCategory(categoryPayload);

  if ("id" in payload && payload.id) {
    const { error } = await supabase.from("dre_categories").update(categoryPayload).eq("id", payload.id);
    if (error) throw new Error("Nao foi possivel atualizar a categoria.");
    return;
  }

  const { error } = await supabase.from("dre_categories").insert(categoryPayload as TablesInsert<"dre_categories">);
  if (error) throw new Error("Nao foi possivel criar a categoria.");
}

export async function deleteOrDeactivateDreCategory(category: DreCategory) {
  const inUse = await hasAnyUsage([
    supabase.from("dre_subcategories").select("id", { count: "exact", head: true }).eq("user_id", category.user_id).eq("category_id", category.id),
    supabase.from("dre_model_lines").select("id", { count: "exact", head: true }).eq("user_id", category.user_id).eq("category_id", category.id),
    supabase.from("dre_entry_items").select("id", { count: "exact", head: true }).eq("user_id", category.user_id).eq("category_id", category.id),
  ]);

  if (inUse) {
    const { error } = await supabase.from("dre_categories").update({ status: "inactive" }).eq("id", category.id).eq("user_id", category.user_id);
    if (error) throw new Error("Categoria em uso. Nao foi possivel inativar.");
    return "inactivated" as const;
  }

  const { error } = await supabase.from("dre_categories").delete().eq("id", category.id).eq("user_id", category.user_id);
  if (error) throw new Error("Nao foi possivel excluir a categoria.");
  return "deleted" as const;
}

export async function listDreSubcategories(userId: string) {
  try {
    return (await fetchAllPaginated<DreSubcategoryWithCategory>((from, to) =>
      supabase
        .from("dre_subcategories")
        .select("*, category:dre_categories(id,name,type,status,is_revenue)")
        .eq("user_id", userId)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true })
        .range(from, to),
    )) as DreSubcategoryWithCategory[];
  } catch {
    throw new Error("Nao foi possivel carregar subcategorias.");
  }
}

export async function saveDreSubcategory(payload: TablesInsert<"dre_subcategories"> | TablesUpdate<"dre_subcategories">) {
  const name = String(payload.name ?? "").trim();
  if (!name) throw new Error("Informe o nome da subcategoria.");
  if (!payload.category_id) throw new Error("Selecione uma categoria.");

  const subcategoryPayload = {
    category_id: payload.category_id,
    display_order: payload.display_order ?? 0,
    is_reductive: payload.is_reductive ?? false,
    name,
    status: payload.status ?? "active",
    user_id: payload.user_id,
  };

  if ("id" in payload && payload.id) {
    const { error } = await supabase.from("dre_subcategories").update(subcategoryPayload).eq("id", payload.id);
    if (error) throw new Error("Nao foi possivel atualizar a subcategoria.");
    return;
  }

  const { error } = await supabase.from("dre_subcategories").insert(subcategoryPayload as TablesInsert<"dre_subcategories">);
  if (error) throw new Error("Nao foi possivel criar a subcategoria.");
}

export async function deleteOrDeactivateDreSubcategory(subcategory: DreSubcategory) {
  const inUse = await hasAnyUsage([
    supabase.from("dre_model_lines").select("id", { count: "exact", head: true }).eq("user_id", subcategory.user_id).eq("subcategory_id", subcategory.id),
    supabase.from("dre_entry_items").select("id", { count: "exact", head: true }).eq("user_id", subcategory.user_id).eq("subcategory_id", subcategory.id),
  ]);

  if (inUse) {
    const { error } = await supabase.from("dre_subcategories").update({ status: "inactive" }).eq("id", subcategory.id).eq("user_id", subcategory.user_id);
    if (error) throw new Error("Subcategoria em uso. Nao foi possivel inativar.");
    return "inactivated" as const;
  }

  const { error } = await supabase.from("dre_subcategories").delete().eq("id", subcategory.id).eq("user_id", subcategory.user_id);
  if (error) throw new Error("Nao foi possivel excluir a subcategoria.");
  return "deleted" as const;
}

export async function listDreModels(userId: string, status?: DreRecordStatus) {
  try {
    return await fetchAllPaginated((from, to) => {
      let q = supabase
        .from("dre_models")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (status) q = q.eq("status", status);
      return q;
    });
  } catch {
    throw new Error("Nao foi possivel carregar modelos.");
  }
}

export async function getDreModelWithLines(userId: string, modelId: string): Promise<DreModelWithLines> {
  const { data: model, error: modelError } = await supabase.from("dre_models").select("*").eq("user_id", userId).eq("id", modelId).single();
  if (modelError) throw new Error("Modelo nao encontrado.");

  let lines: DreModelWithLines["lines"];
  try {
    lines = (await fetchAllPaginated((from, to) =>
      supabase
        .from("dre_model_lines")
        .select("*, category:dre_categories!dre_model_lines_category_id_fkey(*), subcategory:dre_subcategories!dre_model_lines_subcategory_id_fkey(*)")
        .eq("user_id", userId)
        .eq("model_id", modelId)
        .order("display_order", { ascending: true })
        .range(from, to),
    )) as DreModelWithLines["lines"];
  } catch (linesError) {
    if (import.meta.env.DEV) console.error("Erro ao carregar estrutura do modelo DRE:", linesError);
    throw new Error("Nao foi possivel carregar a estrutura do modelo.");
  }
  return { ...model, lines };
}

export async function saveDreModel(params: {
  userId: string;
  id?: string;
  name: string;
  description?: string | null;
  status: DreRecordStatus;
  structure: DreModelBuilderLine[];
}) {
  const name = params.name.trim();
  if (!name) throw new Error("Informe o nome do modelo.");

  const modelPayload = {
    user_id: params.userId,
    name,
    description: params.description || null,
    status: params.status,
  };

  const { data: model, error } = params.id
    ? await supabase.from("dre_models").update(modelPayload).eq("id", params.id).eq("user_id", params.userId).select("*").single()
    : await supabase.from("dre_models").insert(modelPayload).select("*").single();

  if (error || !model) throw new Error("Nao foi possivel salvar o modelo.");
  assertSingleNetIncomeLine(params.structure.map((line) => ({
    line_type: line.kind === "sum" ? "sum" : "category",
    is_net_income: line.kind === "sum" ? line.isNetIncome : false,
  })));

  const linePayloads = params.structure.flatMap((line, lineIndex) => {
    const lineOrder = lineIndex * 1000;
    if (line.kind === "sum") {
      return [{
        user_id: params.userId,
        model_id: model.id,
        category_id: null,
        line_type: "sum" as const,
        subcategory_id: null,
        parent_category_id: null,
        sum_label: line.label.trim() || "Subtotal",
        is_net_income: line.isNetIncome,
        display_order: lineOrder,
      }];
    }

    return [
      {
        user_id: params.userId,
        model_id: model.id,
        category_id: line.categoryId,
        line_type: "category" as const,
        subcategory_id: null,
        parent_category_id: null,
        sum_label: null,
        is_net_income: false,
        display_order: lineOrder,
      },
      ...line.subcategoryIds.map((subcategoryId, subcategoryIndex) => ({
        user_id: params.userId,
        model_id: model.id,
        category_id: line.categoryId,
        line_type: "subcategory" as const,
        subcategory_id: subcategoryId,
        parent_category_id: line.categoryId,
        sum_label: null,
        is_net_income: false,
        display_order: lineOrder + subcategoryIndex + 1,
      })),
    ];
  });

  await supabase.from("dre_model_lines").delete().eq("user_id", params.userId).eq("model_id", model.id);

  if (linePayloads.length) {
    const { error: linesError } = await supabase.from("dre_model_lines").insert(linePayloads);
    if (linesError) throw new Error("Modelo salvo, mas a estrutura nao pode ser atualizada.");
  }

  return model;
}

export async function deleteOrDeactivateDreModel(userId: string, modelId: string) {
  const inUse = await hasAnyUsage([supabase.from("dre_entries").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("model_id", modelId)]);

  if (inUse) {
    const { error } = await supabase.from("dre_models").update({ status: "inactive" }).eq("id", modelId).eq("user_id", userId);
    if (error) throw new Error("Modelo em uso. Nao foi possivel inativar.");
    return "inactivated" as const;
  }

  const { error } = await supabase.from("dre_models").delete().eq("id", modelId).eq("user_id", userId);
  if (error) throw new Error("Nao foi possivel excluir o modelo.");
  return "deleted" as const;
}

export function buildDraftLinesFromModel(model: DreModelWithLines): DreDraftLine[] {
  return model.lines.map((line) => ({
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

export async function saveDreEntry(params: {
  userId: string;
  id?: string;
  modelId: string;
  competence: string;
  status: DreEntryStatus;
  lines: DreDraftLine[];
}) {
  if (!params.competence) throw new Error("Selecione a competencia.");
  if (!params.modelId) throw new Error("Selecione o modelo de DRE.");
  if (!params.lines.some((line) => line.lineType === "subcategory")) throw new Error("O DRE precisa ter pelo menos uma subcategoria.");

  const hasInvalidValue = params.lines.some((line) => line.lineType === "subcategory" && (!Number.isFinite(line.value) || line.value < 0));
  if (hasInvalidValue) throw new Error("Informe apenas valores validos.");

  if (params.status === "finalized") {
    let duplicateQuery = supabase
      .from("dre_entries")
      .select("id")
      .eq("user_id", params.userId)
      .eq("model_id", params.modelId)
      .eq("competence", params.competence)
      .eq("status", "finalized");
    if (params.id) duplicateQuery = duplicateQuery.neq("id", params.id);
    const { data: duplicate, error: duplicateError } = await duplicateQuery.maybeSingle();
    if (duplicateError) throw new Error("Nao foi possivel validar duplicidade do DRE.");
    if (duplicate) throw new Error("Ja existe um DRE finalizado para este modelo e competencia.");
  }

  const normalizedLines = params.lines.map((line, lineIndex) => ({
    ...line,
    value: line.lineType === "category"
      ? calculateCategoryTotal(line.categoryId, params.lines)
      : line.lineType === "sum"
        ? calculateSumLineValue(lineIndex, params.lines)
        : line.value,
  }));
  const totals = calculateDreTotals(normalizedLines);
  const revenue = calculateRevenueFromLines(normalizedLines);
  const netIncome = calculateNetIncomeFromLines(normalizedLines, totals.result);

  const entryPayload = {
    user_id: params.userId,
    model_id: params.modelId,
    competence: params.competence,
    status: params.status,
    total_credit: totals.totalCredit,
    total_debit: totals.totalDebit,
    result: netIncome,
    margin_percentage: revenue > 0 ? roundCurrency((netIncome / revenue) * 100) : totals.marginPercentage,
  };

  const { data: entry, error } = params.id
    ? await supabase.from("dre_entries").update(entryPayload).eq("id", params.id).eq("user_id", params.userId).select("*").single()
    : await supabase.from("dre_entries").insert(entryPayload).select("*").single();

  if (error || !entry) throw new Error("Nao foi possivel salvar o DRE.");

  await supabase.from("dre_entry_items").delete().eq("user_id", params.userId).eq("dre_entry_id", entry.id);

  const items: TablesInsert<"dre_entry_items">[] = normalizedLines.map((line) => ({
    user_id: params.userId,
    dre_entry_id: entry.id,
    category_id: line.categoryId,
    subcategory_id: line.subcategoryId,
    category_name_snapshot: line.categoryName,
    subcategory_name_snapshot: line.lineType === "subcategory" ? line.subcategoryName : null,
    category_type_snapshot: line.categoryType,
    line_type: line.lineType,
    display_order: line.displayOrder,
    value: line.value,
  }));

  const { error: itemsError } = await supabase.from("dre_entry_items").insert(items);
  if (itemsError) throw new Error("DRE salvo, mas os itens nao puderam ser atualizados.");

  return entry;
}

export async function listDreEntries(userId: string) {
  try {
    const entries = (await fetchAllPaginated((from, to) =>
      supabase
        .from("dre_entries")
        .select("*, model:dre_models(id,name)")
        .eq("user_id", userId)
        .order("competence", { ascending: false })
        .range(from, to),
    )) as DreEntryWithModel[];
    return await recalculateEntrySummaries(userId, entries);
  } catch {
    throw new Error("Nao foi possivel carregar DREs cadastrados.");
  }
}

export async function listDreEntriesByModelAndYears(params: {
  userId: string;
  modelId: string;
  years: string[];
  includeDrafts: boolean;
}) {
  if (!params.modelId || params.years.length === 0) return [];

  const competences = params.years.flatMap((year) => Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`));

  try {
    const entries = (await fetchAllPaginated((from, to) => {
      let q = supabase
        .from("dre_entries")
        .select("*, model:dre_models(id,name)")
        .eq("user_id", params.userId)
        .eq("model_id", params.modelId)
        .in("competence", competences)
        .order("competence", { ascending: true })
        .range(from, to);
      if (!params.includeDrafts) q = q.eq("status", "finalized");
      return q;
    })) as DreEntryWithModel[];
    return await recalculateEntrySummaries(params.userId, entries);
  } catch {
    throw new Error("Nao foi possivel carregar DREs para analise.");
  }
}

export async function getDreEntry(userId: string, entryId: string): Promise<DreEntryWithItems> {
  const { data: entry, error } = await supabase
    .from("dre_entries")
    .select("*, model:dre_models(id,name)")
    .eq("user_id", userId)
    .eq("id", entryId)
    .single();

  if (error || !entry) throw new Error("DRE nao encontrado.");

  let items: DreEntryWithItems["items"];
  try {
    const rawItems = (await fetchAllPaginated((from, to) =>
      supabase
        .from("dre_entry_items")
        .select("*")
        .eq("user_id", userId)
        .eq("dre_entry_id", entryId)
        .order("display_order", { ascending: true })
        .range(from, to),
    )) as DreEntryWithItems["items"];
    const subcategoryIds = Array.from(new Set(rawItems.map((item) => item.subcategory_id).filter((id): id is string => Boolean(id))));
    const categoryIds = Array.from(new Set(rawItems.map((item) => item.category_id).filter((id): id is string => Boolean(id))));
    const reductiveBySubcategory = new Map<string, boolean>();
    const revenueByCategory = new Map<string, boolean>();
    const netIncomeDisplayOrders = new Set<number>();

    if (subcategoryIds.length) {
      const subcategories = await fetchAllPaginated<Pick<DreSubcategory, "id" | "is_reductive">>((from, to) =>
        supabase
          .from("dre_subcategories")
          .select("id,is_reductive")
          .eq("user_id", userId)
          .in("id", subcategoryIds)
          .range(from, to),
      );
      subcategories.forEach((subcategory) => reductiveBySubcategory.set(subcategory.id, subcategory.is_reductive));
    }
    if (categoryIds.length) {
      const categories = await fetchAllPaginated<Pick<DreCategory, "id" | "is_revenue">>((from, to) =>
        supabase
          .from("dre_categories")
          .select("id,is_revenue")
          .eq("user_id", userId)
          .in("id", categoryIds)
          .range(from, to),
      );
      categories.forEach((category) => revenueByCategory.set(category.id, category.is_revenue));
    }
    const netIncomeLines = await fetchAllPaginated<Pick<DreModelWithLines["lines"][number], "display_order" | "is_net_income">>((from, to) =>
      supabase
        .from("dre_model_lines")
        .select("display_order,is_net_income")
        .eq("user_id", userId)
        .eq("model_id", entry.model_id)
        .eq("line_type", "sum")
        .eq("is_net_income", true)
        .range(from, to),
    );
    netIncomeLines.forEach((line) => netIncomeDisplayOrders.add(line.display_order));

    items = rawItems.map((item) => ({
      ...item,
      category_is_revenue: item.category_id ? revenueByCategory.get(item.category_id) ?? false : false,
      is_net_income: item.line_type === "sum" && netIncomeDisplayOrders.has(item.display_order),
      subcategory_is_reductive: item.subcategory_id ? reductiveBySubcategory.get(item.subcategory_id) ?? false : false,
    }));
  } catch {
    throw new Error("Nao foi possivel carregar os itens do DRE.");
  }
  return { ...(calculateEntryWithItems(entry as DreEntryWithModel, items)), items };
}

export async function deleteDreEntry(userId: string, entryId: string) {
  const { error } = await supabase.from("dre_entries").delete().eq("user_id", userId).eq("id", entryId);
  if (error) throw new Error("Nao foi possivel excluir o DRE.");
}

async function hasAnyUsage(queries: Array<PromiseLike<{ count: number | null; error: unknown }>>) {
  const results = await Promise.all(queries);
  const failed = results.some((result) => result.error);
  if (failed) throw new Error("Nao foi possivel verificar vinculos antes da exclusao.");
  return results.some((result) => Number(result.count ?? 0) > 0);
}

function calculateEntryWithItems(entry: DreEntryWithModel, items: DreEntryWithItems["items"]): DreEntryWithModel {
  const totals = calculateDreTotals(
    items.map((item) => ({
      lineType: item.line_type,
      categoryType: item.category_type_snapshot,
      categoryIsRevenue: item.category_is_revenue ?? false,
      subcategoryIsReductive: item.subcategory_is_reductive ?? false,
      value: Number(item.value || 0),
    })),
  );
  const revenue = calculateRevenueFromEntryItems(items);
  const netIncome = calculateNetIncomeFromEntryItems(items, totals.result);

  return {
    ...entry,
    total_credit: totals.totalCredit,
    total_debit: totals.totalDebit,
    result: netIncome,
    margin_percentage: revenue > 0 ? roundCurrency((netIncome / revenue) * 100) : totals.marginPercentage,
  };
}

async function recalculateEntrySummaries(userId: string, entries: DreEntryWithModel[]) {
  if (entries.length === 0) return entries;

  const entryIds = entries.map((entry) => entry.id);
  const rawItems = (await fetchAllPaginated((from, to) =>
    supabase
      .from("dre_entry_items")
      .select("*")
      .eq("user_id", userId)
      .in("dre_entry_id", entryIds)
      .range(from, to),
  )) as DreEntryWithItems["items"];
  const subcategoryIds = Array.from(new Set(rawItems.map((item) => item.subcategory_id).filter((id): id is string => Boolean(id))));
  const categoryIds = Array.from(new Set(rawItems.map((item) => item.category_id).filter((id): id is string => Boolean(id))));
  const reductiveBySubcategory = new Map<string, boolean>();
  const revenueByCategory = new Map<string, boolean>();
  const entryModelId = new Map(entries.map((entry) => [entry.id, entry.model_id]));
  const modelIds = Array.from(new Set(entries.map((entry) => entry.model_id)));
  const netIncomeDisplayOrderByModel = new Map<string, Set<number>>();

  if (subcategoryIds.length) {
    const subcategories = await fetchAllPaginated<Pick<DreSubcategory, "id" | "is_reductive">>((from, to) =>
      supabase
        .from("dre_subcategories")
        .select("id,is_reductive")
        .eq("user_id", userId)
        .in("id", subcategoryIds)
        .range(from, to),
    );
    subcategories.forEach((subcategory) => reductiveBySubcategory.set(subcategory.id, subcategory.is_reductive));
  }
  if (categoryIds.length) {
    const categories = await fetchAllPaginated<Pick<DreCategory, "id" | "is_revenue">>((from, to) =>
      supabase
        .from("dre_categories")
        .select("id,is_revenue")
        .eq("user_id", userId)
        .in("id", categoryIds)
        .range(from, to),
    );
    categories.forEach((category) => revenueByCategory.set(category.id, category.is_revenue));
  }
  if (modelIds.length) {
    const netIncomeLines = await fetchAllPaginated<Pick<DreModelWithLines["lines"][number], "model_id" | "display_order">>((from, to) =>
      supabase
        .from("dre_model_lines")
        .select("model_id,display_order")
        .eq("user_id", userId)
        .in("model_id", modelIds)
        .eq("line_type", "sum")
        .eq("is_net_income", true)
        .range(from, to),
    );
    netIncomeLines.forEach((line) => {
      netIncomeDisplayOrderByModel.set(line.model_id, new Set([...(netIncomeDisplayOrderByModel.get(line.model_id) ?? []), line.display_order]));
    });
  }

  const itemsByEntry = new Map<string, DreEntryWithItems["items"]>();
  rawItems.forEach((item) => {
    const modelId = entryModelId.get(item.dre_entry_id);
    const enriched = {
      ...item,
      category_is_revenue: item.category_id ? revenueByCategory.get(item.category_id) ?? false : false,
      is_net_income: item.line_type === "sum" && Boolean(modelId && netIncomeDisplayOrderByModel.get(modelId)?.has(item.display_order)),
      subcategory_is_reductive: item.subcategory_id ? reductiveBySubcategory.get(item.subcategory_id) ?? false : false,
    };
    itemsByEntry.set(item.dre_entry_id, [...(itemsByEntry.get(item.dre_entry_id) ?? []), enriched]);
  });

  return entries.map((entry) => calculateEntryWithItems(entry, itemsByEntry.get(entry.id) ?? []));
}
