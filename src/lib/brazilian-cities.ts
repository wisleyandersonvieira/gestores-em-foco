import { supabase } from "@/integrations/supabase/client";

export async function getDistinctStates(): Promise<string[]> {
  const seen = new Set<string>();
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("brazilian_cities")
      .select("state_name")
      .order("state_name")
      .range(from, from + pageSize - 1);

    if (error) throw new Error("Não foi possível carregar os estados.");
    if (!data || data.length === 0) break;

    for (const row of data) seen.add(row.state_name);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return Array.from(seen).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export async function getCitiesByState(stateName: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("brazilian_cities")
    .select("city_name")
    .eq("state_name", stateName)
    .order("city_name");

  if (error) throw new Error("Não foi possível carregar as cidades.");

  return (data ?? []).map((row) => row.city_name);
}
