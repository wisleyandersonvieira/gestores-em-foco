import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { getUserProducts } from "@/lib/products";
import { validatePassword } from "@/lib/password-security";

export type UserProfile = Tables<"user_profiles">;
export type UserPreferences = Tables<"user_preferences">;
export type UserNotificationPreferences = Tables<"user_notification_preferences">;
export type SupportRequestInsert = TablesInsert<"support_requests">;

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error("Nao foi possivel carregar o perfil.");
  return data ?? createDefaultProfile(userId);
}

export async function updateUserProfile(userId: string, data: TablesUpdate<"user_profiles">) {
  if (!String(data.full_name ?? "").trim()) throw new Error("Informe o nome completo.");

  const { data: saved, error } = await supabase
    .from("user_profiles")
    .upsert({ ...data, user_id: userId }, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) throw new Error("Nao foi possivel salvar o perfil.");
  return saved;
}

export async function getUserPreferences(userId: string) {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error("Nao foi possivel carregar preferencias.");
  return data ?? createDefaultPreferences(userId);
}

export async function updateUserPreferences(userId: string, data: TablesUpdate<"user_preferences">) {
  const { data: saved, error } = await supabase
    .from("user_preferences")
    .upsert({ ...data, user_id: userId }, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) throw new Error("Nao foi possivel salvar preferencias.");
  return saved;
}

export async function getNotificationPreferences(userId: string) {
  const { data, error } = await supabase
    .from("user_notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error("Nao foi possivel carregar notificacoes.");
  return data ?? createDefaultNotifications(userId);
}

export async function updateNotificationPreferences(userId: string, data: TablesUpdate<"user_notification_preferences">) {
  const payload = { ...data, user_id: userId, security_alerts: true };
  const { data: saved, error } = await supabase
    .from("user_notification_preferences")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) throw new Error("Nao foi possivel salvar notificacoes.");
  return saved;
}

export async function getUserSubscriptions(userId: string) {
  return getUserProducts(userId);
}

export async function createSupportRequest(userId: string, data: Pick<SupportRequestInsert, "subject" | "message" | "type">) {
  if (!data.subject.trim()) throw new Error("Informe o assunto.");
  if (!data.message.trim()) throw new Error("Informe a mensagem.");
  if (!data.type) throw new Error("Selecione o tipo.");

  const { error } = await supabase.from("support_requests").insert({ ...data, user_id: userId });
  if (error) throw new Error("Nao foi possivel enviar sua solicitacao.");
}

export async function sendPasswordResetEmail(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) {
    if (import.meta.env.DEV) console.error("Password reset email failed", error);
    throw new Error("Não foi possível enviar o link de redefinição. Tente novamente.");
  }
}

export async function updateUserPassword(newPassword: string, confirmation = newPassword) {
  const validationError = validatePassword(newPassword, confirmation);
  if (validationError) throw new Error(validationError);

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    if (import.meta.env.DEV) console.error("Password update failed", error);
    throw new Error("Não foi possível alterar a senha. Tente novamente.");
  }
}

function createDefaultProfile(userId: string): UserProfile {
  const now = new Date().toISOString();
  return {
    id: "new",
    user_id: userId,
    full_name: "",
    phone: null,
    company_name: null,
    role: null,
    avatar_url: null,
    created_at: now,
    updated_at: now,
  };
}

function createDefaultPreferences(userId: string): UserPreferences {
  const now = new Date().toISOString();
  return {
    id: "new",
    user_id: userId,
    theme: "light",
    density: "default",
    language: "pt-BR",
    timezone: "America/Sao_Paulo",
    currency: "BRL",
    date_format: "DD/MM/YYYY",
    created_at: now,
    updated_at: now,
  };
}

function createDefaultNotifications(userId: string): UserNotificationPreferences {
  const now = new Date().toISOString();
  return {
    id: "new",
    user_id: userId,
    platform_emails: true,
    billing_emails: true,
    product_news: true,
    security_alerts: true,
    in_app_notifications: true,
    created_at: now,
    updated_at: now,
  };
}
