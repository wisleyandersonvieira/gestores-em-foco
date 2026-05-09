import { supabase } from "@/integrations/supabase/client";

export async function isCurrentUserAdmin() {
  const { data, error } = await supabase.rpc("is_admin" as any);
  if (error) {
    if (import.meta.env.DEV) console.error("Admin access check failed", error);
    return false;
  }

  return Boolean(data);
}

export function getAdminAccessError() {
  return "Sua conta nao esta autorizada para acessar o painel administrativo.";
}
