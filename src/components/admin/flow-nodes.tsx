import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Flag, GitBranch, MessageSquareMore, Scale, SquareStack, Target, TextCursorInput } from "lucide-react";

import type { DiagnosticFlowNode as DiagnosticFlowNodeType } from "@/types/diagnostic-builder";

function Shell({
  title,
  subtitle,
  badge,
  accent,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  badge: string;
  accent: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-w-[220px] rounded-2xl border border-slate-200 bg-white shadow-lg">
      <div className={`rounded-t-2xl px-4 py-3 text-white ${accent}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {icon}
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-white/75">{subtitle}</p>
            </div>
          </div>
          <span className="rounded-full bg-white/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]">
            {badge}
          </span>
        </div>
      </div>
      <div className="space-y-3 p-4 text-xs text-slate-600">{children}</div>
    </div>
  );
}

export function DiagnosticFlowNode({ data }: NodeProps<DiagnosticFlowNodeType>) {
  if (data.kind === "group") {
    return (
      <div className="min-w-[240px] rounded-3xl border border-dashed border-primary/30 bg-primary/5 px-5 py-4 shadow-sm">
        <div className="flex items-center gap-2 text-primary">
          <SquareStack className="h-4 w-4" />
          <p className="text-sm font-semibold">{data.title}</p>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{data.description || "Agrupador visual para perguntas relacionadas."}</p>
      </div>
    );
  }

  if (data.kind === "start") {
    return (
      <Shell title={data.title} subtitle="Ponto unico de entrada" badge="Start" accent="bg-emerald-600" icon={<Flag className="h-4 w-4" />}>
        <p>Todo fluxo precisa partir daqui.</p>
        <Handle type="source" position={Position.Right} id="default" className="h-3 w-3 border-2 border-white bg-emerald-600" />
      </Shell>
    );
  }

  if (data.kind === "end") {
    return (
      <Shell title={data.title} subtitle="Mensagem final" badge="End" accent="bg-slate-900" icon={<Target className="h-4 w-4" />}>
        <p>{data.endMessage || "Encerramento sem mensagem personalizada."}</p>
        <Handle type="target" position={Position.Left} className="h-3 w-3 border-2 border-white bg-slate-900" />
      </Shell>
    );
  }

  const accent =
    data.kind === "yes_no"
      ? "bg-primary"
      : data.kind === "multiple"
        ? "bg-orange-500"
        : data.kind === "scale"
          ? "bg-indigo-500"
          : "bg-cyan-600";

  const icon =
    data.kind === "yes_no" ? (
      <GitBranch className="h-4 w-4" />
    ) : data.kind === "multiple" ? (
      <SquareStack className="h-4 w-4" />
    ) : data.kind === "scale" ? (
      <Scale className="h-4 w-4" />
    ) : (
      <TextCursorInput className="h-4 w-4" />
    );

  return (
    <Shell
      title={data.title}
      subtitle={data.description || "Pergunta configuravel"}
      badge={data.kind.replace("_", " ")}
      accent={accent}
      icon={icon}
    >
      <Handle type="target" position={Position.Left} className="h-3 w-3 border-2 border-white bg-slate-700" />

      <div className="rounded-xl bg-slate-50 p-3">
        <p className="line-clamp-3 text-xs leading-5 text-slate-600">{data.description || "Edite esta pergunta no painel lateral."}</p>
      </div>

      {data.kind === "multiple" ? (
        <div className="space-y-2">
          {data.options.map((option: DiagnosticFlowNodeType["data"]["options"][number], index: number) => (
            <div key={option.id} className="relative rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px]">
              {option.label}
              <Handle
                type="source"
                position={Position.Right}
                id={`option-${index + 1}`}
                className="right-[-8px] h-3 w-3 border-2 border-white bg-orange-500"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {data.branches.map((branch: DiagnosticFlowNodeType["data"]["branches"][number]) => (
            <div key={branch.id} className="relative rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px]">
              {branch.label}
              <Handle
                type="source"
                position={Position.Right}
                id={branch.handleId}
                className="right-[-8px] h-3 w-3 border-2 border-white bg-primary"
              />
            </div>
          ))}
          {data.branches.length === 0 ? <MessageSquareMore className="h-4 w-4 text-slate-400" /> : null}
        </div>
      )}
    </Shell>
  );
}

export const flowNodeTypes = {
  diagnostic: DiagnosticFlowNode,
};
