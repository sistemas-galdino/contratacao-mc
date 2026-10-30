import { Check, Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  EDUCATION_LEVELS,
  EXPERIENCE_TIMES,
  REQUIREMENT_CATEGORIES,
  TOOL_LEVELS,
  emptyQuestion,
  emptyRequirement,
  requirementLabel,
  type Question,
  type Requirement,
  type RequirementCategory,
} from "@/lib/suggestions";
import { QuestionList } from "@/components/question-editor";
import { Chip, Field, GhostButton, Panel, PrimaryButton, SectionTitle, SelectInput, TextInput } from "@/components/ui-bits";

type Props = {
  requirements: Requirement[];
  setRequirements: React.Dispatch<React.SetStateAction<Requirement[]>>;
  questions: Question[];
  setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  onRegenerate: () => void;
  skillNames: string[];
  aiLoading?: boolean;
};

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid size-8 place-items-center rounded-full bg-paper/60 text-ink-soft transition-colors hover:text-rose"
      aria-label="Excluir"
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}

export function RequirementsQuestionsStep({
  requirements,
  setRequirements,
  questions,
  setQuestions,
  onRegenerate,
  skillNames,
  aiLoading = false,
}: Props) {
  const updateRequirement = (index: number, patch: Partial<Requirement>) =>
    setRequirements((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const updateDetail = (index: number, patch: Requirement["detail"]) =>
    setRequirements((prev) =>
      prev.map((row, i) => (i === index ? { ...row, detail: { ...row.detail, ...patch } } : row)),
    );

  const approved = questions.filter((item) => item.status === "aprovada").length;

  return (
    <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
      <Panel>
        <SectionTitle title="Requisitos da vaga" hint="critérios objetivos" />
        <p className="mb-3 text-[13px] text-ink-soft">
          Sugerimos os requisitos com base no cargo, no formato de trabalho, no modelo de contratação e nas
          habilidades que você cadastrou. Revise, detalhe e decida o que elimina.
        </p>

        <div className="space-y-2">
          {requirements.map((item, index) => (
            <div key={index} className="rounded-[12px] bg-paper/50 p-3 ring-1 ring-white/5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <SelectInput
                  className="w-auto min-w-44 py-1 text-[12px]"
                  value={item.category}
                  onChange={(event) => {
                    const category = event.target.value as RequirementCategory;
                    const fresh = emptyRequirement(category);
                    updateRequirement(index, {
                      category,
                      detail: fresh.detail,
                      description: category === "ferramenta" ? item.description : "",
                    });
                  }}
                >
                  {REQUIREMENT_CATEGORIES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectInput>
                <div className="flex items-center gap-2">
                  <Chip tone={item.kind === "obrigatorio" ? "brand" : "neutral"}>
                    {item.kind === "obrigatorio" ? "Obrigatório" : "Desejável"}
                  </Chip>
                  <RemoveButton onClick={() => setRequirements((prev) => prev.filter((_, i) => i !== index))} />
                </div>
              </div>

              <p className="mt-2 text-[14px] font-medium text-ink">{requirementLabel(item) || "Descreva o requisito"}</p>

              <div className="mt-2 space-y-2">
                {item.category === "experiencia" ? (
                  <>
                    <Field label="Exigir experiência anterior?">
                      <SelectInput
                        value={item.detail.requires === false ? "nao" : "sim"}
                        onChange={(event) => updateDetail(index, { requires: event.target.value === "sim" })}
                      >
                        <option value="sim">Sim</option>
                        <option value="nao">Não</option>
                      </SelectInput>
                    </Field>
                    {item.detail.requires !== false ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Field label="Tempo mínimo">
                          <SelectInput
                            value={EXPERIENCE_TIMES.includes(item.detail.min_time ?? "") ? item.detail.min_time : "Personalizado"}
                            onChange={(event) => updateDetail(index, { min_time: event.target.value === "Personalizado" ? "" : event.target.value })}
                          >
                            {EXPERIENCE_TIMES.map((time) => (
                              <option key={time} value={time}>
                                {time}
                              </option>
                            ))}
                          </SelectInput>
                        </Field>
                        <Field label="Experiência em quê?">
                          <TextInput
                            value={item.detail.area ?? ""}
                            placeholder="Ex.: gestão de carteira de clientes"
                            onChange={(event) => updateDetail(index, { area: event.target.value })}
                          />
                        </Field>
                      </div>
                    ) : null}
                  </>
                ) : null}

                {item.category === "formacao" ? (
                  <>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Field label="Exigir formação?">
                        <SelectInput
                          value={item.detail.requires === false ? "nao" : "sim"}
                          onChange={(event) => updateDetail(index, { requires: event.target.value === "sim" })}
                        >
                          <option value="sim">Sim</option>
                          <option value="nao">Não</option>
                        </SelectInput>
                      </Field>
                      {item.detail.requires !== false ? (
                        <Field label="Nível">
                          <SelectInput
                            value={item.detail.level ?? "Superior completo"}
                            onChange={(event) => updateDetail(index, { level: event.target.value })}
                          >
                            {EDUCATION_LEVELS.map((level) => (
                              <option key={level} value={level}>
                                {level}
                              </option>
                            ))}
                          </SelectInput>
                        </Field>
                      ) : null}
                    </div>
                    {item.detail.requires !== false ? (
                      <>
                        <label className="flex items-center gap-2 text-[12px] text-ink-soft">
                          <input
                            type="checkbox"
                            checked={Boolean(item.detail.any_degree)}
                            onChange={(event) => updateDetail(index, { any_degree: event.target.checked })}
                          />
                          Aceitar qualquer curso superior
                        </label>
                        {!item.detail.any_degree ? (
                          <div className="space-y-2">
                            {(item.detail.courses ?? [""]).map((course, courseIndex) => (
                              <div key={courseIndex} className="flex items-center gap-2">
                                <TextInput
                                  value={course}
                                  placeholder="Ex.: Administração, Gestão Comercial ou áreas correlatas"
                                  onChange={(event) => {
                                    const courses = [...(item.detail.courses ?? [""])];
                                    courses[courseIndex] = event.target.value;
                                    updateDetail(index, { courses });
                                  }}
                                />
                                {(item.detail.courses ?? []).length > 1 ? (
                                  <RemoveButton
                                    onClick={() =>
                                      updateDetail(index, {
                                        courses: (item.detail.courses ?? []).filter((_, i) => i !== courseIndex),
                                      })
                                    }
                                  />
                                ) : null}
                              </div>
                            ))}
                            <GhostButton
                              className="text-[12px]"
                              onClick={() => updateDetail(index, { courses: [...(item.detail.courses ?? []), ""] })}
                            >
                              <Plus className="size-3.5" /> Adicionar formação aceita
                            </GhostButton>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </>
                ) : null}

                {item.category === "certificacao" ? (
                  <Field label="Qual certificação é necessária?">
                    <TextInput
                      value={item.detail.certification ?? ""}
                      placeholder="Ex.: Certificação em Customer Success"
                      onChange={(event) => updateDetail(index, { certification: event.target.value })}
                    />
                  </Field>
                ) : null}

                {item.category === "ferramenta" ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field label="Ferramenta ou conhecimento">
                      <TextInput
                        value={item.description}
                        placeholder="Ex.: CRM, Excel, Google Workspace"
                        onChange={(event) => updateRequirement(index, { description: event.target.value })}
                      />
                    </Field>
                    <Field label="Nível mínimo">
                      <SelectInput
                        value={item.detail.level ?? "Intermediário"}
                        onChange={(event) => updateDetail(index, { level: event.target.value })}
                      >
                        {TOOL_LEVELS.map((level) => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ))}
                      </SelectInput>
                    </Field>
                  </div>
                ) : null}

                {["equipamento", "disponibilidade", "localizacao", "contratacao", "outro"].includes(item.category) ? (
                  <Field label="Requisito">
                    <TextInput
                      value={item.description}
                      placeholder="Ex.: Notebook próprio"
                      onChange={(event) => updateRequirement(index, { description: event.target.value })}
                    />
                  </Field>
                ) : null}

                <div className="flex flex-wrap items-center gap-3">
                  <SelectInput
                    className="w-auto py-1 text-[12px]"
                    value={item.kind}
                    onChange={(event) =>
                      updateRequirement(index, {
                        kind: event.target.value,
                        is_knockout: event.target.value === "obrigatorio" ? item.is_knockout : false,
                      })
                    }
                  >
                    <option value="obrigatorio">Obrigatório</option>
                    <option value="desejavel">Desejável</option>
                  </SelectInput>
                  {item.kind === "obrigatorio" ? (
                    <label className="flex items-center gap-2 text-[12px] text-ink-soft">
                      <input
                        type="checkbox"
                        checked={item.is_knockout}
                        onChange={(event) => updateRequirement(index, { is_knockout: event.target.checked })}
                      />
                      Usar como critério eliminatório
                    </label>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {REQUIREMENT_CATEGORIES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRequirements((prev) => [...prev, emptyRequirement(option.value)])}
              className="rounded-full bg-paper/70 px-2.5 py-1 text-[11px] text-ink-soft transition-colors hover:text-brand"
            >
              + {option.label}
            </button>
          ))}
        </div>

        {skillNames.length ? (
          <GhostButton
            className="mt-3"
            onClick={() =>
              setRequirements((prev) => [
                ...prev,
                ...skillNames
                  .filter((name) => !prev.some((row) => row.category === "ferramenta" && row.description === name))
                  .map((name) => ({
                    ...emptyRequirement("ferramenta"),
                    description: name,
                    kind: "desejavel",
                  })),
              ])
            }
          >
            <Plus className="size-3.5" /> Trazer habilidades técnicas como requisitos
          </GhostButton>
        ) : null}

        <p className="mt-3 text-[11px] text-ink-soft">
          Critérios eliminatórios são sempre objetivos. Conhecimento que a pessoa declara sozinha só elimina se você
          marcar essa regra de propósito.
        </p>
      </Panel>

      <Panel>
        <SectionTitle title="Perguntas sugeridas para esta vaga" hint={`${approved} de ${questions.length} aprovadas`} />
        <p className="text-[13px] text-ink-soft">
          Criamos estas perguntas com base no perfil, nas responsabilidades e nos requisitos da vaga. Revise antes de
          publicar.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <PrimaryButton
            onClick={() => setQuestions((prev) => prev.map((item) => ({ ...item, status: "aprovada" as const })))}
          >
            <Check className="size-3.5" /> Aprovar todas
          </PrimaryButton>
          <GhostButton onClick={onRegenerate} disabled={aiLoading}>
            <RefreshCw className={`size-3.5 ${aiLoading ? "animate-spin" : ""}`} />
            {aiLoading ? "Gerando com IA..." : "Gerar sugestões com IA"}
          </GhostButton>
        </div>

        <h3 className="mt-5 font-display text-[15px] font-bold tracking-tight">Queremos te conhecer melhor</h3>
        <p className="mb-2 text-[11px] text-ink-soft">Dados pessoais e profissionais do candidato.</p>
        <QuestionList questions={questions} setQuestions={setQuestions} section="perfil" />
        <GhostButton
          className="mt-2 text-[12px]"
          onClick={() => setQuestions((prev) => [...prev, emptyQuestion("perfil")])}
        >
          <Plus className="size-3.5" /> Adicionar campo básico
        </GhostButton>

        <h3 className="mt-6 font-display text-[15px] font-bold tracking-tight">
          Queremos conhecer melhor sua experiência
        </h3>
        <p className="mb-2 text-[11px] text-ink-soft">Perguntas criadas especificamente para esta vaga.</p>
        <QuestionList questions={questions} setQuestions={setQuestions} section="experiencia" />
        <GhostButton
          className="mt-2 text-[12px]"
          onClick={() => setQuestions((prev) => [...prev, emptyQuestion("experiencia")])}
        >
          <Plus className="size-3.5" /> Adicionar pergunta
        </GhostButton>

        <p className="mt-3 text-[11px] text-ink-soft">
          Nenhuma pergunta elimina candidatos sozinha: marque “Eliminatória” apenas nas condições objetivas que você
          quiser usar como filtro. Só as perguntas aprovadas entram no formulário público, e as respostas ficam
          guardadas para o roteiro de entrevista.
        </p>
      </Panel>
    </div>
  );
}
