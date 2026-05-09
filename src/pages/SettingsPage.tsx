import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Bell, CreditCard, Database, Globe2, HelpCircle, KeyRound, Link2, MonitorCog, Shield, UserCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { ClientLayout } from "@/components/platform/client-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  createSupportRequest,
  getNotificationPreferences,
  getUserPreferences,
  getUserProfile,
  getUserSubscriptions,
  sendPasswordResetEmail,
  updateNotificationPreferences,
  updateUserPassword,
  updateUserPreferences,
  updateUserProfile,
  type UserNotificationPreferences,
  type UserPreferences,
  type UserProfile,
} from "@/lib/account-settings";
import { applyTheme, normalizeTheme, storeTheme, type Theme } from "@/lib/theme";
import type { UserProductAccess } from "@/lib/products";

const settingsCards = [
  { value: "perfil", title: "Perfil da conta", description: "Atualize suas informacoes basicas.", icon: UserCircle },
  { value: "seguranca", title: "Seguranca e acesso", description: "Senha, sessoes e acesso.", icon: KeyRound },
  { value: "notificacoes", title: "Notificacoes", description: "Preferencias de avisos.", icon: Bell },
  { value: "aparencia", title: "Aparencia", description: "Tema e densidade visual.", icon: MonitorCog },
  { value: "regiao", title: "Idioma e regiao", description: "Idioma, moeda e datas.", icon: Globe2 },
  { value: "assinaturas", title: "Assinaturas e produtos", description: "Produtos contratados.", icon: CreditCard },
  { value: "integracoes", title: "Integracoes", description: "Ferramentas externas futuras.", icon: Link2 },
  { value: "privacidade", title: "Privacidade e dados", description: "Dados e zona de risco.", icon: Shield },
  { value: "suporte", title: "Suporte", description: "Fale com nosso time.", icon: HelpCircle },
];

export default function SettingsPage() {
  return (
    <ClientLayout>
      {(user) => <SettingsContent user={user} />}
    </ClientLayout>
  );
}

