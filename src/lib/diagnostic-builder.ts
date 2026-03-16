import type { XYPosition } from "@xyflow/react";

import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables, TablesInsert } from "@/integrations/supabase/types";
import type {
  DiagnosticFlowEdge,
  DiagnosticFlowNode,
  FlowBranch,
  FlowNodeKind,
  FlowOption,
  TemplateEditorState,
  TemplateStatus,
  TemplateSummary,
} from "@/types/diagnostic-builder";

type FlowSettings = {
  kind?: FlowNodeKind;
  position?: XYPosition;
  branches?: FlowBranch[];
  options?: FlowOption[];
  scaleMin?: number;
  scaleMax?: number;
  endMessage?: string;
};

const DEFAULT_CATEGORY_NAME = "Fluxo principal";

function asFlowSettings(value: Json | null): FlowSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as FlowSettings;
}

function toQuestionType(kind: FlowNodeKind) {
  switch (kind) {
    case "yes_no":
      return "yes_no" as const;
    case "multiple":
      return "multiple_choice" as const;
    case "scale":
      return "scale" as const;
    default:
      return "text" as const;
  }
}

function fromQuestionType(questionType: Tables<"diagnostic_questions">["question_type"], settings: FlowSettings): FlowNodeKind {
  if (settings.kind) {
    return settings.kind;
  }

  switch (questionType) {
    case "yes_no":
      return "yes_no";
    case "multiple_choice":
      return "multiple";
    case "scale":
      return "scale";
    default:
      return "text";
  }
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createId() {
  return crypto.randomUUID();
}

export function createBranches(kind: FlowNodeKind): FlowBranch[] {
  switch (kind) {
    case "yes_no":
      return [
        { id: createId(), handleId: "yes", label: "Sim", value: "yes" },
        { id: createId(), handleId: "no", label: "Nao", value: "no" },
      ];
    case "multiple":
      return [
        { id: createId(), handleId: "option-1", label: "Opcao 1", value: "option_1" },
        { id: createId(), handleId: "option-2", label: "Opcao 2", value: "option_2" },
      ];
    case "start":
    case "scale":
    case "text":
      return [{ id: createId(), handleId: "default", label: "Proximo", value: "next" }];
    default:
      return [];
  }
}

export function createOptions(): FlowOption[] {
  return [
    { id: createId(), label: "Opcao 1", value: "option_1", score: 1 },
    { id: createId(), label: "Opcao 2", value: "option_2", score: 1 },
  ];
}

export function createNode(kind: FlowNodeKind, position: XYPosition): DiagnosticFlowNode {
  return {
    id: createId(),
    type: "diagnostic",
    position,
    data: {
      kind,
      title:
        kind === "start"
          ? "Inicio do fluxo"
          : kind === "end"
            ? "Conclusao"
            : kind === "group"
              ? "Grupo visual"
              : "Nova pergunta",
      description: "",
      categoryId: null,
      weight: 1,
      required: true,
      branches: createBranches(kind),
      options: kind === "multiple" ? createOptions() : [],
      scaleMin: 1,
      scaleMax: 5,
      endMessage: kind === "end" ? "Parabens por concluir este diagnostico." : "",
    },
  };
}

export function getNodeBranches(node: DiagnosticFlowNode) {
  if (node.data.kind === "multiple") {
    return node.data.options.map((option, index) => ({
      handleId: `option-${index + 1}`,
      label: option.label,
      value: option.value,
    }));
  }

  return node.data.branches;
}

export function syncEdgesWithNodes(nodes: DiagnosticFlowNode[], edges: DiagnosticFlowEdge[]) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  return edges.map((edge) => {
    const source = nodeMap.get(edge.source);
    const branch = source ? getNodeBranches(source).find((item) => item.handleId === edge.sourceHandle) : undefined;

    return {
      ...edge,
      label: branch?.label ?? edge.label,
      data: {
        conditionLabel: branch?.label,
        conditionValue: branch?.value,
      },
    };
  });
}

