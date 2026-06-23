import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { formatCurrency, formatPercentage } from "@/lib/dre-calculations";
import {
  buildManagerialDreReport,
  formatManagerialVertical,
  type ManagerialDreReport,
  type ManagerialReportRow,
  type ManagerialStatus,
} from "@/lib/dre-managerial-analysis";
import type { DreAnalysisResult } from "@/lib/dre-analysis";

const C = {
  primary: [15, 43, 70] as [number, number, number],
  primarySoft: [229, 237, 246] as [number, number, number],
  accent: [180, 83, 9] as [number, number, number],
  border: [219, 226, 236] as [number, number, number],
  text: [24, 31, 42] as [number, number, number],
  muted: [91, 102, 118] as [number, number, number],
  positive: [5, 150, 105] as [number, number, number],
  critical: [185, 28, 28] as [number, number, number],
  attention: [217, 119, 6] as [number, number, number],
  neutral: [100, 116, 139] as [number, number, number],
  blue: [37, 99, 235] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  light: [248, 250, 252] as [number, number, number],
  red50: [254, 242, 242] as [number, number, number],
  amber50: [255, 251, 235] as [number, number, number],
  green50: [240, 253, 244] as [number, number, number],
  blue50: [239, 246, 255] as [number, number, number],
};

const PAGE = {
  left: 10,
  right: 10,
  top: 28,
  bottom: 14,
};

export async function exportManagerialDrePdf(result: DreAnalysisResult, modelName: string): Promise<void> {
  const report = buildManagerialDreReport(result, modelName);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  drawHeader(doc, report);
  let y = 34;
  y = drawCards(doc, report, y);
  y = drawSummaryText(doc, report, y);
  y = drawAlerts(doc, report, y);
  y = drawManagerialTable(doc, report, y);
  y = drawHighlights(doc, report, y);
  drawObservations(doc, report, y);
  addFooters(doc, report);

  const date = report.generatedAt.toISOString().slice(0, 10);
  doc.save(`analise-gerencial-dre-${date}.pdf`);
}

function drawHeader(doc: jsPDF, report: ManagerialDreReport) {
  const W = doc.internal.pageSize.getWidth();
  const generatedAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(report.generatedAt);
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, W, 20, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...C.white);
  doc.text("GESTOR DRE", PAGE.left, 8);

  doc.setFontSize(15);
  doc.text("Análise Gerencial de DRE", PAGE.left, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(205, 216, 230);
  doc.text(report.modelName || "Modelo de DRE", W - PAGE.right, 8, { align: "right" });
  doc.text(`Gerado em ${generatedAt}`, W - PAGE.right, 13, { align: "right" });
  doc.text(`Períodos: ${report.periods.map((period) => period.label).join(", ")}`, W - PAGE.right, 18, { align: "right" });
}

function drawCards(doc: jsPDF, report: ManagerialDreReport, y: number) {
  const W = doc.internal.pageSize.getWidth();
  const gap = 3;
  const columns = 5;
  const cardW = (W - PAGE.left - PAGE.right - gap * (columns - 1)) / columns;
  const cardH = 22;
  report.cards.forEach((card, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = PAGE.left + col * (cardW + gap);
    const cy = y + row * (cardH + 3);
    doc.setFillColor(...statusBackground(card.tone));
    doc.setDrawColor(...C.border);
    doc.roundedRect(x, cy, cardW, cardH, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.3);
    doc.setTextColor(...C.muted);
    doc.text(card.title, x + 3, cy + 5);

    doc.setFontSize(8.2);
    doc.setTextColor(...statusColor(card.tone));
    doc.text(card.currentValue ?? "-", x + 3, cy + 11.5, { maxWidth: cardW - 6 });

    const detail = [card.previousLabel && card.previousValue ? `${card.previousLabel}: ${card.previousValue}` : "", card.variation ? `Var.: ${card.variation}` : ""].filter(Boolean).join("  ");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.setTextColor(...C.muted);
    doc.text(detail || card.currentLabel || "", x + 3, cy + 18, { maxWidth: cardW - 6 });
  });
  return y + Math.ceil(report.cards.length / columns) * (cardH + 3) + 4;
}

function drawSummaryText(doc: jsPDF, report: ManagerialDreReport, y: number) {
  y = ensureSpace(doc, report, y, 28);
  sectionTitle(doc, "Resumo da Análise", y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.text);
  for (const text of report.summaryText) {
    const lines = doc.splitTextToSize(`• ${text}`, 132);
    doc.text(lines, PAGE.left, y);
    y += lines.length * 3.6 + 1;
  }
  return y + 2;
}

