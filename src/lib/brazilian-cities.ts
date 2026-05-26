import { supabase } from "@/integrations/supabase/client";

export async function getDistinctStates(): Promise<string[]> {
  const { data, error } = await supabase
    .from("brazilian_cities")
    .select("state_name")
    .order("state_name");

  if (error) throw new Error("Não foi possível carregar os estados.");

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const row of data ?? []) {
    if (!seen.has(row.state_name)) {
      seen.add(row.state_name);
      unique.push(row.state_name);
    }
  }
  return unique;
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
