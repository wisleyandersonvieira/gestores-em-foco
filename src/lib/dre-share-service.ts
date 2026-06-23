import { supabase } from "@/integrations/supabase/client";
import type { DreEntryWithItems, DreModelWithLines } from "@/types/dre";
import type { DreAnalysisType } from "@/lib/dre-analysis";

export type DreShareLink = {
  id: string;
  token: string;
  user_id: string;
  dre_model_id: string;
  analysis_type: DreAnalysisType;
  selected_years: string[];
  selected_period_ids: string[];
  include_drafts: boolean;
  show_variation: boolean;
  show_vertical_analysis: boolean;
  expires_at: string;
  description: string | null;
  created_at: string;
  created_by: string;
  revoked_at: string | null;
  last_accessed_at: string | null;
  access_count: number;
};

export type CreateShareLinkParams = {
  modelId: string;
  analysisType: DreAnalysisType;
  selectedYears: string[];
  selectedPeriodIds: string[];
  includeDrafts: boolean;
  showVariation: boolean;
  showVerticalAnalysis: boolean;
  expiresAt: Date;
  description?: string;
};

export type PublicShareLinkMeta = {
  id: string;
  analysis_type: DreAnalysisType;
  selected_years: string[];
  selected_period_ids: string[];
  include_drafts: boolean;
  show_variation: boolean;
  show_vertical_analysis: boolean;
  expires_at: string;
  description: string | null;
  created_at: string;
};

export type PublicAnalysisData = {
  link: PublicShareLinkMeta;
  model: DreModelWithLines;
  entries: DreEntryWithItems[];
};

export type PublicAnalysisError = "invalid_token" | "not_found" | "expired" | "revoked" | "error";

function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function createShareLink(params: CreateShareLinkParams): Promise<{ id: string; token: string }> {
  const token = generateSecureToken();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("create_dre_share_link", {
    p_token: token,
    p_dre_model_id: params.modelId,
    p_analysis_type: params.analysisType,
    p_selected_years: params.selectedYears,
    p_selected_period_ids: params.selectedPeriodIds,
    p_include_drafts: params.includeDrafts,
    p_show_variation: params.showVariation,
    p_show_vertical_analysis: params.showVerticalAnalysis,
    p_expires_at: params.expiresAt.toISOString(),
    p_description: params.description ?? null,
  });

  if (error) throw new Error(error.message ?? "Não foi possível criar o link de compartilhamento.");

  return data as { id: string; token: string };
}

export async function listShareLinks(): Promise<DreShareLink[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("dre_analysis_share_links")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error("Não foi possível carregar os links de compartilhamento.");
  return (data ?? []) as DreShareLink[];
}

export async function revokeShareLink(linkId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("dre_analysis_share_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", linkId);

  if (error) throw new Error("Não foi possível revogar o link.");
}

export async function fetchPublicAnalysis(
  token: string,
): Promise<{ data: PublicAnalysisData } | { error: PublicAnalysisError }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: raw, error: rpcError } = await (supabase as any).rpc("fetch_dre_analysis_for_token", {
    p_token: token,
  });

  if (rpcError) return { error: "error" };

  type RawResult = {
    error?: string;
    link?: PublicShareLinkMeta;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model_lines?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    entries?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    entry_items?: any[];
  };

  const result = raw as RawResult;

  if (result.error) {
    const knownErrors: PublicAnalysisError[] = ["invalid_token", "not_found", "expired", "revoked"];
    return { error: knownErrors.includes(result.error as PublicAnalysisError) ? (result.error as PublicAnalysisError) : "error" };
  }

  if (!result.link || !result.model) return { error: "error" };

  const model: DreModelWithLines = {
    ...result.model,
    lines: (result.model_lines ?? []) as DreModelWithLines["lines"],
  };

  const itemsByEntry = new Map<string, DreEntryWithItems["items"]>();
  for (const item of result.entry_items ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entryId = (item as any).dre_entry_id as string;
    const list = itemsByEntry.get(entryId) ?? [];
    list.push(item as DreEntryWithItems["items"][number]);
    itemsByEntry.set(entryId, list);
  }

  const entries: DreEntryWithItems[] = (result.entries ?? []).map((entry) => ({
    ...(entry as object),
    items: itemsByEntry.get((entry as { id: string }).id) ?? [],
  })) as DreEntryWithItems[];

  return {
    data: {
      link: result.link,
      model,
      entries,
    },
  };
}

export function getShareLinkStatus(link: Pick<DreShareLink, "revoked_at" | "expires_at">): "active" | "expired" | "revoked" {
  if (link.revoked_at) return "revoked";
  if (new Date(link.expires_at) < new Date()) return "expired";
  return "active";
}

export function buildPublicUrl(token: string): string {
  return `${window.location.origin}/public/analise-dre/${token}`;
}
