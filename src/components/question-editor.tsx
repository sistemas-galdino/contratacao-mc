import { useState } from "react";
import { ArrowDown, ArrowUp, Check, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import {
  ANSWER_TYPES,
  QUESTION_STATUS_LABEL,
  SELECTION_TYPES,
  canBeKnockout,
  type Question,
} from "@/lib/suggestions";
import { Chip, Field, GhostButton, PrimaryButton, SelectInput, TextArea, TextInput } from "@/components/ui-bits";

export type QuestionStats = {
  total: number;
  required: number;
  open: number;
  single: number;
  multiple: number;
  knockout: number;
  approved: number;
};

export function questionStats(questions: Question[]): QuestionStats {
  return {
    total: questions.length,
    required: questions.filter((item) => item.is_required).length,
    open: questions.filter((item) => item.answer_type === "aberta").length,
    single: questions.filter((item) => item.answer_type === "selecao_unica").length,
    multiple: questions.filter((item) => item.answer_type === "selecao_multipla").length,
    knockout: questions.filter((item) => item.kind === "eliminatoria").length,
    approved: questions.filter((item) => item.status === "aprovada").length,
  };
}

function IconButton({
  label,
  onClick,
  children,
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-8 place-items-center rounded-full bg-paper/60 text-ink-soft transition-colors hover:text-brand disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** Mostra o campo do jeito que o candidato vai ver (sem interação). */
export function QuestionPreview({ item }: { item: Question }) {
  if (item.answer_type === "aberta") {
    return <TextArea rows={2} disabled placeholder="Resposta do candidato" />;
  }
  if (item.answer_type === "upload") {
    return (
      <div className="rounded-[10px] border border-dashed border-line px-3 py-2 text-[13px] text-ink-soft">
        Enviar arquivo
      </div>
    );
  }
  if (item.answer_type === "selecao_multipla") {
    return (
      <div className="flex flex-wrap gap-2">
        {(item.options.length ? item.options : ["Alternativa"]).map((option, index) => (
          <span
            key={`${option}-${index}`}
            className="flex items-center gap-2 rounded-full bg-paper/60 px-3 py-1.5 text-[13px] text-ink-soft"
          >
            <span className="size-3 rounded-[3px] ring-1 ring-white/20" />
            {option || "Alternativa"}
          </span>
        ))}
      </div>
    );
  }
  if (item.answer_type === "selecao_unica") {
    return (
      <SelectInput disabled value="">
        <option value="">Selecione</option>
        {item.options.map((option, index) => (
          <option key={`${option}-${index}`}>{option}</option>
        ))}
      </SelectInput>
    );
  }
  return (
    <TextInput
      disabled
      type={item.answer_type === "numero" ? "number" : item.answer_type === "data" ? "date" : "text"}
      placeholder={item.answer_type === "numero" ? "0" : "Resposta do candidato"}
    />
  );
}

type CardProps = {
  item: Question;
  index: number;
  total: number;
  preview?: boolean;
  onChange: (patch: Partial<Question>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (direction: -1 | 1) => void;
};

export function QuestionCard({
  item,
  index,
  total,
  preview = false,
  onChange,
  onRemove,
  onDuplicate,
  onMove,
}: CardProps) {
  const [editing, setEditing] = useState(false);
  const isSelection = SELECTION_TYPES.includes(item.answer_type);
  const allowKnockout = canBeKnockout(item);

  function setAnswerType(answer_type: Question["answer_type"]) {
    const selection = SELECTION_TYPES.includes(answer_type);
    onChange({
      answer_type,
      options: selection ? (item.options.length ? item.options : ["Sim", "Não"]) : [],
      kind: selection ? item.kind : "classificatoria",
      disqualifying_answer: selection ? item.disqualifying_answer : "",
    });
  }

  function moveOption(optionIndex: number, direction: -1 | 1) {
    const target = optionIndex + direction;
    if (target < 0 || target >= item.options.length) return;
    const options = [...item.options];
    const current = options[optionIndex]!;
    options[optionIndex] = options[target]!;
    options[target] = current;
    onChange({ options });
  }

  return (
    <div
      className={`rounded-[12px] bg-paper/50 p-3 ring-1 ${
        item.status === "aprovada" ? "ring-brand/30" : "ring-white/5"
      }`}
    >
      {editing ? (
        <div className="space-y-2">
          <Field label="Pergunta">
            <TextArea rows={2} value={item.question} onChange={(event) => onChange({ question: event.target.value })} />
          </Field>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Tipo de resposta">
              <SelectInput
                value={item.answer_type}
                onChange={(event) => setAnswerType(event.target.value as Question["answer_type"])}
              >
                {ANSWER_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Tag gerada (opcional)">
              <TextInput
                value={item.tag}
                placeholder="Ex.: TRABALHANDO ATUALMENTE"
                onChange={(event) => onChange({ tag: event.target.value })}
              />
            </Field>
          </div>

          {isSelection ? (
            <div className="space-y-2">
              <p className="text-[12px] text-ink-soft">Alternativas</p>
              {item.options.map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center gap-1.5">
                  <TextInput
                    value={option}
                    onChange={(event) => {
                      const options = [...item.options];
                      options[optionIndex] = event.target.value;
                      onChange({ options });
                    }}
                  />
                  <IconButton
                    label="Subir alternativa"
                    disabled={optionIndex === 0}
                    onClick={() => moveOption(optionIndex, -1)}
                  >
                    <ArrowUp className="size-3.5" />
                  </IconButton>
                  <IconButton
                    label="Descer alternativa"
                    disabled={optionIndex === item.options.length - 1}
                    onClick={() => moveOption(optionIndex, 1)}
                  >
                    <ArrowDown className="size-3.5" />
                  </IconButton>
                  {item.options.length > 1 ? (
                    <IconButton
                      label="Excluir alternativa"
                      onClick={() => onChange({ options: item.options.filter((_, i) => i !== optionIndex) })}
                    >
                      <Trash2 className="size-3.5" />
                    </IconButton>
                  ) : null}
                </div>
              ))}
              <GhostButton className="text-[12px]" onClick={() => onChange({ options: [...item.options, ""] })}>
                <Plus className="size-3.5" /> Adicionar alternativa
              </GhostButton>
            </div>
          ) : null}

          <label className="flex items-center gap-2 text-[12px] text-ink-soft">
            <input
              type="checkbox"
              checked={item.is_required}
              onChange={(event) => onChange({ is_required: event.target.checked })}
            />
            Resposta obrigatória
          </label>

          {allowKnockout ? (
            <label className="flex items-center gap-2 text-[12px] text-ink-soft">
              <input
                type="checkbox"
                checked={item.kind === "eliminatoria"}
                onChange={(event) =>
                  onChange({
                    kind: event.target.checked ? "eliminatoria" : "classificatoria",
                    disqualifying_answer: event.target.checked
                      ? item.options[item.options.length - 1] ?? "Não"
                      : "",
                  })
                }
              />
              Usar como critério eliminatório
            </label>
          ) : null}

          {item.kind === "eliminatoria" ? (
            <Field label="Qual resposta elimina o candidato?">
              <SelectInput
                value={item.disqualifying_answer}
                onChange={(event) => onChange({ disqualifying_answer: event.target.value })}
              >
                {item.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </SelectInput>
            </Field>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <PrimaryButton
              onClick={() => {
                onChange({ status: "aprovada" });
                setEditing(false);
              }}
            >
              <Check className="size-3.5" /> Salvar e aprovar
            </PrimaryButton>
            <GhostButton onClick={() => setEditing(false)}>Fechar edição</GhostButton>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="max-w-[28rem] text-[14px] font-medium text-ink">
              {item.question || "Nova pergunta"}
              {item.is_required ? <span className="text-brand"> *</span> : null}
            </p>
            <Chip tone={item.status === "aprovada" ? "brand" : item.status === "editada" ? "amber" : "neutral"}>
              {QUESTION_STATUS_LABEL[item.status]}
            </Chip>
          </div>

          {preview ? (
            <div className="mt-2">
              <QuestionPreview item={item} />
            </div>
          ) : (
            <>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Chip tone="neutral">
                  {ANSWER_TYPES.find((option) => option.value === item.answer_type)?.label ?? "Resposta aberta"}
                </Chip>
                {item.kind === "eliminatoria" ? (
                  <Chip tone="rose">Eliminatória · elimina “{item.disqualifying_answer}”</Chip>
                ) : null}
                {item.tag ? <Chip tone="teal">Tag: {item.tag}</Chip> : null}
                {item.is_required ? <Chip tone="neutral">Obrigatória</Chip> : null}
              </div>
              {item.options.length ? (
                <p className="mt-2 text-[12px] text-ink-soft">Opções: {item.options.join(" · ")}</p>
              ) : null}
              {item.origin_label ? (
                <p className="mt-1 text-[11px] text-ink-soft">Origem: {item.origin_label}</p>
              ) : null}
            </>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <GhostButton className="text-[12px]" onClick={() => setEditing(true)}>
              <Pencil className="size-3.5" /> Editar
            </GhostButton>
            <IconButton label="Duplicar" onClick={onDuplicate}>
              <Copy className="size-3.5" />
            </IconButton>
            <IconButton label="Mover para cima" disabled={index === 0} onClick={() => onMove(-1)}>
              <ArrowUp className="size-3.5" />
            </IconButton>
            <IconButton label="Mover para baixo" disabled={index === total - 1} onClick={() => onMove(1)}>
              <ArrowDown className="size-3.5" />
            </IconButton>
            <IconButton label="Excluir" onClick={onRemove}>
              <Trash2 className="size-3.5" />
            </IconButton>
            <label className="flex items-center gap-1.5 text-[11px] text-ink-soft">
              <input
                type="checkbox"
                checked={item.is_required}
                onChange={(event) => onChange({ is_required: event.target.checked })}
              />
              Obrigatória
            </label>
            {allowKnockout ? (
              <label className="flex items-center gap-1.5 text-[11px] text-ink-soft">
                <input
                  type="checkbox"
                  checked={item.kind === "eliminatoria"}
                  onChange={(event) =>
                    onChange({
                      kind: event.target.checked ? "eliminatoria" : "classificatoria",
                      disqualifying_answer: event.target.checked
                        ? item.options[item.options.length - 1] ?? "Não"
                        : "",
                    })
                  }
                />
                Eliminatória
              </label>
            ) : null}
            {item.status !== "aprovada" ? (
              <PrimaryButton className="text-[12px]" onClick={() => onChange({ status: "aprovada" })}>
                <Check className="size-3.5" /> Aprovar
              </PrimaryButton>
            ) : null}
          </div>

          {item.kind === "eliminatoria" ? (
            <Field className="mt-2" label="Qual resposta elimina o candidato?">
              <SelectInput
                value={item.disqualifying_answer}
                onChange={(event) => onChange({ disqualifying_answer: event.target.value })}
              >
                {item.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </SelectInput>
            </Field>
          ) : null}
        </>
      )}
    </div>
  );
}

/** Lista de perguntas de um bloco, com todas as ações do gestor. */
export function QuestionList({
  questions,
  setQuestions,
  section,
  preview = false,
}: {
  questions: Question[];
  setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  section: Question["section"];
  preview?: boolean;
}) {
  const indexes = questions.reduce<number[]>((acc, item, index) => {
    if (item.section === section) acc.push(index);
    return acc;
  }, []);

  function update(index: number, patch: Partial<Question>) {
    setQuestions((prev) =>
      prev.map((row, i) =>
        i === index
          ? { ...row, ...patch, status: patch.status ?? (row.status === "aprovada" ? "editada" : row.status) }
          : row,
      ),
    );
  }

  function move(index: number, direction: -1 | 1) {
    setQuestions((prev) => {
      const position = indexes.indexOf(index);
      const targetPosition = position + direction;
      if (targetPosition < 0 || targetPosition >= indexes.length) return prev;
      const target = indexes[targetPosition]!;
      const next = [...prev];
      const current = next[index]!;
      next[index] = next[target]!;
      next[target] = current;
      return next;
    });
  }

  return (
    <div className="space-y-2">
      {indexes.map((index, position) => (
        <QuestionCard
          key={index}
          item={questions[index]!}
          index={position}
          total={indexes.length}
          preview={preview}
          onChange={(patch) => update(index, patch)}
          onRemove={() => setQuestions((prev) => prev.filter((_, i) => i !== index))}
          onDuplicate={() =>
            setQuestions((prev) => [
              ...prev.slice(0, index + 1),
              { ...prev[index]!, status: "editada" as const },
              ...prev.slice(index + 1),
            ])
          }
          onMove={(direction) => move(index, direction)}
        />
      ))}
    </div>
  );
}
