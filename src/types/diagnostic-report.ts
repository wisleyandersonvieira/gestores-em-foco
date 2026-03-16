import type { Tables } from "@/integrations/supabase/types";

export type CategoryMaturity = "attention" | "developing" | "healthy";

export type ReportAnswerItem = {
  questionId: string;
  questionTitle: string;
  answerLabel: string;
  score: number | null;
  weight: number;
};

export type CategoryScoreItem = {
  categoryId: string;
  categoryName: string;
  scorePercent: number;
  maturity: CategoryMaturity;
  recommendation: string;
  answers: ReportAnswerItem[];
};

export type DiagnosticReportPayload = {
  session: Tables<"diagnostic_sessions">;
  template: Tables<"diagnostic_templates">;
  overallScore: number;
  completedAt: string | null;
  categories: CategoryScoreItem[];
  summary: string;
  strengths: string[];
  weaknesses: string[];
};
