export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "gestores-em-foco-theme";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

export function normalizeTheme(value: unknown): Theme {
  return isTheme(value) ? value : "light";
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

export function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isTheme(storedTheme) ? storedTheme : null;
}

export function storeTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function applyStoredTheme() {
  const storedTheme = getStoredTheme();
  applyTheme(storedTheme ?? "light");
}
