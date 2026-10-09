import { Check } from "lucide-react";

type ProfileOption = {
  value: string;
  label: string;
};

type ProfileOptionChipsProps = {
  label: string;
  options: readonly ProfileOption[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
};

export function ProfileOptionChips({
  label,
  options,
  value,
  onChange,
  multiple = false,
}: ProfileOptionChipsProps) {
  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
  const selectedLabels = options
    .filter((option) => selectedValues.includes(option.value))
    .map((option) => option.label);

  const toggleOption = (optionValue: string) => {
    if (!multiple) {
      onChange(optionValue);
      return;
    }

    const nextValues = selectedValues.includes(optionValue)
      ? selectedValues.filter((selectedValue) => selectedValue !== optionValue)
      : [...selectedValues, optionValue];
    onChange(nextValues);
  };

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-foreground">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = selectedValues.includes(option.value);

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => toggleOption(option.value)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                selected
                  ? "border-transparent bg-gradient-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {selected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              {option.label}
            </button>
          );
        })}
      </div>
      {selectedLabels.length > 0 && (
        <p className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground">
          {multiple
            ? `${selectedLabels.length} ${
                selectedLabels.length === 1 ? "perfil selecionado" : "perfis selecionados"
              }: ${selectedLabels.join(", ")}.`
            : `Selecionado: ${selectedLabels[0]}.`}
        </p>
      )}
    </fieldset>
  );
}
