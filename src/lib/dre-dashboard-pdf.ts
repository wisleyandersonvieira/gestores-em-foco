import { jsPDF } from "jspdf";

import { formatCurrency, formatCompetence, formatPercentage } from "@/lib/dre-calculations";
import type { AdvancedDreAnalysis, AdvancedAlert, AlertLevel } from "@/lib/dre-advanced-analysis";

// ── Types ──────────────────────────────────────────────────────────────────────

export type DashboardChartPoint = {
  period: string;
  revenue: number;
  netIncome: number;
  margin: number;
};

export type DashboardPdfParams = {
  selectedCompetences: string[];
  modelName: string | null;
  revenueValue: number;
  netProfitValue: number;
  netMarginValue: number;
  grossMarginValue: number | null;
  grossMarginUnavailable: boolean;
  indicators: AdvancedDreAnalysis["indicators"] | null;
  operationalEfficiency: number;
  hasSinglePeriod: boolean;
  analyzedPeriodLabel: string | null;
  analyzedPeriodMargin: number | null;
  chartData: DashboardChartPoint[];
  alerts: AdvancedAlert[];
  advancedAnalysis: AdvancedDreAnalysis | null;
};

// ── Palette ────────────────────────────────────────────────────────────────────

const C = {
  primary:   [15, 43, 70]    as [number, number, number],
  softBlue:  [230, 237, 246] as [number, number, number],
  accent:    [180, 83, 9]    as [number, number, number],
  border:    [219, 226, 236] as [number, number, number],
  text:      [24, 31, 42]    as [number, number, number],
  muted:     [91, 102, 118]  as [number, number, number],
  positive:  [5, 150, 105]   as [number, number, number],
  negative:  [220, 38, 38]   as [number, number, number],
  amber:     [217, 119, 6]   as [number, number, number],
  white:     [255, 255, 255] as [number, number, number],
  lightGray: [246, 248, 251] as [number, number, number],
  red50:     [254, 242, 242] as [number, number, number],
  amber50:   [255, 251, 235] as [number, number, number],
  green50:   [240, 253, 244] as [number, number, number],
};

// ── Palette helpers ────────────────────────────────────────────────────────────

function alertColor(level: AlertLevel): [number, number, number] {
  return level === "HIGH" ? C.negative : level === "MEDIUM" ? C.amber : C.positive;
}

function alertBg(level: AlertLevel): [number, number, number] {
  return level === "HIGH" ? C.red50 : level === "MEDIUM" ? C.amber50 : C.green50;
}

function alertLabel(level: AlertLevel): string {
  return level === "HIGH" ? "ALTO" : level === "MEDIUM" ? "MEDIO" : "BAIXO";
}

function indLevelLabel(level: AlertLevel | null): string {
  if (!level) return "";
  return level === "HIGH" ? "ALTO" : level === "MEDIUM" ? "MEDIO" : "BAIXO";
}

function indLevelColor(level: AlertLevel | null): [number, number, number] {
  if (!level) return C.muted;
  return alertColor(level);
}

// ── Short period label for chart X-axis ───────────────────────────────────────

function shortPeriod(period: string): string {
  // period is like "Janeiro/2026" — convert to "Jan/26"
  const shortMonths: Record<string, string> = {
    Janeiro: "Jan", Fevereiro: "Fev", Marco: "Mar", Abril: "Abr",
    Maio: "Mai", Junho: "Jun", Julho: "Jul", Agosto: "Ago",
    Setembro: "Set", Outubro: "Out", Novembro: "Nov", Dezembro: "Dez",
  };
  const [month, year] = period.split("/");
  const short = month ? (shortMonths[month] ?? month.slice(0, 3)) : period;
  return year ? `${short}/${year.slice(2)}` : short;
}

// ── Page frame helpers ─────────────────────────────────────────────────────────

