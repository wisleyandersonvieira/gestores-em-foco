import { formatCurrency, formatPercentage, roundCurrency, variationPercentage } from "@/lib/dre-calculations";
import { formatDreAnalysisRowLabel, type DreAnalysisPeriod, type DreAnalysisResult, type DreAnalysisRow } from "@/lib/dre-analysis";

export type ManagerialStatus =
  | "positive"
  | "attention"
  | "critical"
  | "neutral"
  | "new"
  | "zeroed"
  | "no-base"
  | "no-change";

export type ManagerialNature = "revenue" | "result" | "expense" | "deduction" | "investment" | "margin" | "informational";

export type ManagerialReportRow = {
  key: string;
  label: string;
  normalizedLabel: string;
  nature: ManagerialNature;
  lineType: DreAnalysisRow["lineType"];
  level: DreAnalysisRow["level"];
  previousValue: number;
  currentValue: number;
  variationValue: number;
  variationPercentage: number | null;
  variationLabel: string;
  previousVerticalPercentage: number | null;
  currentVerticalPercentage: number | null;
  verticalPointVariation: number | null;
  status: ManagerialStatus;
  statusLabel: string;
  statusReason: string;
  isResultLine: boolean;
};

export type ManagerialAlert = ManagerialReportRow & {
  message: string;
};

export type ManagerialCard = {
  title: string;
  previousLabel?: string;
  previousValue?: string;
  currentLabel?: string;
  currentValue?: string;
  variation?: string;
  tone: ManagerialStatus;
};

export type ManagerialHighlights = {
  revenueDrops: ManagerialReportRow[];
  expenseIncreases: ManagerialReportRow[];
  expenseReductions: ManagerialReportRow[];
  marginImpacts: ManagerialReportRow[];
};

export type ManagerialDreReport = {
  generatedAt: Date;
  modelName: string;
  periods: DreAnalysisPeriod[];
  previousPeriod: DreAnalysisPeriod | null;
  currentPeriod: DreAnalysisPeriod;
  cards: ManagerialCard[];
  alerts: ManagerialAlert[];
  rows: ManagerialReportRow[];
  highlights: ManagerialHighlights;
  summaryText: string[];
  observations: string[];
};

const LABEL_FIXES: Record<string, string> = {
  "assitencia medica e social": "Assistência médica e social",
  "assistencia medica e social": "Assistência médica e social",
  "medicina e seguranca no trab": "Medicina e Segurança no Trabalho",
  "medicina e segurança no trab": "Medicina e Segurança no Trabalho",
  "materiais de infomatica": "Materiais de Informática",
  "materiais de informática": "Materiais de Informática",
  "produtos quimicos": "Produtos Químicos",
  "bonificacao por atingimento de meta": "Bonificação por Atingimento de Meta",
  "bonificação por atingimento de meta": "Bonificação por Atingimento de Meta",
  "provisoes (cedito)": "Provisões (Crédito)",
  "provisões (cédito)": "Provisões (Crédito)",
  "lucro liquido - lucro liquido": "Lucro Líquido",
};

const STATUS_LABELS: Record<ManagerialStatus, string> = {
  positive: "Positivo",
  attention: "Atenção",
  critical: "Crítico",
  neutral: "Neutro",
  new: "Novo lançamento",
  zeroed: "Zerado no período",
  "no-base": "Sem base anterior",
  "no-change": "Sem variação",
};

export function buildManagerialDreReport(result: DreAnalysisResult, modelName: string): ManagerialDreReport {
  const periods = result.periods;
  const currentPeriod = periods.at(-1);
  if (!currentPeriod) {
    throw new Error("Não há períodos para gerar a Análise Gerencial de DRE.");
  }

  const previousPeriod = periods.length > 1 ? periods[0] : null;
  const rows = result.rows.map((row) => buildManagerialRow(row, previousPeriod, currentPeriod));
  const cards = buildCards(result, rows, previousPeriod, currentPeriod);
  const alerts = buildAlerts(rows);
  const highlights = buildHighlights(rows);
  const summaryText = buildSummaryText(rows, previousPeriod, currentPeriod);
  const observations = buildObservations(result, rows);

  return {
    generatedAt: new Date(),
    modelName,
    periods,
    previousPeriod,
    currentPeriod,
    cards,
    alerts,
    rows,
    highlights,
    summaryText,
    observations,
  };
}

