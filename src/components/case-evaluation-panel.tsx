import { useState } from "react";
import { toast } from "sonner";
import { ClipboardCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BrandButton, Chip, Field, Panel, SectionTitle, TextArea } from "@/components/ui-bits";
import { CASE_STATUS_LABEL } from "@/lib/case-module";

type Row = Record<string, unknown>;

export function CaseEvaluationPanel({
  jobCase,
  assignment,
  deliveries,
  candidateId,
  companyId,
  onSaved,
}: {
  jobCase: Row | null;
  assignment: Row | null;
  deliveries: Row[];
  candidateId: string;
  companyId: string;
  onSaved: () => void;
}) {
  const criteria = (() => {
    const raw = typeof jobCase?.["criteria"] === "string" ? (jobCase["criteria"] as string) : "";
    const list = raw.split(", ").map((item) => item.trim()).filter(Boolean);
    return list.length ? list : ["Clareza", "Raciocínio", "Comunicação", "Atenção aos detalhes", "Cumprimento dos requisitos"];
  })();

  const [scores, setScores] = useState<Record<string, number>>({});
  const [strengths, setStrengths] = useState("");
  const [attention, setAttention] = useState("");
  const [notes, setNotes] = useState("");
  const [questions, setQuestions] = useState(
    Array.isArray(jobCase?.["evaluator_questions"]) ? (jobCase!["evaluator_questions"] as string[]).join("\n") : "",
  );
  const [nextStep, setNextStep] = useState("");
  const [saving, setSaving] = useState(false);

  if (!jobCase) return null;
  const caseRow = jobCase;

  async function save() {
    setSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("case_evaluations").insert({
        company_id: companyId,
        candidate_id: candidateId,
        case_id: caseRow["id"] as string,
        assignment_id: (assignment?.["id"] as string) ?? null,
        scores,
        strengths: strengths || null,
        attention_points: attention || null,
        notes: notes || null,
        questions_asked: questions || null,
        next_step: nextStep || null,
        evaluator: user.user?.id ?? null,
      });
      if (error) throw error;
      if (assignment?.["id"]) {
        await supabase
          .from("case_assignments")
          .update({ status: "avaliado", evaluated_at: new Date().toISOString() })
          .eq("id", assignment["id"] as string);
      }
      await supabase.from("candidate_events").insert({
        company_id: companyId,
        candidate_id: candidateId,
        type: "case",
        title: "Case avaliado",
        detail: nextStep || "Avaliação registrada",
      });
      onSaved();
      toast.success("Avaliação do case registrada.");
    } catch (error) {
      console.error(error);
      toast.error("Não conseguimos salvar a avaliação agora.");
    } finally {
      setSaving(false);
    }
  }

  const status = (assignment?.["status"] as string) ?? (caseRow["approved_at"] ? "aprovado" : "rascunho");

  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionTitle title="Avaliar case" hint={(caseRow["title"] as string) || "case técnico"} />
        <Chip tone={status === "avaliado" ? "brand" : "teal"}>{CASE_STATUS_LABEL[status] ?? status}</Chip>
      </div>

      {deliveries.length ? (
        <div className="mb-3 grid gap-1 text-[13px]">
          <p className="text-[11px] uppercase tracking-wide text-ink-soft">Entregas do candidato</p>
          {deliveries.map((delivery, index) => (
            <a
              key={index}
              href={(delivery["url"] as string) ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="text-brand underline"
            >
              {(delivery["url"] as string) ?? "Entrega registrada"}
            </a>
          ))}
        </div>
      ) : null}

      <div className="grid gap-2">
        {criteria.map((criterion) => (
          <div key={criterion} className="flex items-center justify-between gap-3">
            <span className="text-[13px] text-ink">{criterion}</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScores((prev) => ({ ...prev, [criterion]: value }))}
                  className={`size-8 rounded-lg border text-[12px] transition-colors ${
                    scores[criterion] === value
                      ? "border-brand bg-brand font-medium text-brand-ink"
                      : "border-line bg-panel text-ink-soft hover:border-brand/60"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3">
        <Field label="Pontos fortes">
          <TextArea rows={2} value={strengths} onChange={(event) => setStrengths(event.target.value)} />
        </Field>
        <Field label="Pontos de atenção">
          <TextArea rows={2} value={attention} onChange={(event) => setAttention(event.target.value)} />
        </Field>
        <Field label="Observações do avaliador">
          <TextArea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>
        <Field label="Perguntas realizadas" description="As perguntas sugeridas pela IA já vêm preenchidas.">
          <TextArea rows={4} value={questions} onChange={(event) => setQuestions(event.target.value)} />
        </Field>
        <Field label="Próximo passo">
          <TextArea rows={2} value={nextStep} onChange={(event) => setNextStep(event.target.value)} />
        </Field>
        <BrandButton type="button" disabled={saving} onClick={() => void save()}>
          <ClipboardCheck className="size-3.5" /> {saving ? "Salvando…" : "Registrar avaliação do case"}
        </BrandButton>
      </div>
    </Panel>
  );
}
