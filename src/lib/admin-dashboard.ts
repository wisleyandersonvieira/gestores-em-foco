import { supabase } from "@/integrations/supabase/client";

export type AdminPeriod = "today" | "7d" | "30d" | "month";
export type SupportStatus = "open" | "in_progress" | "solved" | "closed";

export function getPeriodStart(period: AdminPeriod) {
  const now = new Date();
  const start = new Date(now);
  if (period === "today") start.setHours(0, 0, 0, 0);
  if (period === "7d") start.setDate(now.getDate() - 7);
  if (period === "30d") start.setDate(now.getDate() - 30);
  if (period === "month") start.setDate(1), start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

export async function getAdminData(period: AdminPeriod) {
  const since = getPeriodStart(period);
  const [profiles, globalProfiles, products, subscriptions, accessLogs, supportRequests, dreMetrics, diagnosticMetrics, sectors, subsectors, userSectors, userSubsectors] = await Promise.all([
    paginatedSelect("profiles", "*"),
    paginatedSelect("user_profiles", "*"),
    paginatedSelect("products", "*"),
    paginatedSelect("user_product_subscriptions", "*, product:products(*)"),
    paginatedSelect("site_access_logs", "*", (q) => q.gte("created_at", since).in("event_type", ["user_panel_access", "product_access"]).order("created_at", { ascending: false }), 5000),
    safeSelect("support_requests", "*", (query) => query.order("created_at", { ascending: false }).limit(250)),
    getDreMetrics(),
    getDiagnosticMetrics(),
    paginatedSelect("business_sectors", "id, name"),
    paginatedSelect("business_subsectors", "id, name, sector_id"),
    paginatedSelect("user_sectors", "user_id, sector_id"),
    paginatedSelect("user_subsectors", "user_id, subsector_id"),
  ]);

  const sectorsById = new Map((sectors as AnyRecord[]).map((s) => [s.id, s.name as string]));
  const subsectorsById = new Map((subsectors as AnyRecord[]).map((s) => [s.id, s.name as string]));

  const userSectorsByUserId = new Map<string, string[]>();
  for (const row of userSectors as AnyRecord[]) {
    const existing = userSectorsByUserId.get(row.user_id) ?? [];
    const name = sectorsById.get(row.sector_id);
    if (name) existing.push(name);
    userSectorsByUserId.set(row.user_id, existing);
  }

  const userSubsectorsByUserId = new Map<string, string[]>();
  for (const row of userSubsectors as AnyRecord[]) {
    const existing = userSubsectorsByUserId.get(row.user_id) ?? [];
    const name = subsectorsById.get(row.subsector_id);
    if (name) existing.push(name);
    userSubsectorsByUserId.set(row.user_id, existing);
  }

  const userProfilesById = new Map((globalProfiles as AnyRecord[]).map((profile) => [profile.user_id, profile]));
  const profilesById = new Map((profiles as AnyRecord[]).map((profile) => [profile.id, profile]));
  const users = (profiles as AnyRecord[]).map((profile) => {
    const globalProfile = userProfilesById.get(profile.id) ?? null;
    return {
      ...profile,
      global_profile: globalProfile,
      subscriptions: (subscriptions as AnyRecord[]).filter((item) => item.user_id === profile.id),
      sector_names: userSectorsByUserId.get(profile.id) ?? (profile.sector_id ? [sectorsById.get(profile.sector_id) ?? ""] : []),
      subsector_names: userSubsectorsByUserId.get(profile.id) ?? (profile.subsector_id ? [subsectorsById.get(profile.subsector_id) ?? ""] : []),
      resolved_phone: globalProfile?.phone ?? profile.phone ?? null,
      resolved_state: globalProfile?.state ?? profile.state ?? null,
      resolved_city: globalProfile?.city ?? profile.city ?? null,
    };
  });
  const supportWithUsers = (supportRequests as AnyRecord[]).map((request) => ({
    ...request,
    profile: profilesById.get(request.user_id) ?? null,
    global_profile: userProfilesById.get(request.user_id) ?? null,
  })) as AnyRecord[];
  const productStats = (products as AnyRecord[]).map((product) => {
    const productSubscriptions = (subscriptions as AnyRecord[]).filter((item) => item.product_slug === product.slug);
    return {
      ...product,
      subscriptions: productSubscriptions,
      activeUsers: productSubscriptions.filter((item) => ["active", "trialing"].includes(item.status)).length,
      activeSubscriptions: productSubscriptions.filter((item) => item.status === "active").length,
      trialSubscriptions: productSubscriptions.filter((item) => item.status === "trialing").length,
      inactiveSubscriptions: productSubscriptions.filter((item) => !["active", "trialing"].includes(item.status)).length,
    };
  });
  const accessLogsWithUsers = (accessLogs as AnyRecord[]).map((log) => ({
    ...log,
    profile: log.user_id ? profilesById.get(log.user_id) ?? null : null,
    global_profile: log.user_id ? userProfilesById.get(log.user_id) ?? null : null,
  })) as AnyRecord[];
  const panelAccessLogs = accessLogsWithUsers.filter((item) => getAccessEventType(item) === "user_panel_access");
  const productAccessLogs = accessLogsWithUsers.filter((item) => getAccessEventType(item) === "product_access" && item.product_slug);
  const productAccessCounts = countBy(productAccessLogs, "product_slug");
  const mostAccessedProduct = Object.entries(productAccessCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Sem dados";

  return {
    overview: {
      totalUsers: users.length,
      activeUsers: new Set((subscriptions as AnyRecord[]).filter((item) => ["active", "trialing"].includes(item.status)).map((item) => item.user_id)).size,
      activeProducts: (products as AnyRecord[]).filter((item) => item.status === "active").length,
      activeSubscriptions: (subscriptions as AnyRecord[]).filter((item) => item.status === "active").length,
      accessCount: panelAccessLogs.length,
      openSupport: supportWithUsers.filter((item) => item.status === "open").length,
      solvedSupport: supportWithUsers.filter((item) => item.status === "solved").length,
      mostAccessedProduct,
    },
    products: productStats,
    users,
    accessLogs: accessLogsWithUsers,
    supportRequests: supportWithUsers,
    dreMetrics,
    diagnosticMetrics,
  };
}

export async function updateSupportRequest(requestId: string, payload: { status?: SupportStatus; priority?: string; admin_notes?: string | null; solved_by?: string | null }) {
  const updatePayload: AnyRecord = { ...payload };
  if (payload.status === "solved") updatePayload.solved_at = new Date().toISOString();
  const { error } = await supabase.from("support_requests").update(updatePayload).eq("id", requestId);
  if (error) throw new Error("Nao foi possivel atualizar o chamado.");
}

async function getDreMetrics() {
  const [categories, subcategories, models, entries, items, lastEntry] = await Promise.all([
    countRows("dre_categories"),
    countRows("dre_subcategories"),
    countRows("dre_models"),
    countRows("dre_entries"),
    countRows("dre_entry_items"),
    fetchLastCreatedAt("dre_entries"),
  ]);
  return {
    categories,
    subcategories,
    models,
    entries,
    items,
    lastActivity: lastEntry,
  };
}

async function getDiagnosticMetrics() {
  const [templates, publishedTemplates, links, sessions] = await Promise.all([
    countRows("diagnostic_templates"),
    countRows("diagnostic_templates", (q) => q.eq("status", "published")),
    countRows("diagnostic_links"),
    countRows("diagnostic_sessions"),
  ]);
  return {
    templates,
    publishedTemplates,
    links,
    sessions,
  };
}

async function safeSelect(table: any, columns = "*", transform?: (query: any) => any) {
  let query = supabase.from(table).select(columns);
  if (transform) query = transform(query);
  const { data, error } = await query;
  if (error) {
    if (import.meta.env.DEV) console.error(`Admin query failed for ${table}`, error);
    return [];
  }
  return data ?? [];
}

async function paginatedSelect(table: any, columns = "*", transform?: (query: any) => any, maxRows = Infinity) {
  const pageSize = 1000;
  let from = 0;
  const all: any[] = [];
  while (all.length < maxRows) {
    const end = Math.min(from + pageSize, maxRows) - 1;
    let query: any = supabase.from(table).select(columns);
    if (transform) query = transform(query);
    query = query.range(from, end);
    const { data, error } = await query;
    if (error) {
      if (import.meta.env.DEV) console.error(`Admin paginated query failed for ${table}`, error);
      return all;
    }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < end - from + 1) break;
    from = all.length;
  }
  return all;
}

async function countRows(table: any, transform?: (query: any) => any) {
  let query: any = supabase.from(table).select("*", { count: "exact", head: true });
  if (transform) query = transform(query);
  const { count, error } = await query;
  if (error) {
    if (import.meta.env.DEV) console.error(`Admin count failed for ${table}`, error);
    return 0;
  }
  return count ?? 0;
}

async function fetchLastCreatedAt(table: any) {
  const { data, error } = await supabase
    .from(table)
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    if (import.meta.env.DEV) console.error(`Admin last-row query failed for ${table}`, error);
    return null;
  }
  return (data as any)?.created_at ?? null;
}

function countBy(rows: AnyRecord[], key: string) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const value = row[key];
    if (!value) return acc;
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function getAccessEventType(row: AnyRecord) {
  return row.event_type ?? row.access_type ?? "page_view";
}

type AnyRecord = Record<string, any>;

