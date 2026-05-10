import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://gestoresemfoco.com.br",
  "https://www.gestoresemfoco.com.br",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
]);

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const allowOrigin = allowedOrigins.has(origin) ? origin : "https://gestoresemfoco.com.br";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function jsonResponse(request: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json",
    },
  });
}

async function removeStoragePrefix(
  supabaseAdmin: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string,
) {
  const { data, error } = await supabaseAdmin.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error || !data?.length) return;

  const paths = data
    .filter((item) => item.name)
    .map((item) => `${prefix}/${item.name}`);

  if (paths.length > 0) {
    await supabaseAdmin.storage.from(bucket).remove(paths);
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  if (request.method !== "POST") {
    return jsonResponse(request, 405, { error: "method_not_allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse(request, 500, { error: "server_not_configured" });
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse(request, 401, { error: "missing_authorization" });
  }

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: userData, error: userError } = await supabaseUser.auth.getUser();
  const user = userData?.user;

  if (userError || !user) {
    return jsonResponse(request, 401, { error: "invalid_authorization" });
  }

  const userId = user.id;
  const now = new Date().toISOString();

  try {
    await supabaseAdmin.from("privacy_requests").insert({
      user_id: userId,
      request_type: "account_deletion",
      status: "completed",
      requested_at: now,
      processed_at: now,
    });

    await supabaseAdmin.from("audit_logs").insert({
      actor_user_id: userId,
      action: "account_deleted_by_user",
      entity_type: "auth.users",
      entity_id: userId,
      metadata: {
        user_id: userId,
        requested_at: now,
      },
    });

    await supabaseAdmin.from("site_access_logs").update({ user_id: null }).eq("user_id", userId);

    await supabaseAdmin
      .from("diagnostic_templates")
      .update({ created_by: null })
      .eq("created_by", userId);
    await supabaseAdmin
      .from("diagnostic_links")
      .update({ assigned_user_id: null })
      .eq("assigned_user_id", userId);
    await supabaseAdmin.from("diagnostic_links").delete().eq("created_by", userId);
    await supabaseAdmin.from("diagnostic_sessions").delete().eq("user_id", userId);

    await supabaseAdmin.from("dre_entry_items").delete().eq("user_id", userId);
    await supabaseAdmin.from("dre_entries").delete().eq("user_id", userId);
    await supabaseAdmin.from("dre_model_lines").delete().eq("user_id", userId);
    await supabaseAdmin.from("dre_subcategories").delete().eq("user_id", userId);
    await supabaseAdmin.from("dre_categories").delete().eq("user_id", userId);
    await supabaseAdmin.from("dre_models").delete().eq("user_id", userId);

    await supabaseAdmin.from("user_lesson_progress").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_course_enrollments").delete().eq("user_id", userId);

    await supabaseAdmin.from("support_requests").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_product_subscriptions").delete().eq("user_id", userId);
    await supabaseAdmin.from("product_subscriptions").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_products").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_notification_preferences").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_preferences").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_profiles").delete().eq("user_id", userId);
    await supabaseAdmin.from("admin_users").delete().eq("user_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    await removeStoragePrefix(supabaseAdmin, "avatars", userId);
    await removeStoragePrefix(supabaseAdmin, "exports", userId);

    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      throw deleteUserError;
    }

    return jsonResponse(request, 200, { success: true });
  } catch (error) {
    console.error("delete-account failed", error);
    return jsonResponse(request, 500, { error: "account_deletion_failed" });
  }
});
