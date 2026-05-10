import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { ClientLayout } from "@/components/platform/client-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PRODUCT_SLUGS, checkProductAccess } from "@/lib/products";

export default function CheckoutSuccessPage() {
  return (
    <ClientLayout>
      {(user) => <CheckoutSuccessContent userId={user.id} />}
    </ClientLayout>
  );
}

function CheckoutSuccessContent({ userId }: { userId: string }) {
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    let active = true;
    let attempts = 0;
    let timeoutId: number | undefined;

    async function pollAccess() {
      attempts += 1;
      const access = await checkProductAccess(userId, PRODUCT_SLUGS.dre);
      if (!active) return;

      setHasAccess(access);
      if (!access && attempts < 6) {
        timeoutId = window.setTimeout(pollAccess, 2500);
      }
    }

    void pollAccess();

    return () => {
      active = false;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [userId]);

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="border-primary/10 bg-white/90 shadow-sm">
        <CardContent className="flex flex-col gap-5 p-8 text-center sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Assinatura em processamento</p>
            <h1 className="font-display mt-3 text-3xl font-semibold">Estamos liberando seu acesso.</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Recebemos a confirmação do Stripe. Em alguns instantes seu acesso ao Gestor de DRE será liberado.
            </p>
          </div>
          {hasAccess ? (
            <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              Acesso liberado. Você já pode entrar no Gestor de DRE.
            </p>
          ) : (
            <p className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
              Estamos liberando seu acesso. Isso pode levar alguns segundos.
            </p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link to="/meus-produtos">Ir para Meus Produtos</Link>
            </Button>
            {hasAccess ? (
              <Button asChild variant="outline">
                <Link to="/dre-facil">Acessar Gestor de DRE</Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
