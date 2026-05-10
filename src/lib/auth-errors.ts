const RATE_LIMIT_MESSAGE = "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
const CAPTCHA_MESSAGE = "Não foi possível validar a verificação de segurança. Tente novamente.";

export function isRateLimitError(error: unknown) {
  const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : null;
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  return status === 429 || message.includes("rate limit") || message.includes("too many requests");
}

export function isCaptchaError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  return message.includes("captcha") || message.includes("turnstile") || message.includes("security verification");
}

export function getAuthErrorMessage(error: unknown, fallback: string) {
  if (isRateLimitError(error)) return RATE_LIMIT_MESSAGE;
  if (isCaptchaError(error)) return CAPTCHA_MESSAGE;
  return fallback;
}
