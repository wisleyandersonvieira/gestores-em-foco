import { jsPDF } from "jspdf";

// Mesma paleta usada em dre-advanced-pdf para manter o padrão visual
const C = {
  primary: [15, 43, 70] as [number, number, number],
  accent: [180, 83, 9] as [number, number, number],
  border: [219, 226, 236] as [number, number, number],
  text: [24, 31, 42] as [number, number, number],
  muted: [91, 102, 118] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

type ExportParams = {
  container: HTMLElement;
  modelName: string;
  periodsLabel: string;
};

type CapturedChart = {
  title: string;
  insight: string | null;
  dataUrl: string;
  ratio: number; // width / height
};

export async function exportDreChartsPdf({ container, modelName, periodsLabel }: ExportParams): Promise<void> {
  const cards = Array.from(container.querySelectorAll<HTMLElement>("[data-chart-card]"));
  const charts: CapturedChart[] = [];

  for (const card of cards) {
    const svg = card.querySelector("svg");
    if (!svg) continue;
    const title = card.getAttribute("data-chart-title") ?? "";
    const insight = card.querySelector("[data-chart-insight]")?.textContent?.trim() || null;
    try {
      const captured = await svgToPngDataUrl(svg as SVGSVGElement);
      charts.push({ title, insight, dataUrl: captured.dataUrl, ratio: captured.ratio });
    } catch {
      // ignora gráfico que falhar a captura
    }
  }

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = W - margin * 2;

  drawHeader(doc, modelName, periodsLabel);
  let y = 52;

  for (const chart of charts) {
    const titleH = 7;
    const insightH = chart.insight ? 10 : 0;
    const maxImgH = 95;
    let imgW = contentW;
    let imgH = imgW / chart.ratio;
    if (imgH > maxImgH) {
      imgH = maxImgH;
      imgW = imgH * chart.ratio;
    }
    const blockH = titleH + imgH + insightH + 8;

    if (y + blockH > H - 20) {
      drawFooter(doc, modelName);
      doc.addPage();
      drawHeader(doc, modelName, periodsLabel);
      y = 52;
    }

    // Título do gráfico
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...C.accent);
    doc.text(chart.title.toUpperCase(), margin, y);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.line(margin, y + 1.5, W - margin, y + 1.5);
    y += titleH;

    const imgX = margin + (contentW - imgW) / 2;
    doc.addImage(chart.dataUrl, "PNG", imgX, y, imgW, imgH, undefined, "FAST");
    y += imgH + 3;

    if (chart.insight) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...C.muted);
      const lines = doc.splitTextToSize(chart.insight, contentW);
      doc.text(lines, margin, y);
      y += lines.length * 3.6 + 2;
    }

    y += 5;
  }

  drawFooter(doc, modelName);
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i);
    drawPageNumber(doc, i, total);
  }

  const date = new Date().toISOString().slice(0, 10);
  doc.save(`graficos-dre-${date}.pdf`);
}

function drawHeader(doc: jsPDF, modelName: string, periodsLabel: string) {
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

  doc.setTextColor(...C.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Gráficos da Análise Detalhada", 14, 34);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.muted);
  doc.text(`Períodos: ${periodsLabel}`, 14, 41);

  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.4);
  doc.line(14, 45, W - 14, 45);
}

function drawFooter(doc: jsPDF, modelName: string) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(14, H - 14, W - 14, H - 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.muted);
  doc.text(modelName, 14, H - 8);
  doc.text("Gráficos da Análise Detalhada de DRE", W / 2, H - 8, { align: "center" });
}

function drawPageNumber(doc: jsPDF, page: number, total: number) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.muted);
  doc.text(`Página ${page} de ${total}`, W - 14, H - 8, { align: "right" });
}

async function svgToPngDataUrl(svg: SVGSVGElement): Promise<{ dataUrl: string; ratio: number }> {
  const rect = svg.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  if (!clone.getAttribute("viewBox")) {
    clone.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }

  // Fundo branco para evitar transparência ruim no PDF
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("width", "100%");
  bg.setAttribute("height", "100%");
  bg.setAttribute("fill", "#ffffff");
  clone.insertBefore(bg, clone.firstChild);

  const xml = new XMLSerializer().serializeToString(clone);
  const svg64 = typeof window !== "undefined" && window.btoa
    ? window.btoa(unescape(encodeURIComponent(xml)))
    : Buffer.from(xml).toString("base64");
  const imgSrc = `data:image/svg+xml;base64,${svg64}`;

  const image = new Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Falha ao carregar SVG"));
    image.src = imgSrc;
  });

  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  return { dataUrl: canvas.toDataURL("image/png"), ratio: width / height };
}
