import { supabase } from "@/integrations/supabase/client";

const SESSION_STORAGE_KEY = "gestores-em-foco-access-session";

export function getAccessSessionId() {
  let sessionId = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
}

export function getProductSlugFromPath(path: string) {
  if (path.startsWith("/diagnosticos") || path.includes("/diagnostico/")) return "diagnosticos";
  if (path.startsWith("/dre-facil") || path.startsWith("/gestor-dre")) return "gestor-dre";
  if (path.startsWith("/dashboard") || path.startsWith("/meus-produtos") || path.startsWith("/produtos") || path.startsWith("/configuracoes")) return "global";
  return null;
}

export async function trackSiteAccess(path: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { error } = await supabase.from("site_access_logs").insert({
    user_id: session?.user?.id ?? null,
    path,
    page_title: document.title || null,
    product_slug: getProductSlugFromPath(path),
    referrer: document.referrer || null,
    user_agent: navigator.userAgent || null,
    session_id: getAccessSessionId(),
    access_type: "page_view",
  });

  if (error && import.meta.env.DEV) console.error("Site access tracking failed", error);
}