function drawStripeHeader(doc: jsPDF, modelName: string | null) {
  const W = doc.internal.pageSize.getWidth();

  doc.setFillColor(...C.primary);
  doc.rect(0, 0, W, 22, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(200, 215, 230);
  doc.text("GESTORES EM FOCO  |  GESTOR DE DRE", 14, 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(160, 190, 215);
  doc.text("Dashboard Financeiro" + (modelName ? `  |  ${modelName}` : ""), 14, 16);
}

function drawFooter(doc: jsPDF, pageNum: number, total: number, generatedAt: string) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.25);
  doc.line(14, H - 14, W - 14, H - 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...C.muted);
  doc.text(
    "Relatorio gerado automaticamente pelo Gestor de DRE  |  Valores conforme filtros aplicados no dashboard.",
    14,
    H - 8,
  );
  doc.text(`Gerado em ${generatedAt}`, W / 2, H - 8, { align: "center" });
  doc.text(`Pagina ${pageNum} de ${total}`, W - 14, H - 8, { align: "right" });
}

// Content-start Y after the stripe (28mm) gives room for the page-level title.
const CONTENT_TOP = 52;
const CONTENT_BOTTOM_MARGIN = 22; // reserve for footer

function contentBottom(doc: jsPDF): number {
  return doc.internal.pageSize.getHeight() - CONTENT_BOTTOM_MARGIN;
}

// ── Section title ──────────────────────────────────────────────────────────────

function sectionTitle(doc: jsPDF, text: string, y: number): number {
  const W = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...C.accent);
  doc.text(text.toUpperCase(), 14, y);
  doc.setDrawColor(...C.accent);
  doc.setLineWidth(0.35);
  doc.line(14, y + 2, W - 14, y + 2);
  doc.setTextColor(...C.text);
  return y + 8;
}

// ── Metric cards ──────────────────────────────────────────────────────────────

function metricCard(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  label: string,
  value: string,
  detail?: string,
  detailColor?: [number, number, number],
) {
  doc.setFillColor(...C.white);
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, w, h, 3, 3, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.muted);
  doc.text(label, x + 5, y + 8);

  const valFs = value.length > 16 ? 9 : value.length > 12 ? 11 : 13;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(valFs);
  doc.setTextColor(...C.text);
  doc.text(value, x + 5, y + 19);

  if (detail) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...(detailColor ?? C.muted));
    doc.text(detail, x + 5, y + 26);
  }
}

function compactCard(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  label: string,
  value: string,
) {
  doc.setFillColor(...C.lightGray);
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, h, 2, 2, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.muted);
  doc.text(label, x + 5, y + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...C.primary);
  const lines = doc.splitTextToSize(value, w - 10);
  doc.text(lines, x + 5, y + 15);
}

// ── Margin evolution chart (pure jsPDF drawing) ───────────────────────────────

