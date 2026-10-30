import { useState } from "react";
import { ArrowDown, ArrowUp, Check, Plus, Sparkles, Trash2, X } from "lucide-react";
import {
  BrandButton,
  Chip,
  Field,
  GhostButton,
  Panel,
  SectionTitle,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/ui-bits";
import { MultiTagPicker } from "@/components/multi-tag-picker";
import {
  CASE_CRITERIA_OPTIONS,
  CASE_DELIVERABLE_OPTIONS,
  CASE_EVALUATE_OPTIONS,
  CASE_MODALITIES,
  CASE_PREP_DEADLINES,
  CASE_PRESENTATION_FORMATS,
  CASE_PRESENTATION_MINUTES,
  CASE_QUESTION_MINUTES,
  CASE_SCHEDULING_MODES,
  CASE_STATUS_LABEL,
  CASE_TOOL_OPTIONS,
  isCaseComplete,
  type CaseConfig,
  type CaseSection,
} from "@/lib/case-module";

export function CaseStep({
  config,
  onChange,
  extraEvaluateOptions = [],
  aiLoading = false,
  onGenerate,
  onApprove,
  showEnabledToggle = true,
  stageNames,
}: {
  config: CaseConfig;
  onChange: (config: CaseConfig) => void;
  extraEvaluateOptions?: string[];
  aiLoading?: boolean;
  onGenerate?: () => void;
  onApprove?: () => void;
  showEnabledToggle?: boolean;
  stageNames?: string[];
}) {
  const [customDeadline, setCustomDeadline] = useState("");
  const set = <K extends keyof CaseConfig>(key: K, value: CaseConfig[K]) => onChange({ ...config, [key]: value });
  const criar = config.modality === "candidato_cria";
  const ready = isCaseComplete(config);

  const evaluateOptions = (() => {
    const extras = extraEvaluateOptions
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item) => !CASE_EVALUATE_OPTIONS.some((option) => option.toLowerCase() === item.toLowerCase()));
    return [...CASE_EVALUATE_OPTIONS, ...Array.from(new Set(extras))];
  })();

  const setSection = (index: number, next: Partial<CaseSection>) =>
    set(
      "sections",
      config.sections.map((section, position) => (position === index ? { ...section, ...next } : section)),
    );

  const moveSection = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= config.sections.length) return;
    const next = [...config.sections];
    const item = next.splice(index, 1)[0];
    if (!item) return;
    next.splice(target, 0, item);
    set("sections", next);
  };

  return (
    <div className="grid gap-4">
      <Panel>
        <SectionTitle title="Case técnico" hint="configuração" />
        {showEnabledToggle ? (
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(event) => onChange({ ...config, enabled: event.target.checked })}
            />
            Esta vaga terá case técnico
          </label>
        ) : null}

        {config.enabled ? (
          <div className="mt-4 grid gap-4">
            {stageNames?.length ? (
              <Field label="Em qual etapa">
                <SelectInput value={config.stageName} onChange={(event) => set("stageName", event.target.value)}>
                  {stageNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            ) : null}

            <Field
              label="O que queremos validar com este case?"
              description="Marque o que será observado. As competências e habilidades da vaga já aparecem como sugestão."
            >
              <MultiTagPicker
                options={evaluateOptions}
                values={config.evaluate_what}
                onChange={(values) => set("evaluate_what", values)}
                placeholder="Digite o que mais quer avaliar"
              />
            </Field>

            <Field label="Objetivo do case" description="Explique com suas palavras o que este case precisa provar.">
              <TextArea rows={2} value={config.objective} onChange={(event) => set("objective", event.target.value)} />
            </Field>

            <Field label="Como o case será realizado?" description="Escolha a modalidade do case.">
              <div className="grid gap-2">
                {CASE_MODALITIES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => set("modality", option.value)}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      config.modality === option.value
                        ? "border-brand bg-brand/10"
                        : "border-line bg-panel hover:border-brand/50"
                    }`}
                  >
                    <p className="flex items-center gap-2 text-[13px] font-medium text-ink">
                      {config.modality === option.value ? <Check className="size-3.5 text-brand" /> : null}
                      {option.label}
                    </p>
                    <p className="mt-1 text-[12px] text-ink-soft">{option.hint}</p>
                  </button>
                ))}
              </div>
            </Field>

            {criar ? (
              <Field label="Em qual ferramenta ou formato o candidato deverá criar?">
                <MultiTagPicker
                  options={CASE_TOOL_OPTIONS}
                  values={config.tools}
                  onChange={(values) => set("tools", values)}
                  placeholder="Digite outra ferramenta"
                />
                <label className="mt-2 flex items-center gap-2 text-[12px] text-ink-soft">
                  <input
                    type="checkbox"
                    checked={config.tool_required}
                    onChange={(event) => set("tool_required", event.target.checked)}
                  />
                  Ferramenta obrigatória (desmarcado: o candidato pode escolher)
                </label>
              </Field>
            ) : null}

            <Field label="O que o candidato precisa entregar?">
              <MultiTagPicker
                options={CASE_DELIVERABLE_OPTIONS}
                values={config.deliverables}
                onChange={(values) => set("deliverables", values)}
                placeholder="Digite outro entregável"
              />
            </Field>

            <Field label="Descreva exatamente o que deverá ser entregue">
              <TextArea
                rows={3}
                value={config.delivery_description}
                onChange={(event) => set("delivery_description", event.target.value)}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Prazo de preparação">
                <SelectInput
                  value={CASE_PREP_DEADLINES.includes(config.prep_deadline) ? config.prep_deadline : "Personalizado"}
                  onChange={(event) => {
                    if (event.target.value === "Personalizado") {
                      set("prep_deadline", customDeadline);
                      return;
                    }
                    set("prep_deadline", event.target.value);
                  }}
                >
                  {CASE_PREP_DEADLINES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </SelectInput>
                {CASE_PREP_DEADLINES.includes(config.prep_deadline) ? null : (
                  <div className="mt-2">
                    <TextInput
                      value={config.prep_deadline || customDeadline}
                      placeholder="Ex.: 10 dias"
                      onChange={(event) => {
                        setCustomDeadline(event.target.value);
                        set("prep_deadline", event.target.value);
                      }}
                    />
                  </div>
                )}
              </Field>
              <Field label="Prazo em dias" description="Usado para calcular a data limite do candidato.">
                <TextInput
                  type="number"
                  min={1}
                  value={config.deadline_days}
                  onChange={(event) => set("deadline_days", event.target.value)}
                />
              </Field>
            </div>

            <Field label="O candidato precisará apresentar o case?">
              <div className="flex gap-2">
                {[
                  { label: "Sim", value: true },
                  { label: "Não", value: false },
                ].map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => set("needs_presentation", option.value)}
                    className={`rounded-full border px-4 py-1.5 text-[13px] transition-colors ${
                      config.needs_presentation === option.value
                        ? "border-brand bg-brand font-medium text-brand-ink"
                        : "border-line bg-panel text-ink-soft hover:border-brand/60"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </Field>

            {config.needs_presentation ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Como será a apresentação?">
                    <SelectInput
                      value={config.presentation_format}
                      onChange={(event) => set("presentation_format", event.target.value)}
                    >
                      {CASE_PRESENTATION_FORMATS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                  <Field label="Tempo de apresentação">
                    <SelectInput
                      value={String(config.presentation_minutes)}
                      onChange={(event) => set("presentation_minutes", Number(event.target.value))}
                    >
                      {CASE_PRESENTATION_MINUTES.map((option) => (
                        <option key={option} value={option}>
                          {option} minutos
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                  <Field label="Tempo para perguntas">
                    <SelectInput
                      value={String(config.questions_minutes)}
                      onChange={(event) => set("questions_minutes", Number(event.target.value))}
                    >
                      {CASE_QUESTION_MINUTES.map((option) => (
                        <option key={option} value={option}>
                          {option} minutos
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                </div>
                <p className="text-[12px] text-ink-soft">
                  Duração total: {config.presentation_minutes + config.questions_minutes} minutos
                </p>

                <Field label="Como será feito o agendamento?">
                  <SelectInput
                    value={config.scheduling_mode}
                    onChange={(event) => set("scheduling_mode", event.target.value)}
                  >
                    {CASE_SCHEDULING_MODES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
                {config.scheduling_mode === "Inserir link da agenda" ? (
                  <Field label="Link da agenda" description="O candidato verá o botão “Agendar apresentação”.">
                    <TextInput
                      value={config.agenda_link}
                      placeholder="https://"
                      onChange={(event) => set("agenda_link", event.target.value)}
                    />
                  </Field>
                ) : null}
                {config.scheduling_mode === "Inserir link do Google Meet" ? (
                  <Field label="Link do Google Meet" description="O candidato verá o botão “Entrar no Google Meet”.">
                    <TextInput
                      value={config.meet_link}
                      placeholder="https://meet.google.com/..."
                      onChange={(event) => set("meet_link", event.target.value)}
                    />
                  </Field>
                ) : null}
              </>
            ) : null}

            <Field label="Critérios de avaliação">
              <MultiTagPicker
                options={CASE_CRITERIA_OPTIONS}
                values={config.criteria}
                onChange={(values) => set("criteria", values)}
                placeholder="Digite outro critério"
              />
            </Field>
          </div>
        ) : null}
      </Panel>

      {config.enabled ? (
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SectionTitle title="Briefing do case" hint="o que o candidato vai ler" />
            <div className="flex items-center gap-2">
              <Chip tone={config.status === "aprovado" ? "brand" : ready ? "teal" : "amber"}>
                {CASE_STATUS_LABEL[config.status] ?? config.status}
              </Chip>
              {onGenerate ? (
                <GhostButton type="button" onClick={onGenerate} disabled={aiLoading}>
                  <Sparkles className="size-3.5" />
                  {aiLoading ? "Gerando…" : config.sections.length ? "Gerar novamente com IA" : "Gerar case com IA"}
                </GhostButton>
              ) : null}
            </div>
          </div>

          <div className="mt-3">
            <Field label="Nome do case">
              <TextInput value={config.title} onChange={(event) => set("title", event.target.value)} />
            </Field>
          </div>

          {config.sections.length === 0 ? (
            <p className="mt-3 text-[13px] text-ink-soft">
              Configure o case acima e clique em “Gerar case com IA”. Depois você revisa, edita e aprova.
            </p>
          ) : (
            <div className="mt-3 grid gap-3">
              {config.sections.map((section, index) => (
                <div key={`${section.title}-${index}`} className="rounded-xl border border-line bg-panel p-3">
                  <div className="flex items-center gap-2">
                    <TextInput value={section.title} onChange={(event) => setSection(index, { title: event.target.value })} />
                    <GhostButton type="button" onClick={() => moveSection(index, -1)} title="Subir">
                      <ArrowUp className="size-3.5" />
                    </GhostButton>
                    <GhostButton type="button" onClick={() => moveSection(index, 1)} title="Descer">
                      <ArrowDown className="size-3.5" />
                    </GhostButton>
                    <GhostButton
                      type="button"
                      title="Excluir seção"
                      onClick={() => set("sections", config.sections.filter((_, position) => position !== index))}
                    >
                      <Trash2 className="size-3.5" />
                    </GhostButton>
                  </div>
                  <div className="mt-2">
                    <TextArea
                      rows={5}
                      value={section.content}
                      onChange={(event) => setSection(index, { content: event.target.value })}
                    />
                  </div>
                </div>
              ))}

              <div>
                <p className="mb-1 text-[11px] uppercase tracking-wide text-ink-soft">
                  Perguntas sugeridas para o avaliador
                </p>
                <div className="grid gap-2">
                  {config.evaluator_questions.map((question, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <TextInput
                        value={question}
                        onChange={(event) =>
                          set(
                            "evaluator_questions",
                            config.evaluator_questions.map((item, position) =>
                              position === index ? event.target.value : item,
                            ),
                          )
                        }
                      />
                      <GhostButton
                        type="button"
                        title="Remover"
                        onClick={() =>
                          set(
                            "evaluator_questions",
                            config.evaluator_questions.filter((_, position) => position !== index),
                          )
                        }
                      >
                        <X className="size-3.5" />
                      </GhostButton>
                    </div>
                  ))}
                  <GhostButton
                    type="button"
                    onClick={() => set("evaluator_questions", [...config.evaluator_questions, ""])}
                  >
                    <Plus className="size-3.5" /> Adicionar pergunta
                  </GhostButton>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <GhostButton
              type="button"
              onClick={() => set("sections", [...config.sections, { title: "Nova seção", content: "" }])}
            >
              <Plus className="size-3.5" /> Adicionar seção
            </GhostButton>
            {onApprove ? (
              <BrandButton type="button" onClick={onApprove} disabled={!ready}>
                <Check className="size-3.5" /> Aprovar case
              </BrandButton>
            ) : null}
            {!ready && config.sections.length ? (
              <span className="text-[12px] text-amber">Complete todas as seções para aprovar.</span>
            ) : null}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