export function normalizeManagerialLabel(label: string) {
  const compact = normalizeText(label);
  if (compact === "lucro liquido - lucro liquido") return "Lucro Líquido";
  return LABEL_FIXES[compact] ?? label.replace(/\bLUCRO LIQUIDO\b/gi, "Lucro Líquido");
}

export function managerialStatusLabel(status: ManagerialStatus) {
  return STATUS_LABELS[status];
}

export function formatManagerialVertical(value: number | null) {
  return value === null ? "Sem base de faturamento" : formatPercentage(value);
}

function buildManagerialRow(row: DreAnalysisRow, previousPeriod: DreAnalysisPeriod | null, currentPeriod: DreAnalysisPeriod): ManagerialReportRow {
  const previousValue = previousPeriod ? row.values[previousPeriod.id]?.amount ?? 0 : 0;
  const currentValue = row.values[currentPeriod.id]?.amount ?? 0;
  const previousVerticalPercentage = previousPeriod && previousPeriod.totals.revenue !== 0 && row.categoryType !== "margin"
    ? row.values[previousPeriod.id]?.verticalPercentage ?? 0
    : row.categoryType === "margin" ? previousValue : null;
  const currentVerticalPercentage = currentPeriod.totals.revenue !== 0 && row.categoryType !== "margin"
    ? row.values[currentPeriod.id]?.verticalPercentage ?? 0
    : row.categoryType === "margin" ? currentValue : null;
  const variationValue = roundCurrency(currentValue - previousValue);
  const variationPct = calculateVariationPercentage(previousValue, currentValue);
  const verticalPointVariation = previousVerticalPercentage === null || currentVerticalPercentage === null
    ? null
    : roundCurrency(currentVerticalPercentage - previousVerticalPercentage);
  const nature = classifyNature(row);
  const status = classifyStatus({ nature, previousValue, currentValue, variationValue, variationPct, verticalPointVariation, row });

  return {
    key: row.key,
    label: formatDreAnalysisRowLabel(row),
    normalizedLabel: normalizeManagerialLabel(formatDreAnalysisRowLabel(row)),
    nature,
    lineType: row.lineType,
    level: row.level,
    previousValue,
    currentValue,
    variationValue,
    variationPercentage: variationPct,
    variationLabel: variationLabel(previousValue, currentValue, variationPct),
    previousVerticalPercentage,
    currentVerticalPercentage,
    verticalPointVariation,
    status,
    statusLabel: STATUS_LABELS[status],
    statusReason: statusReason(status, nature, variationValue, variationPct, verticalPointVariation),
    isResultLine: row.categoryType === "result" || row.isNetIncome || row.isSumLine || row.categoryType === "margin",
  };
}

