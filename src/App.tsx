import { Navigate, Routes, Route } from "react-router-dom";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import AccountPage from "@/pages/AccountPage";
import AvailableProductsPage from "@/pages/AvailableProductsPage";
import DashboardPage from "@/pages/DashboardPage";
import DiagnosticsWorkspacePage from "@/pages/DiagnosticsWorkspacePage";
import MyProductsPage from "@/pages/MyProductsPage";
import ProfilePage from "@/pages/ProfilePage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import SettingsPage from "@/pages/SettingsPage";
import AdminPage from "@/pages/AdminPage";
import CheckoutCanceledPage from "@/pages/CheckoutCanceledPage";
import CheckoutSuccessPage from "@/pages/CheckoutSuccessPage";
import DiagnosticPage from "@/pages/DiagnosticPage";
import DiagnosticReportPage from "@/pages/DiagnosticReportPage";
import CoursesPage from "@/pages/courses/CoursesPage";
import CourseDetailPage from "@/pages/courses/CourseDetailPage";
import CoursePlayerPage from "@/pages/courses/CoursePlayerPage";
import PublicCoursesPage from "@/pages/courses/PublicCoursesPage";
import DreAccountPage from "@/pages/dre/DreAccountPage";
import DreAnalysisPage from "@/pages/dre/DreAnalysisPage";
import DreCategoriesPage from "@/pages/dre/DreCategoriesPage";
import DreDashboardPage from "@/pages/dre/DreDashboardPage";
import DreEntriesPage from "@/pages/dre/DreEntriesPage";
import DreEntryFormPage from "@/pages/dre/DreEntryFormPage";
import DreEntryViewPage from "@/pages/dre/DreEntryViewPage";
import DreModelsPage from "@/pages/dre/DreModelsPage";
import NotFound from "@/pages/NotFound";
import PlaceholderLegalPage from "@/pages/PlaceholderLegalPage";
import SolucoesPage from "@/pages/SolucoesPage";
import CommunityPage from "@/pages/CommunityPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/entrar" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<SignupPage />} />
      <Route path="/esqueci-minha-senha" element={<ForgotPasswordPage />} />
      <Route path="/forgot-password" element={<Navigate to="/esqueci-minha-senha" replace />} />
      <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
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
  );
}
