import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type PrivacyRequest = Tables<"privacy_requests">;
export type PrivacyRequestType = "export" | "account_deletion";
export type ExportFormat = "xlsx" | "pdf" | "json";
export type ExportData = Awaited<ReturnType<typeof exportUserData>>;

const ACTIVE_PRIVACY_REQUEST_STATUSES = ["pending", "processing"];

export async function getPrivacyRequests(userId: string) {
  const { data, error } = await supabase
    .from("privacy_requests")
    .select("*")
    .eq("user_id", userId)
    .order("requested_at", { ascending: false })
    .limit(10);

  if (error) throw new Error("Nao foi possivel carregar solicitacoes de privacidade.");
  return data ?? [];
}

export async function createPrivacyRequest(userId: string, requestType: PrivacyRequestType, status: PrivacyRequest["status"] = "pending", exportFormat?: ExportFormat) {
  const existing = status !== "completed" ? await getActivePrivacyRequest(userId, requestType) : null;
  if (existing) throw new Error("Você já possui uma solicitação em andamento.");

  const { data, error } = await supabase
    .from("privacy_requests")
    .insert({
      user_id: userId,
      request_type: requestType,
      status,
      export_format: requestType === "export" ? exportFormat ?? null : null,
      processed_at: status === "completed" ? new Date().toISOString() : null,
    })
    .select("*")
    .single();

  if (error) {
    if (import.meta.env.DEV) console.error("Privacy request creation failed", error);
    throw new Error("Nao foi possivel registrar sua solicitacao.");
  }

  return data;
}

export async function cancelPrivacyRequest(userId: string, requestId: string) {
  const { data, error } = await supabase
    .from("privacy_requests")
    .update({ status: "canceled" })
    .eq("id", requestId)
    .eq("user_id", userId)
    .in("status", ACTIVE_PRIVACY_REQUEST_STATUSES)
    .select("*")
    .single();

  if (error) {
    if (import.meta.env.DEV) console.error("Privacy request cancellation failed", error);
    throw new Error("Nao foi possivel cancelar a solicitacao.");
  }

  return data;
}

export async function deleteOwnAccount() {
  const { error } = await supabase.functions.invoke("delete-account", {
    method: "POST",
    body: {},
  });

  if (error) {
    if (import.meta.env.DEV) console.error("Account deletion failed", error);
    throw new Error("Não foi possível excluir sua conta. Tente novamente.");
  }
}

export async function exportUserData(user: User) {
  const userId = user.id;
  const [
    profile,
    preferences,
    notificationPreferences,
    userProducts,
    productSubscriptions,
    productAccessSubscriptions,
    supportRequests,
    privacyRequests,
    diagnosticSessions,
    dreCategories,
    dreSubcategories,
    dreModels,
    dreModelLines,
    dreEntries,
    dreEntryItems,
  ] = await Promise.all([
    selectMaybeSingle("user_profiles", userId),
    selectMaybeSingle("user_preferences", userId),
    selectMaybeSingle("user_notification_preferences", userId),
    selectByUser("user_products", userId),
    selectByUser("product_subscriptions", userId),
    selectByUser("user_product_subscriptions", userId),
    selectByUser("support_requests", userId),
    selectByUser("privacy_requests", userId),
    selectByUser("diagnostic_sessions", userId),
    selectByUser("dre_categories", userId),
    selectByUser("dre_subcategories", userId),
    selectByUser("dre_models", userId),
    selectByUser("dre_model_lines", userId),
    selectByUser("dre_entries", userId),
    selectByUser("dre_entry_items", userId),
  ]);

  return {
    exported_at: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
    },
    profile,
    preferences,
    notification_preferences: notificationPreferences,
    products: {
      user_products: userProducts,
      product_subscriptions: productSubscriptions,
      user_product_subscriptions: productAccessSubscriptions,
    },
    support_requests: supportRequests,
    privacy_requests: privacyRequests,
    diagnostics: {
      sessions: diagnosticSessions,
    },
    dre: {
      categories: dreCategories,
      subcategories: dreSubcategories,
      models: dreModels,
      model_lines: dreModelLines,
      entries: dreEntries,
      entry_items: dreEntryItems,
    },
  };
}

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const getExportData = exportUserData;

