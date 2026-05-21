import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://gestoresemfoco.com.br",
  "https://www.gestoresemfoco.com.br",
  "https://gestoresemfoco.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
];

export function configuredAllowedOrigins() {
  const configured = Deno.env.get("ALLOWED_ORIGINS")
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return new Set(configured?.length ? configured : DEFAULT_ALLOWED_ORIGINS);
}

export function corsHeaders(request: Request, fallbackOrigin = "https://gestoresemfoco.com.br") {
  const origin = request.headers.get("origin") ?? "";
  const allowedOrigins = configuredAllowedOrigins();
  const allowOrigin = allowedOrigins.has(origin) ? origin : fallbackOrigin;

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-real-ip")
    ?? forwarded
    ?? "unknown";
}

export async function rateLimitGuard(
  supabaseAdmin: ReturnType<typeof createClient>,
  params: {
    functionName: string;
    userId?: string | null;
    ip?: string | null;
    maxRequests: number;
    windowSeconds: number;
  },
) {
  const now = Date.now();
  const windowMs = params.windowSeconds * 1000;
  const windowStartMs = Math.floor(now / windowMs) * windowMs;
  const subject = params.userId ? `user:${params.userId}` : `ip:${params.ip ?? "unknown"}`;
  const key = `${params.functionName}:${subject}:${new Date(windowStartMs).toISOString()}`;

  const { data, error } = await supabaseAdmin
    .from("edge_rate_limits")
    .select("request_count")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    console.error("rate-limit lookup failed", {
      function_name: params.functionName,
      subject_type: params.userId ? "user" : "ip",
      message: error.message,
    });
    return { allowed: true, remaining: params.maxRequests };
  }

  const requestCount = data?.request_count ?? 0;
  if (requestCount >= params.maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  const { error: upsertError } = await supabaseAdmin
    .from("edge_rate_limits")
    .upsert({
      key,
      function_name: params.functionName,
      subject,
      window_start: new Date(windowStartMs).toISOString(),
      request_count: requestCount + 1,
      updated_at: new Date(now).toISOString(),
    }, { onConflict: "key" });

  if (upsertError) {
    console.error("rate-limit update failed", {
      function_name: params.functionName,
      subject_type: params.userId ? "user" : "ip",
      message: upsertError.message,
    });
  }

  return { allowed: true, remaining: params.maxRequests - requestCount - 1 };
}
