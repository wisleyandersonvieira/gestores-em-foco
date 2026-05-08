import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProductSubscriptionStatus, type UserProductAccess } from "@/lib/products";

export function ProductSubscriptionPanel({ userId, productSlug }: { userId: string; productSlug: string }) {
  const [subscription, setSubscription] = useState<UserProductAccess | null>(null);

  useEffect(() => {
    void getProductSubscriptionStatus(userId, productSlug).then(setSubscription);
  }, [productSlug, userId]);

  return (
    <Card className="border-primary/10 bg-white/90">
      <CardHeader><CardTitle>Dados do produto</CardTitle></CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <Info label="Produto" value={subscription?.product?.name ?? productSlug} />
        <Info label="Status da assinatura" value={subscription?.status ?? "inactive"} />
        <Info label="Plano atual" value={subscription?.plan_name ?? "Nao contratado"} />
        <Info label="Data de inicio" value={formatDate(subscription?.current_period_start) ?? "Nao informada"} />
        <Info label="Vencimento ou renovacao" value={formatDate(subscription?.current_period_end) ?? "Sem vencimento definido"} />
        <div className="rounded-lg bg-muted p-4">
          <p className="text-sm text-muted-foreground">Assinatura</p>
          <Button className="mt-2" disabled>Gerenciar assinatura</Button>
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
