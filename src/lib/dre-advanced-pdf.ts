import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { formatCurrency, formatPercentage } from "@/lib/dre-calculations";
import type { AdvancedDreAnalysis, AlertLevel } from "@/lib/dre-advanced-analysis";

// ── Palette ────────────────────────────────────────────────────────────────────

const C = {
  primary: [15, 43, 70] as [number, number, number],
  primarySoft: [230, 237, 246] as [number, number, number],
  accent: [180, 83, 9] as [number, number, number],
  border: [219, 226, 236] as [number, number, number],
  text: [24, 31, 42] as [number, number, number],
  muted: [91, 102, 118] as [number, number, number],
  positive: [5, 150, 105] as [number, number, number],
  negative: [220, 38, 38] as [number, number, number],
  amber: [217, 119, 6] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  lightGray: [246, 248, 251] as [number, number, number],
  red50: [254, 242, 242] as [number, number, number],
  amber50: [255, 251, 235] as [number, number, number],
  green50: [240, 253, 244] as [number, number, number],
};

function levelColor(level: AlertLevel): [number, number, number] {
  return level === "HIGH" ? C.negative : level === "MEDIUM" ? C.amber : C.positive;
}

function indicatorValue(value: string, fallbackMessage?: string) {
  return fallbackMessage ?? value;
}

function indicatorVariation(variation: number | null) {
  if (variation === null || variation === 0) return "—";
  return `${variation > 0 ? "+" : ""}${formatPercentage(variation)}`;
}

function indicatorLevel(level: AlertLevel | null) {
  return level ?? null;
}

function levelBg(level: AlertLevel): [number, number, number] {
  return level === "HIGH" ? C.red50 : level === "MEDIUM" ? C.amber50 : C.green50;
}

// ── Drawing helpers ────────────────────────────────────────────────────────────

function drawHeader(doc: jsPDF, params: { title: string; subtitle: string; modelName: string; pageLabel?: string }) {
  const { title, subtitle, modelName, pageLabel } = params;
  const W = doc.internal.pageSize.getWidth();

  doc.setFillColor(...C.primary);
  doc.rect(0, 0, W, 22, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...C.white);
  doc.text("GESTOR DRE", 14, 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(200, 215, 230);
  doc.text(modelName, 14, 15);

  if (pageLabel) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...C.white);
    doc.text(pageLabel, W - 14, 9, { align: "right" });
  }

  doc.setTextColor(...C.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title, 14, 34);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.muted);
  doc.text(subtitle, 14, 41);

  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.4);
  doc.line(14, 45, W - 14, 45);
}

function drawFooter(doc: jsPDF, pageNum: number, total: number, modelName: string) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(14, H - 14, W - 14, H - 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.muted);
  doc.text(modelName, 14, H - 8);
  doc.text("Análise Detalhada de DRE", W / 2, H - 8, { align: "center" });
  doc.text(`Página ${pageNum} de ${total}`, W - 14, H - 8, { align: "right" });
}

function sectionTitle(doc: jsPDF, text: string, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...C.accent);
  doc.text(text.toUpperCase(), 14, y);
  const W = doc.internal.pageSize.getWidth();
  doc.setDrawColor(...C.accent);
  doc.setLineWidth(0.5);
  doc.line(14, y + 2, W - 14, y + 2);
  doc.setTextColor(...C.text);
}

function bodyText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, fontSize = 9) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(...C.text);
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * (fontSize * 0.45);
}

function ensureSpace(doc: jsPDF, y: number, needed: number, header: { title: string; subtitle: string; modelName: string; pageLabel?: string }) {
  const H = doc.internal.pageSize.getHeight();
  if (y + needed <= H - 22) return y;
  doc.addPage();
  drawHeader(doc, header);
  return 52;
}

// ── Cover page ─────────────────────────────────────────────────────────────────

