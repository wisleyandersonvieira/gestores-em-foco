import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, Bell, Package } from "lucide-react";

import { ClientLayout } from "@/components/platform/client-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listUserProducts, productStatusLabels, productTypeLabels, type UserProduct } from "@/lib/user-products";

export default function DashboardPage() {
  return (
    <ClientLayout>
      {(user) => <DashboardContent userId={user.id} name={user.user_metadata?.name ?? user.email ?? "gestor"} />}
    </ClientLayout>
  );
}

function DashboardContent({ userId, name }: { userId: string; name: string }) {
  const [products, setProducts] = useState<UserProduct[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listUserProducts(userId).then(setProducts).catch((err) => setError(err instanceof Error ? err.message : "Nao foi possivel carregar o dashboard."));
  }, [userId]);

  const activeProducts = useMemo(() => products.filter((product) => product.status === "ativo").length, [products]);
  const completedDiagnostics = useMemo(() => products.filter((product) => product.product_type === "diagnostico" && product.status === "concluido").length, [products]);
  const quickAccess = products.slice(0, 3);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Dashboard do Cliente</p>
        <h1 className="font-display mt-3 text-3xl font-semibold md:text-4xl">Ola, {name}! 👋</h1>
      </div>

      {error ? <Card className="border-destructive/20 bg-destructive/10"><CardContent className="p-5 text-sm text-destructive">{error}</CardContent></Card> : null}

      <div className="grid gap-5 md:grid-cols-2">
        <Card className="border-primary/10 bg-white/90">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardDescription>Produtos ativos</CardDescription>
              <CardTitle className="mt-2 text-4xl">{activeProducts}</CardTitle>
            </div>
            <Package className="h-9 w-9 text-accent" />
          </CardHeader>
        </Card>
        <Card className="border-primary/10 bg-white/90">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardDescription>Diagnosticos realizados</CardDescription>
              <CardTitle className="mt-2 text-4xl">{completedDiagnostics}</CardTitle>
            </div>
            <BarChart3 className="h-9 w-9 text-accent" />
          </CardHeader>
        </Card>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold">Acesso Rapido</h2>
            <p className="text-sm text-muted-foreground">Ultimos produtos disponiveis na sua conta.</p>
          </div>
          <Button asChild variant="outline"><a href="/meus-produtos">Ver todos</a></Button>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {quickAccess.length === 0 ? (
            <Card className="border-dashed bg-white/80 lg:col-span-3">
              <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">Voce ainda nao possui produtos ativos.</p>
                <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90"><a href="/#produtos">Conhecer produtos</a></Button>
              </CardContent>
            </Card>
          ) : quickAccess.map((product) => (
            <Card key={product.id} className="border-primary/10 bg-white/90">
              <CardHeader>
                <Badge variant="secondary" className="w-fit">{productTypeLabels[product.product_type]}</Badge>
                <CardTitle className="text-xl">{product.product_name}</CardTitle>
                <CardDescription>{productStatusLabels[product.status]}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full bg-primary hover:bg-primary/90">
                  <a href={product.access_url ?? "/meus-produtos"}>
                    Acessar
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Card className="border-primary/10 bg-white/90">
        <CardHeader className="flex flex-row items-start gap-4 space-y-0">
          <Bell className="mt-1 h-6 w-6 text-accent" />
          <div>
            <CardTitle>Novidades</CardTitle>
            <CardDescription className="mt-2">Espaco reservado para comunicados, novas turmas, imersoes e avisos importantes.</CardDescription>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
