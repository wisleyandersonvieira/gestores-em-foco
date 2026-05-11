import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, MessageSquare, Plus, Users } from "lucide-react";
import { toast } from "sonner";

import { ClientLayout } from "@/components/platform/client-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createCommunityComment, createCommunityTopic, getCommunityComments, getCommunityEvents, getCommunityOverview, getCommunityTopics } from "@/lib/community";

export default function CommunityPage() {
  return <ClientLayout>{() => <CommunityContent />}</ClientLayout>;
}

function CommunityContent() {
  const [overview, setOverview] = useState<any | null>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [eventPeriod, setEventPeriod] = useState("all");
  const [topicDialogOpen, setTopicDialogOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [topicForm, setTopicForm] = useState({ title: "", content: "" });
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const communityOptions = useMemo(() => {
    const sectors = (overview?.my_sectors ?? []).map((sector: any) => ({ value: `sector:${sector.id}`, label: `Setor: ${sector.name}`, type: "sector", sectorId: sector.id }));
    const subsectors = (overview?.my_subsectors ?? []).map((subsector: any) => ({ value: `subsector:${subsector.id}`, label: `Subsetor: ${subsector.name}`, type: "subsector", sectorId: subsector.sector_id, subsectorId: subsector.id }));
    return [{ value: "all", label: "Todos", type: "all" }, ...sectors, ...subsectors];
  }, [overview]);
  const selectedCommunity = communityOptions.find((option) => option.value === filter) ?? communityOptions[0];
  const visibleEvents = events.filter((event) => {
    const now = Date.now();
    const startsAt = new Date(event.start_at).getTime();
    const matchesPeriod = eventPeriod === "all" || (eventPeriod === "upcoming" ? startsAt >= now : startsAt < now);
    const matchesCommunity = selectedCommunity.type === "all"
      || event.visibility_type === "all"
      || (event.targets ?? []).some((target: any) => selectedCommunity.type === "sector" ? target.sector_id === selectedCommunity.sectorId : target.subsector_id === selectedCommunity.subsectorId);
    return matchesPeriod && matchesCommunity;
  });

  async function loadAll() {
    const [nextOverview, nextEvents] = await Promise.all([getCommunityOverview(), getCommunityEvents()]);
    setOverview(nextOverview);
    setEvents(nextEvents);
  }

  async function loadTopics() {
    if (!selectedCommunity || selectedCommunity.type === "all") {
      setTopics(await getCommunityTopics());
      return;
    }
    setTopics(await getCommunityTopics({ type: selectedCommunity.type as "sector" | "subsector", id: selectedCommunity.type === "sector" ? selectedCommunity.sectorId : selectedCommunity.subsectorId }));
  }

  useEffect(() => {
    loadAll().catch((error) => toast.error(error instanceof Error ? error.message : "Não foi possível carregar comunidade."));
  }, []);

  useEffect(() => {
    loadTopics().catch((error) => toast.error(error instanceof Error ? error.message : "Não foi possível carregar tópicos."));
  }, [filter, overview]);

  async function handleCreateTopic() {
    if (!selectedCommunity || selectedCommunity.type === "all") {
      toast.error("Selecione uma comunidade específica para criar o tópico.");
      return;
    }
    setBusy(true);
    try {
      await createCommunityTopic({
        communityType: selectedCommunity.type as "sector" | "subsector",
        sectorId: selectedCommunity.sectorId,
        subsectorId: selectedCommunity.subsectorId ?? null,
        title: topicForm.title,
        content: topicForm.content,
      });
      setTopicForm({ title: "", content: "" });
      setTopicDialogOpen(false);
      await loadTopics();
      await loadAll();
      toast.success("Tópico criado com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar o tópico.");
    } finally {
      setBusy(false);
    }
  }

  async function openTopic(topic: any) {
    setSelectedTopic(topic);
    setComments(await getCommunityComments(topic.id));
  }

  async function handleComment() {
    if (!selectedTopic) return;
    setBusy(true);
    try {
      await createCommunityComment(selectedTopic.id, comment);
      setComment("");
      setComments(await getCommunityComments(selectedTopic.id));
      await loadTopics();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível comentar.");
    } finally {
      setBusy(false);
    }
  }

  const hasCommunities = Boolean((overview?.my_sectors ?? []).length);
  if (overview && !hasCommunities) {
    return (
      <Card className="border-primary/10 bg-white/90">
        <CardHeader><CardTitle>Complete seu perfil</CardTitle><CardDescription>Selecione seus setores e subsetores de atuação para acessar comunidades, fóruns e eventos personalizados.</CardDescription></CardHeader>
        <CardContent><Button asChild><Link to="/configuracoes">Atualizar perfil</Link></Button></CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold md:text-4xl">Comunidade</h1>
        <p className="mt-2 text-sm text-muted-foreground">Conecte-se com empresários e gestores dos seus setores de atuação.</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList><TabsTrigger value="overview">Visão geral</TabsTrigger><TabsTrigger value="forum">Fórum</TabsTrigger><TabsTrigger value="events">Eventos</TabsTrigger></TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Metric icon={Users} label="Usuários nos meus setores" value={overview?.users_in_my_sectors_count ?? 0} />
            <Metric icon={Users} label="Usuários nos meus subsetores" value={overview?.users_in_my_subsectors_count ?? 0} />
            <Metric icon={CalendarDays} label="Eventos disponíveis" value={overview?.available_events_count ?? 0} />
            <Metric icon={MessageSquare} label="Tópicos recentes" value={(overview?.recent_topics ?? []).length} />
          </div>
          <Card className="bg-white/90"><CardHeader><CardTitle>Minhas comunidades</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><TagList title="Setores" items={(overview?.my_sectors ?? []).map((item: any) => item.name)} /><TagList title="Subsetores" items={(overview?.my_subsectors ?? []).map((item: any) => `${item.sector_name}: ${item.name}`)} /></CardContent></Card>
          <Card className="bg-white/90"><CardHeader><CardTitle>Conversas recentes</CardTitle></CardHeader><CardContent className="space-y-3">{(overview?.recent_topics ?? []).length ? overview.recent_topics.map((topic: any) => <TopicRow key={topic.id} topic={topic} onOpen={() => openTopic(topic)} />) : <p className="text-sm text-muted-foreground">Nenhum tópico criado nesta comunidade ainda.</p>}</CardContent></Card>
        </TabsContent>

        <TabsContent value="forum" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CommunityFilter value={filter} options={communityOptions} onChange={setFilter} />
            <Button onClick={() => setTopicDialogOpen(true)}><Plus className="h-4 w-4" /> Novo tópico</Button>
          </div>
          <Card className="bg-white/90"><CardContent className="space-y-3 p-4">{topics.length ? topics.map((topic) => <TopicRow key={topic.id} topic={topic} onOpen={() => openTopic(topic)} />) : <p className="text-sm text-muted-foreground">Nenhum tópico criado nesta comunidade ainda.</p>}</CardContent></Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <CommunityFilter value={filter} options={communityOptions} onChange={setFilter} />
            <Select value={eventPeriod} onValueChange={setEventPeriod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="upcoming">Próximos</SelectItem><SelectItem value="past">Encerrados</SelectItem></SelectContent></Select>
          </div>
          {visibleEvents.length ? <div className="grid gap-4 md:grid-cols-2">{visibleEvents.map((event) => <EventCard key={event.id} event={event} />)}</div> : <Card className="bg-white/90"><CardContent className="p-6 text-sm text-muted-foreground">Nenhum evento disponível para suas comunidades no momento.</CardContent></Card>}
        </TabsContent>
      </Tabs>

      <Dialog open={topicDialogOpen} onOpenChange={setTopicDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo tópico</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <CommunityFilter value={filter} options={communityOptions.filter((option) => option.value !== "all")} onChange={setFilter} />
            <Label>Título<Input className="mt-2" maxLength={120} value={topicForm.title} onChange={(event) => setTopicForm((current) => ({ ...current, title: event.target.value }))} /></Label>
            <Label>Conteúdo<Textarea className="mt-2" maxLength={5000} value={topicForm.content} onChange={(event) => setTopicForm((current) => ({ ...current, content: event.target.value }))} /></Label>
          </div>
          <DialogFooter><Button disabled={busy} onClick={() => void handleCreateTopic()}>{busy ? "Publicando..." : "Publicar tópico"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedTopic)} onOpenChange={(open) => !open && setSelectedTopic(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{selectedTopic?.title}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4"><p className="whitespace-pre-wrap text-sm">{selectedTopic?.content}</p><p className="mt-3 text-xs text-muted-foreground">{selectedTopic?.author_name} - {formatDate(selectedTopic?.created_at)}</p></div>
            <div className="space-y-3">{comments.length ? comments.map((item) => <div key={item.id} className="rounded-lg border p-3"><p className="whitespace-pre-wrap text-sm">{item.content}</p><p className="mt-2 text-xs text-muted-foreground">{item.author_name} - {formatDate(item.created_at)}</p></div>) : <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>}</div>
            <Textarea maxLength={2000} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Responder..." />
          </div>
          <DialogFooter><Button disabled={busy} onClick={() => void handleComment()}>{busy ? "Enviando..." : "Responder"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return <Card className="bg-white/90"><CardHeader><Icon className="h-5 w-5 text-primary" /><CardDescription>{label}</CardDescription><CardTitle className="text-3xl">{value}</CardTitle></CardHeader></Card>;
}

function TagList({ title, items }: { title: string; items: string[] }) {
  return <div><p className="font-medium">{title}</p><div className="mt-2 flex flex-wrap gap-2">{items.length ? items.map((item) => <Badge key={item} variant="secondary">{item}</Badge>) : <p className="text-sm text-muted-foreground">Nenhum item selecionado.</p>}</div></div>;
}

function CommunityFilter({ value, options, onChange }: { value: string; options: any[]; onChange: (value: string) => void }) {
  return <Select value={value} onValueChange={onChange}><SelectTrigger className="w-full sm:w-80"><SelectValue placeholder="Ver comunidade" /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>;
}

function TopicRow({ topic, onOpen }: { topic: any; onOpen: () => void }) {
  return <button type="button" onClick={onOpen} className="w-full rounded-lg border p-4 text-left transition hover:border-primary/40"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-semibold">{topic.title}</p><p className="mt-1 text-sm text-muted-foreground">{topic.community_name} - {topic.author_name ?? "Usuário"}</p></div><div className="flex gap-2">{topic.is_pinned ? <Badge>Fixado</Badge> : null}<Badge variant="secondary">{topic.comments_count ?? 0} comentários</Badge></div></div></button>;
}

function EventCard({ event }: { event: any }) {
  const isOnline = event.event_type === "online" || event.event_type === "hibrido";
  return <Card className="bg-white/90"><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>{event.title}</CardTitle><CardDescription>{formatDate(event.start_at)} - {eventTypeLabel(event.event_type)}</CardDescription></div><Badge>{event.status}</Badge></div></CardHeader><CardContent className="space-y-3"><p className="line-clamp-3 text-sm text-muted-foreground">{event.description || "Sem descrição."}</p>{event.location ? <p className="text-sm"><strong>Local:</strong> {event.location}</p> : null}{isOnline && event.meeting_url ? <Button asChild variant="outline"><a href={event.meeting_url} target="_blank" rel="noopener noreferrer">Acessar evento</a></Button> : null}</CardContent></Card>;
}

function formatDate(value?: string | null) {
  return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "-";
}

function eventTypeLabel(value: string) {
  return { online: "Online", presencial: "Presencial", hibrido: "Híbrido" }[value] ?? value;
}
