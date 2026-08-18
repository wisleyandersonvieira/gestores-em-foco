import ExcelJS from "exceljs";

import type { DreAnalysisResult, DreAnalysisRow } from "@/lib/dre-analysis";
import { formatDreAnalysisRowLabel } from "@/lib/dre-analysis";

const CURRENCY_FORMAT = '"R$" #,##0.00;[Red]("R$" #,##0.00);"-"';
const PERCENT_FORMAT = '0.0%;[Red]-0.0%;"-"';

const COLORS = {
  header: "FF1E3A5F",
  category: "FFDCE6F1",
  sum: "FFFCE4D6",
  total: "FFEDEDED",
};

function isEffectiveCredit(row: DreAnalysisRow) {
  const credit = row.categoryType === "credit";
  return row.subcategoryIsReductive ? !credit : credit;
}

export async function exportDreAnalysisExcel(
  result: DreAnalysisResult,
  showVariation: boolean,
  showVerticalAnalysis: boolean,
  modelName = "Modelo de DRE",
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Gestores em Foco";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Análise de DRE", {
    views: [{ state: "frozen", xSplit: 1, ySplit: 3 }],
  });

  // Column plan
  type Col = { type: "value" | "vertical" | "variation" | "variationPct"; periodId: string; previousPeriodId?: string; label: string };
  const columns: Col[] = [];
  result.periods.forEach((period, index) => {
    columns.push({ type: "value", periodId: period.id, label: period.label });
    if (showVerticalAnalysis) columns.push({ type: "vertical", periodId: period.id, label: `AV % ${period.label}` });
    if (showVariation && index > 0) {
      const previousPeriodId = result.periods[index - 1].id;
      columns.push({ type: "variation", periodId: period.id, previousPeriodId, label: `Var. R$ ${period.label}` });
      columns.push({ type: "variationPct", periodId: period.id, previousPeriodId, label: `Var. % ${period.label}` });
    }
  });

  sheet.getColumn(1).width = 46;
  columns.forEach((_, index) => {
    sheet.getColumn(index + 2).width = 18;
  });

  const titleRow = sheet.getRow(1);
  titleRow.getCell(1).value = `Análise de DRE - ${modelName}`;
  titleRow.getCell(1).font = { name: "Arial", size: 14, bold: true };
  sheet.mergeCells(1, 1, 1, columns.length + 1);
  sheet.getRow(2).getCell(1).value = `Gerado em ${new Date().toLocaleDateString("pt-BR")}`;
  sheet.getRow(2).getCell(1).font = { name: "Arial", size: 9, italic: true, color: { argb: "FF666666" } };

  const headerRowIndex = 3;
  const headerRow = sheet.getRow(headerRowIndex);
  headerRow.getCell(1).value = "Categoria / Subcategoria";
  columns.forEach((column, index) => {
    headerRow.getCell(index + 2).value = column.label;
  });
  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.header } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: "FFBFBFBF" } } };
  });
  headerRow.height = 28;

  // Map rows to sheet rows
  const rowIndexByKey = new Map<string, number>();
  result.rows.forEach((row, index) => {
    rowIndexByKey.set(row.key, headerRowIndex + 1 + index);
  });

  const columnLetter = (columnIndex: number) => sheet.getColumn(columnIndex).letter;

  result.rows.forEach((row, rowOffset) => {
    const excelRowIndex = headerRowIndex + 1 + rowOffset;
    const excelRow = sheet.getRow(excelRowIndex);
    const label = formatDreAnalysisRowLabel(row) + (row.isNetIncome ? " (LUCRO LÍQUIDO)" : "");
    excelRow.getCell(1).value = label;
    excelRow.getCell(1).alignment = { indent: row.level === 1 ? 2 : 0, vertical: "middle" };
    excelRow.getCell(1).font = {
      name: "Arial",
      size: 10,
      bold: row.lineType !== "subcategory",
    };

    columns.forEach((column, columnOffset) => {
      const columnIndex = columnOffset + 2;
      const cell = excelRow.getCell(columnIndex);
      const letter = columnLetter(columnIndex);
      const amount = row.values[column.periodId]?.amount ?? 0;

      if (column.type === "vertical") {
        cell.value = (row.values[column.periodId]?.verticalPercentage ?? 0) / 100;
        cell.numFmt = PERCENT_FORMAT;
      } else if (column.type === "variation" && column.previousPeriodId) {
        const previousColumnIndex = columns.findIndex((candidate) => candidate.type === "value" && candidate.periodId === column.previousPeriodId) + 2;
        const currentColumnIndex = columns.findIndex((candidate) => candidate.type === "value" && candidate.periodId === column.periodId) + 2;
        cell.value = { formula: `${columnLetter(currentColumnIndex)}${excelRowIndex}-${columnLetter(previousColumnIndex)}${excelRowIndex}` };
        cell.numFmt = row.categoryType === "margin" ? PERCENT_FORMAT : CURRENCY_FORMAT;
      } else if (column.type === "variationPct" && column.previousPeriodId) {
        const previousColumnIndex = columns.findIndex((candidate) => candidate.type === "value" && candidate.periodId === column.previousPeriodId) + 2;
        const currentColumnIndex = columns.findIndex((candidate) => candidate.type === "value" && candidate.periodId === column.periodId) + 2;
        const previousRef = `${columnLetter(previousColumnIndex)}${excelRowIndex}`;
        const currentRef = `${columnLetter(currentColumnIndex)}${excelRowIndex}`;
        cell.value = { formula: `IF(${previousRef}=0,"",(${currentRef}-${previousRef})/ABS(${previousRef}))` };
        cell.numFmt = PERCENT_FORMAT;
      } else if (row.categoryType === "margin") {
        cell.value = amount / 100;
        cell.numFmt = PERCENT_FORMAT;
      } else if (row.lineType === "category") {
        const formula = buildCategoryFormula(result.rows, row, rowIndexByKey, letter);
        cell.value = formula ? { formula } : amount;
        cell.numFmt = CURRENCY_FORMAT;
      } else if (row.lineType === "sum") {
        const formula = buildSumFormula(result.rows, rowOffset, rowIndexByKey, letter);
        cell.value = formula ? { formula } : amount;
        cell.numFmt = CURRENCY_FORMAT;
      } else {
        cell.value = amount;
        cell.numFmt = CURRENCY_FORMAT;
      }

      cell.font = { name: "Arial", size: 10, bold: row.lineType !== "subcategory" };
      cell.alignment = { horizontal: "right", vertical: "middle" };
    });

    if (row.lineType === "category" || row.lineType === "sum" || row.lineType === "total") {
      const fillColor = row.lineType === "category" ? COLORS.category : row.lineType === "sum" ? COLORS.sum : COLORS.total;
      excelRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillColor } };
        cell.border = { top: { style: "thin", color: { argb: "FFBFBFBF" } }, bottom: { style: "thin", color: { argb: "FFBFBFBF" } } };
      });
    }
  });

  sheet.autoFilter = {
    from: { row: headerRowIndex, column: 1 },
    to: { row: headerRowIndex, column: columns.length + 1 },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "analise-dre.xlsx";
  link.click();
  URL.revokeObjectURL(url);
}

function buildCategoryFormula(rows: DreAnalysisRow[], categoryRow: DreAnalysisRow, rowIndexByKey: Map<string, number>, letter: string) {
  const children = rows.filter((row) => row.lineType === "subcategory" && row.parentKey === categoryRow.key);
  if (children.length === 0) return null;

  return children
    .map((child, index) => {
      const reference = `${letter}${rowIndexByKey.get(child.key)}`;
      const sign = child.subcategoryIsReductive ? "-" : "+";
      return index === 0 && sign === "+" ? reference : `${sign}${reference}`;
    })
    .join("");
}

function buildSumFormula(rows: DreAnalysisRow[], sumRowOffset: number, rowIndexByKey: Map<string, number>, letter: string) {
  const previousSubcategories = rows.slice(0, sumRowOffset).filter((row) => row.lineType === "subcategory");
  if (previousSubcategories.length === 0) return null;

  return previousSubcategories
    .map((row, index) => {
      const reference = `${letter}${rowIndexByKey.get(row.key)}`;
      const sign = isEffectiveCredit(row) ? "+" : "-";
      return index === 0 && sign === "+" ? reference : `${sign}${reference}`;
    })
    .join("");
}
