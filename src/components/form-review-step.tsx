import { Check, Pencil } from "lucide-react";
import type { Question, Assessment } from "@/lib/suggestions";
import { QuestionList, questionStats } from "@/components/question-editor";
import { BrandButton, Chip, GhostButton, Panel, SectionTitle } from "@/components/ui-bits";

type Props = {
  questions: Question[];
  setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  assessment: Assessment;
  approved: boolean;
  approvedBy: string;
  approvedAt: string;
  version: number;
  onApprove: () => void;
  onBack: () => void;
};

export function FormReviewStep({
  questions,
  setQuestions,
  assessment,
  approved,
  approvedBy,
  approvedAt,
  version,
  onApprove,
  onBack,
}: Props) {
  const usable = questions.filter((item) => item.question.trim());
  const stats = questionStats(usable);

  return (
    <div className="space-y-4">
      <Panel>
        <SectionTitle title="Revise o formulário que seus candidatos irão responder" hint={`versão ${version}`} />
        <p className="text-[13px] text-ink-soft">
          Esta é a prévia exata do formulário. Clique em qualquer pergunta para editar, excluir, duplicar, mover,
          tornar obrigatória ou definir como eliminatória.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Perguntas", stats.total],
            ["Obrigatórias", stats.required],
            ["Abertas", stats.open],
            ["Seleção única", stats.single],
            ["Múltipla escolha", stats.multiple],
            ["Critérios eliminatórios", stats.knockout],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-[12px] bg-paper/50 p-3 ring-1 ring-white/5">
              <p className="text-[11px] text-ink-soft">{label}</p>
              <p className="mt-1 font-display text-[20px] font-bold text-brand">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <GhostButton onClick={onBack}>
            <Pencil className="size-3.5" /> Voltar e editar
          </GhostButton>
          {approved ? (
            <Chip tone="brand">Formulário aprovado</Chip>
          ) : (
            <BrandButton onClick={onApprove}>
              <Check className="size-3.5" /> Aprovar formulário
            </BrandButton>
          )}
          {approved ? (
            <span className="text-[11px] text-ink-soft">
              Aprovado por {approvedBy || "você"} em {approvedAt} · versão {version}
            </span>
          ) : (
            <span className="text-[11px] text-ink-soft">A vaga só pode ser publicada depois da sua aprovação.</span>
          )}
        </div>
      </Panel>

      <Panel>
        <SectionTitle title="Queremos te conhecer melhor" hint="etapa 1 do candidato" />
        <QuestionList questions={questions} setQuestions={setQuestions} section="perfil" preview />
      </Panel>

      <Panel>
        <SectionTitle title="Queremos conhecer sua experiência" hint="etapa 2 do candidato" />
        <QuestionList questions={questions} setQuestions={setQuestions} section="experiencia" preview />
      </Panel>

      <Panel>
        <SectionTitle title="Assessment" hint="etapa 3 do candidato" />
        <p className="text-[13px] text-ink-soft">
          {assessment.questions.length} perguntas situacionais, aproximadamente {assessment.estimated_minutes} minutos.
          Já aprovado automaticamente — edite na etapa do assessment se quiser mudar algo.
        </p>
      </Panel>
    </div>
  );
}
