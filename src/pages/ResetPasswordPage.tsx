import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { validatePassword } from "@/lib/password-security";

function hasRecoveryTokenInUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  return urlParams.get("type") === "recovery" || hashParams.get("type") === "recovery" || urlParams.has("code");
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const openedFromRecoveryLink = hasRecoveryTokenInUrl();

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setHasRecoverySession(Boolean(data.session) && openedFromRecoveryLink);
      setIsCheckingSession(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setHasRecoverySession(Boolean(session));
        setIsCheckingSession(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validatePassword(password, passwordConfirmation);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error("Nao foi possivel redefinir a senha. Solicite um novo link e tente novamente.");
      setIsSaving(false);
      return;
    }

    toast.success("Senha redefinida com sucesso.");
    await supabase.auth.signOut({ scope: "local" });
    navigate("/entrar", { replace: true });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center gap-10 px-6 py-16 lg:flex-row lg:justify-between">
      <div className="max-w-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Nova senha</p>
        <h1 className="font-display mt-4 text-4xl font-semibold leading-tight md:text-5xl">
          Crie uma nova senha de acesso.
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          Escolha uma senha segura para proteger sua conta e seus dados.
        </p>
      </div>

      <Card className="w-full max-w-md border-primary/10 bg-white/90 shadow-xl shadow-slate-200/70">
        <CardHeader>
          <CardTitle className="font-display text-3xl">Criar nova senha</CardTitle>
          <CardDescription>Digite uma nova senha para acessar sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          {!isCheckingSession && !hasRecoverySession ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                Link invalido ou expirado. Solicite um novo link de redefinicao.
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link to="/esqueci-minha-senha">Solicitar novo link</Link>
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link to="/entrar">Voltar para login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <PasswordInput
                label="Nova senha"
                value={password}
                placeholder="Nova senha"
                visible={showPassword}
                onToggleVisible={() => setShowPassword((current) => !current)}
                onChange={setPassword}
              />
              <PasswordInput
                label="Confirmar nova senha"
                value={passwordConfirmation}
                placeholder="Confirmar nova senha"
                visible={showPasswordConfirmation}
                onToggleVisible={() => setShowPasswordConfirmation((current) => !current)}
                onChange={setPasswordConfirmation}
              />
              <p className="text-sm text-muted-foreground">A senha deve ter no minimo 8 caracteres, incluindo letras e numeros.</p>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isSaving || isCheckingSession}>
                {isSaving ? "Salvando..." : "Salvar nova senha"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                <Link to="/entrar" className="font-medium text-primary hover:underline">
                  Voltar para login
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function PasswordInput({
  label,
  value,
  placeholder,
  visible,
  onToggleVisible,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  visible: boolean;
  onToggleVisible: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <Label className="block">
      {label}
      <div className="relative mt-2">
        <Input
          className="pr-11"
          type={visible ? "text" : "password"}
          value={value}
          placeholder={placeholder}
          autoComplete="new-password"
          required
          onChange={(event) => onChange(event.target.value)}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-10 w-10 text-muted-foreground hover:text-foreground"
          onClick={onToggleVisible}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          <span className="sr-only">{visible ? "Ocultar senha" : "Mostrar senha"}</span>
        </Button>
      </div>
    </Label>
  );
}
