import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type PrivacyRequest = Tables<"privacy_requests">;
export type PrivacyRequestType = "export" | "account_deletion";

const ACTIVE_PRIVACY_REQUEST_STATUSES = ["pending", "processing"];

export async function getPrivacyRequests(userId: string) {
  const { data, error } = await supabase
    .from("privacy_requests")
    .select("*")
    .eq("user_id", userId)
    .order("requested_at", { ascending: false })
    .limit(10);

  if (error) throw new Error("Nao foi possivel carregar solicitacoes de privacidade.");
  return data ?? [];
}

export async function createPrivacyRequest(userId: string, requestType: PrivacyRequestType, status: PrivacyRequest["status"] = "pending") {
  const existing = await getActivePrivacyRequest(userId, requestType);
  if (existing) throw new Error("Você já possui uma solicitação em andamento.");

  const { data, error } = await supabase
    .from("privacy_requests")
    .insert({
      user_id: userId,
      request_type: requestType,
      status,
      processed_at: status === "completed" ? new Date().toISOString() : null,
    })
    .select("*")
    .single();

  if (error) {
    if (import.meta.env.DEV) console.error("Privacy request creation failed", error);
    throw new Error("Nao foi possivel registrar sua solicitacao.");
  }

  return data;
}

export async function cancelPrivacyRequest(userId: string, requestId: string) {
  const { data, error } = await supabase
    .from("privacy_requests")
    .update({ status: "canceled" })
    .eq("id", requestId)
    .eq("user_id", userId)
    .in("status", ACTIVE_PRIVACY_REQUEST_STATUSES)
    .select("*")
    .single();

  if (error) {
    if (import.meta.env.DEV) console.error("Privacy request cancellation failed", error);
    throw new Error("Nao foi possivel cancelar a solicitacao.");
  }

  return data;
}

export async function exportUserData(user: User) {
  const userId = user.id;
  const [
    profile,
    preferences,
    notificationPreferences,
    userProducts,
    productSubscriptions,
    productAccessSubscriptions,
    supportRequests,
    privacyRequests,
    diagnosticSessions,
    dreCategories,
    dreSubcategories,
    dreModels,
    dreModelLines,
    dreEntries,
    dreEntryItems,
  ] = await Promise.all([
    selectMaybeSingle("user_profiles", userId),
    selectMaybeSingle("user_preferences", userId),
    selectMaybeSingle("user_notification_preferences", userId),
    selectByUser("user_products", userId),
    selectByUser("product_subscriptions", userId),
    selectByUser("user_product_subscriptions", userId),
    selectByUser("support_requests", userId),
    selectByUser("privacy_requests", userId),
    selectByUser("diagnostic_sessions", userId),
    selectByUser("dre_categories", userId),
    selectByUser("dre_subcategories", userId),
    selectByUser("dre_models", userId),
    selectByUser("dre_model_lines", userId),
    selectByUser("dre_entries", userId),
    selectByUser("dre_entry_items", userId),
  ]);

  return {
    exported_at: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
    },
    profile,
    preferences,
    notification_preferences: notificationPreferences,
    products: {
      user_products: userProducts,
      product_subscriptions: productSubscriptions,
      user_product_subscriptions: productAccessSubscriptions,
    },
    support_requests: supportRequests,
    privacy_requests: privacyRequests,
    diagnostics: {
      sessions: diagnosticSessions,
    },
    dre: {
      categories: dreCategories,
      subcategories: dreSubcategories,
      models: dreModels,
      model_lines: dreModelLines,
      entries: dreEntries,
      entry_items: dreEntryItems,
    },
  };
}

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function getActiveDeletionRequest(requests: PrivacyRequest[]) {
  return requests.find((request) => request.request_type === "account_deletion" && ACTIVE_PRIVACY_REQUEST_STATUSES.includes(request.status));
}

async function getActivePrivacyRequest(userId: string, requestType: PrivacyRequestType) {
  const { data, error } = await supabase
    .from("privacy_requests")
    .select("*")
    .eq("user_id", userId)
    .eq("request_type", requestType)
    .in("status", ACTIVE_PRIVACY_REQUEST_STATUSES)
    .maybeSingle();

  if (error) throw new Error("Nao foi possivel verificar solicitacoes em andamento.");
  return data;
}

async function selectByUser(table: Parameters<typeof supabase.from>[0], userId: string) {
  const { data, error } = await supabase.from(table).select("*").eq("user_id", userId);
  if (error) {
    if (import.meta.env.DEV) console.error(`Data export failed for ${table}`, error);
    return [];
  }

  return data ?? [];
}

async function selectMaybeSingle(table: Parameters<typeof supabase.from>[0], userId: string) {
  const { data, error } = await supabase.from(table).select("*").eq("user_id", userId).maybeSingle();
  if (error) {
    if (import.meta.env.DEV) console.error(`Data export failed for ${table}`, error);
    return null;
  }

  return data;
}
