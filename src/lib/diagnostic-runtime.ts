import { supabase } from "@/integrations/supabase/client";
import { ensureDiagnosticProduct } from "@/lib/user-products";
import type { Json, Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type {
  AccountWorkspace,
  AssignedDiagnosticItem,
  ClientProfileOption,
  CreateLinkPayload,
  DiagnosticAnswerRecord,
  DiagnosticLinkItem,
  DiagnosticSessionRuntime,
  DiagnosticTraversal,
  RuntimeOption,
  RuntimeQuestion,
  SessionHistoryItem,
} from "@/types/diagnostic-runtime";

type RuntimeSettings = {
  kind?: RuntimeQuestion["kind"];
  branches?: RuntimeQuestion["branches"];
  options?: RuntimeOption[];
  scaleMin?: number;
  scaleMax?: number;
  endMessage?: string;
  targetMap?: Record<string, string>;
};

function parseSettings(value: Json | null): RuntimeSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as RuntimeSettings;
}

function inferKind(questionType: Tables<"diagnostic_questions">["question_type"], settings: RuntimeSettings): RuntimeQuestion["kind"] {
  if (settings.kind) {
    return settings.kind;
  }

  switch (questionType) {
    case "yes_no":
      return "yes_no";
    case "multiple_choice":
    case "single_choice":
      return "multiple";
    case "scale":
      return "scale";
    default:
      return "text";
  }
}

function defaultBranches(kind: RuntimeQuestion["kind"]) {
  switch (kind) {
    case "yes_no":
      return [
        { id: crypto.randomUUID(), handleId: "yes", label: "Sim", value: "yes" },
        { id: crypto.randomUUID(), handleId: "no", label: "Nao", value: "no" },
      ];
    case "multiple":
      return [];
    case "start":
    case "scale":
    case "text":
      return [{ id: crypto.randomUUID(), handleId: "default", label: "Proximo", value: "next" }];
    default:
      return [];
  }
}

function getAnswerValue(answer: DiagnosticAnswerRecord) {
  return answer.answerValue ?? answer.answerText ?? "";
}

function getAnswerHandle(question: RuntimeQuestion, rawAnswer: string) {
  switch (question.kind) {
    case "yes_no":
      return rawAnswer === "yes" ? "yes" : "no";
    case "multiple": {
      const optionIndex = question.options.findIndex((option) => option.value === rawAnswer);
      return optionIndex >= 0 ? `option-${optionIndex + 1}` : null;
    }
    case "scale":
    case "text":
    case "start":
      return "default";
    default:
      return null;
  }
}

function getNextQuestionId(question: RuntimeQuestion, rawAnswer: string) {
  if (question.kind === "end") {
    return null;
  }

  const handleId = getAnswerHandle(question, rawAnswer);
  if (!handleId) {
    return null;
  }

  return question.targetMap[handleId] ?? null;
}

function buildRuntimeQuestions(
  categories: Tables<"diagnostic_categories">[],
  questions: Tables<"diagnostic_questions">[],
  options: Tables<"diagnostic_question_options">[],
) {
  const categoryMap = new Map(categories.map((category) => [category.id, category.name]));

  return questions.map<RuntimeQuestion>((question) => {
    const settings = parseSettings(question.settings);
    const kind = inferKind(question.question_type, settings);
    const questionOptions = options
      .filter((option) => option.question_id === question.id)
      .map<RuntimeOption>((option) => ({
        id: option.id,
        label: option.label,
        value: option.value,
        score: option.score ?? 1,
      }));

    return {
      id: question.id,
      kind,
      title: question.title,
      description: question.description ?? "",
      categoryId: question.category_id,
      categoryName: categoryMap.get(question.category_id) ?? null,
      weight: question.weight ?? 1,
      required: question.is_required,
      branches:
        kind === "multiple"
          ? questionOptions.map((option, index) => ({
              id: option.id,
              handleId: `option-${index + 1}`,
              label: option.label,
              value: option.value,
            }))
          : settings.branches ?? defaultBranches(kind),
      options: kind === "multiple" ? (settings.options?.length ? settings.options : questionOptions) : [],
      scaleMin: settings.scaleMin ?? 1,
      scaleMax: settings.scaleMax ?? 5,
      endMessage: settings.endMessage ?? "",
      targetMap: settings.targetMap ?? {},
    };
  });
}

