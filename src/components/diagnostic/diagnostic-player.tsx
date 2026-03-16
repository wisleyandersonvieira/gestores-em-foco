import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

import { computeTraversal, getDiagnosticRuntimeByToken, refreshSessionProgress, saveDiagnosticAnswer } from "@/lib/diagnostic-runtime";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import type { DiagnosticSessionRuntime } from "@/types/diagnostic-runtime";

type DiagnosticPlayerProps = {
  token: string;
  userId: string;
  onFinish: (sessionId: string) => void;
};

export function DiagnosticPlayer({ token, userId, onFinish }: DiagnosticPlayerProps) {
  const [runtime, setRuntime] = useState<DiagnosticSessionRuntime | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualQuestionId, setManualQuestionId] = useState<string | null>(null);
  const [textValue, setTextValue] = useState("");

  async function loadRuntime() {
    setLoading(true);
    setError(null);

    try {
      const nextRuntime = await getDiagnosticRuntimeByToken(token, userId);
      const traversal = computeTraversal(nextRuntime.questions, nextRuntime.answers);
      if (traversal.completed) {
        await refreshSessionProgress(nextRuntime.session.id, nextRuntime.questions, nextRuntime.answers);
      }
      setRuntime(nextRuntime);
    } catch (runtimeError) {
      const code = runtimeError instanceof Error ? runtimeError.message : "";
      if (code === "invalid_link") {
        setError("Este link nao existe ou nao esta disponivel.");
      } else if (code === "link_expired") {
        setError("Este link expirou e nao pode mais ser respondido.");
      } else if (code === "forbidden") {
        setError("Este diagnostico foi vinculado a outra conta.");
      } else {
        setError("Nao foi possivel carregar este diagnostico agora.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRuntime();
  }, [token, userId]);

  const traversal = useMemo(
    () => (runtime ? computeTraversal(runtime.questions, runtime.answers) : null),
    [runtime],
  );

  const questionMap = useMemo(
    () => new Map(runtime?.questions.map((question) => [question.id, question]) ?? []),
    [runtime],
  );

  const visibleQuestionId = manualQuestionId ?? traversal?.currentQuestionId ?? null;
  const currentQuestion = visibleQuestionId ? questionMap.get(visibleQuestionId) ?? null : null;
  const currentAnswer = runtime?.answers.find((answer) => answer.questionId === visibleQuestionId) ?? null;

  useEffect(() => {
    setTextValue(currentAnswer?.answerText ?? currentAnswer?.answerValue ?? "");
  }, [currentAnswer?.answerText, currentAnswer?.answerValue, visibleQuestionId]);

  async function handleAnswer(answer: string) {
    if (!runtime || !traversal || !currentQuestion) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const currentIndex = traversal.answeredPathIds.indexOf(currentQuestion.id);
      const prefixIds = currentIndex >= 0 ? traversal.answeredPathIds.slice(0, currentIndex) : traversal.answeredPathIds;

      await saveDiagnosticAnswer({
        sessionId: runtime.session.id,
        question: currentQuestion,
        answer,
        answeredPathIds: prefixIds,
        userId,
      });

      const refreshed = await getDiagnosticRuntimeByToken(token, userId);
      await refreshSessionProgress(refreshed.session.id, refreshed.questions, refreshed.answers);
      setRuntime(refreshed);
      setManualQuestionId(null);
      const nextTraversal = computeTraversal(refreshed.questions, refreshed.answers);
      if (nextTraversal.completed) {
        onFinish(refreshed.session.id);
      }
    } catch (runtimeError) {
      setError(runtimeError instanceof Error ? runtimeError.message : "Nao foi possivel salvar sua resposta.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
        <Card className="w-full bg-white/90">
          <CardHeader>
            <CardTitle className="font-display text-3xl">Nao foi possivel abrir o diagnostico</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (!runtime || !traversal) {
    return null;
  }

  if (traversal.completed) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
        <Card className="w-full border-primary/10 bg-white/95">
          <CardHeader>
            <div className="flex items-center gap-3 text-primary">
              <CheckCircle2 className="h-7 w-7" />
              <CardTitle className="font-display text-3xl">Diagnostico concluido</CardTitle>
            </div>
            <CardDescription>{traversal.endMessage || "Suas respostas foram registradas com sucesso."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
              Suas respostas foram consolidadas e o relatorio final ja pode ser visualizado.
            </div>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => onFinish(runtime.session.id)}>
              Ver meu relatorio
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
      <div className="mb-8 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">{runtime.template.name}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {currentQuestion?.categoryName ? `Categoria atual: ${currentQuestion.categoryName}` : "Fluxo principal"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Progresso</p>
            <p className="font-semibold">{traversal.progressPercent}%</p>
          </div>
        </div>
        <Progress value={traversal.progressPercent} className="h-3" />
      </div>

      {currentQuestion ? (
        <Card className="border-primary/10 bg-white/95 shadow-xl shadow-slate-200/80">
          <CardHeader>
            <CardTitle className="font-display text-3xl">{currentQuestion.title}</CardTitle>
            <CardDescription className="text-base leading-7">
              {currentQuestion.description || "Responda com sinceridade para seguirmos para a proxima etapa."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentQuestion.kind === "yes_no" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Button type="button" variant="outline" className="h-14 text-base" onClick={() => void handleAnswer("yes")} disabled={saving}>
                  Sim
                </Button>
                <Button type="button" variant="outline" className="h-14 text-base" onClick={() => void handleAnswer("no")} disabled={saving}>
                  Nao
                </Button>
              </div>
            ) : null}

            {currentQuestion.kind === "multiple" ? (
              <div className="grid gap-3">
                {currentQuestion.options.map((option) => (
                  <Button
                    key={option.id}
                    type="button"
                    variant="outline"
                    className="h-auto justify-start whitespace-normal px-5 py-4 text-left text-base"
                    onClick={() => void handleAnswer(option.value)}
                    disabled={saving}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            ) : null}

            {currentQuestion.kind === "scale" ? (
              <div className="grid grid-cols-5 gap-3">
                {Array.from({ length: currentQuestion.scaleMax - currentQuestion.scaleMin + 1 }, (_, index) => currentQuestion.scaleMin + index).map((value) => (
                  <Button key={value} type="button" variant="outline" className="h-14 text-lg" onClick={() => void handleAnswer(String(value))} disabled={saving}>
                    {value}
                  </Button>
                ))}
              </div>
            ) : null}

            {currentQuestion.kind === "text" ? (
              <div className="space-y-4">
                <Textarea value={textValue} onChange={(event) => setTextValue(event.target.value)} placeholder="Escreva sua resposta aqui..." className="min-h-[180px]" />
                <Button type="button" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => void handleAnswer(textValue)} disabled={saving || !textValue.trim()}>
                  <ArrowRight className="h-4 w-4" />
                  Salvar e continuar
                </Button>
              </div>
            ) : null}

            {error ? <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}

            <div className="flex items-center justify-between gap-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setManualQuestionId(traversal.previousQuestionId)}
                disabled={!traversal.previousQuestionId || saving}
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>

              {saving ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando resposta...
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
