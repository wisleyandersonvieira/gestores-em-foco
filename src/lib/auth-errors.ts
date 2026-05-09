const RATE_LIMIT_MESSAGE = "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";

export function isRateLimitError(error: unknown) {
  const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : null;
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  return status === 429 || message.includes("rate limit") || message.includes("too many requests");
}

export function getAuthErrorMessage(error: unknown, fallback: string) {
  if (isRateLimitError(error)) return RATE_LIMIT_MESSAGE;
  return fallback;
}
