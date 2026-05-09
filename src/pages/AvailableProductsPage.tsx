import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { BarChart3, BookOpen, CheckCircle2, Package, ReceiptText } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { ClientLayout } from "@/components/platform/client-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getAvailableProducts, getUserProducts, productBenefits, type Product, type UserProductAccess } from "@/lib/products";

const productIcons: Record<string, ComponentType<{ className?: string }>> = {
  diagnosticos: BarChart3,
  "gestor-dre": ReceiptText,
  cursos: BookOpen,
};

export default function AvailableProductsPage() {
  return (
    <ClientLayout>
      {(user) => <AvailableProductsContent userId={user.id} />}
    </ClientLayout>
  );
}

function AvailableProductsContent({ userId }: { userId: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [userProducts, setUserProducts] = useState<UserProductAccess[]>([]);
  const [contractProduct, setContractProduct] = useState<Product | null>(null);

  async function reload() {
    await Promise.all([getAvailableProducts(), getUserProducts(userId)])
      .then(([available, owned]) => {
        setProducts(available);
        setUserProducts(owned);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel carregar produtos."));
  }

  useEffect(() => {
    void reload();
  }, [userId]);

  const accessMap = useMemo(() => new Map(userProducts.map((item) => [item.product_slug, item])), [userProducts]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Produtos</p>
        <h1 className="font-display mt-3 text-3xl font-semibold md:text-4xl">Conheca nossos produtos</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Escolha os modulos que deseja contratar para desenvolver sua gestao.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => {
          const hasAccess = accessMap.has(product.slug);
          const Icon = productIcons[product.slug] ?? Package;

          return (
            <Card key={product.id} className="flex h-full flex-col border-primary/10 bg-white/90 shadow-sm">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${product.highlight_color === "orange" ? "bg-accent/15 text-accent" : "bg-primary/10 text-primary"}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <Badge className={hasAccess ? "bg-emerald-600" : ""}>{hasAccess ? "Acesso ativo" : "Disponivel"}</Badge>
                </div>
                <CardTitle className="text-xl">{product.name}</CardTitle>
                <CardDescription>{product.short_description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto space-y-5">
                <div className="grid gap-2 text-sm">
                  {(productBenefits[product.slug] ?? []).map((benefit) => (
                    <div key={benefit} className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      {benefit}
                    </div>
                  ))}
                </div>
                {product.slug === "cursos" ? (
                  <Button asChild className="w-full bg-primary hover:bg-primary/90">
                    <Link to="/cursos">Ver cursos</Link>
                  </Button>
                ) : hasAccess ? (
                  <Button asChild className="w-full bg-primary hover:bg-primary/90">
                    <Link to={product.route_path ?? "/dashboard"}>Acessar produto</Link>
                  </Button>
                ) : (
                  <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setContractProduct(product)}>Contratar</Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={Boolean(contractProduct)} onOpenChange={(open) => !open && setContractProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contratar produto</DialogTitle>
            <DialogDescription>O acesso sera liberado apos confirmacao segura do pagamento ou por um administrador autorizado.</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-muted p-4 text-sm">
            Produto selecionado: <strong>{contractProduct?.name}</strong>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setContractProduct(null)}>Cancelar</Button>
            <Button
              disabled={!contractProduct}
              onClick={() => {
                toast.info("Checkout em preparacao. Solicite a liberacao ao suporte ou administrador.");
                setContractProduct(null);
              }}
            >
              Solicitar contratação
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
