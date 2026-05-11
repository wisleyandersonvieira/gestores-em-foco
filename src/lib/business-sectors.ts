import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type BusinessSector = Tables<"business_sectors">;
export type BusinessSubsector = Tables<"business_subsectors">;
export type BusinessSectorWithSubsectors = BusinessSector & {
  subsectors: BusinessSubsector[];
};

export function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function slugify(value: string) {
  return normalizeSearchText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getActiveSectorsWithSubsectors() {
  const { data, error } = await supabase
    .from("business_sectors")
    .select("*, subsectors:business_subsectors(*)")
    .eq("is_active", true)
    .eq("business_subsectors.is_active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true })
    .order("display_order", { referencedTable: "business_subsectors", ascending: true })
    .order("name", { referencedTable: "business_subsectors", ascending: true });

  if (error) throw new Error("Não foi possível carregar setores e subsetores.");
  return (data ?? []).map((sector) => ({
    ...sector,
    subsectors: (sector.subsectors ?? []).filter((subsector) => subsector.is_active),
  })) as BusinessSectorWithSubsectors[];
}

export async function getActiveSectors() {
  const { data, error } = await supabase
    .from("business_sectors")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error("Não foi possível carregar setores.");
  return data ?? [];
}

export async function getActiveSubsectorsBySector(sectorId: string) {
  const { data, error } = await supabase
    .from("business_subsectors")
    .select("*")
    .eq("sector_id", sectorId)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error("Não foi possível carregar subsetores.");
  return data ?? [];
}

export async function getAdminSectors() {
  const { data, error } = await supabase
    .from("business_sectors")
    .select("*")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error("Não foi possível carregar setores.");
  return data ?? [];
}

export async function getAdminSubsectors(sectorId: string) {
  const { data, error } = await supabase
    .from("business_subsectors")
    .select("*")
    .eq("sector_id", sectorId)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error("Não foi possível carregar subsetores.");
  return data ?? [];
}

export async function createSector(data: Pick<TablesInsert<"business_sectors">, "name" | "description" | "display_order" | "is_active">) {
  const name = data.name.trim();
  if (!name) throw new Error("Informe o nome do setor.");

  const { data: saved, error } = await supabase
    .from("business_sectors")
    .insert({ ...data, name, slug: slugify(name) })
    .select("*")
    .single();

  if (error) throw new Error("Não foi possível criar o setor. Verifique se ele já existe.");
  return saved;
}

export async function updateSector(id: string, data: Pick<TablesUpdate<"business_sectors">, "name" | "description" | "display_order" | "is_active">) {
  const name = String(data.name ?? "").trim();
  if (!name) throw new Error("Informe o nome do setor.");

  const { data: saved, error } = await supabase
    .from("business_sectors")
    .update({ ...data, name, slug: slugify(name) })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error("Não foi possível atualizar o setor. Verifique se ele já existe.");
  return saved;
}

export async function toggleSectorActive(id: string, isActive: boolean) {
  const { error } = await supabase.from("business_sectors").update({ is_active: isActive }).eq("id", id);
  if (error) throw new Error("Não foi possível atualizar o status do setor.");
}

export async function deleteSector(id: string) {
  const [{ count: subsectorsCount, error: subsectorsError }, { count: profilesCount, error: profilesError }, { count: userProfilesCount, error: userProfilesError }] = await Promise.all([
    supabase.from("business_subsectors").select("id", { count: "exact", head: true }).eq("sector_id", id),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("sector_id", id),
    supabase.from("user_profiles").select("id", { count: "exact", head: true }).eq("sector_id", id),
  ]);

  if (subsectorsError || profilesError || userProfilesError) throw new Error("Não foi possível validar vínculos do setor.");
  if ((subsectorsCount ?? 0) > 0 || (profilesCount ?? 0) > 0 || (userProfilesCount ?? 0) > 0) {
    throw new Error("Não é possível excluir este setor porque ele possui subsetores ou usuários vinculados. Desative-o para impedir novos cadastros.");
  }

  const { error } = await supabase.from("business_sectors").delete().eq("id", id);
  if (error) throw new Error("Não foi possível excluir o setor.");
}

export async function createSubsector(data: Pick<TablesInsert<"business_subsectors">, "sector_id" | "name" | "description" | "display_order" | "is_active">) {
  const name = data.name.trim();
  if (!data.sector_id) throw new Error("Selecione um setor.");
  if (!name) throw new Error("Informe o nome do subsetor.");

  const { data: saved, error } = await supabase
    .from("business_subsectors")
    .insert({ ...data, name, slug: slugify(name) })
    .select("*")
    .single();

  if (error) throw new Error("Não foi possível criar o subsetor. Verifique se ele já existe neste setor.");
  return saved;
}

export async function updateSubsector(id: string, data: Pick<TablesUpdate<"business_subsectors">, "sector_id" | "name" | "description" | "display_order" | "is_active">) {
  const name = String(data.name ?? "").trim();
  if (!data.sector_id) throw new Error("Selecione um setor.");
  if (!name) throw new Error("Informe o nome do subsetor.");

  const { data: saved, error } = await supabase
    .from("business_subsectors")
    .update({ ...data, name, slug: slugify(name) })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error("Não foi possível atualizar o subsetor. Verifique se ele já existe neste setor.");
  return saved;
}

export async function toggleSubsectorActive(id: string, isActive: boolean) {
  const { error } = await supabase.from("business_subsectors").update({ is_active: isActive }).eq("id", id);
  if (error) throw new Error("Não foi possível atualizar o status do subsetor.");
}

export async function deleteSubsector(id: string) {
  const [{ count: profilesCount, error: profilesError }, { count: userProfilesCount, error: userProfilesError }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("subsector_id", id),
    supabase.from("user_profiles").select("id", { count: "exact", head: true }).eq("subsector_id", id),
  ]);

  if (profilesError || userProfilesError) throw new Error("Não foi possível validar vínculos do subsetor.");
  if ((profilesCount ?? 0) > 0 || (userProfilesCount ?? 0) > 0) {
    throw new Error("Não é possível excluir este subsetor porque ele está vinculado a usuários. Desative-o para impedir novos cadastros.");
  }

  const { error } = await supabase.from("business_subsectors").delete().eq("id", id);
  if (error) throw new Error("Não foi possível excluir o subsetor.");
}
