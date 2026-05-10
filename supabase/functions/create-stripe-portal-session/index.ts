import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@16.12.0?target=deno";

const allowedOrigins = new Set([
  "https://gestoresemfoco.com.br",
  "https://www.gestoresemfoco.com.br",
  "https://gestoresemfoco.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
]);

function isAllowedOrigin(origin: string) {
  if (allowedOrigins.has(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    return (
      hostname.endsWith(".lovable.app") ||
      hostname.endsWith(".lovableproject.com") ||
      hostname.endsWith(".lovable.dev")
    );
  } catch {
    return false;
  }
}

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const allowOrigin = isAllowedOrigin(origin) ? origin : "https://gestoresemfoco.com.br";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function jsonResponse(request: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  if (request.method !== "POST") {
    return jsonResponse(request, 405, { error: "method_not_allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const appUrl = Deno.env.get("APP_URL") ?? "https://gestoresemfoco.com.br";

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !stripeSecretKey) {
    return jsonResponse(request, 500, { error: "server_not_configured" });
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse(request, 401, { error: "missing_authorization" });
  }

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: userData, error: userError } = await supabaseUser.auth.getUser();
  const user = userData?.user;

  if (userError || !user) {
    return jsonResponse(request, 401, { error: "invalid_authorization" });
  }

  const { data: billingCustomer, error: billingCustomerError } = await supabaseAdmin
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (billingCustomerError || !billingCustomer?.stripe_customer_id) {
    return jsonResponse(request, 404, {
      error: "billing_customer_not_found",
      message: "Cliente Stripe não encontrado.",
    });
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2024-06-20",
    httpClient: Stripe.createFetchHttpClient(),
  });

  const session = await stripe.billingPortal.sessions.create({
    customer: billingCustomer.stripe_customer_id,
    return_url: `${appUrl}/dre-facil/minha-conta`,
  });

  return jsonResponse(request, 200, { url: session.url });
});
