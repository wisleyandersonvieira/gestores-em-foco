import { useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { Bell, CreditCard, Eye, EyeOff, HelpCircle, KeyRound, LogOut, MonitorCog, RefreshCw, Shield, ShieldCheck, UserCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { TurnstileCaptcha, type TurnstileCaptchaHandle } from "@/components/auth/turnstile-captcha";
import { ClientLayout } from "@/components/platform/client-layout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  createSupportRequest,
  getNotificationPreferences,
  getUserPreferences,
  getUserProfile,
  getUserSubscriptions,
  sendPasswordResetEmail,
  removeUserAvatar,
  updateNotificationPreferences,
  updateUserPassword,
  updateUserPreferences,
  updateUserProfile,
  uploadUserAvatar,
  type UserNotificationPreferences,
  type UserPreferences,
  type UserProfile,
} from "@/lib/account-settings";
import { validatePassword } from "@/lib/password-security";
import {
  createPrivacyRequest,
  deleteOwnAccount,
  exportAsExcel,
  exportAsJson,
  exportAsPdf,
  exportFormatLabel,
  getExportData,
  getPrivacyRequests,
  type ExportFormat,
  type PrivacyRequest,
} from "@/lib/privacy-requests";
import { applyTheme, normalizeTheme, storeTheme, type Theme } from "@/lib/theme";
import type { UserProductAccess } from "@/lib/products";

const settingsCards = [
  { value: "perfil", title: "Perfil da conta", description: "Atualize suas informacoes basicas.", icon: UserCircle },
  { value: "seguranca", title: "Seguranca e acesso", description: "Senha, sessoes e acesso.", icon: KeyRound },
  { value: "notificacoes", title: "Notificacoes", description: "Preferencias de avisos.", icon: Bell },
  { value: "aparencia", title: "Aparencia", description: "Tema e densidade visual.", icon: MonitorCog },
  { value: "assinaturas", title: "Assinaturas e produtos", description: "Produtos contratados.", icon: CreditCard },
  { value: "privacidade", title: "Privacidade e dados", description: "Dados e zona de risco.", icon: Shield },
  { value: "suporte", title: "Suporte", description: "Fale com nosso time.", icon: HelpCircle },
];
const RESET_LINK_COOLDOWN_SECONDS = 60;
const CAPTCHA_ERROR_MESSAGE = "Não foi possível validar a verificação de segurança. Tente novamente.";

export default function SettingsPage() {
  return (
    <ClientLayout>
      {(user) => <SettingsContent user={user} />}
    </ClientLayout>
  );
}

function SettingsContent({ user }: { user: User }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState("perfil");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [notifications, setNotifications] = useState<UserNotificationPreferences | null>(null);
  const [subscriptions, setSubscriptions] = useState<UserProductAccess[]>([]);
  const [privacyRequests, setPrivacyRequests] = useState<PrivacyRequest[]>([]);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isSendingResetLink, setIsSendingResetLink] = useState(false);
  const [resetLinkCooldownSeconds, setResetLinkCooldownSeconds] = useState(0);
  const [isRefreshingSession, setIsRefreshingSession] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [isRequestingDeletion, setIsRequestingDeletion] = useState(false);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User>(user);
  const [support, setSupport] = useState({ subject: "", message: "", type: "duvida" });
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isSendingSupport, setIsSendingSupport] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const passwordUpdateLockRef = useRef(false);
  const resetLinkLockRef = useRef(false);
  const supportLockRef = useRef(false);
  const deleteAccountLockRef = useRef(false);
  const captchaRef = useRef<TurnstileCaptchaHandle>(null);

  useEffect(() => {
    void Promise.all([
      getUserProfile(user.id),
      getUserPreferences(user.id),
      getNotificationPreferences(user.id),
      getUserSubscriptions(user.id),
      getPrivacyRequests(user.id),
    ])
      .then(([nextProfile, nextPreferences, nextNotifications, nextSubscriptions, nextPrivacyRequests]) => {
        setProfile({
          ...nextProfile,
          full_name: nextProfile.full_name || String(user.user_metadata?.name ?? user.user_metadata?.full_name ?? ""),
          company_name: nextProfile.company_name || String(user.user_metadata?.company_name ?? ""),
          role: nextProfile.role || String(user.user_metadata?.role_title ?? ""),
        });
        setPreferences(nextPreferences);
        setNotifications(nextNotifications);
        setSubscriptions(nextSubscriptions);
        setPrivacyRequests(nextPrivacyRequests);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel carregar configuracoes."));
  }, [user]);

  useEffect(() => {
    void loadCurrentSession();
  }, []);

  useEffect(() => {
    if (resetLinkCooldownSeconds <= 0) return;

    const timer = window.setTimeout(() => {
      setResetLinkCooldownSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resetLinkCooldownSeconds]);

  async function saveProfile() {
    if (!profile) return;
    const saved = await updateUserProfile(user.id, profile);
    setProfile(saved);
    toast.success("Perfil salvo com sucesso.");
  }

  async function handleAvatarFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !profile) return;

    setIsUploadingAvatar(true);
    try {
      const saved = await uploadUserAvatar(user.id, file, profile.avatar_path);
      setProfile({
        ...saved,
        full_name: saved.full_name || profile.full_name,
        company_name: saved.company_name || profile.company_name,
        role: saved.role || profile.role,
      });
      toast.success("Foto de perfil atualizada com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar sua foto. Tente novamente.");
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleRemoveAvatar() {
    if (!profile?.avatar_url) return;

    setIsRemovingAvatar(true);
    try {
      const saved = await removeUserAvatar(user.id, profile.avatar_path);
      setProfile({
        ...saved,
        full_name: saved.full_name || profile.full_name,
        company_name: saved.company_name || profile.company_name,
        role: saved.role || profile.role,
      });
      toast.success("Foto removida com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível remover sua foto. Tente novamente.");
    } finally {
      setIsRemovingAvatar(false);
    }
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
    if (passwordUpdateLockRef.current) return;

    const validationError = validatePassword(password, passwordConfirmation);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    passwordUpdateLockRef.current = true;
    setIsUpdatingPassword(true);
    try {
      await updateUserPassword(password, passwordConfirmation);
      setPassword("");
      setPasswordConfirmation("");
      toast.success("Senha alterada com sucesso.");
      await loadCurrentSession();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível alterar a senha. Tente novamente.");
    } finally {
      passwordUpdateLockRef.current = false;
      setIsUpdatingPassword(false);
    }
  }

  async function handleSendPasswordResetEmail() {
    if (resetLinkLockRef.current || resetLinkCooldownSeconds > 0) return;

    if (!currentUser.email) {
      toast.error("Nao foi possivel identificar o e-mail da sua conta.");
      return;
    }

    if (!captchaToken) {
      toast.error(CAPTCHA_ERROR_MESSAGE);
      return;
    }

    resetLinkLockRef.current = true;
    setIsSendingResetLink(true);
    try {
      await sendPasswordResetEmail(currentUser.email, captchaToken);
      toast.success("Enviamos um link de redefinição para o seu e-mail.");
      setResetLinkCooldownSeconds(RESET_LINK_COOLDOWN_SECONDS);
      captchaRef.current?.reset();
    } catch (error) {
      captchaRef.current?.reset();
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar o link de redefinição. Tente novamente.");
    } finally {
      resetLinkLockRef.current = false;
      setIsSendingResetLink(false);
    }
  }

  async function loadCurrentSession() {
    setIsRefreshingSession(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        if (import.meta.env.DEV) console.error("Session refresh failed", sessionError);
        toast.error("Nao foi possivel atualizar a sessao.");
        return;
      }

      setCurrentSession(sessionData.session);
      if (sessionData.session?.user) setCurrentUser(sessionData.session.user);
    } finally {
      setIsRefreshingSession(false);
    }
  }

  async function handleSignOut(scope: "local" | "global" = "local") {
    setIsSigningOut(true);
    const { error } = await supabase.auth.signOut({ scope });
    setIsSigningOut(false);

    if (error) {
      if (import.meta.env.DEV) console.error("Sign out failed", error);
      toast.error("Nao foi possivel sair da conta. Tente novamente.");
      return;
    }

    navigate("/entrar", { replace: true });
  }

  async function handleSupportSubmit() {
    if (supportLockRef.current) return;
    supportLockRef.current = true;
    setIsSendingSupport(true);
    try {
      await createSupportRequest(user.id, support);
      setSupport({ subject: "", message: "", type: "duvida" });
      toast.success("Sua solicitacao foi enviada com sucesso.");
    } finally {
      supportLockRef.current = false;
      setIsSendingSupport(false);
    }
  }

  async function reloadPrivacyRequests() {
    const nextRequests = await getPrivacyRequests(user.id);
    setPrivacyRequests(nextRequests);
    return nextRequests;
  }

  async function handleExport(format: ExportFormat) {
    setExportingFormat(format);
    try {
      const data = await getExportData(currentUser);
      if (format === "xlsx") exportAsExcel(data);
      if (format === "pdf") exportAsPdf(data);
      if (format === "json") exportAsJson(data);
      await createPrivacyRequest(user.id, "export", "completed", format);
      await reloadPrivacyRequests();
      const messages: Record<ExportFormat, string> = {
        xlsx: "Arquivo Excel exportado com sucesso.",
        pdf: "Relatório PDF exportado com sucesso.",
        json: "JSON técnico exportado com sucesso.",
      };
      toast.success(messages[format]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar a exportação. Tente novamente.");
    } finally {
      setExportingFormat(null);
    }
  }

  async function handleDeleteAccount() {
    if (deleteAccountLockRef.current || deleteConfirmation !== "EXCLUIR") return;

    deleteAccountLockRef.current = true;
    setIsRequestingDeletion(true);
    try {
      await deleteOwnAccount();
      await supabase.auth.signOut({ scope: "local" });
      setDeleteDialogOpen(false);
      setDeleteConfirmation("");
      navigate("/", { replace: true });
      toast.success("Sua conta foi excluída com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir sua conta. Tente novamente.");
    } finally {
      deleteAccountLockRef.current = false;
      setIsRequestingDeletion(false);
    }
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
                <Avatar className="h-20 w-20 border border-border">
                  <AvatarImage className="object-cover" src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback>{initials(profile?.full_name || user.email || "U")}</AvatarFallback>
                </Avatar>
                <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
                  <input
                    ref={avatarInputRef}
                    className="hidden"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => void handleAvatarFileChange(event)}
                  />
                  <Button variant="outline" disabled={!profile || isUploadingAvatar || isRemovingAvatar} onClick={() => avatarInputRef.current?.click()}>
                    {isUploadingAvatar ? "Enviando..." : "Alterar foto"}
                  </Button>
                  {profile?.avatar_url ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="border-destructive/35 text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={isUploadingAvatar || isRemovingAvatar}>
                          {isRemovingAvatar ? "Removendo..." : "Remover foto"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover foto de perfil?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Sua foto atual sera removida e o avatar voltara a mostrar suas iniciais.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void handleRemoveAvatar()}>
                            Remover foto
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : null}
                  <p className="text-xs text-muted-foreground sm:basis-full">JPG, PNG ou WEBP com ate 5 MB.</p>
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
                <PasswordField
                  label="Nova senha"
                  value={password}
                  placeholder="Nova senha"
                  visible={showPassword}
                  onToggleVisible={() => setShowPassword((current) => !current)}
                  onChange={setPassword}
                />
                <PasswordField
                  label="Confirmar nova senha"
                  value={passwordConfirmation}
                  placeholder="Confirmar nova senha"
                  visible={showPasswordConfirmation}
                  onToggleVisible={() => setShowPasswordConfirmation((current) => !current)}
                  onChange={setPasswordConfirmation}
                />
                <p className="text-sm text-muted-foreground">A senha deve ter no minimo 8 caracteres, incluindo letras e numeros.</p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    className="bg-primary hover:bg-primary/90 sm:w-fit"
                    disabled={!password || !passwordConfirmation || isUpdatingPassword}
                    onClick={() => void handlePasswordUpdate()}
                  >
                    {isUpdatingPassword ? "Alterando..." : "Alterar senha"}
                  </Button>
                </div>
                <TurnstileCaptcha
                  ref={captchaRef}
                  onTokenChange={setCaptchaToken}
                  onError={(message) => toast.error(message)}
                />
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    variant="outline"
                    className="sm:w-fit"
                    disabled={isSendingResetLink || resetLinkCooldownSeconds > 0 || !captchaToken}
                    onClick={() => void handleSendPasswordResetEmail()}
                  >
                    {isSendingResetLink
                      ? "Enviando..."
                      : resetLinkCooldownSeconds > 0
                        ? `Enviar novamente em ${resetLinkCooldownSeconds}s`
                        : "Enviar link de redefinicao"}
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                <SessionCard
                  user={currentUser}
                  session={currentSession}
                  isRefreshing={isRefreshingSession}
                  isSigningOut={isSigningOut}
                  onRefresh={() => void loadCurrentSession()}
                  onSignOut={() => void handleSignOut("local")}
                  onSignOutEverywhere={() => void handleSignOut("global")}
                />
                <TwoFactorCard />
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

        <TabsContent value="privacidade">
          <SettingsCard title="Privacidade e dados" description="Gerencie seus dados e preferencias de privacidade.">
            <div className="space-y-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border bg-card p-4 text-card-foreground">
                  <p className="font-semibold">Exportar meus dados</p>
                  <p className="mt-2 text-sm text-muted-foreground">Baixe uma copia dos dados vinculados a sua conta no formato desejado.</p>
                  <p className="mt-2 text-xs text-muted-foreground">Excel e recomendado para conferencia completa dos dados. PDF e ideal para leitura. JSON e indicado para uso tecnico e portabilidade.</p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Button className="w-full sm:w-fit" disabled={Boolean(exportingFormat)} onClick={() => void handleExport("xlsx")}>
                      {exportingFormat === "xlsx" ? "Gerando Excel..." : "Exportar em Excel"}
                    </Button>
                    <Button variant="outline" className="w-full sm:w-fit" disabled={Boolean(exportingFormat)} onClick={() => void handleExport("pdf")}>
                      {exportingFormat === "pdf" ? "Gerando PDF..." : "Exportar em PDF"}
                    </Button>
                    <Button variant="outline" className="w-full sm:w-fit" disabled={Boolean(exportingFormat)} onClick={() => void handleExport("json")}>
                      {exportingFormat === "json" ? "Gerando JSON..." : "Exportar JSON tecnico"}
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] p-4">
                  <p className="font-semibold text-[var(--danger-color)]">Zona de risco</p>
                  <p className="mt-2 text-sm text-muted-foreground">A exclusão da conta removerá seu acesso aos produtos, dados cadastrados e histórico da plataforma.</p>
                  <Button className="mt-4 w-full sm:w-fit" variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                    Excluir minha conta
                  </Button>
                </div>
              </div>

              <Button asChild variant="outline" className="w-full sm:w-fit"><Link to="/politica-de-privacidade">Ver politica de privacidade</Link></Button>

              <div className="rounded-lg border bg-card p-4 text-card-foreground">
                <p className="font-semibold">Historico de solicitacoes</p>
                {privacyRequests.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">Nenhuma solicitacao registrada.</p>
                ) : (
                  <div className="mt-4 grid gap-2">
                    <div className="hidden grid-cols-5 gap-3 border-b pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
                      <span>Tipo</span>
                      <span>Formato</span>
                      <span>Status</span>
                      <span>Solicitado em</span>
                      <span>Processado em</span>
                    </div>
                    {privacyRequests.map((request) => (
                      <div key={request.id} className="grid gap-2 rounded-lg border bg-background/60 p-3 text-sm sm:grid-cols-5 sm:border-0 sm:bg-transparent sm:p-0">
                        <span><span className="text-muted-foreground sm:hidden">Tipo: </span>{privacyRequestTypeLabel(request.request_type)}</span>
                        <span><span className="text-muted-foreground sm:hidden">Formato: </span>{exportFormatLabel(request.export_format)}</span>
                        <span><Badge variant="outline">{privacyRequestStatusLabel(request.status)}</Badge></span>
                        <span className="text-muted-foreground">{formatDateTime(request.requested_at)}</span>
                        <span className="text-muted-foreground">{formatDateTime(request.processed_at) || "-"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                <Button disabled={isSendingSupport} onClick={() => void handleSupportSubmit().catch((error) => toast.error(error.message))}>
                  {isSendingSupport ? "Enviando..." : "Enviar solicitacao"}
                </Button>
              </div>
            </div>
          </SettingsCard>
        </TabsContent>
      </Tabs>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(nextOpen) => {
          if (isRequestingDeletion) return;
          setDeleteDialogOpen(nextOpen);
          if (!nextOpen) setDeleteConfirmation("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir conta</DialogTitle>
            <DialogDescription>
              Esta ação removerá seu acesso à plataforma e excluirá os dados vinculados à sua conta. Essa ação não poderá ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] p-3 text-sm font-medium text-[var(--danger-color)]">
              Essa ação não poderá ser desfeita.
            </p>
            <Label>Digite EXCLUIR para confirmar.<Input className="mt-2" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} disabled={isRequestingDeletion} /></Label>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={isRequestingDeletion} onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" disabled={deleteConfirmation !== "EXCLUIR" || isRequestingDeletion} onClick={() => void handleDeleteAccount()}>
              {isRequestingDeletion ? "Excluindo conta..." : "Excluir definitivamente"}
            </Button>
          </DialogFooter>
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

function PasswordField({
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

function SessionCard({
  user,
  session,
  isRefreshing,
  isSigningOut,
  onRefresh,
  onSignOut,
  onSignOutEverywhere,
}: {
  user: User;
  session: Session | null;
  isRefreshing: boolean;
  isSigningOut: boolean;
  onRefresh: () => void;
  onSignOut: () => void;
  onSignOutEverywhere: () => void;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">Sessoes conectadas</p>
          <p className="mt-1 text-sm text-muted-foreground">Informacoes basicas da sua sessao atual.</p>
        </div>
        <Badge className="bg-emerald-600">Ativa</Badge>
      </div>

      <div className="mt-4 grid gap-2 rounded-lg bg-muted/60 p-3 text-sm">
        <p className="font-medium">Sessao atual</p>
        <InfoLine label="Email" value={user.email ?? "Nao informado"} />
        <InfoLine label="Status" value={session ? "Ativa" : "Nao encontrada"} />
        <InfoLine label="Ultimo acesso" value={formatDateTime(user.last_sign_in_at)} />
        <InfoLine label="Conta criada em" value={formatDateTime(user.created_at)} />
        <InfoLine label="ID do usuario" value={maskUserId(user.id)} />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button variant="outline" disabled={isRefreshing} onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" />
          {isRefreshing ? "Atualizando..." : "Atualizar sessao"}
        </Button>
        <Button variant="outline" disabled={isSigningOut} onClick={onSignOut}>
          <LogOut className="h-4 w-4" />
          {isSigningOut ? "Saindo..." : "Sair desta conta"}
        </Button>
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="mt-3 w-full border-destructive/35 text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={isSigningOut}>
            Sair de todos os dispositivos
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar sessoes conectadas?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja encerrar todas as sessoes conectadas? Voce precisara entrar novamente neste dispositivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={onSignOutEverywhere}>
              Encerrar sessoes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TwoFactorCard() {
  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">Autenticacao em dois fatores</p>
          <p className="mt-1 text-sm text-muted-foreground">Adicione uma camada extra de protecao a sua conta.</p>
        </div>
        <Badge variant="secondary">Desativada</Badge>
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
        <ShieldCheck className="h-5 w-5 text-primary" />
        A autenticacao em dois fatores sera disponibilizada em breve.
      </div>
      <Button className="mt-4 w-full" variant="outline" disabled>Configurar 2FA</Button>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-all font-medium">{value}</span>
    </div>
  );
}

function Toggle({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return <label className="flex items-center justify-between gap-4 rounded-lg border bg-white p-4 text-sm"><span>{label}</span><Switch checked={checked} disabled={disabled} onCheckedChange={onChange} /></label>;
}

function Placeholder({ title, text, action }: { title: string; text: string; action?: string }) {
  return <div className="rounded-lg border bg-muted/40 p-4"><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-muted-foreground">{text}</p>{action ? <Button className="mt-3" variant="outline" disabled>{action}</Button> : null}</div>;
}

function initials(value: string) {
  return value.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

function formatDateTime(value?: string | null) {
  if (!value) return "Nao disponivel";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function maskUserId(value: string) {
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function privacyRequestTypeLabel(value: string) {
  const labels: Record<string, string> = {
    export: "Exportacao",
    account_deletion: "Exclusao da conta",
  };

  return labels[value] ?? value;
}

function privacyRequestStatusLabel(value: string) {
  const labels: Record<string, string> = {
    pending: "Pendente",
    processing: "Em processamento",
    completed: "Concluida",
    rejected: "Rejeitada",
    canceled: "Cancelada",
  };

  return labels[value] ?? value;
}
