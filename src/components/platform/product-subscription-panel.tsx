import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createStripeCheckoutSession,
  getProductSubscriptionStatus,
  redirectToCustomerPortal,
  type UserProductAccess,
} from "@/lib/products";

export function ProductSubscriptionPanel({ userId, productSlug }: { userId: string; productSlug: string }) {
  const [subscription, setSubscription] = useState<UserProductAccess | null>(null);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSubscription() {
      const nextSubscription = await getProductSubscriptionStatus(userId, productSlug);
      if (isMounted) setSubscription(nextSubscription);
    }

    void loadSubscription();

    window.addEventListener("focus", loadSubscription);
    return () => {
      isMounted = false;
      window.removeEventListener("focus", loadSubscription);
    };
  }, [productSlug, userId]);

  const status = getSubscriptionStatus(subscription);
  const shouldManageSubscription = ["active", "trialing", "past_due"].includes(subscription?.status ?? "") || Boolean(subscription?.cancel_at_period_end);
  const shouldShowCheckout = !shouldManageSubscription;

  async function handleManageSubscription() {
    setErrorMessage(null);
    setIsLoadingPortal(true);
    try {
      await redirectToCustomerPortal();
    } catch (error) {
      setIsLoadingPortal(false);
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível abrir o portal de assinatura. Tente novamente.");
    }
  }

  async function handleCheckout() {
    setErrorMessage(null);
    setIsLoadingCheckout(true);
    try {
      const url = await createStripeCheckoutSession(productSlug);
      window.location.assign(url);
    } catch (error) {
      setIsLoadingCheckout(false);
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível iniciar o checkout. Tente novamente.");
    }
  }

  return (
    <Card className="border-primary/10 bg-white/90">
      <CardHeader><CardTitle>Dados do produto</CardTitle></CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <Info label="Produto" value={subscription?.product?.name ?? productSlug} />
        <Info label="Status da assinatura" value={status.label} />
        <Info label="Plano atual" value={subscription?.plan_name ?? "Não contratado"} />
        <Info label="Data de início" value={formatDate(subscription?.current_period_start) ?? "Não informada"} />
        <Info label={subscription?.cancel_at_period_end ? "Acesso até" : "Renovação"} value={formatDate(subscription?.current_period_end) ?? "Sem vencimento definido"} />
        <div className="rounded-lg bg-muted p-4">
          <p className="text-sm text-muted-foreground">Assinatura</p>
          {status.message ? <p className="mt-1 text-sm">{status.message}</p> : null}
          {errorMessage ? <p className="mt-2 text-sm text-destructive">{errorMessage}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {shouldManageSubscription ? (
              <Button onClick={handleManageSubscription} disabled={isLoadingPortal}>
                {isLoadingPortal ? "Abrindo portal..." : "Gerenciar assinatura"}
              </Button>
            ) : (
              <Button onClick={handleCheckout} disabled={isLoadingCheckout}>
                {isLoadingCheckout ? "Abrindo checkout..." : "Contratar novamente"}
              </Button>
            )}
            {shouldShowCheckout ? (
              <Button asChild variant="outline">
                <Link to="/produtos">Ver produtos</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

function getSubscriptionStatus(subscription: UserProductAccess | null) {
  if (!subscription) {
    return {
      label: "Não contratada",
      message: "Sua assinatura do Gestor de DRE não está ativa.",
    };
  }

  if (subscription.cancel_at_period_end) {
    const endDate = formatDate(subscription.current_period_end);
    return {
      label: "Cancelamento agendado",
      message: endDate
        ? `Sua assinatura foi cancelada e permanecerá ativa até ${endDate}. Você pode reativar ou alterar sua assinatura pelo portal da Stripe, se disponível.`
        : "Sua assinatura foi cancelada e permanecerá ativa até o fim do período já pago.",
    };
  }

  if (subscription.status === "canceled") {
    return {
      label: "Cancelada",
      message: "Sua assinatura está cancelada. Para voltar a acessar o Gestor de DRE, contrate novamente o plano.",
    };
  }

  const labels: Record<string, string> = {
    active: "Ativa",
    trialing: "Período de teste",
    past_due: "Pagamento pendente",
    incomplete: "Incompleta",
    incomplete_expired: "Expirada",
    unpaid: "Não paga",
    paused: "Pausada",
    inactive: "Inativa",
  };

  return {
    label: labels[subscription.status] ?? subscription.status,
    message: null,
  };
}