export function validateFlow(nodes: DiagnosticFlowNode[], edges: DiagnosticFlowEdge[]) {
  const errors: string[] = [];
  const flowNodes = nodes.filter((node) => node.data.kind !== "group");
  const startNodes = flowNodes.filter((node) => node.data.kind === "start");
  const endNodes = flowNodes.filter((node) => node.data.kind === "end");

  if (startNodes.length !== 1) {
    errors.push("O fluxo precisa ter exatamente 1 no START.");
  }

  if (endNodes.length === 0) {
    errors.push("O fluxo precisa ter ao menos 1 no END.");
  }

  const incomingCount = new Map<string, number>();
  const outgoingCount = new Map<string, number>();

  edges.forEach((edge) => {
    incomingCount.set(edge.target, (incomingCount.get(edge.target) ?? 0) + 1);
    outgoingCount.set(edge.source, (outgoingCount.get(edge.source) ?? 0) + 1);
  });

  flowNodes.forEach((node) => {
    const incoming = incomingCount.get(node.id) ?? 0;
    const outgoing = outgoingCount.get(node.id) ?? 0;

    if (node.data.kind !== "start" && node.data.kind !== "group" && incoming === 0) {
      errors.push(`O no "${node.data.title}" esta sem conexao de entrada.`);
    }

    if (node.data.kind !== "end" && node.data.kind !== "group" && outgoing === 0) {
      errors.push(`O no "${node.data.title}" esta sem conexao de saida.`);
    }
  });

  if (startNodes.length === 1) {
    const visited = new Set<string>();
    const queue = [startNodes[0].id];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || visited.has(current)) {
        continue;
      }

      visited.add(current);
      edges
        .filter((edge) => edge.source === current)
        .forEach((edge) => {
          if (!visited.has(edge.target)) {
            queue.push(edge.target);
          }
        });
    }

    flowNodes.forEach((node) => {
      if (!visited.has(node.id)) {
        errors.push(`O no "${node.data.title}" nao esta conectado ao caminho principal.`);
      }
    });
  }

  return Array.from(new Set(errors));
}

export function buildPreview(nodes: DiagnosticFlowNode[], edges: DiagnosticFlowEdge[]) {
  const startNode = nodes.find((node) => node.data.kind === "start");
  if (!startNode) {
    return [];
  }

  const sequence: DiagnosticFlowNode[] = [];
  const visited = new Set<string>();
  let currentId: string | null = startNode.id;

  while (currentId && !visited.has(currentId) && sequence.length < 12) {
    const current = nodes.find((node) => node.id === currentId);
    if (!current) {
      break;
    }

    sequence.push(current);
    visited.add(current.id);
    const nextEdge = edges.find((edge) => edge.source === current.id);
    currentId = nextEdge?.target ?? null;
  }

  return sequence;
}

export async function getAdminProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", userId)
    .single();

  if (error) {
    throw new Error("Nao foi possivel validar o perfil do administrador.");
  }

  return data;
}

export async function listTemplates() {
  const { data, error } = await supabase
    .from("diagnostic_templates")
    .select("id, name, description, status, is_active, version, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error("Nao foi possivel carregar os modelos de diagnostico.");
  }

  return (data ?? []).map<TemplateSummary>((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    status: item.status,
    isActive: item.is_active,
    version: item.version,
    updatedAt: item.updated_at,
  }));
}

export async function createTemplate(userId: string, payload: { name: string; description: string; status: TemplateStatus }) {
  const { data, error } = await supabase
    .from("diagnostic_templates")
    .insert({
      name: payload.name,
      description: payload.description || null,
      created_by: userId,
      status: payload.status,
      is_active: payload.status === "published",
      slug: slugify(payload.name),
    })
    .select("id, name, description, status, is_active, version, updated_at")
    .single();

  if (error || !data) {
    throw new Error("Nao foi possivel criar o modelo.");
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    status: data.status,
    isActive: data.is_active,
    version: data.version,
    updatedAt: data.updated_at,
  } satisfies TemplateSummary;
}

