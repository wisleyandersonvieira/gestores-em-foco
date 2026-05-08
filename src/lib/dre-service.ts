import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { calculateCategoryTotal, calculateDreTotals, calculateSumLineValue } from "@/lib/dre-calculations";
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

export async function createDefaultDreCategories(userId: string) {
  const { error } = await supabase.rpc("create_default_dre_categories", { p_user_id: userId });
  if (error) {
    throw new Error("Nao foi possivel preparar as categorias padrao.");
  }
}

export async function listDreCategories(userId: string) {
  const { data, error } = await supabase
    .from("dre_categories")
    .select("*")
    .eq("user_id", userId)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error("Nao foi possivel carregar categorias.");
  return data ?? [];
}

export async function saveDreCategory(payload: TablesInsert<"dre_categories"> | TablesUpdate<"dre_categories">) {
  const name = String(payload.name ?? "").trim();
  if (!name) throw new Error("Informe o nome da categoria.");

  if ("id" in payload && payload.id) {
    const { error } = await supabase.from("dre_categories").update({ ...payload, name }).eq("id", payload.id);
    if (error) throw new Error("Nao foi possivel atualizar a categoria.");
    return;
  }

  const { error } = await supabase.from("dre_categories").insert({ ...(payload as TablesInsert<"dre_categories">), name });
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
  const { data, error } = await supabase
    .from("dre_subcategories")
    .select("*, category:dre_categories(id,name,type,status)")
    .eq("user_id", userId)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error("Nao foi possivel carregar subcategorias.");
  return (data ?? []) as DreSubcategoryWithCategory[];
}

export async function saveDreSubcategory(payload: TablesInsert<"dre_subcategories"> | TablesUpdate<"dre_subcategories">) {
  const name = String(payload.name ?? "").trim();
  if (!name) throw new Error("Informe o nome da subcategoria.");
  if (!payload.category_id) throw new Error("Selecione uma categoria.");

  if ("id" in payload && payload.id) {
    const { error } = await supabase.from("dre_subcategories").update({ ...payload, name }).eq("id", payload.id);
    if (error) throw new Error("Nao foi possivel atualizar a subcategoria.");
    return;
  }

  const { error } = await supabase.from("dre_subcategories").insert({ ...(payload as TablesInsert<"dre_subcategories">), name });
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
  let query = supabase.from("dre_models").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new Error("Nao foi possivel carregar modelos.");
  return data ?? [];
}

export async function getDreModelWithLines(userId: string, modelId: string): Promise<DreModelWithLines> {
  const { data: model, error: modelError } = await supabase.from("dre_models").select("*").eq("user_id", userId).eq("id", modelId).single();
  if (modelError) throw new Error("Modelo nao encontrado.");

  const { data: lines, error: linesError } = await supabase
    .from("dre_model_lines")
    .select("*, category:dre_categories(*), subcategory:dre_subcategories(*)")
    .eq("user_id", userId)
    .eq("model_id", modelId)
    .order("display_order", { ascending: true });

  if (linesError) throw new Error("Nao foi possivel carregar a estrutura do modelo.");
  return { ...model, lines: (lines ?? []) as DreModelWithLines["lines"] };
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

  const entryPayload = {
    user_id: params.userId,
    model_id: params.modelId,
    competence: params.competence,
    status: params.status,
    total_credit: totals.totalCredit,
    total_debit: totals.totalDebit,
    result: totals.result,
    margin_percentage: totals.marginPercentage,
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
  const { data, error } = await supabase
    .from("dre_entries")
    .select("*, model:dre_models(id,name)")
    .eq("user_id", userId)
    .order("competence", { ascending: false });

  if (error) throw new Error("Nao foi possivel carregar DREs cadastrados.");
  return (data ?? []) as DreEntryWithModel[];
}

export async function getDreEntry(userId: string, entryId: string): Promise<DreEntryWithItems> {
  const { data: entry, error } = await supabase
    .from("dre_entries")
    .select("*, model:dre_models(id,name)")
    .eq("user_id", userId)
    .eq("id", entryId)
    .single();

  if (error || !entry) throw new Error("DRE nao encontrado.");

  const { data: items, error: itemsError } = await supabase
    .from("dre_entry_items")
    .select("*")
    .eq("user_id", userId)
    .eq("dre_entry_id", entryId)
    .order("display_order", { ascending: true });

  if (itemsError) throw new Error("Nao foi possivel carregar os itens do DRE.");
  return { ...(entry as DreEntryWithModel), items: items ?? [] };
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
