import { supabase } from "@/integrations/supabase/client";

const SESSION_STORAGE_KEY = "gestores-em-foco-access-session";
const PANEL_ACCESS_STORAGE_KEY = "panel_access_logged";
const PANEL_ACCESS_COOLDOWN_MS = 30 * 60 * 1000;
const PRODUCT_ACCESS_COOLDOWN_MS = 30 * 60 * 1000;

export function getAccessSessionId() {
  let sessionId = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
}

export function getProductSlugFromPath(path: string) {
  const pathname = path.split("?")[0];
  if (pathname.startsWith("/meus-cursos") || pathname === "/cursos" || pathname.startsWith("/cursos/")) return "cursos";
  if (pathname.startsWith("/diagnosticos") || pathname.includes("/diagnostico/")) return "diagnosticos";
  if (pathname.startsWith("/dre-facil") || pathname.startsWith("/gestor-dre")) return "gestor-dre";
  return null;
}

function getLastAccessTimestamp(key: string) {
  const rawValue = window.sessionStorage.getItem(key);
  const timestamp = rawValue ? Number(rawValue) : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function isWithinCooldown(key: string, cooldownMs: number) {
  return Date.now() - getLastAccessTimestamp(key) < cooldownMs;
}

function markAccessLogged(key: string) {
  window.sessionStorage.setItem(key, String(Date.now()));
}

function isUserPanelPath(path: string) {
  const pathname = path.split("?")[0];
  return ["/dashboard", "/meus-produtos", "/produtos", "/configuracoes", "/minha-conta", "/meu-perfil"].some((prefix) => pathname.startsWith(prefix));
}

async function logUserAccess(eventType: "user_panel_access" | "product_access", path: string, productSlug: string | null) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) return false;

  const { error } = await supabase.rpc("log_user_access", {
    p_event_type: eventType,
    p_product_slug: productSlug,
    p_page: path,
    p_session_id: getAccessSessionId(),
    p_page_title: document.title || null,
    p_referrer: document.referrer || null,
    p_user_agent: navigator.userAgent || null,
  });

  if (error && import.meta.env.DEV) console.error("User access tracking failed", error);
  return !error;
}

export async function trackUserPanelAccess(path: string) {
  if (!isUserPanelPath(path) || isWithinCooldown(PANEL_ACCESS_STORAGE_KEY, PANEL_ACCESS_COOLDOWN_MS)) return;

  const logged = await logUserAccess("user_panel_access", path, null);
  if (logged) markAccessLogged(PANEL_ACCESS_STORAGE_KEY);
}

export async function trackProductAccess(productSlug: string, path: string) {
  if (!productSlug) return;

  const storageKey = `product_access_logged:${productSlug}`;
  if (isWithinCooldown(storageKey, PRODUCT_ACCESS_COOLDOWN_MS)) return;

  const logged = await logUserAccess("product_access", path, productSlug);
  if (logged) markAccessLogged(storageKey);
}

export async function trackAccessForPath(path: string) {
  await trackUserPanelAccess(path);

  const productSlug = getProductSlugFromPath(path);
  if (productSlug) await trackProductAccess(productSlug, path);
}