export function computeTraversal(questions: RuntimeQuestion[], answers: DiagnosticAnswerRecord[]): DiagnosticTraversal {
  const questionMap = new Map(questions.map((question) => [question.id, question]));
  const answerMap = new Map(answers.map((answer) => [answer.questionId, answer]));
  const answerableQuestions = questions.filter((question) => question.kind !== "start" && question.kind !== "end");
  const startNode = questions.find((question) => question.kind === "start");

  if (!startNode) {
    return {
      currentQuestionId: null,
      previousQuestionId: null,
      answeredPathIds: [],
      completed: false,
      endMessage: null,
      progressPercent: 0,
    };
  }

  const answeredPathIds: string[] = [];
  let previousQuestionId: string | null = null;
  let currentId = getNextQuestionId(startNode, "next");
  let completed = false;
  let endMessage: string | null = null;
  let currentQuestionId: string | null = null;
  const visited = new Set<string>([startNode.id]);

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const question = questionMap.get(currentId);

    if (!question) {
      break;
    }

    if (question.kind === "end") {
      completed = true;
      endMessage = question.endMessage || "Diagnostico concluido com sucesso.";
      currentQuestionId = null;
      break;
    }

    const answer = answerMap.get(question.id);
    if (!answer) {
      currentQuestionId = question.id;
      break;
    }

    answeredPathIds.push(question.id);
    previousQuestionId = question.id;
    currentId = getNextQuestionId(question, getAnswerValue(answer));
  }

  if (!currentId && answeredPathIds.length > 0 && !completed) {
    completed = true;
    endMessage = "Diagnostico concluido com sucesso.";
  }

  const answeredCount = answeredPathIds.length + (currentQuestionId ? 0 : completed ? 1 : 0);
  const progressBase = answerableQuestions.length === 0 ? 0 : Math.round((answeredPathIds.length / answerableQuestions.length) * 100);

  return {
    currentQuestionId,
    previousQuestionId: currentQuestionId ? previousQuestionId : answeredPathIds[answeredPathIds.length - 1] ?? null,
    answeredPathIds,
    completed,
    endMessage,
    progressPercent: completed ? 100 : Math.min(progressBase, 99),
  };
}

export async function listClientProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "client")
    .eq("is_active", true)
    .order("full_name");

  if (error) {
    throw new Error("Nao foi possivel carregar a lista de clientes.");
  }

  return (data ?? []).map<ClientProfileOption>((profile) => ({
    id: profile.id,
    name: profile.full_name ?? profile.email ?? "Cliente sem nome",
    email: profile.email,
  }));
}

export async function createDiagnosticLink(userId: string, payload: CreateLinkPayload) {
  const token = crypto.randomUUID();
  const insertData: TablesInsert<"diagnostic_links"> = {
    created_by: userId,
    template_id: payload.templateId,
    token,
    title: payload.title || null,
    notes: payload.notes || null,
    assigned_user_id: payload.assignedUserId,
    expires_at: payload.expiresAt,
    max_uses: payload.maxUses,
    status: "active",
  };

  const { error } = await supabase.from("diagnostic_links").insert(insertData);

  if (error) {
    throw new Error("Nao foi possivel gerar o link de diagnostico.");
  }

  return token;
}

export async function listDiagnosticLinks(templateId: string) {
  const [{ data: links, error: linksError }, { data: sessions, error: sessionsError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      supabase
        .from("diagnostic_links")
        .select("id, token, title, notes, expires_at, max_uses, uses_count, assigned_user_id, template_id, status")
        .eq("template_id", templateId)
        .order("created_at", { ascending: false }),
      supabase
        .from("diagnostic_sessions")
        .select("id, link_id, status")
        .eq("template_id", templateId),
      supabase.from("profiles").select("id, full_name"),
    ]);

  if (linksError || sessionsError || profilesError) {
    throw new Error("Nao foi possivel carregar os links deste modelo.");
  }

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));
  const sessionsByLink = new Map<
    string,
    Array<Pick<Tables<"diagnostic_sessions">, "id" | "link_id" | "status">>
  >();
  (sessions ?? []).forEach((session) => {
    const current = sessionsByLink.get(session.link_id) ?? [];
    current.push(session);
    sessionsByLink.set(session.link_id, current);
  });

  return (links ?? []).map<DiagnosticLinkItem>((link) => {
    const relatedSessions = sessionsByLink.get(link.id) ?? [];
    const completedSession = relatedSessions.find((session) => session.status === "completed");
    const activeSession = relatedSessions.find((session) => session.status === "in_progress");

    return {
      id: link.id,
      token: link.token,
      title: link.title,
      notes: link.notes,
      expiresAt: link.expires_at,
      maxUses: link.max_uses,
      usesCount: link.uses_count,
      assignedUserId: link.assigned_user_id,
      assignedUserName: link.assigned_user_id ? profileMap.get(link.assigned_user_id) ?? null : null,
      templateId: link.template_id,
      status: link.status,
      progressStatus: completedSession ? "completed" : activeSession ? "in_progress" : "pending",
      sessionId: completedSession?.id ?? activeSession?.id ?? relatedSessions[0]?.id ?? null,
    };
  });
}