function addCoverPage(doc: jsPDF, analysis: AdvancedDreAnalysis) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Header stripe
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, W, 60, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(180, 200, 220);
  doc.text("GESTOR DRE · RELATÓRIO EXECUTIVO", 14, 20);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...C.white);
  doc.text("Análise Detalhada de", 14, 36);
  doc.text("Demonstração de Resultado", 14, 47);

  // Subtitle block
  const periods = analysis.metadata.periods_count;
  doc.setFillColor(...C.primarySoft);
  doc.rect(14, 72, W - 28, 28, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...C.primary);
  doc.text(analysis.metadata.model_name, 20, 83);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.muted);
  doc.text(`${periods} ${periods === 1 ? "período analisado" : "períodos analisados"}`, 20, 90);
  doc.text(`Emitido em ${analysis.metadata.generated_at.toLocaleDateString("pt-BR")}`, 20, 96);

  // Key indicator cards (3 inline)
  const ind = analysis.indicators;
  const cardW = (W - 28 - 8) / 3;
  const cardY = 112;
  const cardData = [
    { label: "Faturamento", value: formatCurrency(ind.revenue.value), color: C.primary },
    { label: "Lucro Líquido", value: indicatorValue(formatCurrency(ind.net_profit.value), ind.net_profit.fallbackMessage), color: ind.net_profit.value >= 0 ? C.positive : C.negative },
    { label: "Margem Líquida", value: indicatorValue(formatPercentage(ind.net_margin.value), ind.net_margin.fallbackMessage), color: ind.net_margin.value >= 8 ? C.positive : ind.net_margin.value >= 3 ? C.amber : C.negative },
  ];
  cardData.forEach((card, i) => {
    const x = 14 + i * (cardW + 4);
    doc.setFillColor(...C.white);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, cardY, cardW, 28, 3, 3, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text(card.label, x + 6, cardY + 9);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(card.value.length > 28 ? 7 : 13);
    doc.setTextColor(...card.color);
    doc.text(card.value, x + 6, cardY + 21);
  });

  // Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  doc.text("Relatório gerado automaticamente pelo Gestor DRE", W / 2, H - 10, { align: "center" });
}

// ── Executive summary page ─────────────────────────────────────────────────────

function addExecutiveSummaryPage(doc: jsPDF, analysis: AdvancedDreAnalysis, modelName: string) {
  doc.addPage();
  const W = doc.internal.pageSize.getWidth();
  const maxW = W - 28;

  drawHeader(doc, { title: "Resumo Executivo", subtitle: "Diagnóstico consolidado do período", modelName, pageLabel: "Seção 1" });

  let y = 52;
  const es = analysis.executive_summary;

  const blocks = [
    { title: "VISÃO GERAL", text: es.overview },
    { title: "PRINCIPAL PONTO DE ATENÇÃO", text: es.main_concern },
    { title: "CAUSAS IDENTIFICADAS", text: es.causes.join(" • ") },
    { title: "IMPACTO QUANTIFICADO", text: es.impact },
    { title: "DIRECIONAMENTO", text: es.direction },
  ];

  for (const block of blocks) {
    if (y > 240) break;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...C.accent);
    doc.text(block.title, 14, y);
    y += 4;

    y = bodyText(doc, block.text, 14, y, maxW) + 6;
  }
}

// ── Indicators page ────────────────────────────────────────────────────────────