function drawMarginChart(
  doc: jsPDF,
  chartData: DashboardChartPoint[],
  x: number, y: number, w: number, h: number,
) {
  // Background
  doc.setFillColor(250, 251, 252);
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, h, 2, 2, "FD");

  if (chartData.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text("Grafico indisponivel no momento da geracao.", x + w / 2, y + h / 2, { align: "center" });
    return;
  }

  const margins = chartData.map((p) => p.margin);
  const rawMin = Math.min(...margins);
  const rawMax = Math.max(...margins);
  const range = Math.max(rawMax - rawMin, 3);
  const pad = range * 0.3;
  const scaleMin = rawMin - pad;
  const scaleMax = rawMax + pad;
  const scaleRange = scaleMax - scaleMin;

  const yAxisW = 22;
  const xAxisH = 13;
  const innerPad = 6;
  const plotX = x + yAxisW;
  const plotY = y + innerPad;
  const plotW = w - yAxisW - innerPad;
  const plotH = h - xAxisH - innerPad;

  // Grid lines (5 levels)
  const gridCount = 4;
  for (let i = 0; i <= gridCount; i++) {
    const val = scaleMin + (scaleRange * i) / gridCount;
    const lineY = plotY + plotH - (plotH * (val - scaleMin)) / scaleRange;

    doc.setDrawColor(225, 232, 240);
    doc.setLineWidth(0.12);
    doc.line(plotX, lineY, plotX + plotW, lineY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(...C.muted);
    doc.text(`${val.toFixed(1)}%`, plotX - 2, lineY + 1, { align: "right" });
  }

  // Axes
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(plotX, plotY + plotH, plotX + plotW, plotY + plotH); // X axis
  doc.line(plotX, plotY, plotX, plotY + plotH);                 // Y axis

  const n = chartData.length;

  if (n === 1) {
    // Single period — vertical bar
    const barW = Math.min(22, plotW * 0.35);
    const pt = chartData[0];
    const barH = Math.max(2, ((pt.margin - scaleMin) / scaleRange) * plotH);
    const barX = plotX + plotW / 2 - barW / 2;
    const barY = plotY + plotH - barH;
    const barColor: [number, number, number] = pt.margin >= 8 ? C.positive : pt.margin >= 3 ? C.primary : C.negative;

    doc.setFillColor(...barColor);
    doc.roundedRect(barX, barY, barW, barH, 1.5, 1.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...barColor);
    doc.text(`${pt.margin.toFixed(1)}%`, plotX + plotW / 2, barY - 3, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.text(shortPeriod(pt.period), plotX + plotW / 2, plotY + plotH + 8, { align: "center" });
  } else {
    // Multiple periods — line chart
    const step = plotW / Math.max(n - 1, 1);

    const pts = chartData.map((d, i) => ({
      px: plotX + i * step,
      py: plotY + plotH - Math.max(0, Math.min(plotH, ((d.margin - scaleMin) / scaleRange) * plotH)),
      margin: d.margin,
    }));

    // Line segments
    doc.setDrawColor(...C.primary);
    doc.setLineWidth(1.1);
    for (let i = 0; i < pts.length - 1; i++) {
      doc.line(pts[i].px, pts[i].py, pts[i + 1].px, pts[i + 1].py);
    }

    // Dots + value labels
    const showVals = n <= 8;
    for (const pt of pts) {
      doc.setFillColor(...C.white);
      doc.setDrawColor(...C.primary);
      doc.setLineWidth(0.7);
      doc.circle(pt.px, pt.py, 1.5, "FD");

      if (showVals) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5.5);
        doc.setTextColor(...C.primary);
        doc.text(`${pt.margin.toFixed(1)}%`, pt.px, pt.py - 4, { align: "center" });
      }
    }

    // X-axis labels (skip alternate when crowded)
    const labelSkip = n > 9 ? 2 : 1;
    for (let i = 0; i < pts.length; i += labelSkip) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.5);
      doc.setTextColor(...C.muted);
      doc.text(shortPeriod(chartData[i].period), pts[i].px, plotY + plotH + 9, { align: "center" });
    }
  }
}

// ── Page 1: filters + main indicators + complementary cards ───────────────────

