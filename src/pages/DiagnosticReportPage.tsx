import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { User } from "@supabase/supabase-js";

import { DiagnosticReportView } from "@/components/report/diagnostic-report-view";
import { supabase } from "@/integrations/supabase/client";
import { getDiagnosticReport } from "@/lib/diagnostic-report";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DiagnosticReportPayload } from "@/types/diagnostic-report";

export default function DiagnosticReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [report, setReport] = useState<DiagnosticReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user && sessionId) {
        navigate(`/entrar?callbackUrl=/minha-conta/diagnostico/${sessionId}/resultado`);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user && sessionId) {
        navigate(`/entrar?callbackUrl=/minha-conta/diagnostico/${sessionId}/resultado`);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, sessionId]);

  useEffect(() => {
    async function loadReport() {
      if (!user || !sessionId) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextReport = await getDiagnosticReport(sessionId, user.id);
        setReport(nextReport);
      } catch (runtimeError) {
        setError(runtimeError instanceof Error ? runtimeError.message : "Nao foi possivel carregar este relatorio.");
      } finally {
        setLoading(false);
      }
    }

    void loadReport();
  }, [sessionId, user]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando relatorio...</div>;
  }

  if (error || !report) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
        <Card className="w-full bg-white/90">
          <CardHeader>
            <CardTitle className="font-display text-3xl">Relatorio indisponivel</CardTitle>
            <CardDescription>{error || "Nao foi possivel carregar este resultado."}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to="/minha-conta">Voltar para minha conta</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Resultado final</p>
          <h1 className="font-display mt-2 text-4xl font-semibold">{report.template.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {report.completedAt
              ? `Concluido em ${new Intl.DateTimeFormat("pt-BR").format(new Date(report.completedAt))}`
              : "Relatorio gerado a partir da sua ultima sessao"}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/minha-conta")}>
          Voltar para minha conta
        </Button>
      </div>

      <DiagnosticReportView report={report} />
    </main>
  );
}