export async function listUserSessionHistory(userId: string) {
  const [{ data: sessions, error: sessionsError }, { data: links, error: linksError }, { data: templates, error: templatesError }] =
    await Promise.all([
      supabase
        .from("diagnostic_sessions")
        .select("id, link_id, template_id, status, progress_percent, updated_at, completed_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false }),
      supabase.from("diagnostic_links").select("id, token, title, template_id"),
      supabase.from("diagnostic_templates").select("id, name"),
    ]);

  if (sessionsError || linksError || templatesError) {
    throw new Error("Nao foi possivel carregar o historico de diagnosticos.");
  }

  const linkMap = new Map((links ?? []).map((link) => [link.id, link]));
  const templateMap = new Map((templates ?? []).map((template) => [template.id, template.name]));

  return (sessions ?? []).map<SessionHistoryItem>((session) => ({
    sessionId: session.id,
    linkId: session.link_id,
    token: linkMap.get(session.link_id)?.token ?? "",
    title: linkMap.get(session.link_id)?.title ?? null,
    templateId: session.template_id,
    templateName: templateMap.get(session.template_id) ?? "Modelo sem nome",
    status: session.status,
    progressPercent: session.progress_percent,
    updatedAt: session.updated_at,
    completedAt: session.completed_at,
  }));
}

export async function listAssignedDiagnostics(userId: string) {
  const [{ data: links, error: linksError }, { data: sessions, error: sessionsError }, { data: templates, error: templatesError }] =
    await Promise.all([
      supabase
        .from("diagnostic_links")
        .select("id, token, title, template_id, expires_at, updated_at")
        .eq("assigned_user_id", userId)
        .eq("status", "active")
        .order("updated_at", { ascending: false }),
      supabase
        .from("diagnostic_sessions")
        .select("id, link_id, template_id, status, progress_percent, updated_at, completed_at")
        .eq("user_id", userId),
      supabase.from("diagnostic_templates").select("id, name"),
    ]);

  if (linksError || sessionsError || templatesError) {
    throw new Error("Nao foi possivel carregar seus diagnosticos vinculados.");
  }

  const templateMap = new Map((templates ?? []).map((template) => [template.id, template.name]));
  const sessionMap = new Map((sessions ?? []).map((session) => [session.link_id, session]));

  return (links ?? []).map<AssignedDiagnosticItem>((link) => {
    const session = sessionMap.get(link.id);
    return {
      linkId: link.id,
      token: link.token,
      title: link.title,
      templateId: link.template_id,
      templateName: templateMap.get(link.template_id) ?? "Modelo sem nome",
      status: session
        ? session.status === "completed"
          ? "completed"
          : session.status === "in_progress"
            ? "in_progress"
            : "pending"
        : "pending",
      expiresAt: link.expires_at,
      updatedAt: session?.updated_at ?? link.updated_at,
      progressPercent: session?.progress_percent ?? 0,
      sessionId: session?.id ?? null,
      completedAt: session?.completed_at ?? null,
    };
  });
}

export async function getAccountWorkspace(userId: string): Promise<AccountWorkspace> {
  const [assigned, history] = await Promise.all([listAssignedDiagnostics(userId), listUserSessionHistory(userId)]);
  return { assigned, history };
}

export function extractDiagnosticToken(input: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }

  if (!trimmed.includes("/diagnostico/")) {
    return trimmed;
  }

  return trimmed.split("/diagnostico/").pop()?.split("?")[0]?.trim() ?? "";
}