function buildPage1(doc: jsPDF, p: DashboardPdfParams, competenceLabel: string, generatedAt: string) {
  const W = doc.internal.pageSize.getWidth();
  const maxW = W - 28;

  drawStripeHeader(doc, p.modelName);

  // Page title block
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...C.primary);
  doc.text("Dashboard Financeiro", 14, 32);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...C.muted);
  doc.text("Indicadores acionaveis dos DREs finalizados nas competencias selecionadas.", 14, 39);

  // Top-right generation info
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.muted);
  doc.text(`Gerado em ${generatedAt}`, W - 14, 32, { align: "right" });
  doc.text("Gestor de DRE  |  Gestores em Foco", W - 14, 38, { align: "right" });

  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.35);
  doc.line(14, 44, W - 14, 44);

  let y = CONTENT_TOP;

  // ── Filtros aplicados ──────────────────────────────────────────────────────
  y = sectionTitle(doc, "Filtros aplicados", y);

  doc.setFillColor(...C.softBlue);
  doc.roundedRect(14, y, maxW, 22, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.muted);
  doc.text("Competencias:", 20, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.text);
  const compLines = doc.splitTextToSize(competenceLabel, maxW - 52);
  doc.text(compLines, 58, y + 7);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.muted);
  doc.text("Modelo DRE:", 20, y + 16);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.text);
  doc.text(p.modelName ?? "Nao identificado", 58, y + 16);

  y += 28;

  // ── Indicadores principais ─────────────────────────────────────────────────
  y = sectionTitle(doc, "Indicadores principais", y);

  const cardW = (maxW - 6) / 2;
  const cardH = 33;

  const revVariation = !p.hasSinglePeriod && p.indicators?.revenue.variation != null
    ? `Variacao: ${p.indicators.revenue.variation >= 0 ? "+" : ""}${formatPercentage(p.indicators.revenue.variation)}`
    : undefined;
  const revVarColor: [number, number, number] | undefined =
    p.indicators?.revenue.variation != null
      ? (p.indicators.revenue.variation >= 0 ? C.positive : C.negative)
      : undefined;

  metricCard(doc, 14, y, cardW, cardH, "Faturamento", formatCurrency(p.revenueValue), revVariation, revVarColor);

  const npVariation = !p.hasSinglePeriod && p.indicators?.net_profit.variation != null
    ? `Variacao: ${p.indicators.net_profit.variation >= 0 ? "+" : ""}${formatPercentage(p.indicators.net_profit.variation)}`
    : undefined;
  const npColor: [number, number, number] = p.netProfitValue >= 0 ? C.positive : C.negative;
  metricCard(doc, 14 + cardW + 6, y, cardW, cardH, "Lucro Liquido", formatCurrency(p.netProfitValue), npVariation, npColor);

  y += cardH + 4;

  const marginLevel = p.indicators?.net_margin.level ?? null;
  const marginDetail = marginLevel ? `Nivel: ${indLevelLabel(marginLevel)}` : undefined;
  metricCard(doc, 14, y, cardW, cardH, "Margem de Lucro", formatPercentage(p.netMarginValue), marginDetail, indLevelColor(marginLevel));

  const grossLevel = p.grossMarginUnavailable ? null : (p.indicators?.gross_margin.level ?? null);
  const grossVal = p.grossMarginUnavailable ? "Ajuste o modelo" : formatPercentage(p.grossMarginValue ?? 0);
  const grossDetail = p.grossMarginUnavailable ? "Configure a linha de Margem Bruta no modelo" : (grossLevel ? `Nivel: ${indLevelLabel(grossLevel)}` : undefined);
  const grossDetailColor: [number, number, number] | undefined = p.grossMarginUnavailable ? C.amber : (grossLevel ? indLevelColor(grossLevel) : undefined);
  metricCard(doc, 14 + cardW + 6, y, cardW, cardH, "Margem Bruta", grossVal, grossDetail, grossDetailColor);

  y += cardH + 8;

  // ── Indicadores complementares ────────────────────────────────────────────
  y = sectionTitle(doc, "Indicadores complementares", y);

  const compW = (maxW - 8) / 3;
  const compH = 30;

  compactCard(
    doc, 14, y, compW, compH,
    "Eficiencia operacional",
    `De cada R$ 100 faturados, R$ ${p.operationalEfficiency} chegam ao lucro`,
  );

  if (p.hasSinglePeriod) {
    const periodStr = p.analyzedPeriodLabel && p.analyzedPeriodMargin !== null
      ? `${p.analyzedPeriodLabel}  |  ${formatPercentage(p.analyzedPeriodMargin)}`
      : "—";
    compactCard(doc, 14 + compW + 4, y, compW * 2 + 4, compH, "Periodo analisado", periodStr);
  } else {
    const bestStr = p.indicators?.best_period.fallbackMessage
      ? "—"
      : `${p.indicators?.best_period.period ?? "—"}  |  ${formatPercentage(p.indicators?.best_period.margin ?? 0)}`;
    const worstStr = p.indicators?.worst_period.fallbackMessage
      ? "—"
      : `${p.indicators?.worst_period.period ?? "—"}  |  ${formatPercentage(p.indicators?.worst_period.margin ?? 0)}`;

    compactCard(doc, 14 + compW + 4, y, compW, compH, "Melhor mes", bestStr);
    compactCard(doc, 14 + compW * 2 + 8, y, compW, compH, "Pior mes", worstStr);
  }

  y += compH + 5;
  return y;
}

// ── Page 2: chart + alerts ─────────────────────────────────────────────────────

