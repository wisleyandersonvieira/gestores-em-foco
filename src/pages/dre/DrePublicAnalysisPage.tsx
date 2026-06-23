import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { AlertTriangle, Clock, ShieldOff, XCircle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { ComparisonTable, DreAnalysisSummaryCards } from "@/components/dre/DreAnalysisDisplay";
import { buildSelectableDreAnalysisPeriods, buildDreAnalysisFromModel, type DreAnalysisResult } from "@/lib/dre-analysis";
import { fetchPublicAnalysis, type PublicAnalysisData, type PublicAnalysisError } from "@/lib/dre-share-service";
import { formatCompetence } from "@/lib/dre-calculations";

type PageState =
  | { status: "loading" }
  | { status: "valid"; data: PublicAnalysisData; result: DreAnalysisResult }
  | { status: "expired" }
  | { status: "revoked" }
  | { status: "invalid" }
  | { status: "error" };

export default function DrePublicAnalysisPage() {
  const { token } = useParams<{ token: string }>();
  const [pageState, setPageState] = useState<PageState>({ status: "loading" });

  useEffect(() => {
    if (!token) {
      setPageState({ status: "invalid" });
      return;
    }

    void (async () => {
      const response = await fetchPublicAnalysis(token);

      if ("error" in response) {
        const errorMap: Record<PublicAnalysisError, PageState> = {
          expired: { status: "expired" },
          revoked: { status: "revoked" },
          not_found: { status: "invalid" },
          invalid_token: { status: "invalid" },
          error: { status: "error" },
        };
        setPageState(errorMap[response.error] ?? { status: "error" });
        return;
      }

      const { data } = response;
      const { link, model, entries } = data;

      // Reconstruct the same periods that were selected when the link was created
      const competences = entries.map((e) => e.competence);
      const allPeriods = buildSelectableDreAnalysisPeriods(link.analysis_type, link.selected_years, competences);
      const selectedPeriods = allPeriods.filter((period) => link.selected_period_ids.includes(period.id));

      if (selectedPeriods.length === 0) {
        setPageState({ status: "error" });
        return;
      }

      const result = buildDreAnalysisFromModel({ model, periods: selectedPeriods, entries });
      setPageState({ status: "valid", data, result });
    })();
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Minimal header — no navigation */}
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-xs font-bold text-primary-foreground">G</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-primary">Gestor de DRE</p>
            <p className="text-xs text-muted-foreground">Link compartilhado</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {pageState.status === "loading" && <LoadingState />}
        {pageState.status === "expired" && <ExpiredState />}
        {pageState.status === "revoked" && <RevokedState />}
        {pageState.status === "invalid" && <InvalidState />}
        {pageState.status === "error" && <ErrorState />}
        {pageState.status === "valid" && (
          <ValidAnalysis data={pageState.data} result={pageState.result} />
        )}
      </main>

      {/* Minimal footer */}
      <footer className="mt-16 border-t bg-white py-6">
        <p className="text-center text-xs text-muted-foreground">
          Análise gerada pelo Gestor de DRE · Acesso via link compartilhado · Somente leitura
        </p>
      </footer>
    </div>
  );
}

function ValidAnalysis({ data, result }: { data: PublicAnalysisData; result: DreAnalysisResult }) {
  const { link } = data;

  const analysisTypeLabel = useMemo(() => {
    if (link.analysis_type === "monthly") return "Mensal";
    if (link.analysis_type === "quarterly") return "Trimestral";
    return "Semestral";
  }, [link.analysis_type]);

  const periodLabels = useMemo(
    () =>
      result.periods.map((p) => p.label).join(", "),
    [result.periods],
  );

  const expiresLabel = useMemo(
    () => new Date(link.expires_at).toLocaleDateString("pt-BR"),
    [link.expires_at],
  );

  return (
    <div className="space-y-6">
      {/* Analysis header */}
      <div>
        <h1 className="font-display text-3xl font-semibold text-primary">Análise de DRE</h1>
        {link.description && (
          <p className="mt-1 text-base text-muted-foreground">{link.description}</p>
        )}
      </div>

      {/* Read-only filter info */}
      <Card className="border-primary/10 bg-white/90">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem label="Tipo de análise" value={analysisTypeLabel} />
          <InfoItem label="Anos" value={link.selected_years.join(", ")} />
          <InfoItem
            label="Períodos"
            value={periodLabels || link.selected_period_ids.length + " período(s)"}
          />
          <InfoItem label="Válido até" value={expiresLabel} />
        </CardContent>
      </Card>

      {/* Missing months warning */}
      {result.periods.some((period) => period.missingMonths.length > 0) && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="grid gap-2 p-4 text-sm text-amber-900">
            {result.periods
              .filter((period) => period.missingMonths.length > 0)
              .map((period) => (
                <p key={period.id}>
                  Atenção: {period.label} não possui DRE cadastrado para{" "}
                  {period.missingMonths.map(formatCompetence).join(", ")}.
                </p>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      <DreAnalysisSummaryCards result={result} />

      {/* Comparison table */}
      <ComparisonTable
        result={result}
        showVariation={link.show_variation}
        showVerticalAnalysis={link.show_vertical_analysis}
      />
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-lg font-medium">Carregando análise…</p>
      <p className="mt-1 text-sm text-muted-foreground">Aguarde enquanto os dados são carregados.</p>
    </div>
  );
}

function ExpiredState() {
  return (
    <StatusPage
      icon={<Clock className="h-12 w-12 text-amber-400" />}
      title="Link expirado"
      description="Este link de compartilhamento não está mais disponível. Solicite um novo link ao responsável."
    />
  );
}

function RevokedState() {
  return (
    <StatusPage
      icon={<ShieldOff className="h-12 w-12 text-red-400" />}
      title="Link indisponível"
      description="Este link foi revogado ou não está mais disponível."
    />
  );
}

function InvalidState() {
  return (
    <StatusPage
      icon={<XCircle className="h-12 w-12 text-slate-400" />}
      title="Link inválido ou expirado"
      description="Não foi possível encontrar a análise solicitada. Verifique o link ou solicite um novo ao responsável."
    />
  );
}

function ErrorState() {
  return (
    <StatusPage
      icon={<AlertTriangle className="h-12 w-12 text-orange-400" />}
      title="Não foi possível carregar esta análise"
      description="Tente novamente ou solicite um novo link ao responsável."
    />
  );
}

function StatusPage({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-6">{icon}</div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 max-w-md text-muted-foreground">{description}</p>
    </div>
  );
}