export async function validateDiagnosticTokenForUser(token: string, userId: string) {
  const cleanedToken = extractDiagnosticToken(token);
  if (!cleanedToken) {
    throw new Error("Digite um token ou link valido.");
  }

  const { data: link, error } = await supabase
    .from("diagnostic_links")
    .select("id, token, assigned_user_id, expires_at, status")
    .eq("token", cleanedToken)
    .maybeSingle();

  if (error || !link) {
    throw new Error("Nao encontramos um diagnostico com este token.");
  }

  if (link.status !== "active") {
    throw new Error("Este diagnostico nao esta mais disponivel.");
  }

  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
    throw new Error("Este diagnostico expirou.");
  }

  if (link.assigned_user_id && link.assigned_user_id !== userId) {
    throw new Error("Este diagnostico foi vinculado a outra conta.");
  }

  return cleanedToken;
}

export async function getDiagnosticRuntimeByToken(token: string, userId: string): Promise<DiagnosticSessionRuntime> {
  const { data: link, error: linkError } = await supabase
    .from("diagnostic_links")
    .select("*")
    .eq("token", token)
    .single();

  if (linkError || !link) {
    throw new Error("invalid_link");
  }

  if (link.status !== "active") {
    throw new Error("link_unavailable");
  }

  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
    throw new Error("link_expired");
  }

  if (link.assigned_user_id && link.assigned_user_id !== userId) {
    throw new Error("forbidden");
  }

  const [{ data: template, error: templateError }, { data: categories, error: categoriesError }, { data: questions, error: questionsError }, { data: options, error: optionsError }] =
    await Promise.all([
      supabase
        .from("diagnostic_templates")
        .select("*")
        .eq("id", link.template_id)
        .single(),
      supabase.from("diagnostic_categories").select("*").eq("template_id", link.template_id).order("sort_order"),
      supabase.from("diagnostic_questions").select("*").eq("template_id", link.template_id).order("sort_order"),
      supabase.from("diagnostic_question_options").select("*").order("sort_order"),
    ]);

  if (templateError || !template || categoriesError || questionsError || optionsError) {
    throw new Error("runtime_unavailable");
  }

  const questionIds = new Set((questions ?? []).map((question) => question.id));
  const runtimeQuestions = buildRuntimeQuestions(categories ?? [], questions ?? [], (options ?? []).filter((option) => questionIds.has(option.question_id)));

  let { data: session } = await supabase
    .from("diagnostic_sessions")
    .select("*")
    .eq("link_id", link.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!session && link.max_uses && link.uses_count >= link.max_uses) {
    throw new Error("link_unavailable");
  }

  if (!session) {
    const insertPayload: TablesInsert<"diagnostic_sessions"> = {
      link_id: link.id,
      template_id: link.template_id,
      user_id: userId,
      status: "not_started",
      progress_percent: 0,
    };

    const { data: insertedSession, error: insertError } = await supabase
      .from("diagnostic_sessions")
      .insert(insertPayload)
      .select("*")
      .single();

    if (insertError || !insertedSession) {
      throw new Error("session_error");
    }

    session = insertedSession;

    const { error: usageError } = await supabase.rpc("mark_diagnostic_link_used" as any, {
      p_link_id: link.id,
      p_user_id: userId,
    });

    if (usageError) {
      throw new Error("link_unavailable");
    }
  }

  const { data: answers, error: answersError } = await supabase
    .from("diagnostic_answers")
    .select("id, question_id, answer_value, answer_text, score")
    .eq("session_id", session.id);

  if (answersError) {
    throw new Error("answers_error");
  }

  return {
    session,
    link,
    template,
    questions: runtimeQuestions,
    answers: (answers ?? []).map<DiagnosticAnswerRecord>((answer) => ({
      id: answer.id,
      questionId: answer.question_id,
      answerValue: answer.answer_value,
      answerText: answer.answer_text,
      score: answer.score,
    })),
  };
}

