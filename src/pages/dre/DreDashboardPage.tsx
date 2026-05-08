import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { DreLayout } from "@/components/dre/dre-layout";
import { CompetenceMultiFilter, IndicatorCard, formatCurrency } from "@/components/dre/dre-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { currentCompetence, formatCompetence, formatPercentage, variationPercentage } from "@/lib/dre-calculations";
import { getDreEntry, listDreEntries } from "@/lib/dre-service";
import type { DreEntryWithItems, DreEntryWithModel } from "@/types/dre";

export default function DreDashboardPage() {
  return <DreLayout>{(user) => <DreDashboardContent userId={user.id} />}</DreLayout>;
}

function DreDashboardContent({ userId }: { userId: string }) {
  const [selectedCompetences, setSelectedCompetences] = useState([currentCompetence()]);
  const [entries, setEntries] = useState<DreEntryWithModel[]>([]);
  const [entriesWithItems, setEntriesWithItems] = useState<DreEntryWithItems[]>([]);

  useEffect(() => {
    void listDreEntries(userId)
      .then(setEntries)
      .catch((error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel carregar dashboard."));
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
    const totalCredit = selectedEntries.reduce((sum, entry) => sum + entry.total_credit, 0);
    const totalDebit = selectedEntries.reduce((sum, entry) => sum + entry.total_debit, 0);
    const result = totalCredit - totalDebit;
    const margin = totalCredit > 0 ? (result / totalCredit) * 100 : 0;
    return { totalCredit, totalDebit, result, margin };
  }, [selectedEntries]);

  const chartData = useMemo(() => {
    return selectedCompetences.map((competence) => {
      const monthEntries = entries.filter((entry) => entry.competence === competence && entry.status === "finalized");
      const credit = monthEntries.reduce((sum, entry) => sum + entry.total_credit, 0);
      const debit = monthEntries.reduce((sum, entry) => sum + entry.total_debit, 0);
      return { competence: formatCompetence(competence), credit, debit, result: credit - debit };
    });
  }, [entries, selectedCompetences]);

  const categoryImpact = useMemo(() => {
    const impact = new Map<string, number>();
    entriesWithItems.forEach((entry) => {
      entry.items
        .filter((item) => item.line_type === "subcategory" && item.category_type_snapshot === "debit")
        .forEach((item) => {
          impact.set(item.category_name_snapshot, (impact.get(item.category_name_snapshot) ?? 0) + Number(item.value || 0));
        });
    });
    return Array.from(impact.entries())
      .map(([category, value]) => ({ category, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [entriesWithItems]);

  const analysis = useMemo(() => {
    const ordered = [...selectedCompetences].sort();
    const first = ordered[0];
    const last = ordered[ordered.length - 1] ?? first;
    const values = new Map<string, { first: number; last: number }>();

    entriesWithItems.forEach((entry) => {
      if (entry.competence !== first && entry.competence !== last) return;
      entry.items.filter((item) => item.line_type === "subcategory").forEach((item) => {
        const current = values.get(item.category_name_snapshot) ?? { first: 0, last: 0 };
        const key = entry.competence === first ? "first" : "last";
        current[key] += Number(item.value || 0);
        values.set(item.category_name_snapshot, current);
      });
    });

    return Array.from(values.entries()).map(([category, value]) => {
      const difference = value.last - value.first;
      return {
        category,
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
      <div>
        <h1 className="font-display text-3xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Indicadores e comparativos dos DREs finalizados nas competencias selecionadas.</p>
      </div>

      <Card className="border-primary/10 bg-white/90">
        <CardContent className="grid gap-2 p-5 sm:max-w-sm">
          <CompetenceMultiFilter selected={selectedCompetences} onChange={(items) => setSelectedCompetences(items.length ? items : [currentCompetence()])} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <IndicatorCard title="Faturamento Total" value={formatCurrency(totals.totalCredit)} />
        <IndicatorCard title="Despesas Totais" value={formatCurrency(totals.totalDebit)} />
        <IndicatorCard title="Lucro / Resultado" value={formatCurrency(totals.result)} tone={totals.result >= 0 ? "positive" : "negative"} />
        <IndicatorCard title="Margem de Lucro" value={formatPercentage(totals.margin)} />
        <IndicatorCard title="Maior variacao positiva" value={biggestPositive ? formatCurrency(biggestPositive.difference) : formatCurrency(0)} description={biggestPositive?.category ?? "Sem variacao positiva"} tone="positive" />
        <IndicatorCard title="Maior variacao negativa" value={biggestNegative ? formatCurrency(biggestNegative.difference) : formatCurrency(0)} description={biggestNegative?.category ?? "Sem variacao negativa"} tone="negative" />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Evolucao de faturamento, despesas e lucro">
          <ChartContainer className="h-80" config={{ credit: { label: "Credito", color: "#16a34a" }, debit: { label: "Debito", color: "#dc2626" }, result: { label: "Lucro", color: "#2563eb" } }}>
            <LineChart data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="competence" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
              <Line type="monotone" dataKey="credit" stroke="var(--color-credit)" strokeWidth={2} />
              <Line type="monotone" dataKey="debit" stroke="var(--color-debit)" strokeWidth={2} />
              <Line type="monotone" dataKey="result" stroke="var(--color-result)" strokeWidth={2} />
            </LineChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard title="Comparativo credito, debito e lucro">
          <ChartContainer className="h-80" config={{ credit: { label: "Credito", color: "#16a34a" }, debit: { label: "Debito", color: "#dc2626" }, result: { label: "Lucro", color: "#2563eb" } }}>
            <BarChart data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="competence" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
              <Bar dataKey="credit" fill="var(--color-credit)" radius={6} />
              <Bar dataKey="debit" fill="var(--color-debit)" radius={6} />
              <Bar dataKey="result" fill="var(--color-result)" radius={6} />
            </BarChart>
          </ChartContainer>
        </ChartCard>
      </div>

      <ChartCard title="Top categorias de despesa com maior impacto">
        <ChartContainer className="h-80" config={{ value: { label: "Impacto", color: "#0f172a" } }}>
          <BarChart data={categoryImpact}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="category" tickLine={false} axisLine={false} />
            <YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
            <Bar dataKey="value" fill="var(--color-value)" radius={6} />
          </BarChart>
        </ChartContainer>
      </ChartCard>

      <Card className="border-primary/10 bg-white/90">
        <CardHeader><CardTitle>Analise do Periodo</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor inicial</TableHead>
                <TableHead className="text-right">Valor atual</TableHead>
                <TableHead className="text-right">Diferenca</TableHead>
                <TableHead className="text-right">Variacao</TableHead>
                <TableHead>Tipo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analysis.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-20 text-center text-muted-foreground">Sem dados finalizados para comparar.</TableCell></TableRow>
              ) : analysis.map((item) => (
                <TableRow key={item.category}>
                  <TableCell className="font-medium">{item.category}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.previous)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.current)}</TableCell>
                  <TableCell className={`text-right font-semibold ${item.type === "positive" ? "text-emerald-700" : "text-red-700"}`}>{formatCurrency(item.difference)}</TableCell>
                  <TableCell className="text-right">{formatPercentage(item.variation)}</TableCell>
                  <TableCell>{item.type === "positive" ? "Positiva" : "Negativa"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-primary/10 bg-white/90">
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
