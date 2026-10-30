import { CheckCircle2, Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  emptyAssessmentQuestion,
  extraAssessmentQuestion,
  isAssessmentReady,
  type Assessment,
  type AssessmentQuestion,
  type SuggestionInput,
} from "@/lib/suggestions";
import { optionScores } from "@/lib/assessment-scoring";
import { BrandButton, Chip, Field, GhostButton, Panel, SectionTitle, TextArea, TextInput } from "@/components/ui-bits";

type Props = {
  assessment: Assessment;
  setAssessment: React.Dispatch<React.SetStateAction<Assessment>>;
  onRegenerate: () => void;
  input: SuggestionInput;
  loading?: boolean;
};

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function AssessmentStep({ assessment, setAssessment, onRegenerate, input, loading = false }: Props) {
  const ready = isAssessmentReady(assessment);
  const approved = !!assessment.approved && ready;
  const bySkill = new Map<string, number>();
  assessment.questions.forEach((q) => bySkill.set(q.competency, (bySkill.get(q.competency) ?? 0) + 1));

  // Qualquer alteração volta o assessment para "em revisão".
  const update = (index: number, patch: Partial<AssessmentQuestion>) =>
    setAssessment((prev) => ({
      ...prev,
      approved: false,
      questions: prev.questions.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));

  const addForSkill = (skill: string) =>
    setAssessment((prev) => ({
      ...prev,
      approved: false,
      questions: [...prev.questions, extraAssessmentQuestion(skill, input, bySkill.get(skill) ?? 0)],
    }));

  return (
    <div className="space-y-4">
      <Panel>
        <SectionTitle title="Assessment da vaga" hint="revise e aprove antes de publicar" />
        <p className="text-[13px] text-ink-soft">
          As situações foram criadas a partir das habilidades e competências cadastradas nesta vaga. Cada alternativa tem
          uma pontuação interna (0 a 100) que o candidato não vê. Depois das respostas, o sistema calcula uma nota por
          habilidade.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {[
            ["Situações", String(assessment.questions.length)],
            ["Habilidades avaliadas", String(bySkill.size)],
            ["Tempo estimado", `${assessment.estimated_minutes} min`],
            ["Status", approved ? "Aprovado" : ready ? "Aguardando aprovação" : "Revise os campos"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[12px] bg-paper/50 p-3 ring-1 ring-white/5">
              <p className="text-[11px] text-ink-soft">{label}</p>
              <p className="mt-1 font-display text-[18px] font-bold text-brand">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <p className="mb-2 text-[12px] text-ink-soft">Situações por habilidade (adicione ou exclua para ajustar)</p>
          <div className="flex flex-wrap gap-2">
            {[...bySkill.entries()].map(([skill, count]) => (
              <span key={skill} className="inline-flex items-center gap-1.5 rounded-full bg-paper/60 px-3 py-1 text-[12px] ring-1 ring-white/5">
                {skill} <strong className="text-brand">{count}</strong>
                <button type="button" aria-label={`Adicionar situação para ${skill}`} onClick={() => addForSkill(skill)} className="text-ink-soft hover:text-brand">
                  <Plus className="size-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <BrandButton
            disabled={!ready || approved}
            onClick={() => setAssessment((prev) => ({ ...prev, approved: true }))}
          >
            <CheckCircle2 className="size-4" /> {approved ? "Assessment aprovado" : "Aprovar assessment"}
          </BrandButton>
          <GhostButton onClick={onRegenerate} disabled={loading}>
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Gerando com IA..." : "Regerar com IA"}
          </GhostButton>
          {!approved ? <Chip tone="amber">Só fica disponível aos candidatos após a aprovação</Chip> : null}
        </div>
      </Panel>

      <Panel>
        <SectionTitle title="Situações do assessment" hint="visão interna — o candidato vê só situação, pergunta e alternativas" />
        <div className="space-y-2">
          {assessment.questions.map((item, index) => {
            const scores = optionScores(item);
            return (
              <div key={index} className="rounded-[12px] bg-paper/50 p-3 ring-1 ring-white/5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    <Chip tone="teal">{item.competency || "Habilidade"}</Chip>
                    {(item.secondary_scores ?? []).map((sec) => (
                      <Chip key={sec.competency}>+ {sec.competency}</Chip>
                    ))}
                  </div>
                  <button
                    type="button"
                    aria-label="Excluir situação"
                    onClick={() =>
                      setAssessment((prev) => ({ ...prev, approved: false, questions: prev.questions.filter((_, i) => i !== index) }))
                    }
                    className="grid size-8 place-items-center rounded-full bg-paper/60 text-ink-soft transition-colors hover:text-rose"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                <div className="mt-2 grid gap-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field label="Habilidade principal">
                      <TextInput value={item.competency} onChange={(e) => update(index, { competency: e.target.value })} />
                    </Field>
                    <Field label="O que observar na resposta">
                      <TextInput value={item.looking_for} onChange={(e) => update(index, { looking_for: e.target.value })} />
                    </Field>
                  </div>
                  <Field label="Situação">
                    <TextArea rows={2} value={item.situation} onChange={(e) => update(index, { situation: e.target.value })} />
                  </Field>
                  <Field label="Pergunta">
                    <TextInput value={item.question} onChange={(e) => update(index, { question: e.target.value })} />
                  </Field>
                  <div className="space-y-2">
                    <p className="text-[12px] text-ink-soft">Alternativas, pontuação interna (0–100) e justificativa</p>
                    {item.options.map((option, oi) => (
                      <div key={oi} className="grid gap-1.5 rounded-[10px] bg-paper/40 p-2 sm:grid-cols-[24px_1fr_80px_32px]">
                        <span className="pt-2 text-[13px] font-bold text-brand">{LETTERS[oi]}</span>
                        <div className="grid gap-1.5">
                          <TextInput
                            value={option}
                            onChange={(e) => {
                              const options = [...item.options];
                              options[oi] = e.target.value;
                              update(index, { options });
                            }}
                          />
                          <TextInput
                            className="text-[12px]"
                            placeholder="Justificativa interna da pontuação"
                            value={item.justifications?.[oi] ?? ""}
                            onChange={(e) => {
                              const justifications = item.options.map((_, i) => item.justifications?.[i] ?? "");
                              justifications[oi] = e.target.value;
                              update(index, { justifications });
                            }}
                          />
                        </div>
                        <TextInput
                          type="number"
                          min={0}
                          max={100}
                          aria-label={`Pontuação da alternativa ${LETTERS[oi]}`}
                          value={scores[oi] ?? 0}
                          onChange={(e) => {
                            const option_scores = [...scores];
                            option_scores[oi] = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                            update(index, { option_scores, scoring: option_scores.map((v) => (v === Math.max(...option_scores) ? 3 : 1)) });
                          }}
                        />
                        {item.options.length > 2 ? (
                          <button
                            type="button"
                            aria-label="Excluir alternativa"
                            onClick={() =>
                              update(index, {
                                options: item.options.filter((_, i) => i !== oi),
                                option_scores: scores.filter((_, i) => i !== oi),
                                scoring: item.scoring.filter((_, i) => i !== oi),
                                justifications: (item.justifications ?? []).filter((_, i) => i !== oi),
                                secondary_scores: (item.secondary_scores ?? []).map((s) => ({ ...s, scores: s.scores.filter((_, i) => i !== oi) })),
                              })
                            }
                            className="grid size-8 place-items-center rounded-full bg-paper/60 text-ink-soft transition-colors hover:text-rose"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        ) : <span />}
                      </div>
                    ))}
                    {item.options.length < 6 ? (
                      <GhostButton
                        className="text-[12px]"
                        onClick={() =>
                          update(index, {
                            options: [...item.options, ""],
                            option_scores: [...scores, 0],
                            scoring: [...item.scoring, 1],
                            justifications: [...item.options.map((_, i) => item.justifications?.[i] ?? ""), ""],
                            secondary_scores: (item.secondary_scores ?? []).map((s) => ({ ...s, scores: [...s.scores, 0] })),
                          })
                        }
                      >
                        <Plus className="size-3.5" /> Adicionar alternativa
                      </GhostButton>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <GhostButton
          className="mt-3"
          onClick={() =>
            setAssessment((prev) => ({ ...prev, approved: false, questions: [...prev.questions, emptyAssessmentQuestion()] }))
          }
        >
          <Plus className="size-3.5" /> Adicionar situação
        </GhostButton>

        <p className="mt-3 text-[11px] text-ink-soft">
          O assessment não elimina candidatos: as notas por habilidade apoiam a análise e o roteiro de entrevista. A
          decisão é sempre do gestor.
        </p>
      </Panel>
    </div>
  );
}