function buildPage2(doc: jsPDF, p: DashboardPdfParams) {
  doc.addPage();
  const W = doc.internal.pageSize.getWidth();
  const maxW = W - 28;

  drawStripeHeader(doc, p.modelName);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...C.primary);
  doc.text("Evolucao e Alertas", 14, 32);

  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.35);
  doc.line(14, 37, W - 14, 37);

  let y = 44;

  // ── Gráfico ────────────────────────────────────────────────────────────────
  y = sectionTitle(doc, "Evolucao da margem de lucro", y);

  const chartH = 68;
  drawMarginChart(doc, p.chartData, 14, y, maxW, chartH);

  y += chartH + 10;

  // ── Alertas ────────────────────────────────────────────────────────────────
  y = sectionTitle(doc, "Alertas prioritarios", y);

  if (p.alerts.length === 0) {
    doc.setFillColor(...C.lightGray);
    doc.roundedRect(14, y, maxW, 14, 2, 2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text("Nenhum alerta identificado para os periodos selecionados.", 14 + maxW / 2, y + 9, { align: "center" });
    y += 18;
  } else {
    for (const alert of p.alerts) {
      const descLines = doc.splitTextToSize(alert.description, maxW - 12);
      const boxH = Math.max(26, 8 + 6 + 5 + descLines.length * 3.8 + 5);

      if (y + boxH > contentBottom(doc)) {
        doc.addPage();
        drawStripeHeader(doc, p.modelName);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(...C.primary);
        doc.text("Alertas (continuacao)", 14, 32);
        doc.setDrawColor(...C.border);
        doc.setLineWidth(0.3);
        doc.line(14, 37, W - 14, 37);
        y = 44;
      }

      const bg = alertBg(alert.level);
      const fg = alertColor(alert.level);

      doc.setFillColor(...bg);
      doc.setDrawColor(...fg);
      doc.setLineWidth(0.3);
      doc.roundedRect(14, y, maxW, boxH, 2, 2, "FD");

      // Level badge
      doc.setFillColor(...fg);
      doc.roundedRect(18, y + 5, 20, 7, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...C.white);
      doc.text(alertLabel(alert.level), 28, y + 10, { align: "center" });

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...C.text);
      const titleMaxW = maxW - 60;
      const titleLines = doc.splitTextToSize(alert.title, titleMaxW);
      doc.text(titleLines, 41, y + 10);

      // Impact (right-aligned)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...fg);
      doc.text(alert.impact_description, W - 18, y + 10, { align: "right" });

      // Description
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...C.text);
      doc.text(descLines, 18, y + 19);

      y += boxH + 4;
    }
  }

  return y;
}

// ── Page 3: analysis summary ───────────────────────────────────────────────────