function addIndicatorsPage(doc: jsPDF, analysis: AdvancedDreAnalysis, modelName: string) {
  doc.addPage();
  const W = doc.internal.pageSize.getWidth();

  drawHeader(doc, { title: "Indicadores Principais", subtitle: "Métricas do período mais recente", modelName, pageLabel: "Seção 2" });

  const ind = analysis.indicators;
  const rows = [
    ["Faturamento", indicatorValue(formatCurrency(ind.revenue.value), ind.revenue.fallbackMessage), indicatorVariation(ind.revenue.variation), indicatorLevel(ind.revenue.level)],
    ["Lucro Líquido", indicatorValue(formatCurrency(ind.net_profit.value), ind.net_profit.fallbackMessage), indicatorVariation(ind.net_profit.variation), indicatorLevel(ind.net_profit.level)],
    ["Margem Líquida", indicatorValue(formatPercentage(ind.net_margin.value), ind.net_margin.fallbackMessage), indicatorVariation(ind.net_margin.variation), indicatorLevel(ind.net_margin.level)],
    ["Margem Bruta", indicatorValue(formatPercentage(ind.gross_margin.value), ind.gross_margin.fallbackMessage), indicatorVariation(ind.gross_margin.variation), indicatorLevel(ind.gross_margin.level)],
    ["Margem Operacional", indicatorValue(formatPercentage(ind.operating_margin.value), ind.operating_margin.fallbackMessage), indicatorVariation(ind.operating_margin.variation), indicatorLevel(ind.operating_margin.level)],
    ...(!ind.ebitda.fallbackMessage ? [["EBITDA — Margem (est.)", formatPercentage(ind.ebitda.value), indicatorVariation(ind.ebitda.variation), indicatorLevel(ind.ebitda.level)]] : []),
    ["Total de Despesas", indicatorValue(formatCurrency(ind.total_expenses.value), ind.total_expenses.fallbackMessage), indicatorVariation(ind.total_expenses.variation), indicatorLevel(ind.total_expenses.level)],
    ["Melhor Período", ind.best_period.fallbackMessage ?? ind.best_period.period, ind.best_period.fallbackMessage ? "—" : formatPercentage(ind.best_period.margin), ind.best_period.fallbackMessage ? null : "LOW"],
    ["Pior Período", ind.worst_period.fallbackMessage ?? ind.worst_period.period, ind.worst_period.fallbackMessage ? "—" : formatPercentage(ind.worst_period.margin), ind.worst_period.fallbackMessage ? null : "HIGH"],
    ["Variação Acumulada (receita)", ind.cumulative_variation.fallbackMessage ?? `${ind.cumulative_variation.value >= 0 ? "+" : ""}${formatPercentage(ind.cumulative_variation.value)}`, "—", indicatorLevel(ind.cumulative_variation.level)],
    ["Índice de Eficiência", ind.efficiency_index.fallbackMessage ?? `${ind.efficiency_index.value.toFixed(2)}x`, "—", indicatorLevel(ind.efficiency_index.level)],
  ];

  const levelLabel: Record<AlertLevel, string> = { HIGH: "ALTO", MEDIUM: "MÉDIO", LOW: "BAIXO" };

  autoTable(doc, {
    startY: 52,
    margin: { left: 14, right: 14 },
    head: [["Indicador", "Valor", "Variação", "Nível"]],
    body: rows.map(([a, b, c, d]) => [a, b, c, d ? levelLabel[d as AlertLevel] : "—"]),
    theme: "plain",
    styles: { fontSize: 9, cellPadding: { top: 3, right: 4, bottom: 3, left: 4 }, lineColor: C.border, lineWidth: 0.1 },
    headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: "bold", fontSize: 8.5 },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" }, 2: { halign: "right" }, 3: { halign: "center" } },
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 3) {
        const level = rows[data.row.index]?.[3] as AlertLevel | null;
        if (level) {
          data.cell.styles.textColor = levelColor(level);
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  if (ind.ebitda.fallbackMessage) {
    const y = ((doc as any).lastAutoTable?.finalY ?? 52) + 8;
    bodyText(doc, ind.ebitda.fallbackMessage, 14, y, W - 28, 8);
  }
}

// ── Margins page ───────────────────────────────────────────────────────────────

function addMarginsPage(doc: jsPDF, analysis: AdvancedDreAnalysis, modelName: string) {
  doc.addPage();
  const W = doc.internal.pageSize.getWidth();
  const maxW = W - 28;

  drawHeader(doc, { title: "Análise de Margens", subtitle: "Evolução histórica das margens por período", modelName, pageLabel: "Seção 3" });

  const rows = analysis.margins.net.map((n, i) => [
    n.period,
    formatPercentage(analysis.margins.gross[i]?.value ?? 0),
    formatPercentage(analysis.margins.operating[i]?.value ?? 0),
    formatPercentage(n.value),
  ]);

  autoTable(doc, {
    startY: 52,
    margin: { left: 14, right: 14 },
    head: [["Período", "Margem Bruta (est.)", "Margem Operacional (est.)", "Margem Líquida"]],
    body: rows,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: { top: 3, right: 4, bottom: 3, left: 4 }, lineColor: C.border, lineWidth: 0.1 },
    headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: "bold", fontSize: 8.5 },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right", fontStyle: "bold" } },
  });

  const tableY = (doc as any).lastAutoTable?.finalY ?? 100;
  let y = tableY + 10;

  sectionTitle(doc, "Insights", y);
  y += 8;

  for (const insight of analysis.margins.insights) {
    const lines = doc.splitTextToSize(`• ${insight}`, maxW - 8);
    y = ensureSpace(doc, y, lines.length * 4 + 10, { title: "Análise de Margens", subtitle: "Evolução histórica das margens por período", modelName, pageLabel: "Seção 3" });
    doc.setFillColor(...C.lightGray);
    doc.roundedRect(14, y - 3, maxW, lines.length * 4 + 6, 2, 2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.text);
    doc.text(lines, 18, y + 3);
    y += lines.length * 4 + 8;
  }
}

