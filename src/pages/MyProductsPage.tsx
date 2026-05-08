import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { ArrowRight, BookOpen, BriefcaseBusiness, ClipboardCheck, Filter, GraduationCap, MessagesSquare, Presentation, Rocket } from "lucide-react";

import { ClientLayout } from "@/components/platform/client-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listUserProducts, productStatusLabels, productTypeLabels, type ProductStatus, type ProductType, type UserProduct } from "@/lib/user-products";

const productIcons: Record<ProductType, ComponentType<{ className?: string }>> = {
  curso_presencial: GraduationCap,
  curso_online: BookOpen,
  palestra: Presentation,
  workshop: Filter,
  imersao: Rocket,
  diagnostico: ClipboardCheck,
  mentoria: MessagesSquare,
  consultoria: BriefcaseBusiness,
};

const statusTone: Record<ProductStatus, string> = {
  ativo: "bg-emerald-600",
  concluido: "bg-primary",
  expirado: "bg-muted text-muted-foreground",
  pendente: "bg-accent text-accent-foreground",
};

export default function MyProductsPage() {
  return (
    <ClientLayout>
      {(user) => <MyProductsContent userId={user.id} />}
    </ClientLayout>
  );
}

function MyProductsContent({ userId }: { userId: string }) {
  const [products, setProducts] = useState<UserProduct[]>([]);
  const [typeFilter, setTypeFilter] = useState<ProductType | "todos">("todos");
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "todos">("todos");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listUserProducts(userId).then(setProducts).catch((err) => setError(err instanceof Error ? err.message : "Nao foi possivel carregar seus produtos."));
  }, [userId]);

  const filteredProducts = useMemo(
    () => products.filter((product) => (typeFilter === "todos" || product.product_type === typeFilter) && (statusFilter === "todos" || product.status === statusFilter)),
    [products, statusFilter, typeFilter],
  );

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Meus Produtos</p>
        <h1 className="font-display mt-3 text-3xl font-semibold md:text-4xl">Produtos adquiridos e acessos ativos.</h1>
      </div>

      <Card className="border-primary/10 bg-white/90">
        <CardContent className="grid gap-4 p-5 md:grid-cols-2">
          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as ProductType | "todos")}>
            <SelectTrigger><SelectValue placeholder="Tipo de produto" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {Object.entries(productTypeLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ProductStatus | "todos")}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {Object.entries(productStatusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {error ? <Card className="border-destructive/20 bg-destructive/10"><CardContent className="p-5 text-sm text-destructive">{error}</CardContent></Card> : null}

      {filteredProducts.length === 0 ? (
        <Card className="border-dashed bg-white/80">
          <CardContent className="flex flex-col gap-5 p-8 text-center sm:items-center">
            <p className="font-display text-2xl font-semibold">Voce ainda nao possui produtos.</p>
            <p className="max-w-xl text-sm text-muted-foreground">Conheca nossos produtos e escolha a jornada ideal para desenvolver sua gestao.</p>
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90"><a href="/#produtos">Conhecer nossos produtos</a></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => {
            const Icon = productIcons[product.product_type];
            return (
              <Card key={product.id} className="flex h-full flex-col border-primary/10 bg-white/90 shadow-sm">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <Icon className="h-9 w-9 text-primary" />
                    <Badge className={statusTone[product.status]}>{productStatusLabels[product.status]}</Badge>
                  </div>
                  <CardTitle className="text-xl">{product.product_name}</CardTitle>
                  <CardDescription>{productTypeLabels[product.product_type]}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto space-y-4">
                  <div className="grid gap-2 rounded-lg bg-muted p-4 text-sm">
                    <div className="flex justify-between gap-4"><span className="text-muted-foreground">Aquisicao</span><span>{formatDate(product.purchased_at)}</span></div>
                    <div className="flex justify-between gap-4"><span className="text-muted-foreground">Validade</span><span>{product.expires_at ? formatDate(product.expires_at) : "Sem validade"}</span></div>
                  </div>
                  <Button asChild className="w-full bg-primary hover:bg-primary/90">
                    <a href={product.access_url ?? "#"}>
                      Acessar
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}