export async function archiveTemplate(templateId: string) {
  const { error } = await supabase
    .from("diagnostic_templates")
    .update({
      status: "archived",
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", templateId);

  if (error) {
    throw new Error("Nao foi possivel arquivar o modelo.");
  }
}

export async function loadTemplate(templateId: string): Promise<TemplateEditorState> {
  const [templateResponse, categoriesResponse, questionsResponse, optionsResponse] = await Promise.all([
    supabase
      .from("diagnostic_templates")
      .select("id, name, description, status")
      .eq("id", templateId)
      .single(),
    supabase
      .from("diagnostic_categories")
      .select("id, name, description, sort_order, weight")
      .eq("template_id", templateId)
      .order("sort_order"),
    supabase
      .from("diagnostic_questions")
      .select("id, title, description, category_id, question_type, settings, weight, is_required, sort_order")
      .eq("template_id", templateId)
      .order("sort_order"),
    supabase
      .from("diagnostic_question_options")
      .select("id, question_id, label, value, score, sort_order")
      .order("sort_order"),
  ]);

  if (templateResponse.error || !templateResponse.data) {
    throw new Error("Nao foi possivel abrir este modelo.");
  }

  if (categoriesResponse.error || questionsResponse.error || optionsResponse.error) {
    throw new Error("Nao foi possivel carregar o fluxo salvo.");
  }

  const categories = categoriesResponse.data ?? [];
  const questions = questionsResponse.data ?? [];
  const questionIds = new Set(questions.map((question) => question.id));
  const options = (optionsResponse.data ?? []).filter((option) => questionIds.has(option.question_id));

  const categoryNodes: DiagnosticFlowNode[] = categories.map((category, index) => ({
    id: category.id,
    type: "diagnostic",
    position: { x: -320, y: index * 220 },
    data: {
      kind: "group",
      title: category.name,
      description: category.description ?? "",
      categoryId: category.id,
      weight: category.weight ?? 1,
      required: false,
      branches: [],
      options: [],
      scaleMin: 1,
      scaleMax: 5,
      endMessage: "",
    },
  }));

  const questionNodes: DiagnosticFlowNode[] = questions.map((question, index) => {
    const settings = asFlowSettings(question.settings);
    const nodeOptions = options
      .filter((option) => option.question_id === question.id)
      .map<FlowOption>((option) => ({
        id: option.id,
        label: option.label,
        value: option.value,
        score: option.score ?? 1,
      }));

    const kind = fromQuestionType(question.question_type, settings);

    return {
      id: question.id,
      type: "diagnostic",
      position: settings.position ?? { x: 120 + index * 180, y: 80 + (index % 3) * 120 },
      data: {
        kind,
        title: question.title,
        description: question.description ?? "",
        categoryId: question.category_id,
        weight: question.weight ?? 1,
        required: question.is_required,
        branches: settings.branches ?? createBranches(kind),
        options: kind === "multiple" ? (settings.options ?? nodeOptions.length ? nodeOptions : createOptions()) : [],
        scaleMin: settings.scaleMin ?? 1,
        scaleMax: settings.scaleMax ?? 5,
        endMessage: settings.endMessage ?? "",
      },
    };
  });

  const nodes = [...categoryNodes, ...questionNodes];

  const persistedEdges: DiagnosticFlowEdge[] = [];
  questions.forEach((question) => {
    const settings = asFlowSettings(question.settings);
    (settings.branches ?? []).forEach((branch) => {
      const targetNodeId = (question.settings as { targetMap?: Record<string, string> } | null)?.targetMap?.[branch.handleId];
      if (!targetNodeId) {
        return;
      }

      persistedEdges.push({
        id: `${question.id}-${branch.handleId}-${targetNodeId}`,
        source: question.id,
        sourceHandle: branch.handleId,
        target: targetNodeId,
        type: "smoothstep",
        animated: true,
        label: branch.label,
        data: {
          conditionLabel: branch.label,
          conditionValue: branch.value,
        },
      });
    });
  });

  return {
    templateId: templateResponse.data.id,
    name: templateResponse.data.name,
    description: templateResponse.data.description ?? "",
    status: templateResponse.data.status,
    nodes,
    edges: syncEdgesWithNodes(nodes, persistedEdges),
  };
}

export async function saveTemplate(userId: string, state: TemplateEditorState) {
  const questionNodes = state.nodes.filter((node) => node.data.kind !== "group");
  const groupNodes = state.nodes.filter((node) => node.data.kind === "group");
  const autoCategoryId = groupNodes[0]?.id ?? createId();
  const defaultCategoryId = groupNodes[0]?.id ?? autoCategoryId;

  const { error: templateError } = await supabase
    .from("diagnostic_templates")
    .update({
      name: state.name,
      description: state.description || null,
      status: state.status,
      is_active: state.status === "published",
      slug: slugify(state.name),
      created_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", state.templateId);

  if (templateError) {
    throw new Error("Nao foi possivel salvar os dados principais do modelo.");
  }

  const categoryRows: TablesInsert<"diagnostic_categories">[] =
    groupNodes.length > 0
      ? groupNodes.map((node, index) => ({
          id: node.id,
          template_id: state.templateId,
          name: node.data.title,
          description: node.data.description || null,
          sort_order: index,
          weight: node.data.weight,
        }))
      : [
          {
            id: autoCategoryId,
            template_id: state.templateId,
            name: DEFAULT_CATEGORY_NAME,
            description: "Categoria padrao criada para o fluxo.",
            sort_order: 0,
            weight: 1,
          },
        ];

  const edgesBySource = new Map<string, Record<string, string>>();
  state.edges.forEach((edge) => {
    if (!edge.sourceHandle) {
      return;
    }

    const current = edgesBySource.get(edge.source) ?? {};
    current[edge.sourceHandle] = edge.target;
    edgesBySource.set(edge.source, current);
  });

  const questionRows: TablesInsert<"diagnostic_questions">[] = questionNodes.map((node, index) => ({
    id: node.id,
    template_id: state.templateId,
    category_id: node.data.categoryId ?? defaultCategoryId,
    title: node.data.title,
    description: node.data.description || null,
    question_type: toQuestionType(node.data.kind),
    is_required: node.data.required,
    sort_order: index,
    weight: node.data.weight,
    settings: {
      kind: node.data.kind,
      position: node.position,
      branches: node.data.kind === "multiple" ? node.data.options.map((option, optionIndex) => ({
        id: option.id,
        handleId: `option-${optionIndex + 1}`,
        label: option.label,
        value: option.value,
      })) : node.data.branches,
      options: node.data.options,
      scaleMin: node.data.scaleMin,
      scaleMax: node.data.scaleMax,
      endMessage: node.data.endMessage,
      targetMap: edgesBySource.get(node.id) ?? {},
    },
  }));

  const optionRows: TablesInsert<"diagnostic_question_options">[] = questionNodes.flatMap((node) =>
    node.data.kind !== "multiple"
      ? []
      : node.data.options.map((option, index) => ({
          id: option.id,
          question_id: node.id,
          label: option.label,
          value: option.value,
          score: option.score,
          sort_order: index,
        })),
  );

  const { error: cleanupAnswersError } = await supabase
    .from("diagnostic_answers")
    .delete()
    .in("question_id", questionNodes.map((node) => node.id));
  if (cleanupAnswersError) {
    console.warn("Nao foi possivel limpar respostas antigas antes da atualizacao.", cleanupAnswersError);
  }

  const { error: deleteOptionsError } = await supabase
    .from("diagnostic_question_options")
    .delete()
    .in("question_id", questionNodes.map((node) => node.id));
  if (deleteOptionsError) {
    throw new Error("Nao foi possivel atualizar as opcoes das perguntas.");
  }

  const { error: deleteQuestionsError } = await supabase
    .from("diagnostic_questions")
    .delete()
    .eq("template_id", state.templateId);
  if (deleteQuestionsError) {
    throw new Error("Nao foi possivel atualizar as perguntas do fluxo.");
  }

  const { error: deleteCategoriesError } = await supabase
    .from("diagnostic_categories")
    .delete()
    .eq("template_id", state.templateId);
  if (deleteCategoriesError) {
    throw new Error("Nao foi possivel atualizar os agrupamentos do fluxo.");
  }

  const { error: insertCategoriesError } = await supabase.from("diagnostic_categories").insert(categoryRows);
  if (insertCategoriesError) {
    throw new Error("Nao foi possivel salvar os agrupamentos visuais.");
  }

  const { error: insertQuestionsError } = await supabase.from("diagnostic_questions").insert(questionRows);
  if (insertQuestionsError) {
    throw new Error("Nao foi possivel salvar as perguntas do fluxo.");
  }

  if (optionRows.length > 0) {
    const { error: insertOptionsError } = await supabase.from("diagnostic_question_options").insert(optionRows);
    if (insertOptionsError) {
      throw new Error("Nao foi possivel salvar as opcoes de resposta.");
    }
  }
}
