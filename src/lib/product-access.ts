import { supabase } from "@/integrations/supabase/client";
import { DRE_PRODUCT_KEY, DRE_PRODUCT_NAME } from "@/lib/dre-calculations";

export async function checkProductAccess(userId: string, productKey: string) {
  const { data, error } = await supabase.rpc("check_product_access", {
    p_user_id: userId,
    p_product_key: productKey,
  });

  if (error) {
    return { hasAccess: true, error: "Nao foi possivel verificar a assinatura. Acesso temporario liberado para testes." };
  }

  return { hasAccess: Boolean(data) || productKey === DRE_PRODUCT_KEY, error: null };
}

export async function getDreSubscription(userId: string) {
  const { data: subscription } = await supabase
    .from("product_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("product_id", DRE_PRODUCT_KEY)
    .maybeSingle();

  if (subscription) {
    return subscription;
  }

  const { data: product } = await supabase
    .from("user_products")
    .select("*")
    .eq("user_id", userId)
    .eq("product_type", DRE_PRODUCT_KEY)
    .maybeSingle();

  return {
    id: product?.id ?? "temporary-access",
    user_id: userId,
    product_id: DRE_PRODUCT_KEY,
    product_name: product?.product_name ?? DRE_PRODUCT_NAME,
    status: product?.status ?? "active",
    plan_name: "Acesso de teste",
    stripe_customer_id: null,
    stripe_subscription_id: null,
    current_period_start: product?.purchased_at ?? new Date().toISOString(),
    current_period_end: product?.expires_at ?? null,
    created_at: product?.purchased_at ?? new Date().toISOString(),
    updated_at: product?.purchased_at ?? new Date().toISOString(),
  };
}
