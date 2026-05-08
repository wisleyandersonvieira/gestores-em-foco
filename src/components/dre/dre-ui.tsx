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
  return (
    <Input
      inputMode="decimal"
      disabled={disabled}
      value={toCurrencyInput(value)}
      onChange={(event) => onChange(parseCurrencyInput(event.target.value))}
      onFocus={(event) => event.currentTarget.select()}
      className="text-right font-medium tabular-nums"
    />
  );
}

export function CompetenceMultiFilter({ selected, onChange }: { selected: string[]; onChange: (competences: string[]) => void }) {
  const options = competenceOptionsAroundCurrent();

  return (
    <div className="grid gap-2">
      <Label>Competencias</Label>
      <div className="grid max-h-44 gap-2 overflow-y-auto rounded-lg border bg-white p-3 sm:grid-cols-2 lg:grid-cols-3">
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
    </div>
  );
}

export function CompetenceSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Selecione a competencia" />
      </SelectTrigger>
      <SelectContent>
        {competenceOptionsAroundCurrent().map((competence) => (
          <SelectItem key={competence} value={competence}>{formatCompetence(competence)}</SelectItem>
        ))}
      </SelectContent>
    </Select>
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
