import { useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Eye, Plus, Save, Trash2 } from "lucide-react";

import { flowNodeTypes } from "@/components/admin/flow-nodes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { buildPreview, createBranches, createId, createNode, syncEdgesWithNodes, validateFlow } from "@/lib/diagnostic-builder";
import { cn } from "@/lib/utils";
import type { DiagnosticFlowEdge, DiagnosticFlowNode, FlowNodeKind, TemplateEditorState } from "@/types/diagnostic-builder";

const nodeButtons: { kind: FlowNodeKind; label: string }[] = [
  { kind: "start", label: "START" },
  { kind: "yes_no", label: "Sim / Nao" },
  { kind: "multiple", label: "Multipla escolha" },
  { kind: "scale", label: "Escala 1-5" },
  { kind: "text", label: "Aberta" },
  { kind: "group", label: "Grupo" },
  { kind: "end", label: "END" },
];

type DiagnosticFlowBuilderProps = {
  template: TemplateEditorState | null;
  saving: boolean;
  onSave: (state: TemplateEditorState) => Promise<void>;
};

export function DiagnosticFlowBuilder({ template, saving, onSave }: DiagnosticFlowBuilderProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TemplateEditorState["status"]>("draft");
  const [nodes, setNodes] = useState<DiagnosticFlowNode[]>([]);
  const [edges, setEdges] = useState<DiagnosticFlowEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!template) {
      setName("");
      setDescription("");
      setStatus("draft");
      setNodes([]);
      setEdges([]);
      setSelectedNodeId(null);
      setValidationErrors([]);
      setSaveError(null);
      setShowPreview(false);
      return;
    }

    setName(template.name);
    setDescription(template.description);
    setStatus(template.status);
    setNodes(template.nodes);
    setEdges(template.edges);
    setSelectedNodeId(template.nodes.find((node) => node.data.kind !== "group")?.id ?? null);
    setValidationErrors([]);
    setSaveError(null);
    setShowPreview(false);
  }, [template]);

  useEffect(() => {
    setEdges((current) => syncEdgesWithNodes(nodes, current));
  }, [nodes]);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );
  const previewSequence = useMemo(() => buildPreview(nodes, edges), [nodes, edges]);

  function onNodesChange(changes: NodeChange<DiagnosticFlowNode>[]) {
    setNodes((current) => applyNodeChanges(changes, current));
  }

  function onEdgesChange(changes: EdgeChange<DiagnosticFlowEdge>[]) {
    setEdges((current) => applyEdgeChanges(changes, current));
  }

  function onConnect(connection: Connection) {
    if (!connection.source || !connection.target) {
      return;
    }

    setEdges((current) =>
      syncEdgesWithNodes(
        nodes,
        addEdge(
          {
            ...connection,
            id: createId(),
            type: "smoothstep",
            animated: true,
          },
          current.filter(
            (edge) =>
              !(edge.source === connection.source && edge.sourceHandle === connection.sourceHandle) &&
              !(edge.source === connection.source && edge.target === connection.target && edge.sourceHandle === connection.sourceHandle),
          ),
        ),
      ),
    );
  }

  function addFlowNode(kind: FlowNodeKind) {
    const nextNode = createNode(kind, {
      x: 160 + nodes.length * 36,
      y: 120 + nodes.length * 24,
    });

    setNodes((current) => [...current, nextNode]);
    setSelectedNodeId(nextNode.id);
  }

  function updateSelectedNode(updater: (node: DiagnosticFlowNode) => DiagnosticFlowNode) {
    if (!selectedNodeId) {
      return;
    }

    setNodes((current) => current.map((node) => (node.id === selectedNodeId ? updater(node) : node)));
  }

  function removeSelectedNode() {
    if (!selectedNodeId) {
      return;
    }

    setNodes((current) => current.filter((node) => node.id !== selectedNodeId));
    setEdges((current) => current.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId));
    setSelectedNodeId(null);
  }

  async function handleSave() {
    if (!template) {
      return;
    }

    const errors = validateFlow(nodes, edges);
    setValidationErrors(errors);

    if (errors.length > 0) {
      return;
    }

    setSaveError(null);
    try {
      await onSave({
        templateId: template.templateId,
        name,
        description,
        status,
        nodes,
        edges: syncEdgesWithNodes(nodes, edges),
      });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Nao foi possivel salvar o fluxo.");
    }
  }

  if (!template) {
    return (
      <Card className="h-full bg-white/90">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Selecione ou crie um modelo</CardTitle>
          <CardDescription>Assim que um modelo for escolhido, o construtor visual sera exibido aqui.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        <Card className="bg-white/90">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="font-display text-2xl">Construtor de fluxo</CardTitle>
              <CardDescription>Arraste os nos, conecte handles e edite cada pergunta no painel lateral.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {nodeButtons.map((button) => (
                <Button key={button.kind} type="button" variant="outline" size="sm" onClick={() => addFlowNode(button.kind)}>
                  <Plus className="h-4 w-4" />
                  {button.label}
                </Button>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setShowPreview((current) => !current)}>
                <Eye className="h-4 w-4" />
                {showPreview ? "Ocultar preview" : "Visualizar preview"}
              </Button>
              <Button type="button" size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4" />
                {saving ? "Salvando..." : "Salvar fluxo"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="template-name">Nome do modelo</Label>
                <Input id="template-name" value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as TemplateEditorState["status"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="published">Publicado</SelectItem>
                    <SelectItem value="archived">Arquivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-description">Descricao</Label>
              <Textarea
                id="template-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Explique o objetivo deste modelo e para quem ele foi criado."
              />
            </div>

            {validationErrors.length > 0 ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                <p className="font-semibold">Corrija estes pontos antes de salvar:</p>
                <ul className="mt-2 space-y-1">
                  {validationErrors.map((error) => (
                    <li key={error}>• {error}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {saveError ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">{saveError}</div>
            ) : null}

            <div className="h-[680px] overflow-hidden rounded-3xl border border-border/70 bg-slate-50">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={flowNodeTypes as never}
                fitView
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                proOptions={{ hideAttribution: true }}
              >
                <MiniMap zoomable pannable />
                <Controls />
                <Background gap={20} size={1} />
                <Panel position="top-left" className="rounded-2xl border border-white/80 bg-white/85 p-3 shadow">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Canvas infinito</p>
                  <p className="mt-1 text-sm text-muted-foreground">Conecte cada ramo arrastando as handles laterais.</p>
                </Panel>
              </ReactFlow>
            </div>
          </CardContent>
        </Card>

        {showPreview ? (
          <Card className="bg-white/90">
            <CardHeader>
              <CardTitle className="font-display text-xl">Preview do diagnostico</CardTitle>
              <CardDescription>Sequencia inicial calculada a partir do primeiro caminho encontrado no fluxo.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {previewSequence.length === 0 ? (
                <p className="text-sm text-muted-foreground">Adicione um START e conecte o fluxo para visualizar a jornada.</p>
              ) : (
                previewSequence.map((node, index) => (
                  <div key={node.id} className="rounded-2xl border border-border/70 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Etapa {index + 1}</p>
                    <p className="mt-2 font-medium">{node.data.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {node.data.kind === "end" ? node.data.endMessage || "Encerramento" : node.data.description || "Sem descricao"}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card className="bg-white/90">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Edicao lateral</CardTitle>
          <CardDescription>Clique em um no para ajustar o texto, categoria, peso e condicoes.</CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedNode ? (
            <p className="text-sm text-muted-foreground">Nenhum no selecionado ainda.</p>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  {selectedNode.data.kind}
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={removeSelectedNode}>
                  <Trash2 className="h-4 w-4" />
                  Remover
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Titulo / rotulo</Label>
                <Input
                  value={selectedNode.data.title}
                  onChange={(event) =>
                    updateSelectedNode((node) => ({
                      ...node,
                      data: { ...node.data, title: event.target.value },
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Descricao / pergunta</Label>
                <Textarea
                  value={selectedNode.data.description}
                  onChange={(event) =>
                    updateSelectedNode((node) => ({
                      ...node,
                      data: { ...node.data, description: event.target.value },
                    }))
                  }
                />
              </div>

              {selectedNode.data.kind !== "group" && selectedNode.data.kind !== "start" && selectedNode.data.kind !== "end" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Peso</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={selectedNode.data.weight}
                      onChange={(event) =>
                        updateSelectedNode((node) => ({
                          ...node,
                          data: { ...node.data, weight: Number(event.target.value) || 0 },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select
                      value={selectedNode.data.categoryId ?? "none"}
                      onValueChange={(value) =>
                        updateSelectedNode((node) => ({
                          ...node,
                          data: { ...node.data, categoryId: value === "none" ? null : value },
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um grupo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem grupo</SelectItem>
                        {nodes
                          .filter((node) => node.data.kind === "group")
                          .map((node) => (
                            <SelectItem key={node.id} value={node.id}>
                              {node.data.title}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}

              {selectedNode.data.kind === "scale" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Escala minima</Label>
                    <Input
                      type="number"
                      min="1"
                      max={selectedNode.data.scaleMax}
                      value={selectedNode.data.scaleMin}
                      onChange={(event) =>
                        updateSelectedNode((node) => ({
                          ...node,
                          data: { ...node.data, scaleMin: Number(event.target.value) || 1 },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Escala maxima</Label>
                    <Input
                      type="number"
                      min={selectedNode.data.scaleMin}
                      value={selectedNode.data.scaleMax}
                      onChange={(event) =>
                        updateSelectedNode((node) => ({
                          ...node,
                          data: { ...node.data, scaleMax: Number(event.target.value) || 5 },
                        }))
                      }
                    />
                  </div>
                </div>
              ) : null}

              {selectedNode.data.kind === "multiple" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Opcoes de resposta</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateSelectedNode((node) => {
                          const nextOptions = [
                            ...node.data.options,
                            {
                              id: createId(),
                              label: `Opcao ${node.data.options.length + 1}`,
                              value: `option_${node.data.options.length + 1}`,
                              score: 1,
                            },
                          ];

                          return {
                            ...node,
                            data: { ...node.data, options: nextOptions },
                          };
                        })
                      }
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar
                    </Button>
                  </div>
                  {selectedNode.data.options.map((option, index) => (
                    <div key={option.id} className="rounded-2xl border border-border/70 p-3">
                      <div className="space-y-2">
                        <Label>Texto da opcao {index + 1}</Label>
                        <Input
                          value={option.label}
                          onChange={(event) =>
                            updateSelectedNode((node) => {
                              const nextOptions = node.data.options.map((item) =>
                                item.id === option.id ? { ...item, label: event.target.value } : item,
                              );

                              return {
                                ...node,
                                data: {
                                  ...node.data,
                                  options: nextOptions,
                                  branches: createBranches("multiple"),
                                },
                              };
                            })
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {selectedNode.data.kind === "yes_no" || selectedNode.data.kind === "start" || selectedNode.data.kind === "scale" || selectedNode.data.kind === "text" ? (
                <div className="space-y-3">
                  <Label>Saidas / condicoes</Label>
                  {selectedNode.data.branches.map((branch) => (
                    <div key={branch.id} className="rounded-2xl border border-border/70 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">{branch.handleId}</p>
                      <Input
                        value={branch.label}
                        onChange={(event) =>
                          updateSelectedNode((node) => ({
                            ...node,
                            data: {
                              ...node.data,
                              branches: node.data.branches.map((item) =>
                                item.id === branch.id ? { ...item, label: event.target.value } : item,
                              ),
                            },
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              ) : null}

              {selectedNode.data.kind === "end" ? (
                <div className="space-y-2">
                  <Label>Mensagem final</Label>
                  <Textarea
                    value={selectedNode.data.endMessage}
                    onChange={(event) =>
                      updateSelectedNode((node) => ({
                        ...node,
                        data: { ...node.data, endMessage: event.target.value },
                      }))
                    }
                  />
                </div>
              ) : null}

              <div className={cn("rounded-2xl bg-muted p-4 text-xs text-muted-foreground")}>
                Dica: ao conectar uma saida, o editor substitui automaticamente o destino anterior daquela mesma handle.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
