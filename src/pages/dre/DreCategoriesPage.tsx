import { useEffect, useMemo, useState } from "react";
import { Edit2, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DreLayout } from "@/components/dre/dre-layout";
import { ConfirmDialog } from "@/components/dre/dre-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { deleteOrDeactivateDreCategory, deleteOrDeactivateDreSubcategory, listDreCategories, listDreSubcategories, saveDreCategory, saveDreSubcategory } from "@/lib/dre-service";
import type { DreCategory, DreCategoryType, DreRecordStatus, DreSubcategoryWithCategory } from "@/types/dre";

type CategoryForm = { id?: string; name: string; type: DreCategoryType; status: DreRecordStatus; display_order: number; is_revenue: boolean };
type SubcategoryForm = { id?: string; name: string; category_id: string; status: DreRecordStatus; display_order: number; is_reductive: boolean };

export default function DreCategoriesPage() {
  return <DreLayout>{(user) => <DreCategoriesContent userId={user.id} />}</DreLayout>;
}

function DreCategoriesContent({ userId }: { userId: string }) {
  const [categories, setCategories] = useState<DreCategory[]>([]);
  const [subcategories, setSubcategories] = useState<DreSubcategoryWithCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<DreCategoryType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<DreRecordStatus | "all">("all");
  const [categoryForm, setCategoryForm] = useState<CategoryForm | null>(null);
  const [subcategoryForm, setSubcategoryForm] = useState<SubcategoryForm | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ kind: "category"; item: DreCategory } | { kind: "subcategory"; item: DreSubcategoryWithCategory } | null>(null);

  async function reload() {
    const [nextCategories, nextSubcategories] = await Promise.all([listDreCategories(userId), listDreSubcategories(userId)]);
    setCategories(nextCategories);
    setSubcategories(nextSubcategories);
    if (!selectedCategoryId && nextCategories[0]) setSelectedCategoryId(nextCategories[0].id);
  }

  useEffect(() => {
    void reload().catch((error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel carregar categorias."));
  }, [userId]);

  const filteredCategories = useMemo(() => {
    return categories.filter((category) => {
      const matchesSearch = category.name.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "all" || category.type === typeFilter;
      const matchesStatus = statusFilter === "all" || category.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [categories, search, statusFilter, typeFilter]);

  const selectedSubcategories = useMemo(
    () => subcategories.filter((subcategory) => subcategory.category_id === selectedCategoryId),
    [selectedCategoryId, subcategories],
  );

  async function submitCategory() {
    if (!categoryForm) return;
    await saveDreCategory({ ...categoryForm, user_id: userId });
    setCategoryForm(null);
    await reload();
    toast.success("Categoria salva.");
  }

  async function submitSubcategory() {
    if (!subcategoryForm) return;
    await saveDreSubcategory({ ...subcategoryForm, user_id: userId });
    setSubcategoryForm(null);
    await reload();
    toast.success("Subcategoria salva.");
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const result = pendingDelete.kind === "category" ? await deleteOrDeactivateDreCategory(pendingDelete.item) : await deleteOrDeactivateDreSubcategory(pendingDelete.item);
    setPendingDelete(null);
    await reload();
    toast.success(result === "deleted" ? "Registro excluido." : "Registro em uso, entao foi inativado.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Categorias e Subcategorias</h1>
          <p className="mt-1 text-sm text-muted-foreground">Organize as linhas base para seus modelos de DRE.</p>
        </div>
        <Button onClick={() => setCategoryForm({ name: "", type: "credit", status: "active", display_order: categories.length + 1, is_revenue: false })}>
          <Plus className="h-4 w-4" />
          Nova categoria
        </Button>
      </div>

      <Card className="border-primary/10 bg-white/90">
        <CardContent className="grid gap-4 p-5 lg:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por nome" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as DreCategoryType | "all")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="credit">Credito</SelectItem>
              <SelectItem value="debit">Debito</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as DreRecordStatus | "all")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativa</SelectItem>
              <SelectItem value="inactive">Inativa</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-primary/10 bg-white/90">
          <CardHeader><CardTitle>Categorias</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {filteredCategories.map((category) => (
              <button
                key={category.id}
                className={`w-full rounded-lg border p-3 text-left transition ${selectedCategoryId === category.id ? "border-primary bg-primary/5" : "bg-white hover:bg-muted"}`}
                onClick={() => setSelectedCategoryId(category.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{category.name}</p>
                    <div className="mt-2 flex gap-2">
                      <Badge variant={category.type === "credit" ? "default" : "secondary"}>{category.type === "credit" ? "Credito" : "Debito"}</Badge>
                      {category.is_revenue ? <Badge variant="outline">FATURAMENTO</Badge> : null}
                      <Badge variant="outline">{category.status === "active" ? "Ativa" : "Inativa"}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={(event) => { event.stopPropagation(); setCategoryForm(toCategoryForm(category)); }}><Edit2 className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={(event) => { event.stopPropagation(); setPendingDelete({ kind: "category", item: category }); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="border-primary/10 bg-white/90">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Subcategorias</CardTitle>
            <Button
              variant="outline"
              disabled={!selectedCategoryId}
              onClick={() => setSubcategoryForm({ name: "", category_id: selectedCategoryId, status: "active", display_order: selectedSubcategories.length + 1, is_reductive: false })}
            >
              <Plus className="h-4 w-4" />
              Nova subcategoria
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {selectedSubcategories.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Selecione uma categoria ou cadastre subcategorias para ela.</div>
            ) : selectedSubcategories.map((subcategory) => (
              <div key={subcategory.id} className="flex items-center justify-between gap-3 rounded-lg border bg-white p-3">
                <div>
                  <p className="font-medium">{subcategory.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <p className="text-xs text-muted-foreground">Ordem {subcategory.display_order} · {subcategory.status === "active" ? "Ativa" : "Inativa"}</p>
                    {subcategory.is_reductive ? <Badge variant="secondary">REDUTORA</Badge> : null}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setSubcategoryForm(toSubcategoryForm(subcategory))}><Edit2 className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setPendingDelete({ kind: "subcategory", item: subcategory })}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <CategoryDialog form={categoryForm} setForm={setCategoryForm} onSubmit={() => void submitCategory().catch((error) => toast.error(error.message))} />
      <SubcategoryDialog categories={categories} form={subcategoryForm} setForm={setSubcategoryForm} onSubmit={() => void submitSubcategory().catch((error) => toast.error(error.message))} />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Confirmar exclusao"
        description="Se o registro estiver em uso, ele sera inativado para preservar o historico."
        onConfirm={() => void confirmDelete().catch((error) => toast.error(error.message))}
      />
    </div>
  );
}

function toCategoryForm(category: DreCategory): CategoryForm {
  return {
    id: category.id,
    name: category.name,
    type: category.type,
    status: category.status,
    display_order: category.display_order,
    is_revenue: category.is_revenue ?? false,
  };
}

function toSubcategoryForm(subcategory: DreSubcategoryWithCategory): SubcategoryForm {
  return {
    id: subcategory.id,
    name: subcategory.name,
    category_id: subcategory.category_id,
    status: subcategory.status,
    display_order: subcategory.display_order,
    is_reductive: subcategory.is_reductive ?? false,
  };
}

function CategoryDialog({ form, setForm, onSubmit }: { form: CategoryForm | null; setForm: (form: CategoryForm | null) => void; onSubmit: () => void }) {
  return (
    <Dialog open={Boolean(form)} onOpenChange={(open) => !open && setForm(null)}>
      <DialogContent>
        <DialogHeader><DialogTitle>{form?.id ? "Editar categoria" : "Nova categoria"}</DialogTitle></DialogHeader>
        {form ? (
          <div className="grid gap-4">
            <Label>Nome<Input className="mt-2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Label>
            <div className="grid gap-4 sm:grid-cols-3">
              <Label>Tipo<Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value as DreCategoryType, is_revenue: value === "credit" ? form.is_revenue : false })}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="credit">Credito</SelectItem><SelectItem value="debit">Debito</SelectItem></SelectContent></Select></Label>
              <Label>Status<Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as DreRecordStatus })}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Ativa</SelectItem><SelectItem value="inactive">Inativa</SelectItem></SelectContent></Select></Label>
              <Label>Ordem<Input className="mt-2" type="number" value={form.display_order} onChange={(event) => setForm({ ...form, display_order: Number(event.target.value) })} /></Label>
            </div>
            {form.type === "credit" ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border bg-white px-4 py-3 text-sm">
                      <span>Esta categoria compõe o faturamento</span>
                      <Switch checked={form.is_revenue} onCheckedChange={(checked) => setForm({ ...form, is_revenue: checked })} />
                    </label>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Categorias marcadas serão utilizadas para cálculo de faturamento no dashboard e análise DRE.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
            <Button onClick={onSubmit}>Salvar categoria</Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function SubcategoryDialog({ categories, form, setForm, onSubmit }: { categories: DreCategory[]; form: SubcategoryForm | null; setForm: (form: SubcategoryForm | null) => void; onSubmit: () => void }) {
  return (
    <Dialog open={Boolean(form)} onOpenChange={(open) => !open && setForm(null)}>
      <DialogContent>
        <DialogHeader><DialogTitle>{form?.id ? "Editar subcategoria" : "Nova subcategoria"}</DialogTitle></DialogHeader>
        {form ? (
          <div className="grid gap-4">
            <Label>Nome<Input className="mt-2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Label>
            <Label>Categoria<Select value={form.category_id} onValueChange={(value) => setForm({ ...form, category_id: value })}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent></Select></Label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Label>Status<Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as DreRecordStatus })}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Ativa</SelectItem><SelectItem value="inactive">Inativa</SelectItem></SelectContent></Select></Label>
              <Label>Ordem<Input className="mt-2" type="number" value={form.display_order} onChange={(event) => setForm({ ...form, display_order: Number(event.target.value) })} /></Label>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border bg-white px-4 py-3 text-sm">
                    <span>Subcategoria redutora</span>
                    <Switch checked={form.is_reductive} onCheckedChange={(checked) => setForm({ ...form, is_reductive: checked })} />
                  </label>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Quando marcada, os lançamentos desta subcategoria terão comportamento financeiro inverso da categoria principal apenas nos cálculos analíticos.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button onClick={onSubmit}>Salvar subcategoria</Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
