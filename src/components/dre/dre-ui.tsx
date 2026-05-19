import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { competenceOptionsAroundCurrent, formatCompetence, formatCurrency, parseCurrencyInput, toCurrencyInput } from "@/lib/dre-calculations";

export function IndicatorCard({ title, value, description, tone = "neutral" }: { title: string; value: string; description?: string; tone?: "neutral" | "positive" | "negative" }) {
  const toneClass = tone === "positive" ? "text-emerald-700" : tone === "negative" ? "text-red-700" : "text-foreground";

  return (
    <Card className="border-primary/10 bg-white/90 shadow-sm">
      <CardHeader className="space-y-1 pb-3">
        <p className="text-sm text-muted-foreground">{title}</p>
        <CardTitle className={`text-2xl ${toneClass}`}>{value}</CardTitle>
      </CardHeader>
      {description ? <CardContent className="pt-0 text-xs text-muted-foreground">{description}</CardContent> : null}
    </Card>
  );
}

export function CurrencyInput({ value, onChange, disabled }: { value: number; onChange: (value: number) => void; disabled?: boolean }) {
  const [draftValue, setDraftValue] = useState(toCurrencyInput(value));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) {
      setDraftValue(toCurrencyInput(value));
    }
  }, [editing, value]);

  return (
    <Input
      inputMode="decimal"
      disabled={disabled}
      value={draftValue}
      onChange={(event) => {
        const nextValue = event.target.value;
        setDraftValue(nextValue);
        onChange(parseCurrencyInput(nextValue));
      }}
      onFocus={(event) => {
        setEditing(true);
        setDraftValue(value ? String(value).replace(".", ",") : "");
        window.requestAnimationFrame(() => event.currentTarget.select());
      }}
      onBlur={() => {
        setEditing(false);
        setDraftValue(toCurrencyInput(parseCurrencyInput(draftValue)));
      }}
      className="text-right font-medium tabular-nums"
    />
  );
}

export function CompetenceMultiFilter({ selected, onChange }: { selected: string[]; onChange: (competences: string[]) => void }) {
  const options = competenceOptionsAroundCurrent();
  const label = selected.length === 1 ? formatCompetence(selected[0]) : `${selected.length} competencias selecionadas`;

  return (
    <div className="grid gap-2">
      <Label>Competencias</Label>
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-left text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
            <span>{label}</span>
            <span className="text-muted-foreground">Selecionar</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3" align="start">
          <div className="grid max-h-72 gap-2 overflow-y-auto">
            {options.map((competence) => (
              <label key={competence} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted">
                <Checkbox
                  checked={selected.includes(competence)}
                  onCheckedChange={(checked) => {
                    if (checked) onChange([...selected, competence].sort());
                    else onChange(selected.filter((item) => item !== competence));
                  }}
                />
                {formatCompetence(competence)}
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

const MONTH_LABELS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function CompetenceSelect({
  value,
  onChange,
  minYear = 2000,
  maxYear = new Date().getFullYear() + 5,
}: {
  value: string;
  onChange: (value: string) => void;
  minYear?: number;
  maxYear?: number;
}) {
  const [open, setOpen] = useState(false);
  const parsed = value?.split("-") ?? [];
  const selectedYear = Number(parsed[0]) || new Date().getFullYear();
  const selectedMonth = Number(parsed[1]) || new Date().getMonth() + 1;
  const [viewYear, setViewYear] = useState(selectedYear);

  useEffect(() => {
    if (open) setViewYear(selectedYear);
  }, [open, selectedYear]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="mt-2 flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-left text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <span>{value ? formatCompetence(value) : "Selecione a competencia"}</span>
          <span className="text-muted-foreground">▾</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setViewYear((y) => Math.max(minYear, y - 1))}
            disabled={viewYear <= minYear}
            className="rounded-md border px-2 py-1 text-sm hover:bg-muted disabled:opacity-40"
          >
            ‹
          </button>
          <Select value={String(viewYear)} onValueChange={(v) => setViewYear(Number(v))}>
            <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-64">
              {Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i).map((year) => (
                <SelectItem key={year} value={String(year)}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={() => setViewYear((y) => Math.min(maxYear, y + 1))}
            disabled={viewYear >= maxYear}
            className="rounded-md border px-2 py-1 text-sm hover:bg-muted disabled:opacity-40"
          >
            ›
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MONTH_LABELS_SHORT.map((label, idx) => {
            const month = idx + 1;
            const isSelected = viewYear === selectedYear && month === selectedMonth;
            return (
              <button
                key={month}
                type="button"
                onClick={() => {
                  onChange(`${viewYear}-${String(month).padStart(2, "0")}`);
                  setOpen(false);
                }}
                className={`rounded-md border px-2 py-2 text-sm transition ${isSelected ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={onConfirm}>Confirmar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { formatCurrency };
