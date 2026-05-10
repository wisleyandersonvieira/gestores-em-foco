import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@16.12.0?target=deno";

const staticAllowedOrigins = new Set([
  "https://gestoresemfoco.com.br",
  "https://www.gestoresemfoco.com.br",
  "https://gestoresemfoco.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
]);

function isAllowedOrigin(origin: string) {
  if (staticAllowedOrigins.has(origin)) return true;
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

function isActiveAccess(subscription: { status: string; current_period_end: string | null }) {
  if (subscription.status === "active" || subscription.status === "trialing") return true;
  if (subscription.status !== "past_due" || !subscription.current_period_end) return false;
  return new Date(subscription.current_period_end).getTime() >= Date.now();
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

  let payload: { product_slug?: string };
  try {
    payload = await request.json();
  } catch (_error) {
    return jsonResponse(request, 400, { error: "invalid_json" });
  }

  if (payload.product_slug !== "gestor-dre") {
    return jsonResponse(request, 400, { error: "product_not_available" });
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

  const { data: product, error: productError } = await supabaseAdmin
    .from("products")
    .select("id, slug, name, stripe_price_id")
    .eq("slug", "gestor-dre")
    .eq("status", "active")
    .eq("is_public_visible", true)
    .maybeSingle();

  if (productError || !product?.stripe_price_id) {
    return jsonResponse(request, 404, { error: "product_not_configured" });
  }

  const { data: subscription, error: subscriptionError } = await supabaseAdmin
    .from("user_product_subscriptions")
    .select("status, current_period_end")
    .eq("user_id", user.id)
    .eq("product_slug", product.slug)
    .maybeSingle();

  if (subscriptionError) {
    return jsonResponse(request, 500, { error: "subscription_lookup_failed" });
  }

  if (subscription && isActiveAccess(subscription)) {
    return jsonResponse(request, 409, { error: "already_has_access" });
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2024-06-20",
    httpClient: Stripe.createFetchHttpClient(),
  });

  let stripeCustomerId: string | null = null;
  const { data: billingCustomer } = await supabaseAdmin
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  stripeCustomerId = billingCustomer?.stripe_customer_id ?? null;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: {
        user_id: user.id,
      },
    });

    stripeCustomerId = customer.id;

    const { error: billingCustomerError } = await supabaseAdmin
      .from("billing_customers")
      .upsert({
        user_id: user.id,
        stripe_customer_id: stripeCustomerId,
        email: user.email ?? null,
      }, { onConflict: "user_id" });

    if (billingCustomerError) {
      return jsonResponse(request, 500, { error: "customer_save_failed" });
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [
      {
        price: product.stripe_price_id,
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/checkout/sucesso?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/checkout/cancelado?produto=gestor-dre`,
    allow_promotion_codes: true,
    client_reference_id: user.id,
    metadata: {
      user_id: user.id,
      product_slug: product.slug,
      internal_product_id: product.id,
    },
    subscription_data: {
      metadata: {
        user_id: user.id,
        product_slug: product.slug,
        internal_product_id: product.id,
      },
    },
  });

  if (!session.url) {
    return jsonResponse(request, 500, { error: "checkout_url_missing" });
  }

  return jsonResponse(request, 200, { url: session.url });
});
