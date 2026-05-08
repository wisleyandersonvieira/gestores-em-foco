import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { DreLayout } from "@/components/dre/dre-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DRE_PRODUCT_NAME } from "@/lib/dre-calculations";
import { getDreSubscription } from "@/lib/product-access";
import type { ProductSubscription } from "@/types/dre";

export default function DreAccountPage() {
  return <DreLayout>{(user) => <DreAccountContent user={user} />}</DreLayout>;
}

function DreAccountContent({ user }: { user: User }) {
  const [subscription, setSubscription] = useState<ProductSubscription | null>(null);

  useEffect(() => {
    void getDreSubscription(user.id).then((data) => setSubscription(data as ProductSubscription));
  }, [user.id]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Minha Conta</h1>
        <p className="mt-1 text-sm text-muted-foreground">Estrutura preparada para assinatura e futura integracao Stripe.</p>
      </div>

      <Card className="border-primary/10 bg-white/90">
        <CardHeader><CardTitle>Dados do produto</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Info label="Nome do usuario" value={String(user.user_metadata?.name ?? user.email ?? "Usuario")} />
          <Info label="E-mail" value={user.email ?? "Nao informado"} />
          <Info label="Produto contratado" value={subscription?.product_name ?? DRE_PRODUCT_NAME} />
          <Info label="Status da assinatura" value={subscription?.status ?? "active"} />
          <Info label="Plano atual" value={subscription?.plan_name ?? "Acesso de teste"} />
          <Info label="Data de inicio" value={formatDate(subscription?.current_period_start)} />
          <Info label="Vencimento ou renovacao" value={formatDate(subscription?.current_period_end) ?? "Sem vencimento definido"} />
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">Assinatura</p>
            <Button className="mt-2" disabled>Gerenciar assinatura</Button>
          </div>
        </CardContent>
      </Card>
    </div>
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
