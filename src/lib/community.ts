import { supabase } from "@/integrations/supabase/client";

const fromAny = (table: string) => (supabase.from as any)(table);

type CommunityFilter = {
  type: "all" | "sector" | "subsector";
  id?: string | null;
};

export async function getCommunityOverview() {
  const { data, error } = await supabase.rpc("get_my_community_overview" as any);
  if (error) throw new Error("Não foi possível carregar a comunidade.");
  return data as any;
}

export async function getCommunityTopics(filter: CommunityFilter = { type: "all" }) {
  const { data, error } = await supabase.rpc("get_my_community_topics" as any, {
    p_filter_type: filter.type,
    p_filter_id: filter.id ?? null,
  });
  if (error) throw new Error("Não foi possível carregar tópicos.");
  return (data ?? []) as any[];
}

export async function createCommunityTopic(input: { communityType: "sector" | "subsector"; sectorId: string; subsectorId?: string | null; title: string; content: string }) {
  const { error } = await supabase.rpc("create_community_topic" as any, {
    p_community_type: input.communityType,
    p_sector_id: input.sectorId,
    p_subsector_id: input.subsectorId ?? null,
    p_title: input.title,
    p_content: input.content,
  });
  if (error) throw new Error("Não foi possível criar o tópico.");
}

export async function getCommunityComments(topicId: string) {
  const { data, error } = await supabase.rpc("get_community_topic_comments" as any, { p_topic_id: topicId });
  if (error) throw new Error("Não foi possível carregar comentários.");
  return (data ?? []) as any[];
}

export async function createCommunityComment(topicId: string, content: string) {
  const { error } = await supabase.rpc("create_community_comment" as any, { p_topic_id: topicId, p_content: content });
  if (error) throw new Error("Não foi possível enviar o comentário.");
}

export async function getCommunityEvents() {
  const { data, error } = await supabase.rpc("get_my_community_events" as any);
  if (error) throw new Error("Não foi possível carregar eventos.");
  return (data ?? []) as any[];
}

export async function getAdminCommunityEvents() {
  const { data, error } = await fromAny("community_events")
    .select("*, targets:community_event_targets(*)")
    .order("start_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar eventos.");
  return data ?? [];
}

export async function saveAdminCommunityEvent(input: any) {
  const {
    id,
    targets,
    ...event
  } = input;

  const { data: saved, error } = id
    ? await fromAny("community_events").update(event).eq("id", id).select("*").single()
    : await fromAny("community_events").insert(event).select("*").single();

  if (error || !saved) throw new Error("Não foi possível salvar o evento.");

  await fromAny("community_event_targets").delete().eq("event_id", saved.id);
  if (event.visibility_type !== "all" && targets?.length) {
    const { error: targetsError } = await fromAny("community_event_targets").insert(targets.map((target: any) => ({ ...target, event_id: saved.id })));
    if (targetsError) throw new Error("Evento salvo, mas não foi possível salvar os destinos.");
  }

  return saved;
}

export async function deleteAdminCommunityEvent(id: string) {
  const { error } = await fromAny("community_events").delete().eq("id", id);
  if (error) throw new Error("Não foi possível excluir o evento.");
}
