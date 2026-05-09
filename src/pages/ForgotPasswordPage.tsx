import { useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const SUCCESS_MESSAGE = "Se o e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.";
const ERROR_MESSAGE = "Nao foi possivel enviar o link neste momento. Tente novamente.";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSending, setIsSending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setIsSending(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });

    setIsSending(false);

    if (error) {
      setFeedback({ type: "error", message: ERROR_MESSAGE });
      return;
    }

    setFeedback({ type: "success", message: SUCCESS_MESSAGE });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center gap-10 px-6 py-16 lg:flex-row lg:justify-between">
      <div className="max-w-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Acesso seguro</p>
        <h1 className="font-display mt-4 text-4xl font-semibold leading-tight md:text-5xl">
          Recupere seu acesso a plataforma.
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          Enviaremos um link seguro para voce criar uma nova senha e voltar a acessar seus produtos.
        </p>
      </div>

      <Card className="w-full max-w-md border-primary/10 bg-white/90 shadow-xl shadow-slate-200/70">
        <CardHeader>
          <CardTitle className="font-display text-3xl">Recuperar senha</CardTitle>
          <CardDescription>Informe o e-mail cadastrado na plataforma para receber o link de redefinicao.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {feedback && (
              <div
                className={
                  feedback.type === "success"
                    ? "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
                    : "rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                }
              >
                {feedback.message}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="voce@empresa.com"
                value={email}
                autoComplete="email"
                required
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isSending}>
              {isSending ? "Enviando..." : "Enviar link de redefinicao"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/entrar" className="font-medium text-primary hover:underline">
              Voltar para login
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
