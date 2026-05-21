export function escapeExcelFormula(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /^[=+\-@]/.test(text.trim()) ? `'${text}` : text;
}