function drawAlerts(doc: jsPDF, report: ManagerialDreReport, y: number) {
  y = ensureSpace(doc, report, y, 30);
  sectionTitle(doc, "Principais Alertas Gerenciais", y);
  y += 6;

  const alerts = report.alerts.length ? report.alerts.slice(0, 8) : [];
  if (alerts.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text("Nenhum alerta crítico ou de atenção foi identificado para os períodos comparados.", PAGE.left, y);
    return y + 8;
  }

  autoTable(doc, {
    startY: y,
    margin: { left: PAGE.left, right: PAGE.right },
    head: [["Linha", "Anterior", "Atual", "Var. R$", "Var. %", "AV ant.", "AV atual", "Var. AV", "Status"]],
    body: alerts.map((row) => rowToCompactCells(row)),
    theme: "plain",
    styles: { fontSize: 6.6, cellPadding: { top: 1.8, right: 1.8, bottom: 1.8, left: 1.8 }, lineColor: C.border, lineWidth: 0.1 },
    headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: "bold", fontSize: 6.8 },
    columnStyles: numericColumnStyles([1, 2, 3, 4, 5, 6, 7]),
    didParseCell(data) {
      if (data.section === "body") {
        const row = alerts[data.row.index];
        data.cell.styles.fillColor = statusBackground(row.status);
        if (data.column.index === 8) {
          data.cell.styles.textColor = statusColor(row.status);
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  return lastTableY(doc) + 6;
}

function drawManagerialTable(doc: jsPDF, report: ManagerialDreReport, y: number) {
  y = ensureSpace(doc, report, y, 50);
  sectionTitle(doc, "Tabela Gerencial com Análise Vertical", y);
  y += 6;

  const previousLabel = report.previousPeriod?.label ?? "Anterior";
  const currentLabel = report.currentPeriod.label;
  autoTable(doc, {
    startY: y,
    margin: { left: PAGE.left, right: PAGE.right, top: PAGE.top, bottom: PAGE.bottom },
    head: [[
      "Categoria/Subcategoria",
      "Natureza",
      `${previousLabel} Valor`,
      `${previousLabel} AV%`,
      `${currentLabel} Valor`,
      `${currentLabel} AV%`,
      "Variação R$",
      "Variação %",
      "Var. AV p.p.",
      "Status",
    ]],
    body: report.rows.map(rowToTableCells),
    theme: "plain",
    styles: { fontSize: 6.2, overflow: "linebreak", cellPadding: { top: 1.5, right: 1.4, bottom: 1.5, left: 1.4 }, lineColor: C.border, lineWidth: 0.08 },
    headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: "bold", fontSize: 6.1, halign: "center" },
    columnStyles: {
      0: { cellWidth: 54 },
      1: { cellWidth: 22 },
      ...numericColumnStyles([2, 3, 4, 5, 6, 7, 8]),
      9: { cellWidth: 22, halign: "center" },
    },
    didParseCell(data) {
      if (data.section === "body") {
        const row = report.rows[data.row.index];
        if (row.lineType === "category" || row.isResultLine) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = row.status === "critical" ? C.red50 : C.light;
        }
        if (row.level === 1 && data.column.index === 0) {
          data.cell.text = [`  ${row.normalizedLabel}`];
        }
        if (data.column.index === 9) {
          data.cell.styles.textColor = statusColor(row.status);
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
    didDrawPage() {
      drawHeader(doc, report);
    },
  });

  return lastTableY(doc) + 7;
}

function drawHighlights(doc: jsPDF, report: ManagerialDreReport, y: number) {
  y = ensureSpace(doc, report, y, 55);
  sectionTitle(doc, "Maiores Variações", y);
  y += 6;

  const groups: Array<[string, ManagerialReportRow[]]> = [
    ["Maiores quedas de receita", report.highlights.revenueDrops],
    ["Maiores aumentos de despesas/custos", report.highlights.expenseIncreases],
    ["Maiores reduções de despesas/custos", report.highlights.expenseReductions],
    ["Maiores impactos na margem", report.highlights.marginImpacts],
  ];

  for (const [title, rows] of groups) {
    y = ensureSpace(doc, report, y, 24);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...C.primary);
    doc.text(title, PAGE.left, y);
    y += 3;

    autoTable(doc, {
      startY: y,
      margin: { left: PAGE.left, right: PAGE.right, top: PAGE.top, bottom: PAGE.bottom },
      head: [["Linha", "Anterior", "Atual", "Var. R$", "Var. %", "Var. AV", "Status"]],
      body: (rows.length ? rows : [null]).map((row) => row ? [
        row.normalizedLabel,
        formatCurrency(row.previousValue),
        formatCurrency(row.currentValue),
        signedCurrency(row.variationValue),
        row.variationLabel,
        row.verticalPointVariation === null ? "Sem base" : formatPoints(row.verticalPointVariation),
        row.statusLabel,
      ] : ["Sem itens para este grupo", "", "", "", "", "", ""]),
      theme: "plain",
      styles: { fontSize: 6.5, cellPadding: { top: 1.4, right: 1.5, bottom: 1.4, left: 1.5 }, lineColor: C.border, lineWidth: 0.08 },
      headStyles: { fillColor: C.primarySoft, textColor: C.primary, fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 72 }, ...numericColumnStyles([1, 2, 3, 4, 5]), 6: { halign: "center" } },
    });
    y = lastTableY(doc) + 5;
  }

  return y;
}

function drawObservations(doc: jsPDF, report: ManagerialDreReport, y: number) {
  y = ensureSpace(doc, report, y, 35);
  sectionTitle(doc, "Observações Automáticas", y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.text);
  for (const observation of report.observations) {
    const lines = doc.splitTextToSize(`• ${observation}`, 260);
    doc.text(lines, PAGE.left, y);
    y += lines.length * 3.5 + 1;
  }
}

function rowToCompactCells(row: ManagerialReportRow) {
  return [
    row.normalizedLabel,
    formatCurrency(row.previousValue),
    formatCurrency(row.currentValue),
    signedCurrency(row.variationValue),
    row.variationLabel,
    formatManagerialVertical(row.previousVerticalPercentage),
    formatManagerialVertical(row.currentVerticalPercentage),
    row.verticalPointVariation === null ? "Sem base" : formatPoints(row.verticalPointVariation),
    row.statusLabel,
  ];
}

function rowToTableCells(row: ManagerialReportRow) {
  return [
    row.normalizedLabel,
    natureLabel(row),
    formatCurrency(row.previousValue),
    formatManagerialVertical(row.previousVerticalPercentage),
    formatCurrency(row.currentValue),
    formatManagerialVertical(row.currentVerticalPercentage),
    signedCurrency(row.variationValue),
    row.variationLabel,
    row.verticalPointVariation === null ? "Sem base" : formatPoints(row.verticalPointVariation),
    row.statusLabel,
  ];
}

function natureLabel(row: ManagerialReportRow) {
  const labels: Record<ManagerialReportRow["nature"], string> = {
    revenue: "Receita",
    result: "Resultado",
    expense: "Despesa/Custo",
    deduction: "Redutora",
    investment: "Investimento",
    margin: "Margem",
    informational: "Informativa",
  };
  return labels[row.nature];
}

function sectionTitle(doc: jsPDF, title: string, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.8);
  doc.setTextColor(...C.accent);
  doc.text(title.toUpperCase(), PAGE.left, y);
  doc.setDrawColor(...C.accent);
  doc.line(PAGE.left, y + 1.5, doc.internal.pageSize.getWidth() - PAGE.right, y + 1.5);
}

function ensureSpace(doc: jsPDF, report: ManagerialDreReport, y: number, needed: number) {
  const H = doc.internal.pageSize.getHeight();
  if (y + needed <= H - PAGE.bottom) return y;
  doc.addPage();
  drawHeader(doc, report);
  return 30;
}

function addFooters(doc: jsPDF, report: ManagerialDreReport) {
  const total = doc.getNumberOfPages();
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const generatedAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(report.generatedAt);
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...C.border);
    doc.line(PAGE.left, H - 9, W - PAGE.right, H - 9);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...C.muted);
    doc.text(`Análise Gerencial de DRE • ${generatedAt}`, PAGE.left, H - 5);
    doc.text(`Página ${page} de ${total}`, W - PAGE.right, H - 5, { align: "right" });
  }
}

function numericColumnStyles(columns: number[]) {
  return Object.fromEntries(columns.map((column) => [column, { halign: "right" as const }]));
}

function lastTableY(doc: jsPDF) {
  return ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 30);
}

function statusColor(status: ManagerialStatus): [number, number, number] {
  if (status === "positive") return C.positive;
  if (status === "critical") return C.critical;
  if (status === "attention" || status === "new" || status === "zeroed") return C.attention;
  if (status === "neutral") return C.blue;
  return C.neutral;
}

function statusBackground(status: ManagerialStatus): [number, number, number] {
  if (status === "positive") return C.green50;
  if (status === "critical") return C.red50;
  if (status === "attention" || status === "new" || status === "zeroed") return C.amber50;
  if (status === "neutral") return C.blue50;
  return C.light;
}

function signedCurrency(value: number) {
  const formatted = formatCurrency(value);
  return value > 0 ? `+${formatted}` : formatted;
}

function formatPoints(value: number) {
  return `${value > 0 ? "+" : ""}${formatPercentage(value).replace("%", " p.p.")}`;
}
