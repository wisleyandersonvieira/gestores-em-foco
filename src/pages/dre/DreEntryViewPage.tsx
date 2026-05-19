import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Edit2 } from "lucide-react";
import { toast } from "sonner";

import { DreLayout } from "@/components/dre/dre-layout";
import { formatCurrency } from "@/components/dre/dre-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { calculateCategoryTotal, calculateSumLineValue, formatCompetence, formatPercentage } from "@/lib/dre-calculations";
import { getDreEntry } from "@/lib/dre-service";
import type { DreDraftLine, DreEntryWithItems } from "@/types/dre";

export default function DreEntryViewPage() {
  return <DreLayout>{(user) => <DreEntryViewContent userId={user.id} />}</DreLayout>;
}

function DreEntryViewContent({ userId }: { userId: string }) {
  const { entryId } = useParams();
  const [entry, setEntry] = useState<DreEntryWithItems | null>(null);

  useEffect(() => {
    if (!entryId) return;
    void getDreEntry(userId, entryId)
      .then(setEntry)
      .catch((error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel carregar o DRE."));
  }, [entryId, userId]);

  const lines = useMemo<DreDraftLine[]>(() => {
    return (entry?.items ?? []).map((item) => ({
      categoryId: item.category_id,
      subcategoryId: item.subcategory_id,
      categoryName: item.category_name_snapshot,
      subcategoryName: item.subcategory_name_snapshot,
      categoryType: item.category_type_snapshot,
      categoryIsRevenue: item.category_is_revenue ?? false,
      isNetIncome: item.is_net_income ?? false,
      subcategoryIsReductive: item.subcategory_is_reductive ?? false,
      lineType: item.line_type,
      displayOrder: item.display_order,
      value: Number(item.value || 0),
    }));
  }, [entry]);

  if (!entry) {
    return <div className="text-sm text-muted-foreground">Carregando DRE...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Visualizacao do DRE</h1>
          <p className="mt-1 text-sm text-muted-foreground">{entry.model?.name ?? "Modelo"} · {formatCompetence(entry.competence)}</p>
        </div>
        <Button asChild><Link to={`/dre-facil/dres/${entry.id}/editar`}><Edit2 className="h-4 w-4" />Editar</Link></Button>
      </div>

      <Card className="border-primary/10 bg-white/95 shadow-sm">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="font-display text-2xl">{entry.model?.name ?? "DRE"}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Competencia {formatCompetence(entry.competence)}</p>
            </div>
            <Badge variant={entry.status === "finalized" ? "default" : "secondary"}>{entry.status === "finalized" ? "Finalizado" : "Rascunho"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableBody>
              {lines.map((line, index) => {
                const value = line.lineType === "category" ? calculateCategoryTotal(line.categoryId, lines) : line.lineType === "sum" ? calculateSumLineValue(index, lines) : line.value;
                return (
                  <TableRow key={`${line.lineType}-${line.categoryId}-${line.subcategoryId}-${index}`} className={line.lineType === "category" ? "bg-muted/70" : line.lineType === "sum" ? "bg-primary/5" : ""}>
                    <TableCell className={line.lineType === "category" ? "font-semibold uppercase" : line.lineType === "sum" ? "font-semibold text-primary" : "pl-10 text-sm"}>
                      {line.lineType === "category" || line.lineType === "sum" ? line.categoryName : line.subcategoryName}
                      {line.lineType === "sum" && line.isNetIncome ? <Badge className="ml-2" variant="secondary">LUCRO LÍQUIDO</Badge> : null}
                      {line.lineType === "subcategory" && line.subcategoryIsReductive ? <Badge className="ml-2" variant="secondary">REDUTORA</Badge> : null}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatCurrency(value)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Total de creditos" value={formatCurrency(entry.total_credit)} />
        <Metric label="Total de debitos" value={formatCurrency(entry.total_debit)} />
        <Metric label="Resultado final" value={formatCurrency(entry.result)} tone={entry.result >= 0 ? "positive" : "negative"} />
        <Metric label="Margem" value={formatPercentage(entry.margin_percentage)} />
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  return (
    <Card className="border-primary/10 bg-white/90">
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`mt-1 text-xl font-semibold ${tone === "positive" ? "text-emerald-700" : tone === "negative" ? "text-red-700" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
