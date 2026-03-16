import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { User } from "@supabase/supabase-js";

export default function AccountPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user) {
        navigate("/entrar?callbackUrl=/minha-conta");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user) {
        navigate("/entrar?callbackUrl=/minha-conta");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/");
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  if (!user) return null;

  const metadata = user.user_metadata;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="font-display text-xl font-semibold">Minha Conta</p>
            <p className="text-sm text-muted-foreground">{metadata?.name ?? user.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm font-medium text-muted-foreground transition hover:text-foreground">
              Voltar ao site
            </Link>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="surface-panel border-none">
            <CardHeader>
              <CardTitle className="font-display text-3xl">Iniciar um diagnostico</CardTitle>
              <CardDescription>Cole o link que voce recebeu para acessar um novo fluxo de perguntas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="https://seudominio.com/diagnostico/token" />
              <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Iniciar Diagnostico</Button>
              <p className="text-sm text-muted-foreground">
                Na proxima fase, esse campo vai validar o token e encaminhar automaticamente para a rota publica do diagnostico.
              </p>
            </CardContent>
          </Card>

          <Card className="surface-panel border-none">
            <CardHeader>
              <CardTitle className="font-display text-3xl">Resumo da conta</CardTitle>
              <CardDescription>Dados basicos da empresa usados para personalizar o acompanhamento.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-muted p-4">
                <p className="text-sm text-muted-foreground">Empresa</p>
                <p className="mt-1 font-semibold">{metadata?.company_name ?? "Nao informada"}</p>
              </div>
              <div className="rounded-2xl bg-muted p-4">
                <p className="text-sm text-muted-foreground">Diagnosticos vinculados</p>
                <p className="mt-1 font-semibold">0</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <section className="mt-10">
          <div className="mb-5">
            <h2 className="font-display text-2xl font-semibold">Historico de diagnosticos</h2>
            <p className="text-sm text-muted-foreground">Acompanhe os links recebidos e o status de cada resposta.</p>
          </div>
          <Card className="border-dashed bg-white/70">
            <CardContent className="p-6 text-sm text-muted-foreground">
              Nenhum diagnostico foi associado a esta conta ainda.
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
