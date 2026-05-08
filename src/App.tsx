import { Routes, Route } from "react-router-dom";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import AccountPage from "@/pages/AccountPage";
import DashboardPage from "@/pages/DashboardPage";
import DiagnosticsWorkspacePage from "@/pages/DiagnosticsWorkspacePage";
import MyProductsPage from "@/pages/MyProductsPage";
import ProfilePage from "@/pages/ProfilePage";
import SettingsPage from "@/pages/SettingsPage";
import AdminPage from "@/pages/AdminPage";
import DiagnosticPage from "@/pages/DiagnosticPage";
import DiagnosticReportPage from "@/pages/DiagnosticReportPage";
import DreAccountPage from "@/pages/dre/DreAccountPage";
import DreCategoriesPage from "@/pages/dre/DreCategoriesPage";
import DreDashboardPage from "@/pages/dre/DreDashboardPage";
import DreEntriesPage from "@/pages/dre/DreEntriesPage";
import DreEntryFormPage from "@/pages/dre/DreEntryFormPage";
import DreEntryViewPage from "@/pages/dre/DreEntryViewPage";
import DreModelsPage from "@/pages/dre/DreModelsPage";
import NotFound from "@/pages/NotFound";
import PlaceholderLegalPage from "@/pages/PlaceholderLegalPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/entrar" element={<LoginPage />} />
      <Route path="/cadastro" element={<SignupPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/meus-produtos" element={<MyProductsPage />} />
      <Route path="/diagnosticos" element={<DiagnosticsWorkspacePage />} />
      <Route path="/dre-facil" element={<DreDashboardPage />} />
      <Route path="/dre-facil/cadastrar" element={<DreEntryFormPage />} />
      <Route path="/dre-facil/dres" element={<DreEntriesPage />} />
      <Route path="/dre-facil/dres/:entryId" element={<DreEntryViewPage />} />
      <Route path="/dre-facil/dres/:entryId/editar" element={<DreEntryFormPage />} />
      <Route path="/dre-facil/modelos" element={<DreModelsPage />} />
      <Route path="/dre-facil/categorias" element={<DreCategoriesPage />} />
      <Route path="/dre-facil/minha-conta" element={<DreAccountPage />} />
      <Route path="/meu-perfil" element={<ProfilePage />} />
      <Route path="/configuracoes" element={<SettingsPage />} />
      <Route path="/minha-conta" element={<AccountPage />} />
      <Route path="/minha-conta/diagnostico/:sessionId/resultado" element={<DiagnosticReportPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/diagnostico/:token" element={<DiagnosticPage />} />
      <Route path="/termos-de-uso" element={<PlaceholderLegalPage title="Termos de Uso" />} />
      <Route path="/politica-de-privacidade" element={<PlaceholderLegalPage title="Politica de Privacidade" />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
