import { Link } from "react-router-dom";

import { ClientLayout } from "@/components/platform/client-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function CheckoutCanceledPage() {
  return (
    <ClientLayout>
      {() => (
        <div className="mx-auto max-w-2xl">
          <Card className="border-primary/10 bg-white/90 shadow-sm">
            <CardContent className="flex flex-col gap-5 p-8 text-center sm:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Checkout cancelado</p>
                <h1 className="font-display mt-3 text-3xl font-semibold">Sua assinatura não foi concluída.</h1>
                <p className="mt-3 text-sm text-muted-foreground">
                  Sua assinatura não foi concluída. Você pode tentar novamente quando desejar.
                </p>
              </div>
              <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/produtos">Voltar para Produtos</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </ClientLayout>
  );
}