export function exportAsJson(data: ExportData) {
  downloadBlob(JSON.stringify(data, null, 2), `meus-dados-tecnico-${fileDate()}.json`, "application/json;charset=utf-8");
}

export function exportAsExcel(data: ExportData) {
  const sheets = buildExcelSheets(data).filter((sheet) => sheet.rows.length > 0);
  downloadBlob(createXlsxWorkbook(sheets), `meus-dados-${fileDate()}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

export function exportAsPdf(data: ExportData) {
  downloadBlob(createPdfReport(data), `meus-dados-${fileDate()}.pdf`, "application/pdf");
}

export function getActiveDeletionRequest(requests: PrivacyRequest[]) {
  return requests.find((request) => request.request_type === "account_deletion" && ACTIVE_PRIVACY_REQUEST_STATUSES.includes(request.status));
}

export function exportFormatLabel(value?: string | null) {
  const labels: Record<string, string> = { xlsx: "Excel", pdf: "PDF", json: "JSON tecnico" };
  return value ? labels[value] ?? value : "-";
}

async function getActivePrivacyRequest(userId: string, requestType: PrivacyRequestType) {
  const { data, error } = await supabase
    .from("privacy_requests")
    .select("*")
    .eq("user_id", userId)
    .eq("request_type", requestType)
    .in("status", ACTIVE_PRIVACY_REQUEST_STATUSES)
    .maybeSingle();

  if (error) throw new Error("Nao foi possivel verificar solicitacoes em andamento.");
  return data;
}

async function selectByUser(table: Parameters<typeof supabase.from>[0], userId: string) {
  const { data, error } = await supabase.from(table).select("*").eq("user_id", userId);
  if (error) {
    if (import.meta.env.DEV) console.error(`Data export failed for ${table}`, error);
    return [];
  }

  return data ?? [];
}

async function selectMaybeSingle(table: Parameters<typeof supabase.from>[0], userId: string) {
  const { data, error } = await supabase.from(table).select("*").eq("user_id", userId).maybeSingle();
  if (error) {
    if (import.meta.env.DEV) console.error(`Data export failed for ${table}`, error);
    return null;
  }

  return data;
}

type AnyRecord = Record<string, any>;
type ExcelSheet = { name: string; rows: AnyRecord[] };
type ZipFile = { path: string; content: string };

function buildExcelSheets(data: ExportData): ExcelSheet[] {
  const categories = data.dre.categories as AnyRecord[];
  const subcategories = data.dre.subcategories as AnyRecord[];
  const models = data.dre.models as AnyRecord[];
  const modelLines = data.dre.model_lines as AnyRecord[];
  const entries = data.dre.entries as AnyRecord[];
  const entryItems = data.dre.entry_items as AnyRecord[];
  const productAccess = data.products.user_product_subscriptions as AnyRecord[];
  const productSubscriptions = data.products.product_subscriptions as AnyRecord[];
  const userProducts = data.products.user_products as AnyRecord[];
  const privacyRequests = data.privacy_requests as AnyRecord[];
  const diagnosticSessions = data.diagnostics.sessions as AnyRecord[];
  const profile = (data.profile ?? {}) as AnyRecord;
  const preferences = (data.preferences ?? {}) as AnyRecord;
  const categoryName = new Map(categories.map((item) => [item.id, item.name]));
  const subcategoryName = new Map(subcategories.map((item) => [item.id, item.name]));
  const modelName = new Map(models.map((item) => [item.id, item.name]));
  const entryById = new Map(entries.map((item) => [item.id, item]));

  return [
    sheet("Resumo", [{
      "Data da exportacao": formatDateTime(data.exported_at),
      "Nome do usuario": profile.full_name ?? "",
      "E-mail": data.user.email ?? "",
      Empresa: profile.company_name ?? "",
      "Total de produtos contratados": productAccess.length + productSubscriptions.length + userProducts.length,
      "Total de categorias DRE": categories.length,
      "Total de subcategorias DRE": subcategories.length,
      "Total de modelos DRE": models.length,
      "Total de DREs lancadas": entries.length,
      "Total de itens de DRE": entryItems.length,
      "Tema atual": preferences.theme ?? "",
      Idioma: preferences.language ?? "",
      Moeda: preferences.currency ?? "",
    }]),
    sheet("Perfil", [{
      "Nome completo": profile.full_name ?? "",
      "E-mail": data.user.email ?? "",
      Telefone: profile.phone ?? "",
      Empresa: profile.company_name ?? "",
      "Cargo ou funcao": profile.role ?? "",
      "Data de criacao da conta": formatDateTime(data.user.created_at),
      "Ultimo acesso": formatDateTime(data.user.last_sign_in_at),
    }]),
    sheet("Preferencias", [{
      Tema: preferences.theme ?? "",
      Densidade: preferences.density ?? "",
      Idioma: preferences.language ?? "",
      "Fuso horario": preferences.timezone ?? "",
      Moeda: preferences.currency ?? "",
      "Formato de data": preferences.date_format ?? "",
    }]),
    sheet("Produtos", [
      ...productAccess.map((item) => ({
        Produto: item.product_slug ?? item.product_name ?? "",
        Plano: item.plan_name ?? "",
        "Tipo de acesso": item.access_type ?? "",
        Status: item.status ?? "",
        "Inicio do periodo": formatDateTime(item.current_period_start),
        "Fim do periodo": formatDateTime(item.current_period_end),
        "Trial ate": formatDateTime(item.trial_ends_at),
        "Cancelado em": formatDateTime(item.canceled_at),
      })),
      ...productSubscriptions.map((item) => ({
        Produto: item.product_name ?? "",
        Plano: item.plan_name ?? "",
        "Tipo de acesso": "",
        Status: item.status ?? "",
        "Inicio do periodo": formatDateTime(item.current_period_start),
        "Fim do periodo": formatDateTime(item.current_period_end),
        "Trial ate": "",
        "Cancelado em": "",
      })),
      ...userProducts.map((item) => ({
        Produto: item.product_name ?? "",
        Plano: "",
        "Tipo de acesso": item.product_type ?? "",
        Status: item.status ?? "",
        "Inicio do periodo": formatDateTime(item.purchased_at),
        "Fim do periodo": formatDateTime(item.expires_at),
        "Trial ate": "",
        "Cancelado em": "",
      })),
    ]),
    sheet("Categorias DRE", categories.map((item) => ({
      Nome: item.name ?? "",
      Tipo: item.type ?? "",
      Status: item.status ?? "",
      Ordem: item.display_order ?? "",
      "Criado em": formatDateTime(item.created_at),
      "Atualizado em": formatDateTime(item.updated_at),
    }))),
    sheet("Subcategorias DRE", subcategories.map((item) => ({
      Categoria: categoryName.get(item.category_id) ?? "",
      Subcategoria: item.name ?? "",
      Status: item.status ?? "",
      Ordem: item.display_order ?? "",
      "Criado em": formatDateTime(item.created_at),
      "Atualizado em": formatDateTime(item.updated_at),
    }))),
    sheet("Modelos DRE", models.map((item) => ({
      "Nome do modelo": item.name ?? "",
      Descricao: item.description ?? "",
      Status: item.status ?? "",
      "Criado em": formatDateTime(item.created_at),
      "Atualizado em": formatDateTime(item.updated_at),
    }))),
    sheet("Linhas dos Modelos", modelLines.map((item) => ({
      Modelo: modelName.get(item.model_id) ?? "",
      "Tipo da linha": item.line_type ?? "",
      Categoria: categoryName.get(item.category_id) ?? "",
      Subcategoria: subcategoryName.get(item.subcategory_id) ?? "",
      "Categoria pai": categoryName.get(item.parent_category_id) ?? "",
      "Rotulo de soma": item.sum_label ?? "",
      Ordem: item.display_order ?? "",
    }))),
    sheet("DREs", entries.map((item) => ({
      Modelo: modelName.get(item.model_id) ?? "",
      Competencia: item.competence ?? "",
      Status: item.status ?? "",
      "Total de receitas": formatCurrency(item.total_credit),
      "Total de despesas": formatCurrency(item.total_debit),
      Resultado: formatCurrency(item.result),
      "Margem %": formatPercent(item.margin_percentage),
      "Criado em": formatDateTime(item.created_at),
      "Atualizado em": formatDateTime(item.updated_at),
    }))),
    sheet("Itens das DREs", entryItems.map((item) => {
      const entry = entryById.get(item.dre_entry_id);
      return {
        "DRE/Competencia": entry?.competence ?? "",
        Modelo: modelName.get(entry?.model_id) ?? "",
        Categoria: item.category_name_snapshot ?? categoryName.get(item.category_id) ?? "",
        Subcategoria: item.subcategory_name_snapshot ?? subcategoryName.get(item.subcategory_id) ?? "",
        Tipo: item.category_type_snapshot ?? "",
        "Tipo da linha": item.line_type ?? "",
        Ordem: item.display_order ?? "",
        Valor: formatCurrency(item.value),
        "Criado em": formatDateTime(item.created_at),
        "Atualizado em": formatDateTime(item.updated_at),
      };
    })),
    sheet("Diagnosticos", diagnosticSessions.map((item) => ({
      Tipo: item.template_id ?? "",
      Status: item.status ?? "",
      Progresso: formatPercent(item.progress_percent),
      "Iniciado em": formatDateTime(item.started_at),
      "Finalizado em": formatDateTime(item.completed_at),
      "Criado em": formatDateTime(item.created_at),
      "Atualizado em": formatDateTime(item.updated_at),
    }))),
    sheet("Solicitacoes de Privacidade", privacyRequests.map((item) => ({
      Tipo: privacyRequestTypeLabel(item.request_type),
      Formato: exportFormatLabel(item.export_format),
      Status: privacyRequestStatusLabel(item.status),
      "Solicitado em": formatDateTime(item.requested_at),
      "Processado em": formatDateTime(item.processed_at),
      Observacoes: item.notes ?? "",
    }))),
  ];
}

function createPdfReport(data: ExportData) {
  const profile = (data.profile ?? {}) as AnyRecord;
  const preferences = (data.preferences ?? {}) as AnyRecord;
  const products = [...(data.products.user_product_subscriptions as AnyRecord[]), ...(data.products.product_subscriptions as AnyRecord[]), ...(data.products.user_products as AnyRecord[])];
  const entries = data.dre.entries as AnyRecord[];
  const models = data.dre.models as AnyRecord[];
  const privacyRequests = data.privacy_requests as AnyRecord[];
  const modelName = new Map(models.map((item) => [item.id, item.name]));
  const lines = [
    "Relatorio de Dados da Conta",
    "Exportacao dos dados vinculados a sua conta",
    "",
    "Gestores em Foco",
    `Nome: ${profile.full_name ?? "Nao informado"}`,
    `Empresa: ${profile.company_name ?? "Nao informado"}`,
    `E-mail: ${data.user.email ?? "Nao informado"}`,
    `Data da exportacao: ${formatDateTime(data.exported_at)}`,
    "",
    "1. Dados da conta",
    `Telefone: ${profile.phone ?? "Nao informado"}`,
    `Cargo/funcao: ${profile.role ?? "Nao informado"}`,
    `Criacao da conta: ${formatDateTime(data.user.created_at)}`,
    `Ultimo acesso: ${formatDateTime(data.user.last_sign_in_at)}`,
    "",
    "2. Preferencias",
    `Tema: ${preferences.theme ?? "Nao informado"}`,
    `Densidade: ${preferences.density ?? "Nao informado"}`,
    `Idioma: ${preferences.language ?? "Nao informado"}`,
    `Fuso horario: ${preferences.timezone ?? "Nao informado"}`,
    `Moeda: ${preferences.currency ?? "Nao informado"}`,
    `Formato de data: ${preferences.date_format ?? "Nao informado"}`,
    "",
    "3. Produtos",
    ...(products.length ? products.slice(0, 12).map((item) => `- ${item.product_slug ?? item.product_name ?? "Produto"} | Status: ${item.status ?? "Nao informado"} | Plano: ${item.plan_name ?? "Padrao"}`) : ["Nenhum produto encontrado."]),
    "",
    "4. Resumo do Gestor de DRE",
    `Categorias: ${(data.dre.categories as unknown[]).length}`,
    `Subcategorias: ${(data.dre.subcategories as unknown[]).length}`,
    `Modelos: ${(data.dre.models as unknown[]).length}`,
    `DREs lancadas: ${entries.length}`,
    `Itens de DRE: ${(data.dre.entry_items as unknown[]).length}`,
    "",
    "5. DREs lancadas",
    ...(entries.length ? entries.slice(0, 15).map((item) => `- ${item.competence ?? ""} | ${modelName.get(item.model_id) ?? "Modelo"} | Receita ${formatCurrency(item.total_credit)} | Despesa ${formatCurrency(item.total_debit)} | Resultado ${formatCurrency(item.result)} | Margem ${formatPercent(item.margin_percentage)}`) : ["Nenhuma DRE encontrada."]),
    "",
    "6. Solicitacoes de privacidade",
    ...(privacyRequests.length ? privacyRequests.slice(0, 10).map((item) => `- ${privacyRequestTypeLabel(item.request_type)} | ${exportFormatLabel(item.export_format)} | ${privacyRequestStatusLabel(item.status)} | ${formatDateTime(item.requested_at)}`) : ["Nenhuma solicitacao registrada."]),
    "",
    "Este relatorio foi gerado automaticamente pela plataforma com base nos dados vinculados ao usuario autenticado.",
    "Para dados completos e manipulaveis, use Excel. Para dados tecnicos completos, use JSON.",
  ];
  return createSimplePdf(lines);
}

function sheet(name: string, rows: AnyRecord[]): ExcelSheet {
  return { name, rows };
}

function createXlsxWorkbook(sheets: ExcelSheet[]) {
  const files: ZipFile[] = [
    { path: "[Content_Types].xml", content: contentTypesXml(sheets.length) },
    { path: "_rels/.rels", content: rootRelsXml() },
    { path: "xl/workbook.xml", content: workbookXml(sheets) },
    { path: "xl/_rels/workbook.xml.rels", content: workbookRelsXml(sheets.length) },
    { path: "xl/styles.xml", content: stylesXml() },
  ];
  sheets.forEach((sheetItem, index) => files.push({ path: `xl/worksheets/sheet${index + 1}.xml`, content: worksheetXml(sheetItem.rows) }));
  return createZip(files);
}

function worksheetXml(rows: AnyRecord[]) {
  const normalizedRows = rows.length ? rows : [{ Mensagem: "Nenhum dado encontrado" }];
  const headers = Object.keys(normalizedRows[0]);
  const widths = headers.map((header) => Math.max(header.length, ...normalizedRows.map((row) => String(row[header] ?? "").length), 10));
  const cols = widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${Math.min(width + 2, 48)}" customWidth="1"/>`).join("");
  const headerRow = `<row r="1">${headers.map((header, index) => cellXml(1, index + 1, header, 1)).join("")}</row>`;
  const bodyRows = normalizedRows.map((row, rowIndex) => `<row r="${rowIndex + 2}">${headers.map((header, colIndex) => cellXml(rowIndex + 2, colIndex + 1, row[header] ?? "", 0)).join("")}</row>`).join("");
  return xml(`worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"`, `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData>${headerRow}${bodyRows}</sheetData>`);
}

