import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { GhostButton, TextInput } from "@/components/ui-bits";

export function MultiTagPicker({
  options,
  values,
  onChange,
  placeholder,
}: {
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherText, setOtherText] = useState("");
  const allOptions = [...options, "Outro"];
  const customs = values.filter((value) => !allOptions.includes(value));

  const toggle = (label: string) => {
    if (label === "Outro") {
      setOtherOpen((open) => !open);
      return;
    }
    onChange(values.includes(label) ? values.filter((value) => value !== label) : [...values, label]);
  };

  const addCustom = () => {
    const label = otherText.trim();
    if (!label) return;
    if (!values.includes(label)) onChange([...values, label]);
    setOtherText("");
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {allOptions.map((option) => {
          const active = option === "Outro" ? otherOpen : values.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
                active
                  ? "border-brand bg-brand font-medium text-brand-ink"
                  : "border-line bg-panel text-ink-soft hover:border-brand/60 hover:text-ink"
              }`}
            >
              {active ? <Check className="size-3" /> : null}
              {option}
            </button>
          );
        })}
        {customs.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => onChange(values.filter((value) => value !== label))}
            title="Remover"
            className="flex items-center gap-1.5 rounded-full border border-brand bg-brand px-3 py-1.5 text-[13px] font-medium text-brand-ink"
          >
            {label}
            <X className="size-3" />
          </button>
        ))}
      </div>
      {otherOpen ? (
        <div className="mt-2 flex items-center gap-2">
          <TextInput
            value={otherText}
            placeholder={placeholder ?? "Digite e adicione"}
            onChange={(event) => setOtherText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addCustom();
              }
            }}
          />
          <GhostButton type="button" onClick={addCustom}>
            <Plus className="size-3.5" />
            Adicionar
          </GhostButton>
        </div>
      ) : null}
    </div>
  );
}
