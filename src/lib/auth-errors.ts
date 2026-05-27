const RATE_LIMIT_MESSAGE = "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
const CAPTCHA_MESSAGE = "Não foi possível validar a verificação de segurança. Tente novamente.";

type SupabaseLikeError = { status?: number; code?: string; message?: string };

function asErr(error: unknown): SupabaseLikeError {
  if (error && typeof error === "object") return error as SupabaseLikeError;
  return {};
}

export function isRateLimitError(error: unknown) {
  const e = asErr(error);
  const message = (e.message ?? "").toLowerCase();
  return e.status === 429 || message.includes("rate limit") || message.includes("too many requests");
}

export function isCaptchaError(error: unknown) {
  const e = asErr(error);
  const message = (e.message ?? "").toLowerCase();
  const code = (e.code ?? "").toLowerCase();
  return code.includes("captcha") || message.includes("captcha") || message.includes("turnstile") || message.includes("security verification");
}

export function getAuthErrorMessage(error: unknown, fallback: string) {
  if (isRateLimitError(error)) return RATE_LIMIT_MESSAGE;
  if (isCaptchaError(error)) return CAPTCHA_MESSAGE;

  const e = asErr(error);
  const code = (e.code ?? "").toLowerCase();
  const message = (e.message ?? "").toLowerCase();

  if (code === "weak_password" || message.includes("password should be") || message.includes("weak password")) {
    return "Senha inválida. Use no mínimo 8 caracteres com letra maiúscula, minúscula, número e caractere especial.";
  }
  if (code === "user_already_exists" || message.includes("already registered") || message.includes("user already")) {
    return "Este email já possui uma conta. Faça login ou recupere sua senha.";
  }
  if (code === "email_address_invalid" || message.includes("invalid email")) {
    return "Email inválido. Verifique o endereço informado.";
  }
  if (code === "signup_disabled" || message.includes("signups not allowed") || message.includes("signup is disabled")) {
    return "Cadastros estão temporariamente desabilitados. Tente novamente mais tarde.";
  }
  if (code === "email_address_not_authorized") {
    return "Este email não está autorizado a se cadastrar.";
  }
  if (code === "reauthentication_needed" || message.includes("current password required") || message.includes("reauthentication")) {
    return "Para alterar sua senha, informe a senha atual no campo correspondente.";
  }
  if (code === "same_password" || message.includes("should be different from the old password") || message.includes("same password")) {
    return "A nova senha deve ser diferente da senha atual.";
  }
  if (code === "validation_failed" || message.includes("validation")) {
    return e.message || fallback;
  }

  // Surface the underlying message when available so the user can act on it.
  return e.message ? `${fallback} (${e.message})` : fallback;
}
