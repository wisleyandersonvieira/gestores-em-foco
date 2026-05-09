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
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error("Nao foi possivel carregar os produtos disponiveis.");
  return data ?? [];
}

export async function getUserProducts(userId: string) {
  const { data, error } = await supabase
    .from("user_product_subscriptions")
    .select("*, product:products(*)")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false });

  if (error) throw new Error("Nao foi possivel carregar seus produtos.");

  const now = Date.now();
  return ((data ?? []) as UserProductAccess[]).filter((item) => {
    if (!item.product || item.product.status !== "active") return false;
    if (!item.current_period_end) return true;
    return new Date(item.current_period_end).getTime() >= now;
  });
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
  throw new Error("Checkout Stripe ainda nao implementado.");
}

export async function redirectToCustomerPortal() {
  throw new Error("Portal do cliente Stripe ainda nao implementado.");
}

export async function handleStripeWebhook() {
  throw new Error("Webhook Stripe deve ser implementado no backend.");
}
