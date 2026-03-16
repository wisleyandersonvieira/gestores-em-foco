import { Routes, Route } from "react-router-dom";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import AccountPage from "@/pages/AccountPage";
import AdminPage from "@/pages/AdminPage";
import DiagnosticPage from "@/pages/DiagnosticPage";
import DiagnosticReportPage from "@/pages/DiagnosticReportPage";
import NotFound from "@/pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/entrar" element={<LoginPage />} />
      <Route path="/cadastro" element={<SignupPage />} />
      <Route path="/minha-conta" element={<AccountPage />} />
      <Route path="/minha-conta/diagnostico/:sessionId/resultado" element={<DiagnosticReportPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/diagnostico/:token" element={<DiagnosticPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