function buildCards(result: DreAnalysisResult, rows: ManagerialReportRow[], previousPeriod: DreAnalysisPeriod | null, currentPeriod: DreAnalysisPeriod): ManagerialCard[] {
  const previousRevenue = previousPeriod?.totals.revenue ?? 0;
  const currentRevenue = currentPeriod.totals.revenue;
  const revenueVariation = calculateVariationPercentage(previousRevenue, currentRevenue);
  const netRevenue = findRow(rows, ["receita liquida", "receita líquida"]);
  const grossProfit = findRow(rows, ["lucro bruto"]);
  const netProfit = findRow(rows, ["lucro liquido", "lucro líquido"]);
  const margin = findRow(rows, ["margem de lucro", "margem liquida", "margem líquida"]);
  const accumulatedResult = result.summary.result;

  return [
    comparisonCard("Faturamento", previousPeriod?.label, previousRevenue, currentPeriod.label, currentRevenue, revenueVariation, classifySimpleTone("revenue", currentRevenue - previousRevenue, revenueVariation)),
    rowCard("Receita líquida", netRevenue, previousPeriod, currentPeriod),
    rowCard("Lucro bruto", grossProfit, previousPeriod, currentPeriod),
    rowCard("Lucro líquido", netProfit, previousPeriod, currentPeriod),
    rowCard("Margem de lucro", margin, previousPeriod, currentPeriod, true),
    { title: "Melhor período", currentValue: result.summary.bestPeriod, tone: "neutral" },
    { title: "Pior período", currentValue: result.summary.worstPeriod, tone: "attention" },
    comparisonCard("Variação do faturamento", previousPeriod?.label, previousRevenue, currentPeriod.label, currentRevenue, revenueVariation, classifySimpleTone("revenue", currentRevenue - previousRevenue, revenueVariation)),
    {
      title: "Variação da margem líquida",
      previousLabel: previousPeriod?.label,
      previousValue: previousPeriod ? formatPercentage(previousPeriod.totals.marginPercentage) : "Sem base anterior",
      currentLabel: currentPeriod.label,
      currentValue: formatPercentage(currentPeriod.totals.marginPercentage),
      variation: previousPeriod ? `${signed(formatPercentage(roundCurrency(currentPeriod.totals.marginPercentage - previousPeriod.totals.marginPercentage)))} p.p.`.replace("% p.p.", " p.p.") : "Sem base anterior",
      tone: previousPeriod ? classifyMarginTone(currentPeriod.totals.marginPercentage - previousPeriod.totals.marginPercentage, currentPeriod.totals.result) : "neutral",
    },
    { title: "Resultado acumulado", currentValue: formatCurrency(accumulatedResult), tone: accumulatedResult >= 0 ? "positive" : "critical" },
  ];
}

function buildAlerts(rows: ManagerialReportRow[]): ManagerialAlert[] {
  return rows
    .filter((row) => row.status === "critical" || row.status === "attention" || row.status === "new" || row.status === "zeroed" || (row.nature === "investment" && (row.currentVerticalPercentage ?? 0) > 10))
    .map((row) => ({ ...row, message: alertMessage(row) }))
    .sort((a, b) => statusWeight(b.status) - statusWeight(a.status) || Math.abs(b.variationValue) - Math.abs(a.variationValue))
    .slice(0, 18);
}

function buildHighlights(rows: ManagerialReportRow[]): ManagerialHighlights {
  const comparable = rows.filter((row) => row.lineType !== "category");
  return {
    revenueDrops: comparable
      .filter((row) => row.nature === "revenue" && row.variationValue < 0)
      .sort((a, b) => a.variationValue - b.variationValue)
      .slice(0, 10),
    expenseIncreases: comparable
      .filter((row) => (row.nature === "expense" || row.nature === "deduction") && row.variationValue > 0)
      .sort((a, b) => b.variationValue - a.variationValue)
      .slice(0, 10),
    expenseReductions: comparable
      .filter((row) => (row.nature === "expense" || row.nature === "deduction") && row.variationValue < 0)
      .sort((a, b) => a.variationValue - b.variationValue)
      .slice(0, 10),
    marginImpacts: comparable
      .filter((row) => row.verticalPointVariation !== null && row.verticalPointVariation !== 0)
      .sort((a, b) => Math.abs(b.verticalPointVariation ?? 0) - Math.abs(a.verticalPointVariation ?? 0))
      .slice(0, 10),
  };
}

