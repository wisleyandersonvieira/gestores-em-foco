import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { ArrowRight, BarChart3, BookOpen, Package, ReceiptText } from "lucide-react";
import { Link } from "react-router-dom";

import { ClientLayout } from "@/components/platform/client-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserProducts, type UserProductAccess } from "@/lib/products";
import { getUserCourses, type UserCourseEnrollment } from "@/lib/courses";

const productIcons: Record<string, ComponentType<{ className?: string }>> = {
  diagnosticos: BarChart3,
  "gestor-dre": ReceiptText,
  cursos: BookOpen,
};

const statusLabels: Record<string, string> = {
  active: "Acesso ativo",
  trialing: "Teste ativo",
};

export default function MyProductsPage() {
  return (
    <ClientLayout>
      {(user) => <MyProductsContent userId={user.id} />}
    </ClientLayout>
  );
}

function MyProductsContent({ userId }: { userId: string }) {
  const [products, setProducts] = useState<UserProductAccess[]>([]);
  const [courses, setCourses] = useState<UserCourseEnrollment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getUserProducts(userId), getUserCourses(userId)])
      .then(([loadedProducts, loadedCourses]) => {
        setProducts(loadedProducts);
        setCourses(loadedCourses);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Nao foi possivel carregar seus produtos."));
  }, [userId]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Meus Produtos</p>
        <h1 className="font-display mt-3 text-3xl font-semibold md:text-4xl">Produtos adquiridos e acessos ativos.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Acesse os produtos contratados para acompanhar sua gestao.</p>
      </div>

      {error ? <Card className="border-destructive/20 bg-destructive/10"><CardContent className="p-5 text-sm text-destructive">{error}</CardContent></Card> : null}

      {products.length === 0 && courses.length === 0 ? (
        <Card className="border-dashed bg-white/80">
          <CardContent className="flex flex-col gap-5 p-8 text-center sm:items-center">
            <p className="font-display text-2xl font-semibold">Voce ainda nao possui produtos.</p>
            <p className="max-w-xl text-sm text-muted-foreground">Conheca nossos produtos e escolha a jornada ideal para desenvolver sua gestao.</p>
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90"><Link to="/produtos">Conhecer nossos produtos</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {courses.length ? (
            <Card className="flex h-full flex-col border-primary/10 bg-white/90 shadow-sm">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <BookOpen className="h-9 w-9 text-primary" />
                  <Badge className="bg-emerald-600">{courses.length} curso(s)</Badge>
                </div>
                <CardTitle className="text-xl">Cursos</CardTitle>
                <CardDescription>Seus treinamentos contratados, aulas e materiais de apoio.</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto space-y-4">
                <div className="grid gap-2 rounded-lg bg-muted p-4 text-sm">
                  {courses.slice(0, 3).map((enrollment) => (
                    <div key={enrollment.id} className="flex justify-between gap-4">
                      <span className="text-muted-foreground">{enrollment.course?.title ?? "Curso"}</span>
                      <span>{enrollment.status === "trialing" ? "Teste" : "Ativo"}</span>
                    </div>
                  ))}
                </div>
                <Button asChild className="w-full bg-primary hover:bg-primary/90">
                  <Link to="/cursos">
                    Acessar cursos
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}
          {products.map((subscription) => {
            const product = subscription.product;
            if (!product) return null;
            const Icon = productIcons[product.slug] ?? Package;
            return (
              <Card key={subscription.id} className="flex h-full flex-col border-primary/10 bg-white/90 shadow-sm">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <Icon className="h-9 w-9 text-primary" />
                    <Badge className="bg-emerald-600">{statusLabels[subscription.status] ?? subscription.status}</Badge>
                  </div>
                  <CardTitle className="text-xl">{product.name}</CardTitle>
                  <CardDescription>{product.short_description}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto space-y-4">
                  <div className="grid gap-2 rounded-lg bg-muted p-4 text-sm">
                    <div className="flex justify-between gap-4"><span className="text-muted-foreground">Plano</span><span>{subscription.plan_name ?? "Padrao"}</span></div>
                    <div className="flex justify-between gap-4"><span className="text-muted-foreground">Renovacao</span><span>{subscription.current_period_end ? formatDate(subscription.current_period_end) : "Sem vencimento"}</span></div>
                  </div>
                  <Button asChild className="w-full bg-primary hover:bg-primary/90">
                    <Link to={product.route_path ?? "/dashboard"}>
                      Acessar
                      <ArrowRight className="h-4 w-4" />
                    </Link>
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
