import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { normalizeSearchText, type BusinessSectorWithSubsectors } from "@/lib/business-sectors";

type SectorSubsectorFieldsProps = {
  sectors: BusinessSectorWithSubsectors[];
  sectorId: string;
  subsectorId: string;
  onSectorChange: (sectorId: string) => void;
  onSubsectorChange: (subsectorId: string) => void;
  disabled?: boolean;
  className?: string;
};

export function SectorSubsectorFields({ sectors, sectorId, subsectorId, onSectorChange, onSubsectorChange, disabled, className }: SectorSubsectorFieldsProps) {
  const selectedSector = sectors.find((sector) => sector.id === sectorId) ?? null;
  const subsectors = selectedSector?.subsectors ?? [];
  const selectedSubsector = subsectors.find((subsector) => subsector.id === subsectorId) ?? null;

  return (
    <div className={cn("grid gap-4 md:grid-cols-2", className)}>
      <div className="space-y-2">
        <Label>Setor</Label>
        <SearchablePicker
          items={sectors}
          value={sectorId}
          placeholder="Selecione o setor"
          searchPlaceholder="Buscar setor..."
          emptyText="Nenhum setor encontrado."
          disabled={disabled}
          selectedLabel={selectedSector?.name}
          onChange={(nextSectorId) => {
            onSectorChange(nextSectorId);
            onSubsectorChange("");
          }}
        />
      </div>

      <div className="space-y-2">
        <Label>Subsetor</Label>
        <SearchablePicker
          items={subsectors}
          value={subsectorId}
          placeholder={sectorId ? "Selecione o subsetor" : "Selecione primeiro um setor"}
          searchPlaceholder="Buscar subsetor..."
          emptyText="Nenhum subsetor encontrado para este setor."
          disabled={disabled || !sectorId}
          selectedLabel={selectedSubsector?.name}
          onChange={onSubsectorChange}
        />
      </div>
    </div>
  );
}

type SearchablePickerItem = {
  id: string;
  name: string;
};

type SearchablePickerProps = {
  items: SearchablePickerItem[];
  value: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  selectedLabel?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

function SearchablePicker({ items, value, placeholder, searchPlaceholder, emptyText, selectedLabel, disabled, onChange }: SearchablePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" disabled={disabled} className="w-full justify-between">
          <span className={cn("truncate", !selectedLabel && "text-muted-foreground")}>{selectedLabel ?? placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.name} ${normalizeSearchText(item.name)}`}
                  onSelect={() => {
                    onChange(item.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === item.id ? "opacity-100" : "opacity-0")} />
                  {item.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