function buildSummaryText(rows: ManagerialReportRow[], previousPeriod: DreAnalysisPeriod | null, currentPeriod: DreAnalysisPeriod) {
  const previousRevenue = previousPeriod?.totals.revenue ?? 0;
  const currentRevenue = currentPeriod.totals.revenue;
  const revenueVar = previousPeriod ? calculateVariationPercentage(previousRevenue, currentRevenue) : null;
  const netProfit = findRow(rows, ["lucro liquido", "lucro líquido"]);
  const netRevenue = findRow(rows, ["receita liquida", "receita líquida"]);
  const topExpense = rows
    .filter((row) => row.nature === "expense" && (row.status === "critical" || row.status === "attention"))
    .sort((a, b) => Math.abs(b.variationValue) - Math.abs(a.variationValue))[0];
  const investment = rows
    .filter((row) => row.nature === "investment" && Math.abs(row.currentValue) > 0)
    .sort((a, b) => Math.abs(b.currentValue) - Math.abs(a.currentValue))[0];
  const lines: string[] = [];

  if (previousPeriod) {
    lines.push(`O faturamento ${currentRevenue >= previousRevenue ? "aumentou" : "caiu"} ${formatVariationForSentence(revenueVar)}, passando de ${formatCurrency(previousRevenue)} para ${formatCurrency(currentRevenue)}.`);
    lines.push(`A margem líquida passou de ${formatPercentage(previousPeriod.totals.marginPercentage)} para ${formatPercentage(currentPeriod.totals.marginPercentage)}, variação de ${formatPoints(currentPeriod.totals.marginPercentage - previousPeriod.totals.marginPercentage)}.`);
  } else {
    lines.push(`O faturamento do período analisado foi de ${formatCurrency(currentRevenue)}, com margem líquida de ${formatPercentage(currentPeriod.totals.marginPercentage)}.`);
  }

  if (netRevenue && netRevenue.previousVerticalPercentage !== null && netRevenue.currentVerticalPercentage !== null) {
    lines.push(`A receita líquida representava ${formatPercentage(netRevenue.previousVerticalPercentage)} do faturamento e passou para ${formatPercentage(netRevenue.currentVerticalPercentage)}.`);
  }

  if (netProfit) {
    lines.push(`O lucro líquido passou de ${formatCurrency(netProfit.previousValue)} para ${formatCurrency(netProfit.currentValue)}, com variação de ${netProfit.variationLabel}.`);
  }

  if (topExpense && topExpense.previousVerticalPercentage !== null && topExpense.currentVerticalPercentage !== null) {
    lines.push(`${topExpense.normalizedLabel} alterou sua participação sobre o faturamento de ${formatPercentage(topExpense.previousVerticalPercentage)} para ${formatPercentage(topExpense.currentVerticalPercentage)}.`);
  }

  if (investment && (investment.currentVerticalPercentage ?? 0) >= 10) {
    lines.push(`O período atual apresentou investimento relevante em ${investment.normalizedLabel}, no valor de ${formatCurrency(investment.currentValue)}, equivalente a ${formatPercentage(investment.currentVerticalPercentage ?? 0)} do faturamento.`);
  }

  return lines.slice(0, 6);
}

function buildObservations(result: DreAnalysisResult, rows: ManagerialReportRow[]) {
  const observations = [
    "A análise vertical usa o faturamento do próprio período como base para todas as linhas monetárias.",
    "Quando o faturamento é zero, o relatório exibe ausência de base em vez de calcular percentual.",
    "As cores consideram a natureza gerencial da linha, não apenas o sinal matemático da variação.",
  ];

  if (result.periods.some((period) => period.missingMonths.length > 0)) {
    observations.push("Há períodos selecionados com competências sem DRE cadastrada; os valores refletem somente os lançamentos encontrados pelos filtros.");
  }

  if (rows.some((row) => row.normalizedLabel !== row.label)) {
    observations.push("Alguns nomes foram padronizados apenas visualmente neste relatório, sem alterar os cadastros originais.");
  }

  return observations;
}

