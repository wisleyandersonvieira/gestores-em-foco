import { DRE_PRODUCT_KEY, DRE_PRODUCT_NAME } from "@/lib/dre-calculations";
import { checkProductAccess as checkProductAccessBoolean, getProductSubscriptionStatus } from "@/lib/products";

export async function getDreSubscription(userId: string) {
  const subscription = await getProductSubscriptionStatus(userId, DRE_PRODUCT_KEY);

  if (subscription) {
    return {
      id: subscription.id,
      user_id: subscription.user_id,
      product_id: subscription.product_slug,
      product_name: subscription.product?.name ?? DRE_PRODUCT_NAME,
      status: subscription.status,
      plan_name: subscription.plan_name,
      stripe_customer_id: subscription.stripe_customer_id,
      stripe_subscription_id: subscription.stripe_subscription_id,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      created_at: subscription.created_at,
      updated_at: subscription.updated_at,
    };
  }

  return {
    id: "no-subscription",
    user_id: userId,
    product_id: DRE_PRODUCT_KEY,
    product_name: DRE_PRODUCT_NAME,
    status: "inactive",
    plan_name: null,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    current_period_start: null,
    current_period_end: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function checkProductAccess(userId: string, productKey: string) {
  return { hasAccess: await checkProductAccessBoolean(userId, productKey), error: null };
}