export async function getDiagnosticRuntimeBySession(sessionId: string, userId: string): Promise<DiagnosticSessionRuntime> {
  const { data: session, error: sessionError } = await supabase
    .from("diagnostic_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (sessionError || !session) {
    throw new Error("Sessao de diagnostico nao encontrada.");
  }

  const { data: link, error: linkError } = await supabase
    .from("diagnostic_links")
    .select("*")
    .eq("id", session.link_id)
    .single();

  if (linkError || !link) {
    throw new Error("Link do diagnostico nao encontrado.");
  }

  const [{ data: template, error: templateError }, { data: categories, error: categoriesError }, { data: questions, error: questionsError }, { data: options, error: optionsError }, { data: answers, error: answersError }] =
    await Promise.all([
      supabase
        .from("diagnostic_templates")
        .select("*")
        .eq("id", session.template_id)
        .single(),
      supabase.from("diagnostic_categories").select("*").eq("template_id", session.template_id).order("sort_order"),
      supabase.from("diagnostic_questions").select("*").eq("template_id", session.template_id).order("sort_order"),
      supabase.from("diagnostic_question_options").select("*").order("sort_order"),
      supabase
        .from("diagnostic_answers")
        .select("id, question_id, answer_value, answer_text, score")
        .eq("session_id", session.id),
    ]);

  if (templateError || !template || categoriesError || questionsError || optionsError || answersError) {
    throw new Error("Nao foi possivel reconstruir esta sessao.");
  }

  const questionIds = new Set((questions ?? []).map((question) => question.id));
  const runtimeQuestions = buildRuntimeQuestions(categories ?? [], questions ?? [], (options ?? []).filter((option) => questionIds.has(option.question_id)));

  return {
    session,
    link,
    template,
    questions: runtimeQuestions,
    answers: (answers ?? []).map<DiagnosticAnswerRecord>((answer) => ({
      id: answer.id,
      questionId: answer.question_id,
      answerValue: answer.answer_value,
      answerText: answer.answer_text,
      score: answer.score,
    })),
  };
}

export async function saveDiagnosticAnswer(params: {
  sessionId: string;
  question: RuntimeQuestion;
  answer: string;
  answeredPathIds: string[];
  userId: string;
}) {
  const keepQuestionIds = [...params.answeredPathIds, params.question.id];
  const { data: existingAnswers } = await supabase
    .from("diagnostic_answers")
    .select("id, question_id")
    .eq("session_id", params.sessionId);

  const staleIds = (existingAnswers ?? [])
    .filter((answer) => !keepQuestionIds.includes(answer.question_id))
    .map((answer) => answer.id);

  if (staleIds.length > 0) {
    await supabase.from("diagnostic_answers").delete().in("id", staleIds);
  }

  await supabase
    .from("diagnostic_answers")
    .delete()
    .eq("session_id", params.sessionId)
    .eq("question_id", params.question.id);

  let score: number | null = null;
  let answerValue: string | null = params.answer;
  let answerText: string | null = null;

  if (params.question.kind === "text") {
    answerText = params.answer;
  }

  if (params.question.kind === "scale") {
    score = Number(params.answer);
  } else if (params.question.kind === "multiple") {
    score = params.question.options.find((option) => option.value === params.answer)?.score ?? null;
  } else if (params.question.kind === "yes_no") {
    score = params.answer === "yes" ? 1 : 0;
  }

  const insertPayload: TablesInsert<"diagnostic_answers"> = {
    session_id: params.sessionId,
    question_id: params.question.id,
    answer_value: answerValue,
    answer_text: answerText,
    score,
  };

  const { error: insertError } = await supabase.from("diagnostic_answers").insert(insertPayload);
  if (insertError) {
    throw new Error("Nao foi possivel salvar sua resposta.");
  }

  void params.userId;
}

export async function refreshSessionProgress(
  sessionId: string,
  questions: RuntimeQuestion[],
  answers: DiagnosticAnswerRecord[],
) {
  const traversal = computeTraversal(questions, answers);
  const updatePayload: TablesUpdate<"diagnostic_sessions"> = {
    progress_percent: traversal.progressPercent,
    last_answered_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: traversal.completed ? "completed" : answers.length > 0 ? "in_progress" : "not_started",
    completed_at: traversal.completed ? new Date().toISOString() : null,
  };

  if (answers.length > 0) {
    updatePayload.started_at = new Date().toISOString();
  }

  const { error } = await supabase.from("diagnostic_sessions").update(updatePayload).eq("id", sessionId);

  if (error) {
    throw new Error("Nao foi possivel atualizar o progresso da sessao.");
  }

  if (traversal.completed) {
    const { data: session } = await supabase
      .from("diagnostic_sessions")
      .select("id, user_id, completed_at, diagnostic_templates(name)")
      .eq("id", sessionId)
      .maybeSingle();

    if (session) {
      await ensureDiagnosticProduct({
        userId: session.user_id,
        sessionId: session.id,
        templateName: session.diagnostic_templates?.name ?? "Diagnostico Empresarial",
        completedAt: session.completed_at,
      });
    }
  }

  return traversal;
}
