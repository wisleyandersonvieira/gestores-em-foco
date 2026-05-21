import { lazy, Suspense } from "react";
import { Navigate, Routes, Route } from "react-router-dom";

const HomePage = lazy(() => import("@/pages/HomePage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const SignupPage = lazy(() => import("@/pages/SignupPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));
const AccountPage = lazy(() => import("@/pages/AccountPage"));
const AvailableProductsPage = lazy(() => import("@/pages/AvailableProductsPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const DiagnosticsWorkspacePage = lazy(() => import("@/pages/DiagnosticsWorkspacePage"));
const MyProductsPage = lazy(() => import("@/pages/MyProductsPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const CheckoutCanceledPage = lazy(() => import("@/pages/CheckoutCanceledPage"));
const CheckoutSuccessPage = lazy(() => import("@/pages/CheckoutSuccessPage"));
const DiagnosticPage = lazy(() => import("@/pages/DiagnosticPage"));
const DiagnosticReportPage = lazy(() => import("@/pages/DiagnosticReportPage"));
const CoursesPage = lazy(() => import("@/pages/courses/CoursesPage"));
const CourseDetailPage = lazy(() => import("@/pages/courses/CourseDetailPage"));
const CoursePlayerPage = lazy(() => import("@/pages/courses/CoursePlayerPage"));
const PublicCoursesPage = lazy(() => import("@/pages/courses/PublicCoursesPage"));
const DreAccountPage = lazy(() => import("@/pages/dre/DreAccountPage"));
const DreAnalysisPage = lazy(() => import("@/pages/dre/DreAnalysisPage"));
const DreCategoriesPage = lazy(() => import("@/pages/dre/DreCategoriesPage"));
const DreDashboardPage = lazy(() => import("@/pages/dre/DreDashboardPage"));
const DreEntriesPage = lazy(() => import("@/pages/dre/DreEntriesPage"));
const DreEntryFormPage = lazy(() => import("@/pages/dre/DreEntryFormPage"));
const DreEntryViewPage = lazy(() => import("@/pages/dre/DreEntryViewPage"));
const DreModelsPage = lazy(() => import("@/pages/dre/DreModelsPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const PlaceholderLegalPage = lazy(() => import("@/pages/PlaceholderLegalPage"));
const SolucoesPage = lazy(() => import("@/pages/SolucoesPage"));
const CommunityPage = lazy(() => import("@/pages/CommunityPage"));

function RouteFallback() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/entrar" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<SignupPage />} />
        <Route path="/esqueci-minha-senha" element={<ForgotPasswordPage />} />
        <Route path="/forgot-password" element={<Navigate to="/esqueci-minha-senha" replace />} />
        <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
        <Route path="/reset-password" element={<Navigate to="/redefinir-senha" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/meus-produtos" element={<MyProductsPage />} />
        <Route path="/produtos" element={<AvailableProductsPage />} />
        <Route path="/checkout/sucesso" element={<CheckoutSuccessPage />} />
        <Route path="/checkout/cancelado" element={<CheckoutCanceledPage />} />
        <Route path="/diagnosticos" element={<DiagnosticsWorkspacePage />} />
        <Route path="/solucoes" element={<SolucoesPage />} />
        <Route path="/cursos" element={<PublicCoursesPage />} />
        <Route path="/meus-cursos" element={<CoursesPage />} />
        <Route path="/cursos/:courseSlug" element={<CourseDetailPage />} />
        <Route path="/cursos/:courseSlug/aulas" element={<CoursePlayerPage />} />
        <Route path="/cursos/:courseSlug/aulas/:lessonId" element={<CoursePlayerPage />} />
        <Route path="/gestor-dre" element={<Navigate to="/dre-facil" replace />} />
        <Route path="/dre-facil" element={<DreDashboardPage />} />
        <Route path="/dre-facil/cadastrar" element={<DreEntryFormPage />} />
        <Route path="/dre-facil/dres" element={<DreEntriesPage />} />
        <Route path="/dre-facil/dres/:entryId" element={<DreEntryViewPage />} />
        <Route path="/dre-facil/dres/:entryId/editar" element={<DreEntryFormPage />} />
        <Route path="/dre-facil/analise" element={<DreAnalysisPage />} />
        <Route path="/dre-facil/modelos" element={<DreModelsPage />} />
        <Route path="/dre-facil/categorias" element={<DreCategoriesPage />} />
        <Route path="/dre-facil/minha-conta" element={<DreAccountPage />} />
        <Route path="/meu-perfil" element={<ProfilePage />} />
        <Route path="/configuracoes" element={<SettingsPage />} />
        <Route path="/comunidade" element={<CommunityPage />} />
        <Route path="/minha-conta" element={<AccountPage />} />
        <Route path="/minha-conta/diagnostico/:sessionId/resultado" element={<DiagnosticReportPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/produtos" element={<AdminPage />} />
        <Route path="/admin/produtos/diagnostico" element={<AdminPage />} />
        <Route path="/admin/produtos/dre" element={<AdminPage />} />
        <Route path="/admin/produtos/cursos" element={<AdminPage />} />
        <Route path="/admin/produtos/cursos/:courseId" element={<AdminPage />} />
        <Route path="/admin/usuarios" element={<AdminPage />} />
        <Route path="/admin/acessos" element={<AdminPage />} />
        <Route path="/admin/eventos" element={<AdminPage />} />
        <Route path="/admin/suporte" element={<AdminPage />} />
        <Route path="/admin/configuracoes" element={<AdminPage />} />
        <Route path="/diagnostico/:token" element={<DiagnosticPage />} />
        <Route path="/termos-de-uso" element={<PlaceholderLegalPage title="Termos de Uso" />} />
        <Route path="/politica-de-privacidade" element={<PlaceholderLegalPage title="Política de Privacidade" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
