import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const PRODUCT_SLUGS = {
  diagnostics: "diagnosticos",
  dre: "gestor-dre",
  courses: "cursos",
} as const;

export type Product = Tables<"products">;
export type UserProductSubscription = Tables<"user_product_subscriptions">;
export type ProductSlug = (typeof PRODUCT_SLUGS)[keyof typeof PRODUCT_SLUGS];

export type UserProductAccess = UserProductSubscription & {
  product: Product | null;
};

export const productBenefits: Record<string, string[]> = {
  diagnosticos: [
    "Diagnostico da gestao",
    "Indicadores estrategicos",
    "Acompanhamento da evolucao",
    "Relatorios gerenciais",
  ],
  "gestor-dre": [
    "Cadastro de modelos de DRE",
    "Lancamento mensal por competencia",
    "Dashboard de faturamento, despesas e lucro",
    "Analise comparativa mensal, trimestral e semestral",
  ],
  cursos: [
    "Cursos em video",
    "Modulos e aulas organizados",
    "Materiais de apoio",
    "Acompanhamento de progresso",
  ],
};

export async function getAvailableProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("status", "active")
    .eq("is_public_visible", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error("Nao foi possivel carregar os produtos disponiveis.");
  return data ?? [];
}

export async function getPublicProductBySlug(productSlug: string) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", productSlug)
    .eq("status", "active")
    .eq("is_public_visible", true)
    .maybeSingle();

  if (error) throw new Error("Nao foi possivel carregar o produto.");
  return data as Product | null;
}

export async function updateProductVisibility(productId: string, isPublicVisible: boolean) {
  const { data, error } = await supabase
    .from("products")
    .update({ is_public_visible: isPublicVisible })
    .eq("id", productId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("Não foi possível atualizar a visibilidade do produto.");
  }

  return data as Product;
}

export async function getUserProducts(userId: string) {
  const { data, error } = await supabase
    .from("user_product_subscriptions")
    .select("*, product:products(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Nao foi possivel carregar seus produtos.");

  const now = Date.now();
  return ((data ?? []) as UserProductAccess[]).filter((item) => {
    if (!item.product || item.product.status !== "active") return false;
    return hasActiveProductAccess(item, now);
  });
}

export function hasActiveProductAccess(subscription: Pick<UserProductSubscription, "status" | "current_period_end" | "cancel_at_period_end">, now = Date.now()) {
  const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end).getTime() : null;
  const hasValidPeriod = periodEnd === null || periodEnd >= now;

  if (subscription.status === "active" || subscription.status === "trialing") {
    return hasValidPeriod;
  }

  if (subscription.status === "past_due") {
    return periodEnd !== null && periodEnd >= now;
  }

  if (subscription.cancel_at_period_end) {
    return periodEnd !== null && periodEnd >= now;
  }

  return false;
}

export async function checkProductAccess(userId: string, productSlug: string) {
  const { data, error } = await supabase.rpc("check_product_access_v2", {
    p_user_id: userId,
    p_product_slug: productSlug,
  });

  if (error) {
    if (import.meta.env.DEV) console.error("Erro ao verificar acesso ao produto:", error);
    return false;
  }

  return Boolean(data);
}

export async function getProductSubscriptionStatus(userId: string, productSlug: string) {
  const { data, error } = await supabase
    .from("user_product_subscriptions")
    .select("*, product:products(*)")
    .eq("user_id", userId)
    .eq("product_slug", productSlug)
    .maybeSingle();

  if (error) throw new Error("Nao foi possivel carregar a assinatura do produto.");
  return data as UserProductAccess | null;
}

export async function getUserProductAccessMap(userId: string) {
  const products = await getUserProducts(userId);
  return new Map(products.map((item) => [item.product_slug, item]));
}

export async function activateProductSubscriptionForTest(productSlug: string) {
  void productSlug;
  throw new Error("A liberacao de produtos precisa ser feita por checkout, webhook ou administrador autorizado.");
}

export async function createStripeCheckoutSession(_productSlug: string) {
  const { data, error } = await supabase.functions.invoke("create-stripe-checkout", {
    body: { product_slug: _productSlug },
  });

  if (error) {
    const message = typeof error.context === "object" && error.context && "error" in error.context
      ? String((error.context as { error?: unknown }).error)
      : error.message;

    if (message.includes("already_has_access")) {
      throw new Error("Você já possui acesso ao Gestor de DRE.");
    }

    throw new Error("Não foi possível iniciar o checkout. Tente novamente.");
  }

  const url = typeof data === "object" && data && "url" in data ? String((data as { url?: unknown }).url ?? "") : "";
  if (!url) {
    throw new Error("Não foi possível iniciar o checkout. Tente novamente.");
  }

  return url;
}

export async function redirectToCustomerPortal() {
  const { data, error } = await supabase.functions.invoke("create-stripe-portal-session", {
    body: {},
  });

  if (error) {
    const context = error.context as unknown;
    if (context instanceof Response) {
      let payload: { error?: unknown } | null = null;
      try {
        payload = await context.clone().json();
      } catch (_parseError) {
        // Fall through to the generic portal error.
      }
      if (payload?.error === "billing_customer_not_found") {
        throw new Error("Não encontramos sua assinatura no Stripe. Entre em contato com o suporte.");
      }
    }

    throw new Error("Não foi possível abrir o portal de assinatura. Tente novamente.");
  }

  const url = typeof data === "object" && data && "url" in data ? String((data as { url?: unknown }).url ?? "") : "";
  if (!url) {
    throw new Error("Não foi possível abrir o portal de assinatura. Tente novamente.");
  }

  window.location.assign(url);
}

export async function handleStripeWebhook() {
  throw new Error("Webhook Stripe deve ser implementado no backend.");
}
