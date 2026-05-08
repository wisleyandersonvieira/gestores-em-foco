import { Bell, Lock } from "lucide-react";

import { ClientLayout } from "@/components/platform/client-layout";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <ClientLayout>
      {() => (
        <div className="space-y-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Configuracoes</p>
            <h1 className="font-display mt-3 text-3xl font-semibold md:text-4xl">Preferencias da sua conta.</h1>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <Card className="border-primary/10 bg-white/90">
              <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                <Bell className="mt-1 h-6 w-6 text-accent" />
                <div>
                  <CardTitle>Notificacoes</CardTitle>
                  <CardDescription className="mt-2">Preferencias de email e avisos da plataforma ficarao aqui.</CardDescription>
                </div>
              </CardHeader>
            </Card>
            <Card className="border-primary/10 bg-white/90">
              <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                <Lock className="mt-1 h-6 w-6 text-accent" />
                <div>
                  <CardTitle>Senha e seguranca</CardTitle>
                  <CardDescription className="mt-2">Alteracao de senha e configuracoes de acesso serao conectadas aqui.</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>
      )}
    </ClientLayout>
  );
}
