import { useEffect, useRef, useState } from "react";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { PASSWORD_RULES, validatePassword } from "@/lib/password-security";

// ── Token detection ────────────────────────────────────────────────────────────
// Supabase sends recovery links in two possible formats depending on the project settings:
// • PKCE flow  → ?code=XXXX  (default in Supabase v2 / modern clients)
// • Implicit   → #access_token=XXXX&type=recovery

function getRecoveryParams() {
  const search = new URLSearchParams(window.location.search);
  const hash   = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return {
    tokenHash: search.get("token_hash") ?? hash.get("token_hash"),
    type: search.get("type") ?? hash.get("type"),
    code: search.get("code"),
    accessToken: hash.get("access_token"),
    error: search.get("error") ?? hash.get("error"),
  };
}

function cleanRecoveryTokenFromUrl() {
  if (typeof window !== "undefined" && window.history.replaceState) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
  const navigate = useNavigate();

  const [password, setPassword]                             = useState("");
  const [passwordConfirmation, setPasswordConfirmation]     = useState("");
  const [showPassword, setShowPassword]                     = useState(false);
  const [showConfirmation, setShowConfirmation]             = useState(false);

  // Session state machine: "checking" | "valid" | "invalid"
  const [sessionState, setSessionState] = useState<"checking" | "valid" | "invalid">("checking");
  const [isSaving, setIsSaving]         = useState(false);
  const submitLockRef                   = useRef(false);

  // Guarda os parâmetros para consumi-los apenas no submit (evita que
  // scanners de email pré-visualizem o link e queimem o OTP).
  const recoveryParamsRef = useRef(getRecoveryParams());

  useEffect(() => {
    const params = recoveryParamsRef.current;

    if (params.error) {
      setSessionState("invalid");
      return;
    }

    const hasAnyToken = !!(params.tokenHash || params.code || params.accessToken || params.type === "recovery");
    if (!hasAnyToken) {
      void supabase.auth.getSession().then(({ data }) => {
        setSessionState(data.session ? "valid" : "invalid");
      });
      return;
    }

    // Não consumir o token aqui: apenas habilitar o formulário.
    setSessionState("valid");
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLockRef.current || sessionState !== "valid") return;

    const validationError = validatePassword(password, passwordConfirmation);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    submitLockRef.current = true;
    setIsSaving(true);

    const params = recoveryParamsRef.current;

    // 1) Estabelecer sessão usando o token recebido por email — somente
    //    agora (no clique do usuário), para não ser consumido por scanners.
    try {
      if (params.tokenHash) {
        const { error } = await supabase.auth.verifyOtp({
          type: "recovery",
          token_hash: params.tokenHash,
        });
        if (error) throw error;
      } else if (params.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(params.code);
        if (error) throw error;
      }
      // accessToken no hash: supabase-js já restaurou a sessão.
    } catch (error) {
      toast.error(
        getAuthErrorMessage(
          error,
          "Link inválido ou expirado. Solicite um novo link de redefinição.",
        ),
      );
      setSessionState("invalid");
      submitLockRef.current = false;
      setIsSaving(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error(
        getAuthErrorMessage(
          error,
          "Não foi possível redefinir sua senha. Solicite um novo link e tente novamente.",
        ),
      );
      submitLockRef.current = false;
      setIsSaving(false);
      return;
    }

    cleanRecoveryTokenFromUrl();
    toast.success("Senha redefinida com sucesso.");
    await supabase.auth.signOut({ scope: "local" });
    navigate("/entrar", { replace: true });
  }

  // ── Render ───────────────────────────────────────────────────────────────────

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
          {sessionState === "checking" && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Validando link de redefinição...
            </div>
          )}

          {sessionState === "invalid" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                Este link expirou ou é inválido. Solicite uma nova redefinição de senha.
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link to="/esqueci-minha-senha">Solicitar novo link</Link>
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link to="/entrar">Voltar para login</Link>
              </Button>
            </div>
          )}

          {sessionState === "valid" && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <PasswordInput
                id="new-password"
                label="Nova senha"
                value={password}
                placeholder="Nova senha"
                visible={showPassword}
                onToggleVisible={() => setShowPassword((v) => !v)}
                onChange={setPassword}
              />

              {/* Real-time requirements checklist */}
              {password.length > 0 && (
                <PasswordRequirements password={password} />
              )}

              <PasswordInput
                id="confirm-password"
                label="Confirmar nova senha"
                value={passwordConfirmation}
                placeholder="Confirmar nova senha"
                visible={showConfirmation}
                onToggleVisible={() => setShowConfirmation((v) => !v)}
                onChange={setPasswordConfirmation}
              />

              {/* Confirmation mismatch hint */}
              {passwordConfirmation.length > 0 && password !== passwordConfirmation && (
                <p className="text-xs text-destructive">As senhas informadas não coincidem.</p>
              )}

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                disabled={isSaving}
              >
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

// ── Sub-components ─────────────────────────────────────────────────────────────

function PasswordInput({
  id,
  label,
  value,
  placeholder,
  visible,
  onToggleVisible,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  visible: boolean;
  onToggleVisible: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <Label className="block" htmlFor={id}>
      {label}
      <div className="relative mt-2">
        <Input
          id={id}
          className="pr-11"
          type={visible ? "text" : "password"}
          value={value}
          placeholder={placeholder}
          autoComplete="new-password"
          required
          onChange={(e) => onChange(e.target.value)}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-10 w-10 text-muted-foreground hover:text-foreground"
          onClick={onToggleVisible}
          tabIndex={-1}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          <span className="sr-only">{visible ? "Ocultar senha" : "Mostrar senha"}</span>
        </Button>
      </div>
    </Label>
  );
}

function PasswordRequirements({ password }: { password: string }) {
  return (
    <ul className="grid gap-1 rounded-lg border bg-muted/30 px-3 py-2.5 sm:grid-cols-2">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li key={rule.label} className={`flex items-center gap-1.5 text-xs ${met ? "text-emerald-600" : "text-muted-foreground"}`}>
            {met
              ? <Check className="h-3.5 w-3.5 shrink-0" />
              : <X className="h-3.5 w-3.5 shrink-0" />}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
