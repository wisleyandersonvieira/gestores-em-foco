import { useEffect, useMemo, useState } from "react";
import { Edit2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DreLayout } from "@/components/dre/dre-layout";
import { ConfirmDialog } from "@/components/dre/dre-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { deleteOrDeactivateDreModel, getDreModelWithLines, listDreCategories, listDreModels, listDreSubcategories, saveDreModel } from "@/lib/dre-service";
import type { DreCategory, DreModel, DreModelBuilderCategory, DreRecordStatus, DreSubcategoryWithCategory } from "@/types/dre";

type ModelForm = { id?: string; name: string; description: string; status: DreRecordStatus; structure: DreModelBuilderCategory[] };

export default function DreModelsPage() {
  return <DreLayout>{(user) => <DreModelsContent userId={user.id} />}</DreLayout>;
}

function DreModelsContent({ userId }: { userId: string }) {
  const [models, setModels] = useState<DreModel[]>([]);
  const [categories, setCategories] = useState<DreCategory[]>([]);
  const [subcategories, setSubcategories] = useState<DreSubcategoryWithCategory[]>([]);
  const [form, setForm] = useState<ModelForm | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DreModel | null>(null);

  async function reload() {
    const [nextModels, nextCategories, nextSubcategories] = await Promise.all([listDreModels(userId), listDreCategories(userId), listDreSubcategories(userId)]);
    setModels(nextModels);
    setCategories(nextCategories);
    setSubcategories(nextSubcategories);
  }

  useEffect(() => {
    void reload().catch((error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel carregar modelos."));
  }, [userId]);

  async function editModel(model: DreModel) {
    const fullModel = await getDreModelWithLines(userId, model.id);
    const categoryLines = fullModel.lines.filter((line) => line.line_type === "category");
    setForm({
      id: model.id,
      name: model.name,
      description: model.description ?? "",
      status: model.status,
      structure: categoryLines.map((line) => ({
        categoryId: line.category_id,
        subcategoryIds: fullModel.lines
          .filter((child) => child.line_type === "subcategory" && child.parent_category_id === line.category_id)
          .map((child) => child.subcategory_id)
          .filter(Boolean) as string[],
      })),
    });
  }

  async function submitModel() {
    if (!form) return;
    await saveDreModel({ userId, id: form.id, name: form.name, description: form.description, status: form.status, structure: form.structure });
    setForm(null);
    await reload();
    toast.success("Modelo salvo.");
  }

  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Modelos de DRE</h1>
          <p className="mt-1 text-sm text-muted-foreground">Monte estruturas reutilizaveis com categorias e subcategorias selecionadas.</p>
        </div>
        <Button onClick={() => setForm({ name: "", description: "", status: "active", structure: [] })}>
          <Plus className="h-4 w-4" />
          Novo modelo
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {models.length === 0 ? (
          <Card className="border-dashed bg-white/80 md:col-span-2 xl:col-span-3">
            <CardContent className="p-6 text-sm text-muted-foreground">Crie seu primeiro modelo para poder cadastrar DREs mensais.</CardContent>
          </Card>
        ) : models.map((model) => (
          <Card key={model.id} className="border-primary/10 bg-white/90">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{model.name}</CardTitle>
                  <CardDescription className="mt-2">{model.description || "Sem descricao"}</CardDescription>
                </div>
                <Badge variant={model.status === "active" ? "default" : "secondary"}>{model.status === "active" ? "Ativo" : "Inativo"}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => void editModel(model).catch((error) => toast.error(error.message))}><Edit2 className="h-4 w-4" />Editar</Button>
              <Button variant="outline" size="icon" onClick={() => setPendingDelete(model)}><Trash2 className="h-4 w-4" /></Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={Boolean(form)} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader><DialogTitle>{form?.id ? "Editar modelo" : "Novo modelo"}</DialogTitle></DialogHeader>
          {form ? (
            <div className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                <Label>Nome do modelo<Input className="mt-2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Label>
                <Label>Status<Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as DreRecordStatus })}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Ativo</SelectItem><SelectItem value="inactive">Inativo</SelectItem></SelectContent></Select></Label>
              </div>
              <Label>Descricao<Textarea className="mt-2" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Label>

              <div>
                <h2 className="font-display text-xl font-semibold">Montagem do modelo</h2>
                <p className="mt-1 text-sm text-muted-foreground">Selecione categorias e escolha quais subcategorias entram em cada bloco.</p>
              </div>

              <div className="grid gap-3">
                {categories.map((category) => {
                  const selectedCategory = form.structure.find((item) => item.categoryId === category.id);
                  const categorySubcategories = subcategories.filter((subcategory) => subcategory.category_id === category.id);
                  return (
                    <div key={category.id} className="rounded-lg border bg-white p-4">
                      <label className="flex items-start gap-3">
                        <Checkbox
                          checked={Boolean(selectedCategory)}
                          onCheckedChange={(checked) => {
                            if (checked) setForm({ ...form, structure: [...form.structure, { categoryId: category.id, subcategoryIds: [] }] });
                            else setForm({ ...form, structure: form.structure.filter((item) => item.categoryId !== category.id) });
                          }}
                        />
                        <div>
                          <p className="font-semibold">{category.name}</p>
                          <p className="text-xs text-muted-foreground">{category.type === "credit" ? "Credito" : "Debito"} · Ordem atual {category.display_order}</p>
                        </div>
                      </label>
                      {selectedCategory ? (
                        <div className="mt-3 grid gap-2 border-l pl-6">
                          {categorySubcategories.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Nenhuma subcategoria cadastrada para esta categoria.</p>
                          ) : categorySubcategories.map((subcategory) => (
                            <label key={subcategory.id} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={selectedCategory.subcategoryIds.includes(subcategory.id)}
                                onCheckedChange={(checked) => {
                                  const nextStructure = form.structure.map((item) => {
                                    if (item.categoryId !== category.id) return item;
                                    const subcategoryIds = checked
                                      ? [...item.subcategoryIds, subcategory.id]
                                      : item.subcategoryIds.filter((id) => id !== subcategory.id);
                                    return { ...item, subcategoryIds };
                                  });
                                  setForm({ ...form, structure: nextStructure });
                                }}
                              />
                              {subcategory.name}
                            </label>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <Card className="bg-muted/50">
                <CardHeader><CardTitle className="text-base">Previa da estrutura</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {form.structure.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma categoria selecionada.</p> : form.structure.map((item) => (
                    <div key={item.categoryId}>
                      <p className="font-semibold uppercase">{categoryMap.get(item.categoryId)?.name}</p>
                      <div className="mt-1 grid gap-1 pl-5 text-sm text-muted-foreground">
                        {item.subcategoryIds.map((subcategoryId) => <span key={subcategoryId}>{subcategories.find((subcategory) => subcategory.id === subcategoryId)?.name}</span>)}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Button onClick={() => void submitModel().catch((error) => toast.error(error.message))}>
                <Save className="h-4 w-4" />
                Salvar modelo
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Excluir modelo"
        description="Se houver DRE usando este modelo, ele sera inativado para preservar os dados."
        onConfirm={() => {
          if (!pendingDelete) return;
          void deleteOrDeactivateDreModel(userId, pendingDelete.id)
            .then(async (result) => {
              setPendingDelete(null);
              await reload();
              toast.success(result === "deleted" ? "Modelo excluido." : "Modelo em uso, entao foi inativado.");
            })
            .catch((error) => toast.error(error.message));
        }}
      />
    </div>
  );
}
