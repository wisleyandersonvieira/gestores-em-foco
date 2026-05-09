import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getAdminAccessError } from "@/lib/admin-access";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const created = searchParams.get("cadastro") === "sucesso";
  const callbackUrl = searchParams.get("redirect") ?? searchParams.get("callbackUrl") ?? "/dashboard";
  const adminAccessError =
    searchParams.get("erro") === "admin_email" ? getAdminAccessError(searchParams.get("email")) : null;
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    setIsPending(false);

    if (authError) {
      setError("Email ou senha invalidos.");
      return;
    }

    navigate(callbackUrl);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center gap-10 px-6 py-16 lg:flex-row lg:justify-between">
      <div className="max-w-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Acesso seguro</p>
        <h1 className="font-display mt-4 text-4xl font-semibold leading-tight md:text-5xl">
          Entre para acompanhar sua jornada de gestao.
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          Seus produtos, diagnosticos, progresso e relatorios ficam disponiveis em uma experiencia pensada para uso rapido no desktop e no mobile.
        </p>
      </div>

      <Card className="w-full max-w-md border-primary/10 bg-white/90 shadow-xl shadow-slate-200/70">
        <CardHeader>
          <CardTitle className="font-display text-3xl">Entrar na plataforma</CardTitle>
          <CardDescription>Acesse seus produtos, progresso e relatorios.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {created && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                Conta criada com sucesso. Agora e so entrar.
              </div>
            )}

            {adminAccessError && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {adminAccessError}
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="voce@empresa.com" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" name="password" type="password" placeholder="Sua senha" required />
            </div>

            <div className="flex justify-end">
              <Link to="/esqueci-minha-senha" className="text-sm font-medium text-primary hover:underline">
                Esqueci minha senha
              </Link>
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isPending}>
              {isPending ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Ainda nao tem conta?{" "}
            <Link to="/cadastro" className="font-medium text-primary hover:underline">
              Criar conta
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
