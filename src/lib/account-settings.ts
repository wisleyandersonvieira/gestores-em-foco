import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { getUserProducts } from "@/lib/products";
import { validatePassword } from "@/lib/password-security";

export type UserProfile = Tables<"user_profiles">;
export type UserPreferences = Tables<"user_preferences">;
export type UserNotificationPreferences = Tables<"user_notification_preferences">;
export type SupportRequestInsert = TablesInsert<"support_requests">;

const AVATAR_BUCKET = "avatars";
const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const AVATAR_ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const SUPPORT_ALLOWED_TYPES = new Set(["duvida", "problema", "sugestao", "financeiro"]);
const SUPPORT_SUBJECT_MAX_LENGTH = 120;
const SUPPORT_MESSAGE_MAX_LENGTH = 5000;

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
  if ("full_name" in data && !String(data.full_name ?? "").trim()) throw new Error("Informe o nome completo.");

  const payload = sanitizeUserProfilePayload(sanitizeUpsertPayload(data));
  const { data: saved, error } = await supabase
    .from("user_profiles")
    .upsert({ ...payload, user_id: userId }, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) throw new Error("Nao foi possivel salvar o perfil.");
  return saved;
}

export function validateAvatarFile(file: File) {
  if (!AVATAR_ALLOWED_TYPES.has(file.type) || file.size > AVATAR_MAX_SIZE_BYTES) {
    return "Envie uma imagem em JPG, PNG ou WEBP com até 5 MB.";
  }

  return null;
}

export async function uploadUserAvatar(userId: string, file: File, previousAvatarPath?: string | null) {
  const validationError = validateAvatarFile(file);
  if (validationError) throw new Error(validationError);

  const extension = getAvatarFileExtension(file);
  const avatarPath = `${userId}/avatar-${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(avatarPath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });

  if (uploadError) {
    if (import.meta.env.DEV) console.error("Avatar upload failed", uploadError);
    throw new Error("Não foi possível atualizar sua foto. Tente novamente.");
  }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(avatarPath);
  const savedProfile = await updateUserProfile(userId, {
    avatar_url: data.publicUrl,
    avatar_path: avatarPath,
  });

  if (previousAvatarPath && previousAvatarPath !== avatarPath) {
    void supabase.storage
      .from(AVATAR_BUCKET)
      .remove([previousAvatarPath])
      .then(({ error }) => {
        if (error && import.meta.env.DEV) console.error("Previous avatar removal failed", error);
      });
  }

  return savedProfile;
}

export async function removeUserAvatar(userId: string, avatarPath?: string | null) {
  if (avatarPath) {
    const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([avatarPath]);
    if (error && import.meta.env.DEV) console.error("Avatar removal failed", error);
  }

  return updateUserProfile(userId, {
    avatar_url: null,
    avatar_path: null,
  });
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
  const payload = sanitizeUpsertPayload(data);
  const { data: saved, error } = await supabase
    .from("user_preferences")
    .upsert({ ...payload, user_id: userId }, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) {
    if (import.meta.env.DEV) console.error("User preferences upsert failed", error);
    throw new Error("Nao foi possivel salvar preferencias.");
  }
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
  const payload = { ...sanitizeUpsertPayload(data), user_id: userId, security_alerts: true };
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
  const subject = stripHtml(String(data.subject ?? "")).trim();
  const message = stripHtml(String(data.message ?? "")).trim();
  const type = String(data.type ?? "").trim();

  if (!subject) throw new Error("Informe o assunto.");
  if (!message) throw new Error("Informe a mensagem.");
  if (!SUPPORT_ALLOWED_TYPES.has(type)) throw new Error("Selecione um tipo valido.");
  if (subject.length > SUPPORT_SUBJECT_MAX_LENGTH) throw new Error("O assunto deve ter no maximo 120 caracteres.");
  if (message.length > SUPPORT_MESSAGE_MAX_LENGTH) throw new Error("A mensagem deve ter no maximo 5000 caracteres.");

  const { error } = await supabase.from("support_requests").insert({ subject, message, type, user_id: userId });
  if (error) throw new Error("Nao foi possivel enviar sua solicitacao.");
}

export async function sendPasswordResetEmail(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/redefinir-senha`,
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
    avatar_path: null,
    full_name: "",
    phone: null,
    company_name: null,
    role: null,
    avatar_url: null,
    created_at: now,
    updated_at: now,
  };
}

function getAvatarFileExtension(file: File) {
  const extensionByType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  return extensionByType[file.type] ?? "jpg";
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

function sanitizeUpsertPayload<T extends { id?: string | null; created_at?: string | null; updated_at?: string | null }>(data: T) {
  const { id: _id, created_at: _createdAt, updated_at: _updatedAt, ...payload } = data;
  return payload;
}

function sanitizeUserProfilePayload<T extends Record<string, unknown>>(data: T) {
  const blockedFields = new Set(["user_id", "email", "role", "is_active"]);
  const payload: Record<string, unknown> = {};

  Object.entries(data).forEach(([key, value]) => {
    if (blockedFields.has(key)) return;
    payload[key] = typeof value === "string" ? stripHtml(value).trim().slice(0, maxLengthForProfileField(key)) : value;
  });

  return payload;
}

function maxLengthForProfileField(key: string) {
  if (key === "full_name" || key === "company_name") return 120;
  if (key === "phone") return 32;
  if (key === "avatar_url" || key === "avatar_path") return 500;
  return 255;
}

function stripHtml(value: string) {
  return value.replace(/[<>]/g, "");
}
