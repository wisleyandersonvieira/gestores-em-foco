import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@16.12.0?target=deno";

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function toIsoFromUnix(value?: number | null) {
  return value ? new Date(value * 1000).toISOString() : null;
}

function normalizeSubscriptionStatus(status: string) {
  if (status === "active" || status === "trialing" || status === "past_due" || status === "canceled" || status === "incomplete" || status === "incomplete_expired" || status === "unpaid" || status === "paused") {
    return status;
  }
  return "inactive";
}

function getObjectId(value: string | Stripe.Customer | Stripe.Subscription | Stripe.Price | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

async function upsertBillingCustomer(
  supabaseAdmin: ReturnType<typeof createClient>,
  params: { userId: string; stripeCustomerId: string | null; email?: string | null },
) {
  if (!params.stripeCustomerId) return;

  await supabaseAdmin
    .from("billing_customers")
    .upsert({
      user_id: params.userId,
      stripe_customer_id: params.stripeCustomerId,
      email: params.email ?? null,
    }, { onConflict: "user_id" });
}

async function upsertInternalSubscription(
  supabaseAdmin: ReturnType<typeof createClient>,
  params: {
    userId: string;
    productSlug: string;
    productId?: string | null;
    status: string;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    stripePriceId?: string | null;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    cancelAtPeriodEnd?: boolean;
    canceledAt?: string | null;
    trialEndsAt?: string | null;
  },
) {
  let productId = params.productId ?? null;
  if (!productId) {
    const { data: product } = await supabaseAdmin
      .from("products")
      .select("id")
      .eq("slug", params.productSlug)
      .maybeSingle();
    productId = product?.id ?? null;
  }

  if (!productId) {
    throw new Error("product_not_found");
  }

  const { error } = await supabaseAdmin
    .from("user_product_subscriptions")
    .upsert({
      user_id: params.userId,
      product_id: productId,
      product_slug: params.productSlug,
      status: normalizeSubscriptionStatus(params.status),
      plan_name: "Gestor DRE Mensal",
      access_type: "paid",
      stripe_customer_id: params.stripeCustomerId ?? null,
      stripe_subscription_id: params.stripeSubscriptionId ?? null,
      stripe_price_id: params.stripePriceId ?? null,
      current_period_start: params.currentPeriodStart ?? null,
      current_period_end: params.currentPeriodEnd ?? null,
      cancel_at_period_end: params.cancelAtPeriodEnd ?? false,
      canceled_at: params.canceledAt ?? null,
      trial_ends_at: params.trialEndsAt ?? null,
    }, { onConflict: "user_id,product_slug" });

  if (error) {
    throw error;
  }
}

async function handleCheckoutCompleted(
  stripe: Stripe,
  supabaseAdmin: ReturnType<typeof createClient>,
  session: Stripe.Checkout.Session,
) {
  if (session.mode !== "subscription") return;

  const userId = session.metadata?.user_id ?? session.client_reference_id;
  const productSlug = session.metadata?.product_slug;
  if (!userId || productSlug !== "gestor-dre") return;

  const stripeCustomerId = getObjectId(session.customer as Stripe.Customer | string | null);
  const stripeSubscriptionId = getObjectId(session.subscription as Stripe.Subscription | string | null);
  const productId = session.metadata?.internal_product_id ?? null;

  await upsertBillingCustomer(supabaseAdmin, {
    userId,
    stripeCustomerId,
    email: session.customer_details?.email ?? session.customer_email ?? null,
  });

  let subscription: Stripe.Subscription | null = null;
  if (stripeSubscriptionId) {
    subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  }

  const item = subscription?.items.data[0];

  await upsertInternalSubscription(supabaseAdmin, {
    userId,
    productSlug,
    productId,
    status: subscription?.status ?? "incomplete",
    stripeCustomerId,
    stripeSubscriptionId,
    stripePriceId: item?.price.id ?? null,
    currentPeriodStart: toIsoFromUnix(subscription?.current_period_start),
    currentPeriodEnd: toIsoFromUnix(subscription?.current_period_end),
    cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
    canceledAt: toIsoFromUnix(subscription?.canceled_at),
    trialEndsAt: toIsoFromUnix(subscription?.trial_end),
  });
}

async function handleSubscriptionEvent(
  supabaseAdmin: ReturnType<typeof createClient>,
  subscription: Stripe.Subscription,
) {
  const stripeSubscriptionId = subscription.id;
  const userId = subscription.metadata?.user_id;
  const productSlug = subscription.metadata?.product_slug;
  const productId = subscription.metadata?.internal_product_id ?? null;
  const stripeCustomerId = getObjectId(subscription.customer as Stripe.Customer | string | null);
  const item = subscription.items.data[0];

  if (!userId || productSlug !== "gestor-dre") {
    const { data: existing } = await supabaseAdmin
      .from("user_product_subscriptions")
      .select("user_id, product_slug, product_id")
      .eq("stripe_subscription_id", stripeSubscriptionId)
      .maybeSingle();

    if (!existing) return;

    await upsertInternalSubscription(supabaseAdmin, {
      userId: existing.user_id,
      productSlug: existing.product_slug,
      productId: existing.product_id,
      status: subscription.status,
      stripeCustomerId,
      stripeSubscriptionId,
      stripePriceId: item?.price.id ?? null,
      currentPeriodStart: toIsoFromUnix(subscription.current_period_start),
      currentPeriodEnd: toIsoFromUnix(subscription.current_period_end),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: toIsoFromUnix(subscription.canceled_at),
      trialEndsAt: toIsoFromUnix(subscription.trial_end),
    });
    return;
  }

  await upsertBillingCustomer(supabaseAdmin, {
    userId,
    stripeCustomerId,
  });

  await upsertInternalSubscription(supabaseAdmin, {
    userId,
    productSlug,
    productId,
    status: subscription.status,
    stripeCustomerId,
    stripeSubscriptionId,
    stripePriceId: item?.price.id ?? null,
    currentPeriodStart: toIsoFromUnix(subscription.current_period_start),
    currentPeriodEnd: toIsoFromUnix(subscription.current_period_end),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    canceledAt: toIsoFromUnix(subscription.canceled_at),
    trialEndsAt: toIsoFromUnix(subscription.trial_end),
  });
}

async function handleInvoiceEvent(
  stripe: Stripe,
  supabaseAdmin: ReturnType<typeof createClient>,
  invoice: Stripe.Invoice,
  status: "active" | "past_due",
) {
  const stripeSubscriptionId = getObjectId(invoice.subscription as Stripe.Subscription | string | null);
  if (!stripeSubscriptionId) return;

  try {
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    await handleSubscriptionEvent(supabaseAdmin, subscription);
    return;
  } catch (_error) {
    // Fall back to the invoice payload when Stripe cannot return the subscription.
  }

  const { data: existing } = await supabaseAdmin
    .from("user_product_subscriptions")
    .select("id, current_period_end")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();

  if (!existing) return;

  const update: Record<string, unknown> = { status };
  if (invoice.period_start) update.current_period_start = toIsoFromUnix(invoice.period_start);
  if (invoice.period_end) update.current_period_end = toIsoFromUnix(invoice.period_end);

  const { error } = await supabaseAdmin
    .from("user_product_subscriptions")
    .update(update)
    .eq("id", existing.id);

  if (error) throw error;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "method_not_allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!supabaseUrl || !supabaseServiceRoleKey || !stripeSecretKey || !webhookSecret) {
    return jsonResponse(500, { error: "server_not_configured" });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return jsonResponse(400, { error: "missing_signature" });
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2024-06-20",
    httpClient: Stripe.createFetchHttpClient(),
  });
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (_error) {
    return jsonResponse(400, { error: "invalid_signature" });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: processedEvent } = await supabaseAdmin
    .from("stripe_webhook_events")
    .select("id")
    .eq("id", event.id)
    .maybeSingle();

  if (processedEvent) {
    return jsonResponse(200, { received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(stripe, supabaseAdmin, event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionEvent(supabaseAdmin, event.data.object as Stripe.Subscription);
        break;
      case "invoice.paid":
        await handleInvoiceEvent(stripe, supabaseAdmin, event.data.object as Stripe.Invoice, "active");
        break;
      case "invoice.payment_failed":
        await handleInvoiceEvent(stripe, supabaseAdmin, event.data.object as Stripe.Invoice, "past_due");
        break;
      default:
        break;
    }

    const { error: eventInsertError } = await supabaseAdmin
      .from("stripe_webhook_events")
      .insert({
        id: event.id,
        type: event.type,
        payload: event as unknown as Record<string, unknown>,
      });

    if (eventInsertError && eventInsertError.code !== "23505") {
      throw eventInsertError;
    }

    return jsonResponse(200, { received: true });
  } catch (error) {
    console.error("stripe-webhook processing failed", error);
    return jsonResponse(500, { error: "webhook_processing_failed" });
  }
});