function buildPage3(doc: jsPDF, p: DashboardPdfParams, competenceLabel: string, generatedAt: string) {
  doc.addPage();
  const W = doc.internal.pageSize.getWidth();
  const maxW = W - 28;

  drawStripeHeader(doc, p.modelName);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...C.primary);
  doc.text("Resumo da Analise", 14, 32);

  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.35);
  doc.line(14, 37, W - 14, 37);

  let y = 44;

  // ── Diagnóstico executivo (se disponível) ──────────────────────────────────
  if (p.advancedAnalysis?.executive_summary) {
    y = sectionTitle(doc, "Diagnostico executivo", y);
    const es = p.advancedAnalysis.executive_summary;

    const blocks: Array<{ title: string; text: string }> = [
      { title: "Visao geral", text: es.overview },
      { title: "Principal ponto de atencao", text: es.main_concern },
      { title: "Causas identificadas", text: es.causes.join("  |  ") },
      { title: "Impacto quantificado", text: es.impact },
      { title: "Direcionamento", text: es.direction },
    ];

    for (const block of blocks) {
      if (y > contentBottom(doc) - 20) break;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...C.accent);
      doc.text(block.title.toUpperCase(), 14, y);
      y += 4;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...C.text);
      const lines = doc.splitTextToSize(block.text, maxW);
      doc.text(lines, 14, y);
      y += lines.length * 4.2 + 6;
    }

    y += 4;
  }

  // ── Resumo automático dos dados ────────────────────────────────────────────
  y = sectionTitle(doc, "Resumo dos dados do periodo", y);

  const bullets: string[] = [];
  bullets.push(`O faturamento total no periodo selecionado foi de ${formatCurrency(p.revenueValue)}.`);
  bullets.push(`O lucro liquido acumulado foi de ${formatCurrency(p.netProfitValue)}.`);
  bullets.push(`A margem de lucro media ficou em ${formatPercentage(p.netMarginValue)}.`);

  if (!p.grossMarginUnavailable && p.grossMarginValue !== null) {
    bullets.push(`A margem bruta foi de ${formatPercentage(p.grossMarginValue)}.`);
  }

  bullets.push(`Eficiencia: de cada R$ 100 faturados, R$ ${p.operationalEfficiency} chegaram ao lucro liquido.`);

  if (!p.hasSinglePeriod) {
    if (p.indicators?.best_period && !p.indicators.best_period.fallbackMessage) {
      bullets.push(`O melhor desempenho ocorreu em ${p.indicators.best_period.period} com margem de ${formatPercentage(p.indicators.best_period.margin)}.`);
    }
    if (p.indicators?.worst_period && !p.indicators.worst_period.fallbackMessage) {
      bullets.push(`O pior desempenho ocorreu em ${p.indicators.worst_period.period} com margem de ${formatPercentage(p.indicators.worst_period.margin)}.`);
    }
  }

  const highAlerts = p.alerts.filter((a) => a.level === "HIGH");
  if (highAlerts.length > 0) {
    bullets.push(`${highAlerts.length} alerta(s) de nivel ALTO identificado(s): ${highAlerts.map((a) => a.title).join("; ")}.`);
  } else {
    bullets.push("Nenhum alerta de nivel ALTO identificado no periodo.");
  }

  bullets.push(`Competencias analisadas: ${competenceLabel}.`);
  bullets.push(`Relatorio gerado em: ${generatedAt}.`);
  bullets.push("Aviso: valores conforme filtros aplicados no dashboard.");

  // Measure box height
  let totalLines = 0;
  const wrappedBullets: string[][] = bullets.map((b) => {
    const lines = doc.splitTextToSize(`• ${b}`, maxW - 8);
    totalLines += lines.length;
    return lines;
  });
  const boxH = totalLines * 4.5 + 10;

  doc.setFillColor(...C.lightGray);
  doc.roundedRect(14, y, maxW, boxH, 2, 2, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...C.text);
  let lineY = y + 8;
  for (const lines of wrappedBullets) {
    doc.text(lines, 20, lineY);
    lineY += lines.length * 4.5;
  }
}

// ── Footers pass ───────────────────────────────────────────────────────────────

function applyAllFooters(doc: jsPDF, generatedAt: string) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawFooter(doc, i, total, generatedAt);
  }
}

// ── File name ──────────────────────────────────────────────────────────────────

function buildFilename(competences: string[]): string {
  if (competences.length <= 3) {
    return `Dashboard DRE - ${competences.join(", ")}.pdf`;
  }
  return `Dashboard DRE - ${competences[0]} a ${competences[competences.length - 1]}.pdf`;
}

// ── Main export function ───────────────────────────────────────────────────────

export function exportDashboardDrePdf(params: DashboardPdfParams): void {
  if (params.revenueValue === 0 && params.chartData.length === 0) return;

  const levelOrder: Record<AlertLevel, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  const sortedParams: DashboardPdfParams = {
    ...params,
    alerts: [...params.alerts].sort((a, b) => {
      if (levelOrder[a.level] !== levelOrder[b.level]) return levelOrder[a.level] - levelOrder[b.level];
      return Math.abs(b.impact_value) - Math.abs(a.impact_value);
    }),
  };

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const competenceLabel = sortedParams.selectedCompetences.map(formatCompetence).join(", ");
  const generatedAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date());

  buildPage1(doc, sortedParams, competenceLabel, generatedAt);
  buildPage2(doc, sortedParams);
  buildPage3(doc, sortedParams, competenceLabel, generatedAt);

  applyAllFooters(doc, generatedAt);

  doc.save(buildFilename(sortedParams.selectedCompetences));
}
