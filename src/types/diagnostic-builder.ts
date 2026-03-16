import type { Edge, Node } from "@xyflow/react";
import type { Enums } from "@/integrations/supabase/types";

export type TemplateStatus = Enums<"template_status">;

export type FlowNodeKind =
  | "start"
  | "group"
  | "end"
  | "yes_no"
  | "multiple"
  | "scale"
  | "text";

export type FlowBranch = {
  id: string;
  handleId: string;
  label: string;
  value: string;
};

export type FlowOption = {
  id: string;
  label: string;
  value: string;
  score: number;
};

export type DiagnosticNodeData = {
  kind: FlowNodeKind;
  title: string;
  description: string;
  categoryId: string | null;
  weight: number;
  required: boolean;
  branches: FlowBranch[];
  options: FlowOption[];
  scaleMin: number;
  scaleMax: number;
  endMessage: string;
};

export type DiagnosticFlowNode = Node<DiagnosticNodeData>;

export type DiagnosticFlowEdge = Edge<{
  conditionLabel?: string;
  conditionValue?: string;
}>;

export type TemplateSummary = {
  id: string;
  name: string;
  description: string | null;
  status: TemplateStatus;
  isActive: boolean;
  version: number;
  updatedAt: string;
};

export type TemplateEditorState = {
  templateId: string;
  name: string;
  description: string;
  status: TemplateStatus;
  nodes: DiagnosticFlowNode[];
  edges: DiagnosticFlowEdge[];
};