function cellXml(row: number, column: number, value: unknown, style: number) {
  const ref = `${columnName(column)}${row}`;
  return `<c r="${ref}" t="inlineStr" s="${style}"><is><t>${escapeXml(String(value ?? ""))}</t></is></c>`;
}

function contentTypesXml(sheetCount: number) {
  const sheets = Array.from({ length: sheetCount }, (_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
  return xml("Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"", `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets}`);
}

function rootRelsXml() {
  return xml("Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"", `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>`);
}

function workbookXml(sheets: ExcelSheet[]) {
  const sheetXml = sheets.map((sheetItem, index) => `<sheet name="${escapeXml(cleanSheetName(sheetItem.name))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("");
  return xml("workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"", `<sheets>${sheetXml}</sheets>`);
}

function workbookRelsXml(sheetCount: number) {
  const sheets = Array.from({ length: sheetCount }, (_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("");
  return xml("Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"", `${sheets}<Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`);
}

function stylesXml() {
  return xml("styleSheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"", `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf fontId="0" fillId="0" borderId="0" xfId="0"/><xf fontId="1" fillId="0" borderId="0" xfId="0"/></cellXfs>`);
}

function createSimplePdf(lines: string[]) {
  const pages: string[][] = [];
  let current: string[] = [];
  lines.flatMap((line) => wrapText(line, 96)).forEach((line) => {
    if (current.length >= 42) {
      pages.push(current);
      current = [];
    }
    current.push(line);
  });
  if (current.length) pages.push(current);
  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(`<< /Type /Pages /Kids [${pages.map((_, index) => `${index * 2 + 3} 0 R`).join(" ")}] /Count ${pages.length} >>`);
  pages.forEach((page, index) => {
    const pageObject = index * 2 + 3;
    const contentObject = pageObject + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> /Contents ${contentObject} 0 R >>`);
    const stream = page.map((line, lineIndex) => `BT /${lineIndex < 2 && index === 0 ? "F2" : "F1"} ${lineIndex === 0 && index === 0 ? 18 : 10} Tf 48 ${800 - lineIndex * 17} Td (${escapePdf(line)}) Tj ET`).join("\n");
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}

function createZip(files: ZipFile[]) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  files.forEach((file) => {
    const nameBytes = encoder.encode(file.path);
    const contentBytes = encoder.encode(file.content);
    const crc = crc32(contentBytes);
    const local = concatBytes(u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(contentBytes.length), u32(contentBytes.length), u16(nameBytes.length), u16(0), nameBytes, contentBytes);
    localParts.push(local);
    centralParts.push(concatBytes(u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(contentBytes.length), u32(contentBytes.length), u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), nameBytes));
    offset += local.length;
  });
  const central = concatBytes(...centralParts);
  const end = concatBytes(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(central.length), u32(offset), u16(0));
  return concatBytes(...localParts, central, end);
}

function downloadBlob(content: BlobPart, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function fileDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateTime(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));
}

function formatPercent(value: unknown) {
  return `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value ?? 0))}%`;
}

function privacyRequestTypeLabel(value: string) {
  return value === "account_deletion" ? "Exclusao da conta" : "Exportacao";
}

function privacyRequestStatusLabel(value: string) {
  const labels: Record<string, string> = {
    pending: "Pendente",
    processing: "Processando",
    completed: "Concluida",
    rejected: "Rejeitada",
    canceled: "Cancelada",
  };
  return labels[value] ?? value;
}

function wrapText(text: string, maxLength: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  words.forEach((word) => {
    if (`${current} ${word}`.trim().length > maxLength) {
      lines.push(current);
      current = word;
      return;
    }
    current = `${current} ${word}`.trim();
  });
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function xml(tag: string, content: string) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><${tag}>${content}</${tag.split(" ")[0]}>`;
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", "\"": "&quot;" })[char] ?? char);
}

function escapePdf(value: string) {
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return normalized.replace(/[()\\]/g, "\\$&").replace(/[^\x20-\x7E]/g, "");
}

function cleanSheetName(value: string) {
  return value.replace(/[\\/?*[\]:]/g, " ").slice(0, 31);
}

function columnName(index: number) {
  let name = "";
  while (index > 0) {
    const remainder = (index - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    index = Math.floor((index - 1) / 26);
  }
  return name;
}

function concatBytes(...arrays: Uint8Array[]) {
  const length = arrays.reduce((total, array) => total + array.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  arrays.forEach((array) => {
    result.set(array, offset);
    offset += array.length;
  });
  return result;
}

function u16(value: number) {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function u32(value: number) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value >>> 0, true);
  return bytes;
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