function classifyNature(row: DreAnalysisRow): ManagerialNature {
  const text = normalizeText(`${row.label} ${row.financialType ?? ""}`);
  if (row.categoryType === "margin") return "margin";
  if (row.financialType === "gross_profit" || row.financialType === "operating_result" || row.financialType === "pre_tax_profit" || row.financialType === "net_profit" || row.isNetIncome) return "result";
  if (row.financialType === "revenue" || row.categoryType === "credit" && !row.subcategoryIsReductive) return "revenue";
  if (text.includes("invest") || text.includes("imobiliz") || text.includes("ativo fixo")) return "investment";
  if (row.subcategoryIsReductive) return row.categoryType === "credit" ? "deduction" : "informational";
  if (text.includes("lucro") || text.includes("resultado") || text.includes("saldo")) return "result";
  if (row.categoryType === "debit") return "expense";
  return "informational";
}

function classifyStatus(params: {
  nature: ManagerialNature;
  previousValue: number;
  currentValue: number;
  variationValue: number;
  variationPct: number | null;
  verticalPointVariation: number | null;
  row: DreAnalysisRow;
}): ManagerialStatus {
  const { nature, previousValue, currentValue, variationValue, variationPct, verticalPointVariation, row } = params;
  if (previousValue === 0 && currentValue > 0) return nature === "revenue" || nature === "result" ? "new" : Math.abs(currentValue) >= 1 ? "attention" : "new";
  if (previousValue > 0 && currentValue === 0) return "zeroed";
  if (previousValue === 0 && currentValue === 0) return "no-change";
  if (variationValue === 0 && (verticalPointVariation ?? 0) === 0) return "no-change";

  if (nature === "investment") return "neutral";
  if (nature === "margin") return classifyMarginTone(variationValue, currentValue);
  if (nature === "revenue") {
    if ((variationPct ?? 0) <= -10) return "critical";
    if (variationValue < 0) return "attention";
    return variationValue > 0 ? "positive" : "neutral";
  }
  if (nature === "result") {
    if (previousValue >= 0 && currentValue < 0) return "critical";
    if (previousValue < 0 && currentValue > 0) return "positive";
    if (row.financialType === "net_profit" && currentValue < 0) return "critical";
    if (variationValue < 0) return "critical";
    return variationValue > 0 ? "positive" : "neutral";
  }
  if (nature === "expense" || nature === "deduction") {
    if (variationValue > 0 && (verticalPointVariation ?? 0) > 0 && (variationPct ?? 0) > 10) return "critical";
    if (variationValue > 0) return "attention";
    if (variationValue < 0 && (verticalPointVariation ?? 0) > 0) return "attention";
    if (variationValue < 0 && (verticalPointVariation ?? 0) <= 0) return "positive";
  }
  return "neutral";
}

function statusReason(status: ManagerialStatus, nature: ManagerialNature, variationValue: number, variationPct: number | null, verticalPointVariation: number | null) {
  if (status === "new") return "Linha sem base anterior e com valor no período atual.";
  if (status === "zeroed") return "Linha tinha valor no período anterior e ficou zerada no atual.";
  if (status === "no-change") return "Não houve variação relevante.";
  if (status === "critical") return nature === "expense" ? "Piora em valor e/ou participação sobre faturamento." : "Piora relevante para resultado, receita ou margem.";
  if (status === "attention") return variationValue < 0 && (verticalPointVariation ?? 0) > 0 ? "Redução nominal com maior participação sobre faturamento." : `Variação requer acompanhamento (${variationPct === null ? "sem base percentual" : formatPercentage(variationPct)}).`;
  if (status === "positive") return "Movimento favorável para a natureza da linha.";
  return "Linha informativa ou sem base suficiente para análise automática.";
}

