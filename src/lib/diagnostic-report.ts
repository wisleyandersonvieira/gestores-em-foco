import { supabase } from "@/integrations/supabase/client";
import type { Json, TablesInsert } from "@/integrations/supabase/types";
import type { DiagnosticAnswerRecord, RuntimeQuestion } from "@/types/diagnostic-runtime";
import type { CategoryMaturity, CategoryScoreItem, DiagnosticReportPayload, ReportAnswerItem } from "@/types/diagnostic-report";
import { getDiagnosticRuntimeBySession } from "@/lib/diagnostic-runtime";

function roundPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getCategoryMaturity(scorePercent: number): CategoryMaturity {
  if (scorePercent <= 40) {
    return "attention";
  }

  if (scorePercent <= 70) {
    return "developing";
  }

  return "healthy";
}

function getQuestionMaxScore(question: RuntimeQuestion) {
  if (question.kind === "scale") {
    return question.scaleMax;
  }

  if (question.kind === "multiple") {
    return Math.max(...question.options.map((option) => option.score), 1);
  }

  if (question.kind === "yes_no") {
    return 1;
  }

  return null;
}

function getAnswerDisplay(question: RuntimeQuestion, answer: DiagnosticAnswerRecord) {
  if (question.kind === "text") {
    return answer.answerText ?? answer.answerValue ?? "Sem resposta";
  }

  if (question.kind === "multiple") {
    return question.options.find((option) => option.value === answer.answerValue)?.label ?? answer.answerValue ?? "Sem resposta";
  }

  if (question.kind === "yes_no") {
    return answer.answerValue === "yes" ? "Sim" : "Nao";
  }

  return answer.answerValue ?? answer.answerText ?? "Sem resposta";
}

function getRecommendation(categoryName: string, maturity: CategoryMaturity) {
  if (maturity === "attention") {
    return `Priorize um plano de acao imediato para ${categoryName.toLowerCase()}, com rotinas simples, metas claras e acompanhamento semanal.`;
  }

  if (maturity === "developing") {
    return `A base de ${categoryName.toLowerCase()} ja existe, mas ainda precisa de padronizacao e indicadores mais consistentes para ganhar tracao.`;
  }

  return `${categoryName} aparece como um ponto forte. Vale transformar esse desempenho em processo replicavel e referencia para outras areas do negocio.`;
}

function buildSummary(templateName: string, overallScore: number, strengths: string[], weaknesses: string[]) {
  const strengthText = strengths.length > 0 ? strengths.join(", ") : "nenhuma categoria dominante";
  const weaknessText = weaknesses.length > 0 ? weaknesses.join(", ") : "sem fragilidades criticas aparentes";

  return `${templateName} foi concluido com score geral de ${overallScore}%. Destaques positivos: ${strengthText}. Pontos de atencao: ${weaknessText}.`;
}

function serializeCategoryScores(categories: CategoryScoreItem[]): Json {
  return categories.map((category) => ({
    categoryId: category.categoryId,
    categoryName: category.categoryName,
    scorePercent: category.scorePercent,
    maturity: category.maturity,
    recommendation: category.recommendation,
  }));
}

export function computeDiagnosticReport(input: {
  template: DiagnosticReportPayload["template"];
  session: DiagnosticReportPayload["session"];
  questions: RuntimeQuestion[];
  answers: DiagnosticAnswerRecord[];
}): DiagnosticReportPayload {
  const answerMap = new Map(input.answers.map((answer) => [answer.questionId, answer]));
  const categoryAccumulator = new Map<
    string,
    {
      categoryName: string;
      totalWeightedScore: number;
      totalWeightedMax: number;
      answers: ReportAnswerItem[];
    }
  >();

  input.questions
    .filter((question) => question.kind !== "start" && question.kind !== "end")
    .forEach((question) => {
      const categoryId = question.categoryId ?? "sem-categoria";
      const categoryName = question.categoryName ?? "Sem categoria";
      const current = categoryAccumulator.get(categoryId) ?? {
        categoryName,
        totalWeightedScore: 0,
        totalWeightedMax: 0,
        answers: [],
      };

      const answer = answerMap.get(question.id);
      const maxScore = getQuestionMaxScore(question);

      if (answer) {
        current.answers.push({
          questionId: question.id,
          questionTitle: question.title,
          answerLabel: getAnswerDisplay(question, answer),
          score: answer.score,
          weight: question.weight,
        });
      }

      if (answer && maxScore && answer.score !== null) {
        current.totalWeightedScore += answer.score * question.weight;
        current.totalWeightedMax += maxScore * question.weight;
      }

      categoryAccumulator.set(categoryId, current);
    });

  const categories = Array.from(categoryAccumulator.entries()).map<CategoryScoreItem>(([categoryId, category]) => {
    const scorePercent =
      category.totalWeightedMax > 0 ? roundPercent((category.totalWeightedScore / category.totalWeightedMax) * 100) : 0;
    const maturity = getCategoryMaturity(scorePercent);

    return {
      categoryId,
      categoryName: category.categoryName,
      scorePercent,
      maturity,
      recommendation: getRecommendation(category.categoryName, maturity),
      answers: category.answers,
    };
  });

  const overallBase = categories.filter((category) => category.answers.length > 0);
  const overallScore =
    overallBase.length > 0
      ? roundPercent(overallBase.reduce((sum, category) => sum + category.scorePercent, 0) / overallBase.length)
      : 0;

  const strengths = [...categories]
    .sort((a, b) => b.scorePercent - a.scorePercent)
    .slice(0, 2)
    .filter((category) => category.scorePercent > 0)
    .map((category) => category.categoryName);

  const weaknesses = [...categories]
    .sort((a, b) => a.scorePercent - b.scorePercent)
    .slice(0, 2)
    .filter((category) => category.scorePercent <= 70)
    .map((category) => category.categoryName);

  return {
    session: input.session,
    template: input.template,
    overallScore,
    completedAt: input.session.completed_at,
    categories,
    summary: buildSummary(input.template.name, overallScore, strengths, weaknesses),
    strengths,
    weaknesses,
  };
}

export async function getDiagnosticReport(sessionId: string, userId: string) {
  const runtime = await getDiagnosticRuntimeBySession(sessionId, userId);
  if (runtime.session.status !== "completed") {
    throw new Error("Este relatorio sera liberado assim que o diagnostico for concluido.");
  }

  const report = computeDiagnosticReport({
    template: runtime.template,
    session: runtime.session,
    questions: runtime.questions,
    answers: runtime.answers,
  });

  const upsertPayload: TablesInsert<"diagnostic_reports"> = {
    session_id: report.session.id,
    overall_score: report.overallScore,
    category_scores: serializeCategoryScores(report.categories),
    summary: report.summary,
    strengths: report.strengths,
    weaknesses: report.weaknesses,
    generated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await supabase.from("diagnostic_reports").upsert(upsertPayload, { onConflict: "session_id" });

  return report;
}
