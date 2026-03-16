import type { Enums, Tables } from "@/integrations/supabase/types";

export type ClientProfileOption = {
  id: string;
  name: string;
  email: string | null;
};

export type DiagnosticLinkItem = {
  id: string;
  token: string;
  title: string | null;
  notes: string | null;
  expiresAt: string | null;
  maxUses: number | null;
  usesCount: number;
  assignedUserId: string | null;
  assignedUserName: string | null;
  templateId: string;
  status: Tables<"diagnostic_links">["status"];
  progressStatus: "pending" | "in_progress" | "completed";
  sessionId: string | null;
};

export type DiagnosticAnswerRecord = {
  id: string;
  questionId: string;
  answerValue: string | null;
  answerText: string | null;
  score: number | null;
};

export type RuntimeBranch = {
  id: string;
  handleId: string;
  label: string;
  value: string;
};

export type RuntimeOption = {
  id: string;
  label: string;
  value: string;
  score: number;
};

export type RuntimeQuestion = {
  id: string;
  kind: "start" | "end" | "yes_no" | "multiple" | "scale" | "text";
  title: string;
  description: string;
  categoryId: string | null;
  categoryName: string | null;
  weight: number;
  required: boolean;
  branches: RuntimeBranch[];
  options: RuntimeOption[];
  scaleMin: number;
  scaleMax: number;
  endMessage: string;
  targetMap: Record<string, string>;
};

export type DiagnosticSessionRuntime = {
  session: Tables<"diagnostic_sessions">;
  link: Tables<"diagnostic_links">;
  template: Tables<"diagnostic_templates">;
  questions: RuntimeQuestion[];
  answers: DiagnosticAnswerRecord[];
};

export type DiagnosticTraversal = {
  currentQuestionId: string | null;
  previousQuestionId: string | null;
  answeredPathIds: string[];
  completed: boolean;
  endMessage: string | null;
  progressPercent: number;
};

export type CreateLinkPayload = {
  templateId: string;
  title: string;
  notes: string;
  assignedUserId: string | null;
  expiresAt: string | null;
  maxUses: number | null;
};

export type SessionHistoryItem = {
  sessionId: string;
  linkId: string;
  token: string;
  title: string | null;
  templateId: string;
  templateName: string;
  status: Enums<"session_status">;
  progressPercent: number;
  updatedAt: string;
  completedAt: string | null;
};

export type AssignedDiagnosticItem = {
  linkId: string;
  token: string;
  title: string | null;
  templateId: string;
  templateName: string;
  status: "pending" | "in_progress" | "completed";
  expiresAt: string | null;
  updatedAt: string;
  progressPercent: number;
  sessionId: string | null;
  completedAt: string | null;
};

export type AccountWorkspace = {
  assigned: AssignedDiagnosticItem[];
  history: SessionHistoryItem[];
};