function alertMessage(row: ManagerialReportRow) {
  if (row.status === "new") return "Linha nova no período atual.";
  if (row.status === "zeroed") return "Linha zerada no período atual.";
  if (row.nature === "expense" && row.variationValue > 0 && (row.verticalPointVariation ?? 0) > 0) return "Despesa aumentou em valor e em participação sobre o faturamento.";
  if (row.nature === "expense" && row.variationValue < 0 && (row.verticalPointVariation ?? 0) > 0) return "Despesa reduziu em valor, mas não proporcionalmente ao faturamento.";
  if (row.nature === "revenue" && row.variationValue < 0) return "Receita/faturamento em queda.";
  if (row.nature === "result" && row.currentValue < 0) return "Resultado negativo no período atual.";
  if (row.nature === "investment") return "Investimento relevante no período atual.";
  return row.statusReason;
}

function rowCard(title: string, row: ManagerialReportRow | undefined, previousPeriod: DreAnalysisPeriod | null, currentPeriod: DreAnalysisPeriod, percentage = false): ManagerialCard {
  if (!row) return { title, currentValue: "Configure a linha no modelo", tone: "neutral" };
  const fmt = percentage ? formatPercentage : formatCurrency;
  return {
    title,
    previousLabel: previousPeriod?.label,
    previousValue: previousPeriod ? fmt(row.previousValue) : "Sem base anterior",
    currentLabel: currentPeriod.label,
    currentValue: fmt(row.currentValue),
    variation: percentage && row.verticalPointVariation !== null ? formatPoints(row.verticalPointVariation) : row.variationLabel,
    tone: row.status,
  };
}

function comparisonCard(
  title: string,
  previousLabel: string | undefined,
  previousValue: number,
  currentLabel: string,
  currentValue: number,
  variationPct: number | null,
  tone: ManagerialStatus,
): ManagerialCard {
  return {
    title,
    previousLabel,
    previousValue: previousLabel ? formatCurrency(previousValue) : "Sem base anterior",
    currentLabel,
    currentValue: formatCurrency(currentValue),
    variation: `${signed(formatCurrency(currentValue - previousValue))} / ${variationLabel(previousValue, currentValue, variationPct)}`,
    tone,
  };
}

function findRow(rows: ManagerialReportRow[], labels: string[]) {
  const normalizedLabels = labels.map(normalizeText);
  return rows.find((row) => normalizedLabels.some((label) => normalizeText(row.normalizedLabel).includes(label)));
}

function calculateVariationPercentage(previous: number, current: number) {
  if (previous === 0) return null;
  return variationPercentage(previous, current);
}

function variationLabel(previous: number, current: number, variationPct: number | null) {
  if (previous === 0 && current > 0) return "Novo lançamento";
  if (previous > 0 && current === 0) return "Zerado no período";
  if (previous === 0 && current === 0) return "Sem variação";
  return variationPct === null ? "Sem base anterior" : formatPercentage(variationPct);
}

function classifySimpleTone(nature: ManagerialNature, variationValue: number, variationPct: number | null): ManagerialStatus {
  if (nature === "revenue" && variationValue < 0) return (variationPct ?? 0) <= -10 ? "critical" : "attention";
  if (variationValue > 0) return "positive";
  if (variationValue < 0) return "critical";
  return "neutral";
}

function classifyMarginTone(pointVariation: number, currentResult: number): ManagerialStatus {
  if (currentResult < 0) return "critical";
  if (pointVariation <= -5) return "critical";
  if (pointVariation < 0) return "attention";
  if (pointVariation > 0) return "positive";
  return "neutral";
}

function statusWeight(status: ManagerialStatus) {
  const weights: Record<ManagerialStatus, number> = { critical: 5, attention: 4, new: 3, zeroed: 3, positive: 2, neutral: 1, "no-base": 0, "no-change": 0 };
  return weights[status];
}

function formatPoints(value: number) {
  return `${value > 0 ? "+" : ""}${formatPercentage(value).replace("%", " p.p.")}`;
}

function formatVariationForSentence(value: number | null) {
  if (value === null) return "sem base percentual";
  return `em ${formatPercentage(Math.abs(value))}`;
}

function signed(value: string) {
  return value.startsWith("-") ? value : `+${value}`;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