// ── Variations page ────────────────────────────────────────────────────────────

function addVariationsPage(doc: jsPDF, analysis: AdvancedDreAnalysis, modelName: string) {
  doc.addPage();
  const W = doc.internal.pageSize.getWidth();
  const maxW = W - 28;

  drawHeader(doc, { title: "Ponte de Resultado", subtitle: "O que reduziu e o que melhorou o lucro entre o primeiro e o último período", modelName, pageLabel: "Seção 4" });

  const bridge = analysis.result_bridge;
  if (!bridge) return;

  let y = 52;
  bodyText(doc, `Resultado do primeiro período (${bridge.first_period.label}): ${formatCurrency(bridge.first_period.result)} (margem ${formatPercentage(bridge.first_period.margin)})`, 14, y, maxW, 9);
  y += 6;
  bodyText(doc, `Resultado do último período (${bridge.last_period.label}): ${formatCurrency(bridge.last_period.result)} (margem ${formatPercentage(bridge.last_period.margin)})`, 14, y, maxW, 9);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(bridge.total_variation < 0 ? C.negative[0] : C.positive[0], bridge.total_variation < 0 ? C.negative[1] : C.positive[1], bridge.total_variation < 0 ? C.negative[2] : C.positive[2]);
  doc.text(`Variação total: ${bridge.total_variation > 0 ? "+" : ""}${formatCurrency(bridge.total_variation)}`, 14, y + 2);
  y += 12;

  const drawBlock = (title: string, total: number, items: typeof bridge.reduced, color: [number, number, number], hidden: number) => {
    y = ensureSpace(doc, y, 20, { title: "Ponte de Resultado", subtitle: "O que reduziu e o que melhorou o lucro entre o primeiro e o último período", modelName, pageLabel: "Seção 4" });
    doc.setDrawColor(...C.border);
    doc.line(14, y, W - 14, y);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...C.text);
    doc.text(title, 14, y);
    doc.setTextColor(...color);
    doc.text(`Total: ${total > 0 ? "+" : ""}${formatCurrency(total)}`, W - 14, y, { align: "right" });
    y += 7;

    for (const item of items) {
      y = ensureSpace(doc, y, 9, { title: "Ponte de Resultado", subtitle: "O que reduziu e o que melhorou o lucro entre o primeiro e o último período", modelName, pageLabel: "Seção 4" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...C.text);
      const nameLines = doc.splitTextToSize(item.label, maxW - 48);
      doc.text(nameLines, 18, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...color);
      doc.text(`${item.result_impact > 0 ? "+" : ""}${formatCurrency(item.result_impact)}`, W - 14, y, { align: "right" });
      y += Math.max(6, nameLines.length * 4);
    }

    if (hidden > 0) {
      y = ensureSpace(doc, y, 7, { title: "Ponte de Resultado", subtitle: "O que reduziu e o que melhorou o lucro entre o primeiro e o último período", modelName, pageLabel: "Seção 4" });
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...C.muted);
      doc.text(`+ ${hidden} itens adicionais`, 18, y);
      y += 7;
    }
    y += 4;
  };

  drawBlock("O que reduziu o resultado", bridge.reduced_total, bridge.reduced, C.negative, bridge.hidden_reduced_count);
  drawBlock("O que melhorou o resultado", bridge.improved_total, bridge.improved, C.positive, bridge.hidden_improved_count);
}

// ── Alerts page ────────────────────────────────────────────────────────────────

