import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const submitLockRef = useRef(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setIsPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = String(formData.get("name") ?? "");
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const companyName = String(formData.get("companyName") ?? "");
    const segment = String(formData.get("segment") ?? "");
    const employeesCount = Number(formData.get("employeesCount") ?? 0);

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/entrar?cadastro=sucesso`,
        data: {
          name,
          company_name: companyName,
          segment,
          employees_count: employeesCount,
        },
      },
    });

    if (authError) {
      submitLockRef.current = false;
      setIsPending(false);
      setError(getAuthErrorMessage(authError, "Nao foi possivel criar sua conta. Confira os dados e tente novamente."));
      return;
    }

    navigate("/entrar?cadastro=sucesso");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center gap-10 px-6 py-16">
      <div className="max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Primeiro acesso</p>
        <h1 className="font-display mt-4 text-4xl font-semibold md:text-5xl">
          Crie sua conta e comece a responder diagnosticos personalizados.
        </h1>
      </div>

      <Card className="w-full max-w-2xl border-primary/10 bg-white/90 shadow-xl shadow-slate-200/70">
        <CardHeader>
          <CardTitle className="font-display text-3xl">Criar conta</CardTitle>
          <CardDescription>Comece a receber diagnosticos e acompanhar seus resultados em um so lugar.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
            {error && (
              <div className="md:col-span-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" name="name" placeholder="Seu nome" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="voce@empresa.com" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" name="password" type="password" placeholder="Crie uma senha forte" required minLength={8} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">Empresa</Label>
              <Input id="companyName" name="companyName" placeholder="Nome da empresa" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="segment">Segmento</Label>
              <Input id="segment" name="segment" placeholder="Ex.: Consultoria, varejo, servicos" required />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="employeesCount">Numero de funcionarios</Label>
              <Input id="employeesCount" name="employeesCount" type="number" min="1" placeholder="Ex.: 12" required />
            </div>

            <div className="md:col-span-2">
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={isPending}>
                {isPending ? "Criando conta..." : "Criar conta"}
              </Button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Ja tem conta?{" "}
            <Link to="/entrar" className="font-medium text-primary hover:underline">
              Acessar agora
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
