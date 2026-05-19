import { jsPDF } from "jspdf";
import autoTable, { type CellHookData } from "jspdf-autotable";

import { formatCompetence, formatCurrency, formatPercentage, resolveDreDisplayLines } from "@/lib/dre-calculations";
import type { DreDisplayLine, DreDraftLine, DreEntryWithItems } from "@/types/dre";

const COLORS = {
  primary: [20, 46, 78] as [number, number, number],
  primarySoft: [235, 241, 248] as [number, number, number],
  border: [219, 226, 236] as [number, number, number],
  text: [24, 31, 42] as [number, number, number],
  muted: [91, 102, 118] as [number, number, number],
  positive: [22, 101, 52] as [number, number, number],
  negative: [185, 28, 28] as [number, number, number],
  netIncome: [219, 234, 254] as [number, number, number],
  sum: [246, 248, 251] as [number, number, number],
};

type DrePdfParams = {
  entry: DreEntryWithItems;
  lines: DreDraftLine[];
};

export function exportDreToPdf({ entry, lines }: DrePdfParams) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const displayLines = resolveDreDisplayLines(lines);
  const emittedAt = new Date();
  const emittedAtLabel = formatDateTime(emittedAt);
  const statusLabel = entry.status === "finalized" ? "Finalizado" : "Rascunho";
  const title = entry.model?.name ?? "DRE";
  const fileName = buildDrePdfFileName(title, entry.competence);

  drawHeader(doc, { title, competence: entry.competence, statusLabel, emittedAtLabel });

  autoTable(doc, {
    startY: 84,
    margin: { top: 32, right: 14, bottom: 22, left: 14 },
    head: [["Descricao", "Valor"]],
    body: displayLines.map((line) => [line.description, formatCurrency(line.displayValue)]),
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 9.5,
      cellPadding: { top: 3.2, right: 3, bottom: 3.2, left: 3 },
      lineColor: COLORS.border,
      lineWidth: 0.1,
      textColor: COLORS.text,
      valign: "middle",
    },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: 255,
      fontStyle: "bold",
      fontSize: 10,
      cellPadding: { top: 4, right: 3, bottom: 4, left: 3 },
    },
    columnStyles: {
      0: { cellWidth: 137 },
      1: { cellWidth: 45, halign: "right", fontStyle: "bold" },
    },
    alternateRowStyles: { fillColor: [252, 253, 255] },
    didParseCell: (data) => styleDreRow(data, displayLines),
  });

  drawSummary(doc, entry);
  drawFooters(doc, emittedAtLabel);
  doc.save(fileName);
}

function styleDreRow(data: CellHookData, lines: DreDisplayLine[]) {
  if (data.section !== "body") return;

  const line = lines[data.row.index];
  if (!line) return;

  if (line.lineType === "category") {
    data.cell.styles.fillColor = COLORS.primarySoft;
    data.cell.styles.fontStyle = "bold";
    data.cell.styles.fontSize = 9.7;
    data.cell.styles.textColor = COLORS.primary;
  }

  if (line.lineType === "subcategory" && data.column.index === 0) {
    data.cell.text = [`   ${line.description}${line.subcategoryIsReductive ? " (redutora)" : ""}`];
    data.cell.styles.fontSize = 9.2;
    data.cell.styles.textColor = COLORS.muted;
  }

  if (line.lineType === "sum") {
    data.cell.styles.fillColor = line.isNetIncome ? COLORS.netIncome : COLORS.sum;
    data.cell.styles.fontStyle = "bold";
    data.cell.styles.textColor = line.isNetIncome ? COLORS.primary : COLORS.text;
    if (line.isNetIncome && data.column.index === 0) {
      data.cell.text = [`${line.description} - LUCRO LIQUIDO`];
    }
  }

  if (data.column.index === 1 && line.displayValue < 0) {
    data.cell.styles.textColor = COLORS.negative;
  }
}

function drawHeader(
  doc: jsPDF,
  params: { title: string; competence: string; statusLabel: string; emittedAtLabel: string },
) {
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Gestores em Foco", 14, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Gestor de DRE", 14, 20);

  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Demonstrativo de Resultado do Exercicio", 14, 43);

  doc.setFontSize(11);
  doc.text(params.title, 14, 54);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...COLORS.muted);
  doc.text(`Competencia: ${formatCompetence(params.competence)}`, 14, 62);
  doc.text(`Data de emissao: ${params.emittedAtLabel}`, 14, 69);
  doc.text(`Status: ${params.statusLabel}`, 122, 62);
}

function drawSummary(doc: jsPDF, entry: DreEntryWithItems) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const startY = Math.min((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 92, pageHeight - 58) + 8;

  if (startY > pageHeight - 48) {
    doc.addPage();
  }

  const y = startY > pageHeight - 48 ? 28 : startY;
  const metrics = [
    ["Total de creditos", formatCurrency(entry.total_credit)],
    ["Total de debitos", formatCurrency(entry.total_debit)],
    ["Resultado final", formatCurrency(entry.result)],
    ["Margem", formatPercentage(entry.margin_percentage)],
  ];

  doc.setDrawColor(...COLORS.border);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, 182, 30, 2, 2, "FD");
  metrics.forEach(([label, value], index) => {
    const x = 20 + index * 44;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(label, x, y + 11);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(index === 2 && entry.result < 0 ? COLORS.negative[0] : index === 2 ? COLORS.positive[0] : COLORS.text[0], index === 2 && entry.result < 0 ? COLORS.negative[1] : index === 2 ? COLORS.positive[1] : COLORS.text[1], index === 2 && entry.result < 0 ? COLORS.negative[2] : index === 2 ? COLORS.positive[2] : COLORS.text[2]);
    doc.text(value, x, y + 21);
  });
}

function drawFooters(doc: jsPDF, emittedAtLabel: string) {
  const pageCount = doc.internal.getNumberOfPages();

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    drawFooter(doc, emittedAtLabel);
  }
}

function drawFooter(doc: jsPDF, emittedAtLabel: string) {
  const pageCount = doc.internal.getNumberOfPages();
  const currentPage = doc.getCurrentPageInfo().pageNumber;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setDrawColor(...COLORS.border);
  doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text(`Emitido em ${emittedAtLabel}`, 14, pageHeight - 8);
  doc.text(`Pagina ${currentPage} de ${pageCount}`, pageWidth - 14, pageHeight - 8, { align: "right" });
}

function buildDrePdfFileName(name: string, competence: string) {
  return `DRE_${slugFilePart(name)}_${slugFilePart(formatCompetence(competence))}.pdf`;
}

function slugFilePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