function addAlertsPage(doc: jsPDF, analysis: AdvancedDreAnalysis, modelName: string) {
  doc.addPage();
  const W = doc.internal.pageSize.getWidth();
  const maxW = W - 28;
  const header = { title: "Alertas Automáticos", subtitle: "Ordenados por nível e impacto financeiro", modelName, pageLabel: "Seção 5" };

  drawHeader(doc, header);

  const levelLabel: Record<AlertLevel, string> = { HIGH: "ALTO", MEDIUM: "MÉDIO", LOW: "BAIXO" };
  let y = 52;

  for (const alert of analysis.alerts) {
    const bgColor = levelBg(alert.level);
    const descLines = doc.splitTextToSize(alert.description, maxW - 10);
    const recLines = doc.splitTextToSize(`Recomendação: ${alert.recommendation}`, maxW - 10);
    const h = Math.max(26, 16 + descLines.length * 3.5 + recLines.length * 3.3);
    y = ensureSpace(doc, y, h + 4, header);
    doc.setFillColor(...bgColor);
    doc.roundedRect(14, y, maxW, h, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...levelColor(alert.level));
    doc.text(`[${levelLabel[alert.level]}] ${alert.title}`, 18, y + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.text);
    doc.text(descLines, 18, y + 13);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.text(recLines, 18, y + 15 + descLines.length * 3.5);

    y += h + 4;
  }
}

// ── Recommendations page ───────────────────────────────────────────────────────

function addRecommendationsPage(doc: jsPDF, analysis: AdvancedDreAnalysis, modelName: string) {
  doc.addPage();
  const W = doc.internal.pageSize.getWidth();
  const maxW = W - 28;
  const header = { title: "Recomendações Gerenciais", subtitle: "Priorizadas por impacto esperado", modelName, pageLabel: "Seção 6" };

  drawHeader(doc, header);

  const timelineLabel: Record<string, string> = { short: "Curto prazo", medium: "Médio prazo", long: "Longo prazo" };
  let y = 52;

  for (const rec of analysis.recommendations) {
    const justLines = doc.splitTextToSize(rec.justification, maxW - 14);
    const impactLines = rec.estimated_impact ? doc.splitTextToSize(`Impacto estimado: ${rec.estimated_impact}`, maxW - 20) : [];
    const needed = 22 + justLines.length * 4 + (impactLines.length ? impactLines.length * 4 + 10 : 0);
    y = ensureSpace(doc, y, needed, header);

    // Number circle
    doc.setFillColor(...C.primary);
    doc.circle(18, y + 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...C.white);
    doc.text(String(rec.priority), 18, y + 5.5, { align: "center" });

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...C.primary);
    doc.text(rec.title, 26, y + 5);

    // Timeline badge
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.muted);
    doc.text(`[${timelineLabel[rec.suggested_timeline] ?? rec.suggested_timeline}]`, W - 14, y + 5, { align: "right" });

    y += 10;

    // Justification
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.text);
    doc.text(justLines, 26, y);
    y += justLines.length * 4 + 2;

    // Impact
    if (rec.estimated_impact) {
      doc.setFillColor(...C.green50);
      const boxH = impactLines.length * 4 + 4;
      doc.roundedRect(26, y, maxW - 14, boxH, 1.5, 1.5, "F");
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(...C.positive);
      doc.text(impactLines, 30, y + 4);
      y += boxH + 4;
    }

    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.2);
    doc.line(26, y, W - 14, y);
    y += 5;
  }
}

// ── Footer numbers ─────────────────────────────────────────────────────────────

function addFooters(doc: jsPDF, modelName: string) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawFooter(doc, i, total, modelName);
  }
}

// ── Main export ────────────────────────────────────────────────────────────────

export async function exportAdvancedDrePdf(analysis: AdvancedDreAnalysis): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const modelName = analysis.metadata.model_name;

  addCoverPage(doc, analysis);
  addExecutiveSummaryPage(doc, analysis, modelName);
  addIndicatorsPage(doc, analysis, modelName);
  addMarginsPage(doc, analysis, modelName);
  if (analysis.variations.length > 0) addVariationsPage(doc, analysis, modelName);
  if (analysis.alerts.length > 0) addAlertsPage(doc, analysis, modelName);
  if (analysis.recommendations.length > 0) addRecommendationsPage(doc, analysis, modelName);

  addFooters(doc, modelName);

  const date = analysis.metadata.generated_at.toISOString().slice(0, 10);
  doc.save(`analise-dre-${date}.pdf`);
}
