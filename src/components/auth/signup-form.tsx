"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";

import { registerUser, type RegisterActionState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: RegisterActionState = {
  success: false,
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={pending}>
      {pending ? "Criando conta..." : "Criar conta"}
    </Button>
  );
}

export function SignupForm() {
  const [state, formAction] = useFormState(registerUser, initialState);

  return (
    <Card className="w-full max-w-2xl border-primary/10 bg-white/90 shadow-xl shadow-slate-200/70">
      <CardHeader>
        <CardTitle className="font-display text-3xl">Criar conta</CardTitle>
        <CardDescription>Comece a receber diagnosticos e acompanhar seus resultados em um so lugar.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-5 md:grid-cols-2">
          {state.message ? (
            <div className="md:col-span-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {state.message}
            </div>
          ) : null}

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
            <Input id="password" name="password" type="password" placeholder="Crie uma senha forte" required />
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
            <SubmitButton />
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Ja tem conta?{" "}
          <Link href="/entrar" className="font-medium text-primary hover:underline">
            Acessar agora
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