function SettingsContent({ user }: { user: User }) {
  const [tab, setTab] = useState("perfil");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [notifications, setNotifications] = useState<UserNotificationPreferences | null>(null);
  const [subscriptions, setSubscriptions] = useState<UserProductAccess[]>([]);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [support, setSupport] = useState({ subject: "", message: "", type: "duvida" });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    void Promise.all([
      getUserProfile(user.id),
      getUserPreferences(user.id),
      getNotificationPreferences(user.id),
      getUserSubscriptions(user.id),
    ])
      .then(([nextProfile, nextPreferences, nextNotifications, nextSubscriptions]) => {
        setProfile({
          ...nextProfile,
          full_name: nextProfile.full_name || String(user.user_metadata?.name ?? user.user_metadata?.full_name ?? ""),
          company_name: nextProfile.company_name || String(user.user_metadata?.company_name ?? ""),
          role: nextProfile.role || String(user.user_metadata?.role_title ?? ""),
        });
        setPreferences(nextPreferences);
        setNotifications(nextNotifications);
        setSubscriptions(nextSubscriptions);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel carregar configuracoes."));
  }, [user]);

  async function saveProfile() {
    if (!profile) return;
    const saved = await updateUserProfile(user.id, profile);
    setProfile(saved);
    toast.success("Perfil salvo com sucesso.");
  }

  async function savePreferences(nextPreferences = preferences) {
    if (!nextPreferences) return;
    const safePreferences = { ...nextPreferences, theme: normalizeTheme(nextPreferences.theme) };
    const saved = await updateUserPreferences(user.id, safePreferences);
    setPreferences(saved);
    toast.success("Preferencias salvas.");
  }

  async function saveAppearance() {
    if (!preferences) return;

    const theme = normalizeTheme(preferences.theme);
    const saved = await updateUserPreferences(user.id, {
      ...preferences,
      theme,
      density: preferences.density || "default",
    });

    const savedTheme = normalizeTheme(saved.theme);
    setPreferences({ ...saved, theme: savedTheme });
    storeTheme(savedTheme);
    applyTheme(savedTheme);
    toast.success("Preferências de aparência salvas com sucesso.");
  }

  async function saveNotifications(nextNotifications = notifications) {
    if (!nextNotifications) return;
    const saved = await updateNotificationPreferences(user.id, nextNotifications);
    setNotifications(saved);
    toast.success("Notificacoes salvas.");
  }

  async function handlePasswordUpdate() {
    if (password !== passwordConfirmation) {
      toast.error("A confirmacao precisa ser igual a nova senha.");
      return;
    }
    await updateUserPassword(password);
    setPassword("");
    setPasswordConfirmation("");
    toast.success("Senha atualizada com sucesso.");
  }

  async function handleSupportSubmit() {
    await createSupportRequest(user.id, support);
    setSupport({ subject: "", message: "", type: "duvida" });
    toast.success("Sua solicitacao foi enviada com sucesso.");
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Configuracoes</p>
        <h1 className="font-display mt-3 text-3xl font-semibold md:text-4xl">Preferencias da sua conta.</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Gerencie suas informacoes, seguranca, notificacoes e preferencias gerais da plataforma.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {settingsCards.map((item) => (
            <button key={item.value} onClick={() => setTab(item.value)} className={`rounded-xl border bg-white/90 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${tab === item.value ? "border-primary ring-2 ring-primary/10" : "border-primary/10"}`}>
              <div className="flex items-start gap-3">
                <item.icon className="mt-1 h-6 w-6 text-accent" />
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <TabsList className="hidden" />

        <TabsContent value="perfil">
          <Card className="border-primary/10 bg-white/90">
            <CardHeader><CardTitle>Perfil da conta</CardTitle><CardDescription>Atualize suas informacoes basicas da plataforma.</CardDescription></CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Avatar className="h-20 w-20"><AvatarImage src={profile?.avatar_url ?? undefined} /><AvatarFallback>{initials(profile?.full_name || user.email || "U")}</AvatarFallback></Avatar>
                <div>
                  <Button variant="outline" disabled>Alterar foto</Button>
                  <p className="mt-2 text-xs text-muted-foreground">Upload de avatar preparado para futura integracao com storage.</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nome completo" value={profile?.full_name ?? ""} onChange={(value) => setProfile((current) => current && { ...current, full_name: value })} />
                <Field label="E-mail" value={user.email ?? ""} disabled />
                <Field label="Telefone" value={profile?.phone ?? ""} onChange={(value) => setProfile((current) => current && { ...current, phone: value })} />
                <Field label="Nome da empresa" value={profile?.company_name ?? ""} onChange={(value) => setProfile((current) => current && { ...current, company_name: value })} />
                <Field label="Cargo / funcao" value={profile?.role ?? ""} onChange={(value) => setProfile((current) => current && { ...current, role: value })} />
              </div>
              <Button onClick={() => void saveProfile().catch((error) => toast.error(error.message))}>Salvar perfil</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seguranca">
          <Card className="border-primary/10 bg-white/90">
            <CardHeader><CardTitle>Senha e seguranca</CardTitle><CardDescription>Gerencie sua senha, sessoes e configuracoes de acesso.</CardDescription></CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <Field label="Nova senha" type="password" value={password} onChange={setPassword} />
                <Field label="Confirmar nova senha" type="password" value={passwordConfirmation} onChange={setPasswordConfirmation} />
                <Button onClick={() => void handlePasswordUpdate().catch((error) => toast.error(error.message))}>Alterar senha</Button>
              </div>
              <div className="space-y-3">
                <Button variant="outline" onClick={() => user.email && void sendPasswordResetEmail(user.email).then(() => toast.success("Enviamos um link de redefinicao para seu e-mail.")).catch((error) => toast.error(error.message))}>Enviar link de redefinicao</Button>
                <Placeholder title="Sessoes conectadas" text="Gerenciamento de sessoes sera disponibilizado em breve." />
                <Placeholder title="Autenticacao em dois fatores" text="Autenticacao em dois fatores sera adicionada em breve." />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notificacoes">
          <SettingsCard title="Notificacoes" description="Defina como deseja receber avisos da plataforma.">
            {notifications ? (
              <div className="grid gap-3">
                <Toggle label="Receber e-mails importantes da plataforma" checked={notifications.platform_emails} onChange={(value) => setNotifications({ ...notifications, platform_emails: value })} />
                <Toggle label="Receber avisos sobre assinatura e cobranca" checked={notifications.billing_emails} onChange={(value) => setNotifications({ ...notifications, billing_emails: value })} />
                <Toggle label="Receber novidades sobre produtos" checked={notifications.product_news} onChange={(value) => setNotifications({ ...notifications, product_news: value })} />
                <Toggle label="Receber alertas de seguranca" checked={notifications.security_alerts} onChange={() => toast.info("Alertas de seguranca permanecem sempre ativos para proteger sua conta.")} disabled />
                <Toggle label="Receber notificacoes dentro da plataforma" checked={notifications.in_app_notifications} onChange={(value) => setNotifications({ ...notifications, in_app_notifications: value })} />
                <Button className="w-fit" onClick={() => void saveNotifications().catch((error) => toast.error(error.message))}>Salvar notificacoes</Button>
              </div>
            ) : null}
          </SettingsCard>
        </TabsContent>

        <TabsContent value="aparencia">
          <SettingsCard title="Aparencia" description="Personalize a forma como a plataforma e exibida.">
            {preferences ? (
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField label="Tema" value={normalizeTheme(preferences.theme)} onChange={(value) => setPreferences({ ...preferences, theme: value as Theme })} options={[["light", "Tema claro"], ["dark", "Tema escuro"]]} />
                <SelectField label="Tamanho da interface" value={preferences.density || "default"} onChange={(value) => setPreferences({ ...preferences, density: value })} options={[["default", "Padrao"]]} />
                <Button className="w-fit" onClick={() => void saveAppearance().catch((error) => toast.error(error.message))}>Salvar aparencia</Button>
              </div>
            ) : null}
          </SettingsCard>
        </TabsContent>

        <TabsContent value="regiao">
          <SettingsCard title="Idioma e regiao" description="Configure idioma, moeda, fuso horario e formato de datas.">
            {preferences ? (
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField label="Idioma" value={preferences.language} onChange={(value) => setPreferences({ ...preferences, language: value })} options={[["pt-BR", "Portugues Brasil"], ["en-US", "Ingles"]]} />
                <SelectField label="Moeda padrao" value={preferences.currency} onChange={(value) => setPreferences({ ...preferences, currency: value })} options={[["BRL", "BRL"], ["USD", "USD"]]} />
                <SelectField label="Fuso horario" value={preferences.timezone} onChange={(value) => setPreferences({ ...preferences, timezone: value })} options={[["America/Sao_Paulo", "America/Sao_Paulo"], ["America/New_York", "America/New_York"], ["America/Chicago", "America/Chicago"], ["America/Los_Angeles", "America/Los_Angeles"]]} />
                <SelectField label="Formato de data" value={preferences.date_format} onChange={(value) => setPreferences({ ...preferences, date_format: value })} options={[["DD/MM/YYYY", "DD/MM/YYYY"], ["MM/DD/YYYY", "MM/DD/YYYY"], ["YYYY-MM-DD", "YYYY-MM-DD"]]} />
                <Button className="w-fit" onClick={() => void savePreferences().catch((error) => toast.error(error.message))}>Salvar idioma e regiao</Button>
              </div>
            ) : null}
          </SettingsCard>
        </TabsContent>

        <TabsContent value="assinaturas">
          <SettingsCard title="Assinaturas e produtos" description="Veja seus produtos contratados e status de acesso.">
            {subscriptions.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                Voce ainda nao possui produtos ativos.
                <Button asChild className="mt-4 block w-fit bg-accent text-accent-foreground hover:bg-accent/90"><Link to="/produtos">Conhecer produtos</Link></Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {subscriptions.map((subscription) => (
                  <div key={subscription.id} className="grid gap-3 rounded-lg border bg-white p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div>
                      <p className="font-semibold">{subscription.product?.name}</p>
                      <p className="text-sm text-muted-foreground">{subscription.product?.short_description}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <Badge>{subscription.status}</Badge>
                        <Badge variant="outline">{subscription.plan_name ?? "Plano padrao"}</Badge>
                        <Badge variant="outline">{subscription.current_period_end ? `Renova em ${formatDate(subscription.current_period_end)}` : "Sem vencimento"}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild variant="outline"><Link to={subscription.product?.route_path ?? "/dashboard"}>Acessar produto</Link></Button>
                      <Button disabled>Gerenciar assinatura</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SettingsCard>
        </TabsContent>

        <TabsContent value="integracoes">
          <SettingsCard title="Integracoes" description="Conecte ferramentas externas a sua conta.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[
                ["Stripe", "Gerencie pagamentos, assinaturas e cobrancas da plataforma."],
                ["Google", "Conecte sua conta para calendario, arquivos ou login."],
                ["WhatsApp", "Receba alertas e notificacoes importantes pelo WhatsApp."],
                ["E-mail", "Configure canais futuros de comunicacao."],
                ["Webhooks", "Envie eventos da plataforma para sistemas externos."],
                ["API", "Gerencie acesso programatico futuro."],
              ].map(([title, text]) => <IntegrationCard key={title} title={title} text={text} />)}
            </div>
          </SettingsCard>
        </TabsContent>

        <TabsContent value="privacidade">
          <SettingsCard title="Privacidade e dados" description="Gerencie seus dados e preferencias de privacidade.">
            <div className="grid gap-4 lg:grid-cols-2">
              <Placeholder title="Exportar meus dados" text="Exportacao de dados sera implementada em breve." action="Solicitar exportacao" />
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <p className="font-semibold text-destructive">Zona de risco</p>
                <p className="mt-2 text-sm text-muted-foreground">A exclusao pode remover acesso aos produtos, dados e historico.</p>
                <Button className="mt-4" variant="destructive" onClick={() => setDeleteDialogOpen(true)}>Solicitar exclusao da conta</Button>
              </div>
              <Button asChild variant="outline" className="w-fit"><Link to="/politica-de-privacidade">Ver politica de privacidade</Link></Button>
            </div>
          </SettingsCard>
        </TabsContent>

        <TabsContent value="suporte">
          <SettingsCard title="Suporte" description="Precisa de ajuda? Entre em contato com nosso time.">
            <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
              <div className="grid gap-3">
                <Placeholder title="Central de ajuda" text="Artigos e tutoriais serao disponibilizados em breve." />
                <Placeholder title="Falar com suporte" text="Envie uma solicitacao pelo formulario ao lado." />
                <Placeholder title="Enviar feedback" text="Sugestoes ajudam a evoluir a plataforma." />
                <Placeholder title="Relatar problema" text="Conte o que aconteceu com o maximo de contexto." />
              </div>
              <div className="grid gap-4 rounded-lg border bg-white p-4">
                <Field label="Assunto" value={support.subject} onChange={(value) => setSupport({ ...support, subject: value })} />
                <SelectField label="Tipo" value={support.type} onChange={(value) => setSupport({ ...support, type: value })} options={[["duvida", "Duvida"], ["problema", "Problema"], ["sugestao", "Sugestao"], ["financeiro", "Financeiro"]]} />
                <Label>Mensagem<Textarea className="mt-2" value={support.message} onChange={(event) => setSupport({ ...support, message: event.target.value })} /></Label>
                <Button onClick={() => void handleSupportSubmit().catch((error) => toast.error(error.message))}>Enviar solicitacao</Button>
              </div>
            </div>
          </SettingsCard>
        </TabsContent>
      </Tabs>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar exclusao da conta</DialogTitle>
            <DialogDescription>Essa acao pode remover acesso aos produtos, dados e historico. Nesta etapa, a exclusao real ainda nao sera executada automaticamente.</DialogDescription>
          </DialogHeader>
          <Button variant="destructive" onClick={() => { setDeleteDialogOpen(false); toast.success("Solicitacao de exclusao registrada. Esta funcionalidade sera concluida em etapa futura."); }}>Confirmar solicitacao</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SettingsCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="border-primary/10 bg-white/90">
      <CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Field({ label, value, onChange, disabled, type = "text" }: { label: string; value: string; onChange?: (value: string) => void; disabled?: boolean; type?: string }) {
  return <Label>{label}<Input className="mt-2" type={type} value={value} disabled={disabled} onChange={(event) => onChange?.(event.target.value)} /></Label>;
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return (
    <Label>{label}<Select value={value} onValueChange={onChange}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent>{options.map(([optionValue, optionLabel]) => <SelectItem key={optionValue} value={optionValue}>{optionLabel}</SelectItem>)}</SelectContent></Select></Label>
  );
}

function Toggle({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return <label className="flex items-center justify-between gap-4 rounded-lg border bg-white p-4 text-sm"><span>{label}</span><Switch checked={checked} disabled={disabled} onCheckedChange={onChange} /></label>;
}

function Placeholder({ title, text, action }: { title: string; text: string; action?: string }) {
  return <div className="rounded-lg border bg-muted/40 p-4"><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-muted-foreground">{text}</p>{action ? <Button className="mt-3" variant="outline" disabled>{action}</Button> : null}</div>;
}

function IntegrationCard({ title, text }: { title: string; text: string }) {
  return <div className="rounded-lg border bg-white p-4"><div className="flex items-center justify-between gap-3"><p className="font-semibold">{title}</p><Badge variant="secondary">Em breve</Badge></div><p className="mt-2 text-sm text-muted-foreground">{text}</p><Button className="mt-4 w-full" variant="outline" disabled>Configurar em breve</Button></div>;
}

function initials(value: string) {
  return value.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}
