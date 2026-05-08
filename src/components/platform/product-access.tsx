import { useEffect, useState } from "react";
import type React from "react";
import { Link } from "react-router-dom";
import type { User } from "@supabase/supabase-js";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { checkProductAccess } from "@/lib/products";

export function ProductAccessGate({
  user,
  productSlug,
  productName,
  children,
}: {
  user: User;
  productSlug: string;
  productName: string;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<"loading" | "allowed" | "blocked">("loading");

  useEffect(() => {
    let active = true;
    void checkProductAccess(user.id, productSlug).then((hasAccess) => {
      if (active) setState(hasAccess ? "allowed" : "blocked");
    });
    return () => {
      active = false;
    };
  }, [productSlug, user.id]);

  if (state === "loading") {
    return <div className="text-sm text-muted-foreground">Verificando acesso ao produto...</div>;
  }

  if (state === "blocked") {
    return <ProductAccessBlocked productName={productName} />;
  }

  return <>{children}</>;
}

export function ProductAccessBlocked({ productName }: { productName: string }) {
  return (
    <Card className="border-primary/10 bg-white/90">
      <CardContent className="flex flex-col gap-5 p-8 text-center sm:items-center">
        <Badge variant="outline" className="w-fit">Acesso ao produto nao disponivel</Badge>
        <div>
          <h1 className="font-display text-3xl font-semibold">Voce ainda nao possui acesso ao {productName}.</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Para utilizar este modulo, e necessario contratar ou ativar este produto em sua conta.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/produtos">Conhecer produtos</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/meus-produtos">Voltar para Meus Produtos</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
