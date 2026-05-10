import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type UserProduct = Tables<"user_products">;
export type ProductType = UserProduct["product_type"];
export type ProductStatus = UserProduct["status"];

export const productTypeLabels: Record<ProductType, string> = {
  curso_presencial: "Curso Presencial",
  curso_online: "Curso Online",
  palestra: "Palestra",
  workshop: "Workshop",
  imersao: "Imersao",
  diagnostico: "Diagnostico",
  dre_facil: "Gestor de DRE",
  mentoria: "Mentoria",
  consultoria: "Consultoria",
};

export const productStatusLabels: Record<ProductStatus, string> = {
  ativo: "Ativo",
  concluido: "Concluido",
  expirado: "Expirado",
  pendente: "Pendente",
};

export async function listUserProducts(userId: string) {
  const { data, error } = await supabase
    .from("user_products")
    .select("*")
    .eq("user_id", userId)
    .order("purchased_at", { ascending: false });

  if (error) {
    throw new Error("Nao foi possivel carregar seus produtos.");
  }

  return data ?? [];
}

export async function ensureDiagnosticProduct(params: {
  userId: string;
  sessionId: string;
  templateName: string;
  completedAt?: string | null;
}) {
  const { data: existing, error: existingError } = await supabase
    .from("user_products")
    .select("id")
    .eq("user_id", params.userId)
    .eq("product_type", "diagnostico")
    .filter("metadata->>diagnostic_session_id", "eq", params.sessionId)
    .maybeSingle();

  if (existingError) {
    throw new Error("Nao foi possivel verificar seus produtos.");
  }

  if (existing) {
    return;
  }

  const { error } = await supabase.rpc("register_completed_diagnostic_product" as any, {
    p_session_id: params.sessionId,
  });

  if (error) {
    throw new Error("Nao foi possivel registrar o diagnostico em seus produtos.");
  }

  void params.templateName;
  void params.completedAt;
}
