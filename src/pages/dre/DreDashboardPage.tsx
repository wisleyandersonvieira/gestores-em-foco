import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, XAxis, YAxis } from "recharts";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

import { DreLayout } from "@/components/dre/dre-layout";
import { CompetenceMultiFilter, IndicatorCard, formatCurrency } from "@/components/dre/dre-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calculateRevenueFromEntryItems, currentCompetence, effectiveCategoryType, formatCompetence, formatPercentage, variationPercentage } from "@/lib/dre-calculations";
import { getDreEntry, listDreEntries } from "@/lib/dre-service";
import type { DreCategoryType, DreEntryWithItems, DreEntryWithModel } from "@/types/dre";

export default function DreDashboardPage() {
  return <DreLayout>{(user) => <DreDashboardContent userId={user.id} />}</DreLayout>;
}

function DreDashboardContent({ userId }: { userId: string }) {
  const [selectedCompetences, setSelectedCompetences] = useState([currentCompetence()]);
  const [entries, setEntries] = useState<DreEntryWithModel[]>([]);
  const [entriesWithItems, setEntriesWithItems] = useState<DreEntryWithItems[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);

  useEffect(() => {
    setIsLoadingEntries(true);
    void listDreEntries(userId)
      .then(setEntries)
      .catch((error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel carregar dashboard."))
      .finally(() => setIsLoadingEntries(false));
  }, [userId]);

  const selectedEntries = useMemo(
    () => entries.filter((entry) => selectedCompetences.includes(entry.competence) && entry.status === "finalized"),
    [entries, selectedCompetences],
  );

  useEffect(() => {
    async function loadItems() {
      const detailed = await Promise.all(selectedEntries.map((entry) => getDreEntry(userId, entry.id)));
      setEntriesWithItems(detailed);
    }

    void loadItems().catch(() => setEntriesWithItems([]));
  }, [selectedEntries, userId]);

  const totals = useMemo(() => {
    const revenue = entriesWithItems.reduce((sum, entry) => sum + calculateRevenueFromEntryItems(entry.items), 0);
    const totalDebit = entriesWithItems.reduce((sum, entry) => sum + entry.total_debit, 0);
    const result = entriesWithItems.reduce((sum, entry) => sum + entry.result, 0);
    const margin = revenue > 0 ? (result / revenue) * 100 : 0;
    return { revenue, totalDebit, result, margin };
  }, [entriesWithItems]);

  const chartData = useMemo(() => {
    return selectedCompetences.map((competence) => {
      const monthEntries = entriesWithItems.filter((entry) => entry.competence === competence && entry.status === "finalized");
      const revenue = monthEntries.reduce((sum, entry) => sum + calculateRevenueFromEntryItems(entry.items), 0);
      const debit = monthEntries.reduce((sum, entry) => sum + entry.total_debit, 0);
      const result = monthEntries.reduce((sum, entry) => sum + entry.result, 0);
      return { competence: formatCompetence(competence), revenue, debit, result };
    });
  }, [entriesWithItems, selectedCompetences]);

  const categoryImpact = useMemo(() => {
    const impact = new Map<string, number>();
    entriesWithItems.forEach((entry) => {
      entry.items
        .filter((item) => item.line_type === "subcategory" && effectiveCategoryType({ categoryType: item.category_type_snapshot, subcategoryIsReductive: item.subcategory_is_reductive ?? false }) === "debit")
        .forEach((item) => {
          impact.set(item.category_name_snapshot, (impact.get(item.category_name_snapshot) ?? 0) + Number(item.value || 0));
        });
    });
    const totalDebit = Array.from(impact.values()).reduce((sum, value) => sum + value, 0);
    return Array.from(impact.entries())
      .map(([category, value]) => ({ category, value, percentage: totalDebit > 0 ? (value / totalDebit) * 100 : 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [entriesWithItems]);

  const analysis = useMemo(() => {
    const ordered = [...selectedCompetences].sort();
    const first = ordered[0];
    const last = ordered[ordered.length - 1] ?? first;
    const values = new Map<string, { category: string; categoryType: DreCategoryType; first: number; last: number }>();

    entriesWithItems.forEach((entry) => {
      if (entry.competence !== first && entry.competence !== last) return;
      entry.items.filter((item) => item.line_type === "subcategory").forEach((item) => {
        const itemCategoryType = effectiveCategoryType({ categoryType: item.category_type_snapshot, subcategoryIsReductive: item.subcategory_is_reductive ?? false });
        const mapKey = `${itemCategoryType}:${item.category_name_snapshot}`;
        const current = values.get(mapKey) ?? {
          category: item.category_name_snapshot,
          categoryType: itemCategoryType,
          first: 0,
          last: 0,
        };
        const key = entry.competence === first ? "first" : "last";
        current[key] += Number(item.value || 0);
        values.set(mapKey, current);
      });
    });

    return Array.from(values.values()).map((value) => {
      const difference = value.last - value.first;
      return {
        category: value.category,
        categoryType: value.categoryType,
        previous: value.first,
        current: value.last,
        difference,
        variation: variationPercentage(value.first, value.last),
        type: difference >= 0 ? "positive" : "negative",
      };
    }).sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
  }, [entriesWithItems, selectedCompetences]);

  const biggestPositive = analysis.find((item) => item.difference > 0);
  const biggestNegative = analysis.find((item) => item.difference < 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Indicadores e comparativos dos DREs finalizados nas competencias selecionadas.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => exportDashboardPdf({
            selectedCompetences,
            totals,
            chartData,
            categoryImpact,
            analysis,
          })}
        >
          <Download className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      {!isLoadingEntries && entries.length === 0 ? (
        <Card className="border-primary/10 bg-white/90">
          <CardContent className="flex flex-col gap-5 p-6 sm:items-start">
            <div>
              <h2 className="font-display text-2xl font-semibold">Seu modelo de DRE já está pronto</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Criamos uma estrutura gerencial padrão para você começar. Agora basta lançar os valores da competência desejada.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/dre-facil/cadastrar">Lançar primeira DRE</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/dre-facil/modelos">Editar modelo</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/dre-facil/categorias">Ver categorias</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-primary/10 bg-white/90">
        <CardContent className="grid gap-2 p-5 sm:max-w-sm">
          <CompetenceMultiFilter selected={selectedCompetences} onChange={(items) => setSelectedCompetences(items.length ? items : [currentCompetence()])} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <IndicatorCard title="Faturamento Total" value={formatCurrency(totals.revenue)} />
        <IndicatorCard title="Despesas Totais" value={formatCurrency(totals.totalDebit)} />
        <IndicatorCard title="Lucro / Resultado" value={formatCurrency(totals.result)} tone={totals.result >= 0 ? "positive" : "negative"} />
        <IndicatorCard title="Margem de Lucro" value={formatPercentage(totals.margin)} />
        <IndicatorCard title="Maior variacao positiva" value={biggestPositive ? formatCurrency(biggestPositive.difference) : formatCurrency(0)} description={biggestPositive?.category ?? "Sem variacao positiva"} tone="positive" />
        <IndicatorCard title="Maior variacao negativa" value={biggestNegative ? formatCurrency(biggestNegative.difference) : formatCurrency(0)} description={biggestNegative?.category ?? "Sem variacao negativa"} tone="negative" />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Evolução de faturamento, despesas e lucro">
          <ChartContainer className="aspect-auto h-80 w-full" config={{ revenue: { label: "Faturamento", color: "#16a34a" }, debit: { label: "Débito", color: "#dc2626" }, result: { label: "Lucro Líquido", color: "#2563eb" } }}>
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="competence" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} width={48} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
              <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} />
              <Line type="monotone" dataKey="debit" stroke="var(--color-debit)" strokeWidth={2} />
              <Line type="monotone" dataKey="result" stroke="var(--color-result)" strokeWidth={2} />
            </LineChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard title="Comparativo crédito, débito e lucro">
          <ChartContainer className="aspect-auto h-80 w-full" config={{ revenue: { label: "Faturamento", color: "#16a34a" }, debit: { label: "Débito", color: "#dc2626" }, result: { label: "Lucro Líquido", color: "#2563eb" } }}>
            <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="competence" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} width={48} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={6} />
              <Bar dataKey="debit" fill="var(--color-debit)" radius={6} />
              <Bar dataKey="result" fill="var(--color-result)" radius={6} />
            </BarChart>
          </ChartContainer>
        </ChartCard>
      </div>

      <ChartCard title="Top categorias de despesa com maior impacto">
        <ChartContainer className="aspect-auto h-80 w-full" config={{ value: { label: "Impacto", color: "#0f172a" } }}>
          <BarChart data={categoryImpact} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="category" tickLine={false} axisLine={false} interval={0} height={50} tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} width={48} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
            <Bar dataKey="value" fill="var(--color-value)" radius={6}>
              <LabelList
                dataKey="percentage"
                position="top"
                formatter={(value: number) => formatPercentage(Number(value))}
                className="fill-foreground text-xs font-semibold"
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </ChartCard>

      <Card className="border-primary/10 bg-white/90">
        <CardHeader><CardTitle>Análise do Período</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor inicial</TableHead>
                <TableHead className="text-right">Valor atual</TableHead>
                <TableHead className="text-right">Diferença</TableHead>
                <TableHead className="text-right">Variação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analysis.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-20 text-center text-muted-foreground">Sem dados finalizados para comparar.</TableCell></TableRow>
              ) : analysis.map((item) => (
                <TableRow key={item.category}>
                  <TableCell className="font-medium">{item.category}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.previous)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.current)}</TableCell>
                  <TableCell className={`text-right font-semibold ${isGoodVariation(item.categoryType, item.difference) ? "text-emerald-700" : "text-red-700"}`}>{formatCurrency(item.difference)}</TableCell>
                  <TableCell className="text-right">{formatPercentage(item.variation)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function isGoodVariation(categoryType: DreCategoryType, difference: number) {
  if (difference === 0) return true;
  return categoryType === "credit" ? difference > 0 : difference < 0;
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-primary/10 bg-white/90">
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function exportDashboardPdf(params: {
  selectedCompetences: string[];
  totals: { revenue: number; totalDebit: number; result: number; margin: number };
  chartData: Array<{ competence: string; revenue: number; debit: number; result: number }>;
  categoryImpact: Array<{ category: string; value: number; percentage: number }>;
  analysis: Array<{
    category: string;
    categoryType: DreCategoryType;
    previous: number;
    current: number;
    difference: number;
    variation: number;
  }>;
}) {
  const reportWindow = window.open("", "_blank", "width=1100,height=800");

  if (!reportWindow) {
    toast.error("Nao foi possivel abrir a janela de exportacao. Verifique o bloqueador de pop-ups.");
    return;
  }

  const competenceLabel = params.selectedCompetences.map(formatCompetence).join(", ");
  const generatedAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date());

  reportWindow.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Dashboard DRE - ${escapeHtml(competenceLabel)}</title>
        <style>
          @page { size: A4; margin: 14mm; }
          * { box-sizing: border-box; }
          body { font-family: Inter, Arial, sans-serif; color: #172033; margin: 0; background: #f6f7f9; }
          .page { background: #fff; padding: 28px; min-height: 100vh; }
          .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 3px solid #0f2b46; padding-bottom: 18px; }
          .eyebrow { color: #b45309; font-size: 11px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; margin: 0 0 8px; }
          h1 { color: #0f2b46; font-size: 28px; margin: 0; }
          .meta { color: #64748b; font-size: 12px; line-height: 1.5; text-align: right; }
          .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 22px 0; }
          .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; background: #fbfdff; }
          .card span { color: #64748b; display: block; font-size: 11px; margin-bottom: 8px; }
          .card strong { color: #0f172a; font-size: 18px; }
          .positive { color: #047857 !important; }
          .negative { color: #b91c1c !important; }
          h2 { color: #0f2b46; font-size: 18px; margin: 24px 0 10px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #0f2b46; color: white; text-align: left; padding: 9px; }
          td { border-bottom: 1px solid #e2e8f0; padding: 9px; }
          .right { text-align: right; }
          .bar-row { display: grid; grid-template-columns: 180px 1fr 74px; align-items: center; gap: 10px; margin: 9px 0; font-size: 12px; }
          .bar-track { height: 16px; border-radius: 999px; background: #e2e8f0; overflow: hidden; }
          .bar-fill { height: 100%; border-radius: 999px; background: #0f2b46; }
          .footer { margin-top: 28px; color: #64748b; font-size: 11px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          @media print { body { background: #fff; } .page { padding: 0; } }
        </style>
      </head>
      <body>
        <main class="page">
          <section class="header">
            <div>
              <p class="eyebrow">Gestor de DRE</p>
              <h1>Dashboard Financeiro</h1>
            </div>
            <div class="meta">
              <strong>Competencias:</strong><br />
              ${escapeHtml(competenceLabel)}<br />
              Gerado em ${escapeHtml(generatedAt)}
            </div>
          </section>

          <section class="cards">
            ${reportCard("Faturamento Total", formatCurrency(params.totals.revenue))}
            ${reportCard("Despesas Totais", formatCurrency(params.totals.totalDebit))}
            ${reportCard("Resultado", formatCurrency(params.totals.result), params.totals.result >= 0 ? "positive" : "negative")}
            ${reportCard("Margem", formatPercentage(params.totals.margin))}
          </section>

          <h2>Evolucao por competencia</h2>
          <table>
            <thead><tr><th>Competencia</th><th class="right">Faturamento</th><th class="right">Debitos</th><th class="right">Lucro liquido</th></tr></thead>
            <tbody>
              ${params.chartData.map((item) => `
                <tr>
                  <td>${escapeHtml(item.competence)}</td>
                  <td class="right">${formatCurrency(item.revenue)}</td>
                  <td class="right">${formatCurrency(item.debit)}</td>
                  <td class="right ${item.result >= 0 ? "positive" : "negative"}">${formatCurrency(item.result)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <h2>Top categorias de despesas com maior impacto</h2>
          ${params.categoryImpact.length === 0 ? "<p>Sem despesas no periodo selecionado.</p>" : params.categoryImpact.map((item) => `
            <div class="bar-row">
              <strong>${escapeHtml(item.category)}</strong>
              <div class="bar-track"><div class="bar-fill" style="width: ${Math.max(item.percentage, 2).toFixed(2)}%"></div></div>
              <span class="right">${formatPercentage(item.percentage)}</span>
            </div>
          `).join("")}

          <h2>Analise do Periodo</h2>
          <table>
            <thead><tr><th>Categoria</th><th class="right">Valor inicial</th><th class="right">Valor atual</th><th class="right">Diferenca</th><th class="right">Variacao</th></tr></thead>
            <tbody>
              ${params.analysis.length === 0 ? `<tr><td colspan="5">Sem dados finalizados para comparar.</td></tr>` : params.analysis.map((item) => `
                <tr>
                  <td>${escapeHtml(item.category)}</td>
                  <td class="right">${formatCurrency(item.previous)}</td>
                  <td class="right">${formatCurrency(item.current)}</td>
                  <td class="right ${isGoodVariation(item.categoryType, item.difference) ? "positive" : "negative"}">${formatCurrency(item.difference)}</td>
                  <td class="right">${formatPercentage(item.variation)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div class="footer">Relatorio gerado automaticamente pelo Gestor de DRE. Valores conforme filtros aplicados no dashboard.</div>
        </main>
        <script>
          window.onload = () => {
            window.focus();
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  reportWindow.document.close();
}

function reportCard(label: string, value: string, tone = "") {
  return `<div class="card"><span>${escapeHtml(label)}</span><strong class="${tone}">${escapeHtml(value)}</strong></div>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
