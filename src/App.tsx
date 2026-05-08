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
