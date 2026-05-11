import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ClientLayout } from "@/components/platform/client-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserProfile, type UserProfile } from "@/lib/account-settings";
import { getActiveSectorsWithSubsectors, type BusinessSectorWithSubsectors } from "@/lib/business-sectors";

export default function ProfilePage() {
  return (
    <ClientLayout>
      {(user) => <ProfileContent userId={user.id} email={user.email ?? "Não informado"} metadata={user.user_metadata} />}
    </ClientLayout>
  );
}

function ProfileContent({ userId, email, metadata }: { userId: string; email: string; metadata: Record<string, any> }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sectors, setSectors] = useState<BusinessSectorWithSubsectors[]>([]);

  useEffect(() => {
    void Promise.all([getUserProfile(userId), getActiveSectorsWithSubsectors()]).then(([nextProfile, nextSectors]) => {
      setProfile(nextProfile);
      setSectors(nextSectors);
    });
  }, [userId]);

  const sector = useMemo(() => sectors.find((item) => item.id === profile?.sector_id) ?? null, [sectors, profile?.sector_id]);
  const subsector = useMemo(() => sector?.subsectors.find((item) => item.id === profile?.subsector_id) ?? null, [sector, profile?.subsector_id]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Meu Perfil</p>
          <h1 className="font-display mt-3 text-3xl font-semibold md:text-4xl">Dados pessoais e empresariais.</h1>
        </div>
        <Button asChild><Link to="/configuracoes">Editar perfil</Link></Button>
      </div>
      <Card className="border-primary/10 bg-white/90">
        <CardHeader>
          <CardTitle>Informações da conta</CardTitle>
          <CardDescription>Dados usados para personalizar sua experiência na plataforma.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Info label="Nome" value={profile?.full_name || metadata?.name || metadata?.full_name || "Não informado"} />
          <Info label="Email" value={email} />
          <Info label="Empresa" value={profile?.company_name || metadata?.company_name || "Não informada"} />
          <Info label="Setor" value={sector?.name ?? "Não informado"} />
          <Info label="Subsetor" value={subsector?.name ?? "Não informado"} />
          <Info label="Cargo" value={profile?.role || metadata?.role_title || "Não informado"} />
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
