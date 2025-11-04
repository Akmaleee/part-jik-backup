"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Option = {
  value: string | number;
  label: string;
};

type InputSelectProps = {
  /** Label di atas combobox */
  title: string;
  /** List opsi yang akan ditampilkan */
  options: Option[];
  /** Nilai terpilih */
  value?: string | number;
  /** Handler saat nilai berubah */
  onChange?: (value: string | number | undefined) => void;
  /** Placeholder saat belum ada pilihan */
  placeholder?: string;
  /** Apakah wajib diisi */
  required?: boolean;
  /** ID opsional untuk label */
  id?: string;
  /** Apakah tombol disabled */
  disabled?: boolean;
  /** Lebar tombol */
  widthClass?: string;
};

export default function InputSelect({
  title,
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  required = false,
  id,
  disabled = false,
  widthClass = "w-[200px]",
}: InputSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedLabel = options.find((opt) => opt.value === value)?.label;

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="mb-1 text-sm font-medium"
      >
        {title}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn("justify-between", widthClass)}
          >
            {selectedLabel || placeholder}
            <ChevronsUpDown className="opacity-50 h-4 w-4" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className={cn("p-0", widthClass)}>
          <Command>
            <CommandInput placeholder="Search..." className="h-9" />
            <CommandList>
              <CommandEmpty>No option found.</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.label.toLowerCase()}
                    onSelect={(currentValue) => {
                      const newValue =
                        currentValue === String(value) ? undefined : opt.value;
                      onChange?.(newValue);
                      setOpen(false);
                    }}
                  >
                    {opt.label}
                    <Check
                      className={cn(
                        "ml-auto",
                        value === opt.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
