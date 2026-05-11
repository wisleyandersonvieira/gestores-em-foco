import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { TurnstileCaptcha, type TurnstileCaptchaHandle } from "@/components/auth/turnstile-captcha";
import { MultiSectorSubsectorFields } from "@/components/platform/sector-subsector-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getActiveSectorsWithSubsectors, type BusinessSectorWithSubsectors } from "@/lib/business-sectors";

const CAPTCHA_ERROR_MESSAGE = "Não foi possível validar a verificação de segurança. Tente novamente.";

export default function SignupPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [sectors, setSectors] = useState<BusinessSectorWithSubsectors[]>([]);
  const [sectorIds, setSectorIds] = useState<string[]>([]);
  const [subsectorIds, setSubsectorIds] = useState<string[]>([]);
  const submitLockRef = useRef(false);
  const captchaRef = useRef<TurnstileCaptchaHandle>(null);
  const selectedSectors = useMemo(() => sectors.filter((sector) => sectorIds.includes(sector.id)), [sectors, sectorIds]);
  const selectedSubsectors = useMemo(() => selectedSectors.flatMap((sector) => sector.subsectors).filter((subsector) => subsectorIds.includes(subsector.id)), [selectedSectors, subsectorIds]);

  useEffect(() => {
    getActiveSectorsWithSubsectors()
      .then(setSectors)
      .catch((runtimeError) => setError(runtimeError instanceof Error ? runtimeError.message : "Não foi possível carregar setores."));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitLockRef.current || !captchaToken) {
      if (!captchaToken) setError(CAPTCHA_ERROR_MESSAGE);
      return;
    }
    submitLockRef.current = true;
    setIsPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = String(formData.get("name") ?? "");
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const companyName = String(formData.get("companyName") ?? "").trim();
    const employeesCount = Number(formData.get("employeesCount") ?? 0);
    const segment = selectedSectors.length && selectedSubsectors.length ? `${selectedSectors[0].name} - ${selectedSubsectors[0].name}` : "";

    if (!sectorIds.length) {
      submitLockRef.current = false;
      setIsPending(false);
      setError("Selecione um setor.");
      return;
    }

    if (!subsectorIds.length) {
      submitLockRef.current = false;
      setIsPending(false);
      setError("Selecione um subsetor.");
      return;
    }

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        captchaToken,
        emailRedirectTo: `${window.location.origin}/entrar?cadastro=sucesso`,
        data: {
          name,
          company_name: companyName || null,
          sector_id: sectorIds[0],
          subsector_id: subsectorIds[0],
          sector_ids: sectorIds,
          subsector_ids: subsectorIds,
          segment,
          employees_count: employeesCount,
        },
      },
    });

    if (authError) {
      submitLockRef.current = false;
      setIsPending(false);
      captchaRef.current?.reset();
      setError(getAuthErrorMessage(authError, "Nao foi possivel criar sua conta. Confira os dados e tente novamente."));
      return;
    }

    captchaRef.current?.reset();
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
              <Label htmlFor="companyName">Nome da empresa, opcional</Label>
              <Input id="companyName" name="companyName" placeholder="Nome da empresa, se houver" />
            </div>

            <MultiSectorSubsectorFields
              sectors={sectors}
              sectorIds={sectorIds}
              subsectorIds={subsectorIds}
              onSectorIdsChange={setSectorIds}
              onSubsectorIdsChange={setSubsectorIds}
              disabled={isPending}
              className="md:col-span-2"
            />

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="employeesCount">Numero de funcionarios</Label>
              <Input id="employeesCount" name="employeesCount" type="number" min="1" placeholder="Ex.: 12" required />
            </div>

            <div className="md:col-span-2">
              <TurnstileCaptcha
                ref={captchaRef}
                onTokenChange={setCaptchaToken}
                onError={(message) => setError(message)}
              />
            </div>

            <div className="md:col-span-2">
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={isPending || !captchaToken}>
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
