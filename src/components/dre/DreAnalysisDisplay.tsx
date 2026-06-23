import { useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IndicatorCard, formatCurrency } from "@/components/dre/dre-ui";
import { formatPercentage, variationPercentage } from "@/lib/dre-calculations";
import {
  formatDreAnalysisRowLabel,
  isGoodDreAnalysisVariation,
  type DreAnalysisPeriod,
  type DreAnalysisResult,
  type DreAnalysisRow,
} from "@/lib/dre-analysis";

// Summary indicator cards (6 cards: faturamento, débitos, resultado, margem, melhor, pior)
export function DreAnalysisSummaryCards({ result }: { result: DreAnalysisResult }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <IndicatorCard title="Faturamento" value={formatCurrency(result.summary.revenue)} />
      <IndicatorCard title="Total de Débitos" value={formatCurrency(result.summary.totalDebit)} />
      <IndicatorCard
        title="Resultado acumulado"
        value={formatCurrency(result.summary.result)}
        tone={result.summary.result >= 0 ? "positive" : "negative"}
      />
      <IndicatorCard title="Margem média" value={formatPercentage(result.summary.averageMargin)} />
      <IndicatorCard title="Melhor período" value={result.summary.bestPeriod} />
      <IndicatorCard title="Pior período" value={result.summary.worstPeriod} />
    </div>
  );
}

// Full comparison table with expand/collapse categories
export function ComparisonTable({
  result,
  showVariation,
  showVerticalAnalysis,
}: {
  result: DreAnalysisResult;
  showVariation: boolean;
  showVerticalAnalysis: boolean;
}) {
  const categoryKeys = useMemo(
    () =>
      result.rows
        .filter(
          (row) =>
            row.lineType === "category" &&
            result.rows.some((candidate) => candidate.lineType === "subcategory" && candidate.parentKey === row.key),
        )
        .map((row) => row.key),
    [result.rows],
  );

  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());
  const allExpanded = categoryKeys.length > 0 && expandedKeys.size === categoryKeys.length;

  const visibleRows = useMemo(
    () =>
      result.rows.filter(
        (row) => row.lineType !== "subcategory" || Boolean(row.parentKey && expandedKeys.has(row.parentKey)),
      ),
    [expandedKeys, result.rows],
  );

  useEffect(() => {
    setExpandedKeys(new Set());
  }, [result]);

  function toggleCategory(categoryKey: string) {
    setExpandedKeys((current) => {
      const next = new Set(current);
      if (next.has(categoryKey)) {
        next.delete(categoryKey);
      } else {
        next.add(categoryKey);
      }
      return next;
    });
  }

  function toggleAllCategories() {
    setExpandedKeys(allExpanded ? new Set() : new Set(categoryKeys));
  }

  return (
    <Card className="border-primary/10 bg-white/90">
      <CardHeader>
        <CardTitle>Tabela Comparativa</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table className="min-w-[920px]">
          <TableHeader className="sticky top-0 z-10 bg-white">
            <TableRow>
              <TableHead className="sticky left-0 z-20 min-w-72 bg-white">
                <div className="flex items-center gap-2">
                  <span>Categoria / Subcategoria</span>
                  <button
                    type="button"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onClick={toggleAllCategories}
                    aria-label={allExpanded ? "Recolher todas as subcategorias" : "Expandir todas as subcategorias"}
                    title={allExpanded ? "Recolher todas" : "Expandir todas"}
                  >
                    {allExpanded ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </TableHead>
              {result.periods.map((period, index) => (
                <ColumnHeaders key={period.id} period={period} index={index} showVariation={showVariation} />
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((row) => (
              <TableRow
                key={row.key}
                className={
                  row.lineType === "category"
                    ? "bg-muted/70"
                    : row.isNetIncome
                      ? "bg-primary/10"
                      : row.isSumLine
                        ? "bg-primary/5"
                        : ""
                }
              >
                <TableCell
                  className={`sticky left-0 z-10 bg-inherit ${row.level === 1 ? "pl-10 text-sm" : "font-semibold"} ${row.isNetIncome ? "text-primary" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    {categoryKeys.includes(row.key) ? (
                      <button
                        type="button"
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                        onClick={() => toggleCategory(row.key)}
                        aria-label={
                          expandedKeys.has(row.key)
                            ? `Recolher subcategorias de ${row.label}`
                            : `Expandir subcategorias de ${row.label}`
                        }
                        title={expandedKeys.has(row.key) ? "Recolher subcategorias" : "Expandir subcategorias"}
                      >
                        {expandedKeys.has(row.key) ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      </button>
                    ) : row.lineType === "category" ? (
                      <span className="h-6 w-6 shrink-0" />
                    ) : null}
                    <span>{formatDreAnalysisRowLabel(row)}</span>
                  </div>
                  {row.isNetIncome ? (
                    <Badge className="ml-2" variant="secondary">
                      LUCRO LÍQUIDO
                    </Badge>
                  ) : null}
                </TableCell>
                {result.periods.map((period, index) => {
                  const current = getRowValue(row, period);
                  const previous = index > 0 ? getRowValue(row, result.periods[index - 1]) : 0;
                  const variation = index > 0 ? current - previous : 0;
                  return (
                    <ValueCells
                      key={`${period.id}-${row.key}`}
                      row={row}
                      value={current}
                      variation={variation}
                      previous={previous}
                      showVariation={showVariation && index > 0}
                      showVerticalAnalysis={showVerticalAnalysis}
                      verticalPercentage={getRowVerticalPercentage(row, period)}
                    />
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ColumnHeaders({
  period,
  index,
  showVariation,
}: {
  period: DreAnalysisPeriod;
  index: number;
  showVariation: boolean;
}) {
  return (
    <>
      <TableHead className="min-w-36 text-right">{period.label}</TableHead>
      {showVariation && index > 0 ? <TableHead className="min-w-44 text-right">Var. anterior</TableHead> : null}
    </>
  );
}

function ValueCells({
  row,
  value,
  variation,
  previous,
  showVariation,
  showVerticalAnalysis,
  verticalPercentage,
}: {
  row: DreAnalysisRow;
  value: number;
  variation: number;
  previous: number;
  showVariation: boolean;
  showVerticalAnalysis: boolean;
  verticalPercentage: number;
}) {
  const formatted = row.categoryType === "margin" ? formatPercentage(value) : formatCurrency(value);
  const variationClass =
    variation === 0
      ? "text-muted-foreground"
      : isGoodDreAnalysisVariation(row.categoryType, variation)
        ? "text-emerald-700"
        : "text-red-700";

  return (
    <>
      <TableCell
        className={`text-right font-medium tabular-nums ${row.categoryType === "result" ? (value >= 0 ? "text-emerald-700" : "text-red-700") : ""}`}
      >
        <span>{formatted}</span>
        {showVerticalAnalysis && row.categoryType !== "margin" ? (
          <span className="mt-1 block text-xs font-semibold text-muted-foreground">
            {formatPercentage(verticalPercentage)}
          </span>
        ) : null}
      </TableCell>
      {showVariation ? (
        <TableCell className={`text-right text-sm font-semibold tabular-nums ${variationClass}`}>
          {formatCurrency(variation)} / {formatPercentage(variationPercentage(previous, value))}
        </TableCell>
      ) : null}
    </>
  );
}

function getRowValue(row: DreAnalysisRow, period: DreAnalysisPeriod) {
  return row.values[period.id]?.amount ?? 0;
}

function getRowVerticalPercentage(row: DreAnalysisRow, period: DreAnalysisPeriod) {
  return row.values[period.id]?.verticalPercentage ?? 0;
}
