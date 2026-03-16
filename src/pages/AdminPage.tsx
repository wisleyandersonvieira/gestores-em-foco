import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/entrar?callbackUrl=/admin");
      }
      setLoading(false);
    });
  }, [navigate]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/70 bg-foreground text-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="font-display text-xl font-semibold">Painel Administrativo</p>
            <p className="text-sm opacity-70">Controle de modelos, links e resultados</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm opacity-70 transition hover:opacity-100">
              Ver site
            </Link>
            <Button variant="outline" size="sm" className="border-background/20 text-background hover:bg-background/10" onClick={() => supabase.auth.signOut().then(() => navigate("/"))}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <section className="grid gap-4 md:grid-cols-3">
          <Card className="bg-white/90">
            <CardHeader>
              <CardDescription>Usuarios cadastrados</CardDescription>
              <CardTitle className="font-display text-4xl">—</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-white/90">
            <CardHeader>
              <CardDescription>Modelos ativos</CardDescription>
              <CardTitle className="font-display text-4xl">—</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-white/90">
            <CardHeader>
              <CardDescription>Links recentes</CardDescription>
              <CardTitle className="font-display text-4xl">—</CardTitle>
            </CardHeader>
          </Card>
        </section>

        <section className="mt-10">
          <Card className="bg-white/90">
            <CardHeader>
              <CardTitle className="font-display text-2xl">Em construcao</CardTitle>
              <CardDescription>
                O painel administrativo sera alimentado pelo banco de dados Supabase. Configure as tabelas para habilitar o CRUD de modelos e links.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>
      </main>
    </div>
  );
}
