import { ClientLayout } from "@/components/platform/client-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProfilePage() {
  return (
    <ClientLayout>
      {(user) => {
        const metadata = user.user_metadata;
        return (
          <div className="space-y-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Meu Perfil</p>
              <h1 className="font-display mt-3 text-3xl font-semibold md:text-4xl">Dados pessoais e empresariais.</h1>
            </div>
            <Card className="border-primary/10 bg-white/90">
              <CardHeader>
                <CardTitle>Informacoes da conta</CardTitle>
                <CardDescription>Campos editaveis podem ser conectados ao cadastro completo na proxima etapa.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Info label="Nome" value={metadata?.name ?? metadata?.full_name ?? "Nao informado"} />
                <Info label="Email" value={user.email ?? "Nao informado"} />
                <Info label="Empresa" value={metadata?.company_name ?? "Nao informada"} />
                <Info label="Cargo" value={metadata?.role_title ?? "Nao informado"} />
              </CardContent>
            </Card>
          </div>
        );
      }}
    </ClientLayout>
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
