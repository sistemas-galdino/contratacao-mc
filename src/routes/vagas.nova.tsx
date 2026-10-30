import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, GripVertical, Plus, Sparkles, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany, useSession } from "@/hooks/use-session";
import { PageHeading, RequireAuth } from "@/components/app-shell";
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
import { RequirementsQuestionsStep } from "@/components/requirements-questions-step";
import { AssessmentStep } from "@/components/assessment-step";
import { shuffleQuestion } from "@/lib/assessment-scoring";
import { FormReviewStep } from "@/components/form-review-step";
import {
  aiGenerateAssessment,
  aiGenerateJobContext,
  aiGenerateJobForm,
  aiGenerateTechnicalCase,
} from "@/lib/ai.functions";
import { CaseStep } from "@/components/case-step";
import { dedupeQuestions } from "@/lib/question-dedupe";
import { emptyCaseConfig, fallbackCase, type CaseConfig } from "@/lib/case-module";
import {
  completeAssessment,
  profileQuestions,
  requirementLabel,
  suggestAssessment,
  suggestQuestions,
  suggestRequirements,
  type Assessment,
  type Question,
  type Requirement,
} from "@/lib/suggestions";
import {
  COMPETENCY_SUGGESTIONS,
  CONTRACT_MODELS,
  formatDateTime,
  IMPORTANCE_OPTIONS,
  SECTORS,
  SKILL_IMPORTANCE,
  SKILL_LEVELS,
  SKILL_SUGGESTIONS,
  SUGGESTED_STAGES,
  WORK_MODES,
} from "@/lib/hiring";

export const Route = createFileRoute("/vagas/nova")({
  head: () => ({
    meta: [
      { title: "Criar nova vaga — Vetor" },
      {
        name: "description",
        content:
          "Monte a vaga em etapas guiadas: informações básicas, contexto, competências, requisitos, perguntas eliminatórias e o processo seletivo.",
      },
      { property: "og:title", content: "Criar nova vaga — Vetor" },
      {
        property: "og:description",
        content: "Um passo a passo simples para estruturar a vaga e o processo de seleção.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <NewJobWizard />
    </RequireAuth>
  ),
});

type Competency = { name: string; importance: string };
type Skill = { name: string; level: string; importance: string };
type Stage = {
  name: string;
  stage_key: string | null;
  objective: string;
  owner: string;
  is_required: boolean;
  has_evaluation: boolean;
  has_score: boolean;
  needs_manual_approval: boolean;
};

type AiForm = Awaited<ReturnType<typeof aiGenerateJobForm>>;

/** Converte a saída da IA (campos nulos) para o formato usado na tela. */
function fromAiRequirements(items: AiForm["requirements"]): Requirement[] {
  return items.map((item) => {
    const detail: Requirement["detail"] = {};
    if (item.detail.requires !== null) detail.requires = item.detail.requires;
    if (item.detail.min_time) detail.min_time = item.detail.min_time;
    if (item.detail.area) detail.area = item.detail.area;
    if (item.detail.level) detail.level = item.detail.level;
    if (item.detail.courses?.length) detail.courses = item.detail.courses;
    if (item.detail.any_degree !== null) detail.any_degree = item.detail.any_degree;
    if (item.detail.certification) detail.certification = item.detail.certification;
    return {
      description: item.description,
      category: item.category,
      kind: item.kind,
      is_knockout: item.is_knockout,
      detail,
    };
  });
}

function fromAiQuestions(items: AiForm["questions"]): Question[] {
  return items.map((item) => ({
    ...item,
    status: "sugerida" as const,
    section: "experiencia" as const,
    field_key: "",
  }));
}

const STEPS = [
  "Informações básicas",
  "Contexto da vaga",
  "O que precisa ter",
  "Requisitos e perguntas",
  "Assessment",
  "Como será o processo",
  "Revisar formulário",
];

const WORKLOAD_OPTIONS = [
  "20h semanais",
  "30h semanais",
  "36h semanais",
  "40h semanais",
  "44h semanais",
  "Por demanda",
  "Personalizado",
];

const WORK_HOURS_OPTIONS = [
  "Horário comercial — 08h às 18h",
  "08h às 17h",
  "09h às 18h",
  "6 horas diárias",
  "Flexível",
  "Por escala",
  "Personalizado",
];

const BENEFIT_OPTIONS = [
  "Vale-refeição (VR)",
  "Vale-alimentação (VA)",
  "Vale-transporte (VT)",
  "Plano de saúde",
  "Plano odontológico",
  "Auxílio home office",
  "Auxílio combustível",
  "Seguro de vida",
  "Gympass/Wellhub",
  "Bonificação",
  "Comissão",
  "Day off",
  "Sem benefícios",
  "Outro",
];

function NewJobWizard() {
  const { session } = useSession();
  const { data: company } = useCompany(Boolean(session));
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);

  const [basics, setBasics] = useState({
    title: "",
    sector: "",
    manager: "",
    openings: "1",
    work_mode: "Presencial",
    city: "",
    state: "",
    contract_model: "CLT",
    salary_type: "fixo",
    salary_min: "",
    salary_max: "",
    benefits: "",
    workload: "",
    work_hours: "",
    target_hire_date: "",
  });
  const [context, setContext] = useState({
    objective: "",
    responsibilities: "",
    expected_results: "",
    routine: "",
    challenges: "",
    document: "",
  });
  const [competencies, setCompetencies] = useState<Competency[]>([
    { name: "", importance: "essencial" },
  ]);
  const [skills, setSkills] = useState<Skill[]>([
    { name: "", level: "intermediario", importance: "importante" },
  ]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [seeded, setSeeded] = useState(false);
  const [assessment, setAssessment] = useState<Assessment>({
    title: "Assessment",
    questions: [],
    estimated_minutes: 8,
    generated_by: "sistema",
  });
  const [assessmentSeeded, setAssessmentSeeded] = useState(false);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [formApproved, setFormApproved] = useState(false);
  const [formApprovedAt, setFormApprovedAt] = useState<string>("");
  const [stages, setStages] = useState<Stage[]>(
    SUGGESTED_STAGES.map((stage) => {
      const evaluated = ["assessment", "entrevista", "case", "entrevista_gestor", "etapa_final"].includes(
        stage.stage_key,
      );
      return {
        name: stage.name,
        stage_key: stage.stage_key as string,
        objective: stage.objective,
        owner: "",
        is_required: true,
        has_evaluation: evaluated,
        has_score: ["assessment", "case"].includes(stage.stage_key),
        needs_manual_approval: stage.stage_key !== "inscricao",
      };
    }),
  );
  const [caseConfig, setCaseConfig] = useState<CaseConfig>(emptyCaseConfig());
  const [caseLoading, setCaseLoading] = useState(false);

  const setBasic = (key: keyof typeof basics) => (event: { target: { value: string } }) =>
    setBasics((prev) => ({ ...prev, [key]: event.target.value }));
  const setContextField = (key: keyof typeof context) => (event: { target: { value: string } }) =>
    setContext((prev) => ({ ...prev, [key]: event.target.value }));

  const [workloadPreset, setWorkloadPreset] = useState("");
  const [workloadCustom, setWorkloadCustom] = useState("");
  const [workHoursPreset, setWorkHoursPreset] = useState("");
  const [workHoursCustom, setWorkHoursCustom] = useState("");
  const [benefitTags, setBenefitTags] = useState<string[]>([]);
  const [customBenefits, setCustomBenefits] = useState<string[]>([]);
  const [benefitOtherOpen, setBenefitOtherOpen] = useState(false);
  const [benefitOtherText, setBenefitOtherText] = useState("");

  useEffect(() => {
    setBasics((prev) => ({ ...prev, benefits: [...benefitTags, ...customBenefits].join(", ") }));
  }, [benefitTags, customBenefits]);

  function selectWorkload(value: string) {
    setWorkloadPreset(value);
    setBasics((prev) => ({ ...prev, workload: value === "Personalizado" ? workloadCustom : value }));
  }

  function selectWorkHours(value: string) {
    setWorkHoursPreset(value);
    setBasics((prev) => ({ ...prev, work_hours: value === "Personalizado" ? workHoursCustom : value }));
  }

  function toggleBenefit(label: string) {
    if (label === "Outro") {
      setBenefitOtherOpen((open) => !open);
      return;
    }
    if (label === "Sem benefícios") {
      setBenefitTags((prev) => (prev.includes(label) ? [] : [label]));
      setCustomBenefits([]);
      setBenefitOtherOpen(false);
      return;
    }
    setBenefitTags((prev) => {
      const withoutNone = prev.filter((tag) => tag !== "Sem benefícios");
      return withoutNone.includes(label)
        ? withoutNone.filter((tag) => tag !== label)
        : [...withoutNone, label];
    });
  }

  function addCustomBenefit() {
    const label = benefitOtherText.trim();
    if (!label) return;
    setCustomBenefits((prev) => (prev.includes(label) ? prev : [...prev, label]));
    setBenefitTags((prev) => prev.filter((tag) => tag !== "Sem benefícios"));
    setBenefitOtherText("");
  }

  const suggestionInput = {
    basics: {
      title: basics.title,
      sector: basics.sector,
      work_mode: basics.work_mode,
      city: basics.city,
      state: basics.state,
      contract_model: basics.contract_model,
      work_hours: basics.work_hours,
      workload: basics.workload,
    },
    context: {
      objective: context.objective,
      responsibilities: context.responsibilities,
      routine: context.routine,
      expected_results: context.expected_results,
      challenges: context.challenges,
    },
    competencies,
    skills,
  };

  function generateSuggestions() {
    const suggestedRequirements = suggestRequirements(suggestionInput);
    setRequirements(suggestedRequirements);
    setQuestions([...profileQuestions(), ...dedupeQuestions(suggestQuestions(suggestionInput, suggestedRequirements), profileQuestions())]);
    return suggestedRequirements;
  }

  // Sugestões com IA; se a IA falhar, as regras internas continuam valendo.
  async function generateWithAI() {
    const fallback = generateSuggestions();
    setFormApproved(false);
    setAiLoading(true);
    try {
      const result = await aiGenerateJobForm({ data: suggestionInput });
      if (result.requirements.length) setRequirements(fromAiRequirements(result.requirements));
      if (result.questions.length) setQuestions([...profileQuestions(), ...dedupeQuestions(fromAiQuestions(result.questions), profileQuestions())]);
      toast.success("Sugestões criadas com IA");
    } catch (error) {
      console.error(error);
      toast.error("A IA não respondeu agora. Deixei sugestões automáticas para você revisar.");
      if (!fallback.length) generateSuggestions();
    } finally {
      setAiLoading(false);
    }
  }

  const caseAiInput = () => ({
    basics: {
      title: basics.title,
      sector: basics.sector,
      work_mode: basics.work_mode,
      city: basics.city,
      state: basics.state,
      contract_model: basics.contract_model,
    },
    context: {
      objective: context.objective,
      responsibilities: context.responsibilities,
      routine: context.routine,
      expected_results: context.expected_results,
      challenges: context.challenges,
    },
    company: company?.name ?? "",
    competencies: competencies.map((item) => item.name),
    skills: skills.map((item) => item.name),
    requirements: requirements.map((item) => item.description),
    config: {
      evaluate_what: caseConfig.evaluate_what,
      modality: caseConfig.modality,
      tools: caseConfig.tools,
      tool_required: caseConfig.tool_required,
      deliverables: caseConfig.deliverables,
      delivery_description: caseConfig.delivery_description,
      prep_deadline: caseConfig.prep_deadline,
      needs_presentation: caseConfig.needs_presentation,
      presentation_format: caseConfig.presentation_format,
      presentation_minutes: caseConfig.presentation_minutes,
      questions_minutes: caseConfig.questions_minutes,
      criteria: caseConfig.criteria,
    },
  });

  async function generateCaseWithAI() {
    if (!basics.title.trim()) {
      toast.error("Informe o cargo da vaga antes de gerar o case.");
      return;
    }
    setCaseLoading(true);
    const reserva = fallbackCase({
      jobTitle: basics.title,
      companyName: company?.name ?? "a empresa",
      context,
      config: caseConfig,
      competencies: competencies.map((item) => item.name),
      skills: skills.map((item) => item.name),
    });
    try {
      const result = await aiGenerateTechnicalCase({ data: caseAiInput() });
      const sections = result.sections.filter((section) => section.title.trim() && section.content.trim());
      setCaseConfig((prev) => ({
        ...prev,
        title: result.title || reserva.title,
        sections: sections.length ? sections : reserva.sections,
        evaluator_questions: result.evaluator_questions.length
          ? result.evaluator_questions
          : reserva.evaluator_questions,
        status: "aguardando_aprovacao",
      }));
      toast.success("Case gerado com IA. Revise e aprove antes de enviar ao candidato.");
    } catch (error) {
      console.error(error);
      setCaseConfig((prev) => ({
        ...prev,
        title: prev.title || reserva.title,
        sections: reserva.sections,
        evaluator_questions: reserva.evaluator_questions,
        status: "aguardando_aprovacao",
      }));
      toast.error("A IA não respondeu agora. Montei uma primeira versão do case para você revisar.");
    } finally {
      setCaseLoading(false);
    }
  }

  // Assessment: gerado com IA e já aprovado; as regras internas servem de reserva.
  async function generateAssessment() {
    setAssessment(suggestAssessment(suggestionInput));
    setAssessmentLoading(true);
    try {
      const result = await aiGenerateAssessment({ data: suggestionInput });
      if (result.questions.length) {
        // Validação automática: completa qualquer questão que venha incompleta da IA.
        setAssessment(
          completeAssessment(
            {
              title: result.title || `Assessment — ${basics.title}`,
              questions: result.questions.map((item, i) =>
                shuffleQuestion({ ...item, answer_type: "selecao_unica", scoring: item.scoring ?? [], looking_for: item.looking_for ?? "" }, i + 3),
              ),
              approved: false,
              estimated_minutes: Math.max(3, Math.round(result.estimated_minutes || result.questions.length)),
              generated_by: "IA",
            },
            suggestionInput,
          ),
        );
      }
      toast.success("Assessment gerado. Revise e aprove para liberar aos candidatos.");
    } catch (error) {
      console.error(error);
      toast.error("A IA não respondeu agora. Deixei um assessment automático para você revisar.");
    } finally {
      setAssessmentLoading(false);
    }
  }

  async function generateContextWithAI() {
    if (!basics.title.trim()) {
      toast.error("Informe o nome da vaga primeiro");
      return;
    }
    setContextLoading(true);
    try {
      const result = await aiGenerateJobContext({
        data: {
          title: basics.title,
          sector: basics.sector,
          work_mode: basics.work_mode,
          city: basics.city,
          state: basics.state,
          contract_model: basics.contract_model,
          work_hours: basics.work_hours,
          workload: basics.workload,
          benefits: basics.benefits,
          company: company?.name ?? "",
          notes: context.document,
        },
      });
      setContext((prev) => ({ ...prev, ...result }));
      toast.success("Contexto escrito com IA. Revise e ajuste.");
    } catch (error) {
      console.error(error);
      toast.error("A IA não conseguiu escrever o contexto agora.");
    } finally {
      setContextLoading(false);
    }
  }

  // Ao chegar na etapa de requisitos, a tela já abre preenchida com sugestões.
  useEffect(() => {
    if (step !== 3 || seeded) return;
    setSeeded(true);
    void generateWithAI();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, seeded]);

  // Ao chegar no assessment, ele já vem gerado e aprovado.
  useEffect(() => {
    if (step !== 4 || assessmentSeeded) return;
    setAssessmentSeeded(true);
    void generateAssessment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, assessmentSeeded]);

  function approveForm() {
    setQuestions((prev) => prev.map((item) => ({ ...item, status: "aprovada" as const })));
    setFormApproved(true);
    setFormApprovedAt(new Date().toISOString());
    toast.success("Formulário aprovado. Agora você pode publicar a vaga.");
  }

  function moveStage(index: number, direction: -1 | 1) {
    const next = [...stages];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const current = next[index]!;
    next[index] = next[target]!;
    next[target] = current;
    setStages(next);
  }

  async function handleSubmit() {
    if (!company) return;
    if (!basics.title.trim()) {
      toast.error("Dê um nome para a vaga");
      setStep(0);
      return;
    }
    if (!formApproved) {
      toast.error("Revise e aprove o formulário antes de publicar a vaga");
      setStep(6);
      return;
    }
    setSaving(true);
    try {
      const { data: job, error } = await supabase
        .from("jobs")
        .insert({
          company_id: company.id,
          title: basics.title,
          sector: basics.sector || null,
          manager: basics.manager || null,
          openings: Number(basics.openings) || 1,
          work_mode: basics.work_mode,
          city: basics.city || null,
          state: basics.state || null,
          contract_model: basics.contract_model,
          salary_type: basics.salary_type,
          salary_min: basics.salary_min ? Number(basics.salary_min) : null,
          salary_max: basics.salary_max ? Number(basics.salary_max) : null,
          benefits: basics.benefits || null,
          workload: basics.workload || null,
          work_hours: basics.work_hours || null,
          target_hire_date: basics.target_hire_date || null,
          objective: context.objective || null,
          responsibilities: context.responsibilities || null,
          expected_results: context.expected_results || null,
          routine: context.routine || null,
          challenges: context.challenges || null,
          has_case: caseConfig.enabled,
          status: "aberta",
          form_approved_at: formApprovedAt || new Date().toISOString(),
          form_approved_by: session?.user.id ?? null,
          form_version: 1,
        })
        .select()
        .single();
      if (error) throw error;

      const companyId = company.id;
      const jobId = job.id;

      const stageRows = stages.map((stage, index) => ({
        company_id: companyId,
        job_id: jobId,
        name: stage.name,
        stage_key: stage.stage_key,
        objective: stage.objective || null,
        owner: stage.owner || null,
        is_required: stage.is_required,
        has_evaluation: stage.has_evaluation,
        has_score: stage.has_score,
        needs_manual_approval: stage.needs_manual_approval,
        position: index,
      }));

      const { data: savedStages, error: stageError } = await supabase
        .from("job_stages")
        .insert(stageRows)
        .select();
      if (stageError) throw stageError;

      const inserts: Promise<unknown>[] = [];

      const cleanCompetencies = competencies.filter((item) => item.name.trim());
      if (cleanCompetencies.length) {
        inserts.push(
          Promise.resolve(
            supabase.from("job_competencies").insert(
              cleanCompetencies.map((item, index) => ({
                company_id: companyId,
                job_id: jobId,
                name: item.name,
                importance: item.importance,
                position: index,
              })),
            ),
          ),
        );
      }

      const cleanSkills = skills.filter((item) => item.name.trim());
      if (cleanSkills.length) {
        inserts.push(
          Promise.resolve(
            supabase.from("job_skills").insert(
              cleanSkills.map((item, index) => ({
                company_id: companyId,
                job_id: jobId,
                name: item.name,
                level: item.level,
                importance: item.importance,
                position: index,
              })),
            ),
          ),
        );
      }

      const cleanRequirements = requirements
        .map((item) => ({ item, label: requirementLabel(item).trim() }))
        .filter((row) => row.label);
      if (cleanRequirements.length) {
        inserts.push(
          Promise.resolve(
            supabase.from("job_requirements").insert(
              cleanRequirements.map(({ item, label }, index) => ({
                company_id: companyId,
                job_id: jobId,
                description: label,
                category: item.category,
                detail: item.detail,
                kind: item.kind,
                is_knockout: item.kind === "obrigatorio" ? item.is_knockout : false,
                position: index,
              })),
            ),
          ),
        );
      }

      const cleanQuestions = questions.filter((item) => item.question.trim());
      if (cleanQuestions.length) {
        inserts.push(
          Promise.resolve(
            supabase.from("job_questions").insert(
              cleanQuestions.map((item, index) => ({
                company_id: companyId,
                job_id: jobId,
                question: item.question,
                kind: item.kind,
                answer_type: item.answer_type,
                options: item.answer_type === "aberta" ? [] : item.options.filter((option) => option.trim()),
                disqualifying_answer: item.kind === "eliminatoria" ? item.disqualifying_answer : null,
                tag: item.tag ? item.tag : null,
                status: item.status,
                is_required: item.is_required,
                origin_type: item.origin_type || null,
                origin_label: item.origin_label || null,
                related_competency: item.related_competency || null,
                related_skill: item.related_skill || null,
                section: item.section,
                field_key: item.field_key || null,
                position: index,
              })),
            ),
          ),
        );
      }

      if (context.document.trim()) {
        inserts.push(
          Promise.resolve(
            supabase.from("job_documents").insert({
              company_id: companyId,
              job_id: jobId,
              name: "Contexto da vaga",
              kind: "contexto",
              content_text: context.document,
            }),
          ),
        );
      }

      if (caseConfig.enabled) {
        const caseStage = (savedStages ?? []).find((stage) => stage.name === caseConfig.stageName);
        inserts.push(
          Promise.resolve(
            supabase.from("job_cases").insert({
              company_id: companyId,
              job_id: jobId,
              stage_id: caseStage?.id ?? null,
              title: caseConfig.title || `Case — ${basics.title}`,
              objective: caseConfig.objective || null,
              evaluate_what: caseConfig.evaluate_what.join(", ") || null,
              deadline_days: caseConfig.deadline_days ? Number(caseConfig.deadline_days) : null,
              delivery_format: caseConfig.deliverables.join(", ") || null,
              criteria: caseConfig.criteria.join(", ") || null,
              content: caseConfig.content || null,
              modality: caseConfig.modality,
              tools: caseConfig.tools,
              tool_required: caseConfig.tool_required,
              deliverables: caseConfig.deliverables,
              delivery_description: caseConfig.delivery_description || null,
              prep_deadline: caseConfig.prep_deadline || null,
              needs_presentation: caseConfig.needs_presentation,
              presentation_format: caseConfig.presentation_format || null,
              presentation_minutes: caseConfig.presentation_minutes,
              questions_minutes: caseConfig.questions_minutes,
              scheduling_mode: caseConfig.scheduling_mode || null,
              agenda_link: caseConfig.agenda_link || null,
              meet_link: caseConfig.meet_link || null,
              sections: caseConfig.sections,
              evaluator_questions: caseConfig.evaluator_questions,
              status: caseConfig.sections.length ? "aguardando_aprovacao" : "nao_gerado",
              generated_by: caseConfig.sections.length ? "IA" : "manual",
            }),
          ),
        );
      }

      // Validação automática antes de salvar: completa questões incompletas.
      const cleanAssessment = completeAssessment(assessment, suggestionInput).questions;
      if (cleanAssessment.length) {
        inserts.push(
          Promise.resolve(
            supabase.from("assessments").insert({
              company_id: companyId,
              job_id: jobId,
              title: assessment.title || `Assessment — ${basics.title}`,
              generated_by: assessment.generated_by,
              payload: {
                approved: assessment.approved ?? false,
                estimated_minutes: assessment.estimated_minutes,
                questions: cleanAssessment,
              },
            }),
          ),
        );
      }

      await Promise.all(inserts);
      toast.success("Vaga criada. Bom processo!");
      navigate({ to: "/vagas/$jobId", params: { jobId } });
    } catch (submitError) {
      console.error(submitError);
      toast.error("Não foi possível criar a vaga agora");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow={`Etapa ${step + 1} de ${STEPS.length}`}
        title={STEPS[step]!}
        aside={
          <div className="flex items-center gap-1.5">
            {STEPS.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => setStep(index)}
                className={`h-1.5 rounded-full transition-all ${
                  index === step ? "w-8 bg-brand" : index < step ? "w-4 bg-teal" : "w-4 bg-line"
                }`}
                aria-label={label}
              />
            ))}
          </div>
        }
      />

      <div className="pb-6">
        {step === 0 ? (
          <Panel>
            <SectionTitle title="Informações básicas" hint="o essencial da vaga" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Nome da vaga" className="sm:col-span-2">
                <TextInput value={basics.title} onChange={setBasic("title")} placeholder="Ex.: Assistente Administrativo" />
              </Field>
              <Field label="Setor">
                <SelectInput value={basics.sector} onChange={setBasic("sector")}>
                  <option value="">Selecione</option>
                  {SECTORS.map((sector) => (
                    <option key={sector} value={sector}>
                      {sector}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Gestor responsável">
                <TextInput value={basics.manager} onChange={setBasic("manager")} />
              </Field>
              <Field label="Quantidade de vagas">
                <TextInput type="number" min={1} value={basics.openings} onChange={setBasic("openings")} />
              </Field>
              <Field label="Modelo de trabalho">
                <SelectInput value={basics.work_mode} onChange={setBasic("work_mode")}>
                  {WORK_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Cidade">
                <TextInput value={basics.city} onChange={setBasic("city")} />
              </Field>
              <Field label="Estado">
                <TextInput maxLength={2} value={basics.state} onChange={setBasic("state")} />
              </Field>
              <Field label="Contratação">
                <SelectInput value={basics.contract_model} onChange={setBasic("contract_model")}>
                  {CONTRACT_MODELS.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Salário">
                <SelectInput value={basics.salary_type} onChange={setBasic("salary_type")}>
                  <option value="fixo">Valor fixo</option>
                  <option value="faixa">Faixa salarial</option>
                  <option value="combinar">A combinar</option>
                </SelectInput>
              </Field>
              {basics.salary_type !== "combinar" ? (
                <Field label={basics.salary_type === "faixa" ? "De (R$)" : "Valor (R$)"}>
                  <TextInput type="number" value={basics.salary_min} onChange={setBasic("salary_min")} />
                </Field>
              ) : null}
              {basics.salary_type === "faixa" ? (
                <Field label="Até (R$)">
                  <TextInput type="number" value={basics.salary_max} onChange={setBasic("salary_max")} />
                </Field>
              ) : null}
              <Field label="Carga horária">
                <SelectInput value={workloadPreset} onChange={(event) => selectWorkload(event.target.value)}>
                  <option value="" disabled>
                    Selecione
                  </option>
                  {WORKLOAD_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </SelectInput>
                {workloadPreset === "Personalizado" ? (
                  <TextInput
                    className="mt-2"
                    value={workloadCustom}
                    placeholder="Ex.: 6h por dia, de segunda a sexta"
                    onChange={(event) => {
                      setWorkloadCustom(event.target.value);
                      setBasics((prev) => ({ ...prev, workload: event.target.value }));
                    }}
                  />
                ) : null}
              </Field>
              <Field label="Horário">
                <SelectInput value={workHoursPreset} onChange={(event) => selectWorkHours(event.target.value)}>
                  <option value="" disabled>
                    Selecione
                  </option>
                  {WORK_HOURS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </SelectInput>
                {workHoursPreset === "Personalizado" ? (
                  <TextInput
                    className="mt-2"
                    value={workHoursCustom}
                    placeholder="Ex.: 13h às 19h, com 1h de almoço"
                    onChange={(event) => {
                      setWorkHoursCustom(event.target.value);
                      setBasics((prev) => ({ ...prev, work_hours: event.target.value }));
                    }}
                  />
                ) : null}
              </Field>
              <Field label="Benefícios" className="sm:col-span-2">
                <div className="flex flex-wrap gap-2">
                  {BENEFIT_OPTIONS.map((option) => {
                    const active =
                      option === "Outro" ? benefitOtherOpen : benefitTags.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggleBenefit(option)}
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
                  {customBenefits.map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setCustomBenefits((prev) => prev.filter((tag) => tag !== label))}
                      title="Remover"
                      className="flex items-center gap-1.5 rounded-full border border-brand bg-brand px-3 py-1.5 text-[13px] font-medium text-brand-ink"
                    >
                      {label}
                      <X className="size-3" />
                    </button>
                  ))}
                </div>
                {benefitOtherOpen ? (
                  <div className="mt-2 flex items-center gap-2">
                    <TextInput
                      value={benefitOtherText}
                      placeholder="Digite o benefício e adicione"
                      onChange={(event) => setBenefitOtherText(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addCustomBenefit();
                        }
                      }}
                    />
                    <GhostButton type="button" onClick={addCustomBenefit}>
                      <Plus className="size-3.5" />
                      Adicionar
                    </GhostButton>
                  </div>
                ) : null}
              </Field>
              <Field label="Data desejada de contratação">
                <TextInput type="date" value={basics.target_hire_date} onChange={setBasic("target_hire_date")} />
              </Field>
            </div>
          </Panel>
        ) : null}

        {step === 1 ? (
          <Panel>
            <SectionTitle title="Contexto da vaga" hint="quanto mais contexto, melhor a seleção" />
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <GhostButton onClick={generateContextWithAI} disabled={contextLoading}>
                <Sparkles className={`size-3.5 ${contextLoading ? "animate-pulse" : ""}`} />
                {contextLoading ? "Escrevendo com IA..." : "Escrever com IA"}
              </GhostButton>
              <span className="text-[12px] text-ink-soft">
                A IA escreve uma primeira versão a partir da vaga. Você revisa e ajusta.
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Objetivo da vaga"
                description="Explique por que essa vaga existe e qual é a principal missão dessa pessoa na empresa."
                className="sm:col-span-2"
              >
                <TextArea value={context.objective} onChange={setContextField("objective")} />
              </Field>
              <Field
                label="Principais responsabilidades"
                description="Liste as principais atividades e entregas que serão responsabilidade dessa pessoa."
              >
                <TextArea value={context.responsibilities} onChange={setContextField("responsibilities")} />
              </Field>
              <Field
                label="Resultados esperados"
                description="Descreva o que essa pessoa precisa alcançar ou entregar para ter sucesso na função."
              >
                <TextArea value={context.expected_results} onChange={setContextField("expected_results")} />
              </Field>
              <Field
                label="Rotina do dia a dia"
                description="Conte como será a rotina: atividades recorrentes, contatos, reuniões, ferramentas e acompanhamentos."
              >
                <TextArea value={context.routine} onChange={setContextField("routine")} />
              </Field>
              <Field
                label="Desafios da posição"
                description="Descreva as principais situações, dificuldades e desafios que essa pessoa encontrará no cargo."
              >
                <TextArea value={context.challenges} onChange={setContextField("challenges")} />
              </Field>
              <Field
                label="Contexto adicional da vaga"
                description="Adicione informações que ajudem a entender melhor a função ou cole conteúdos de manuais, processos e documentos relacionados à vaga."
                hint="Cole o texto de um PDF, DOCX ou TXT. Fica guardado como contexto da vaga."
                className="sm:col-span-2"
              >
                <TextArea rows={5} value={context.document} onChange={setContextField("document")} />
              </Field>
            </div>
          </Panel>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <SectionTitle title="Competências comportamentais" hint="como a pessoa precisa ser" />
              <div className="space-y-2">
                {competencies.map((item, index) => (
                  <div key={index} className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
                    <TextInput
                      value={item.name}
                      placeholder="Ex.: Organização"
                      onChange={(event) =>
                        setCompetencies((prev) =>
                          prev.map((row, i) => (i === index ? { ...row, name: event.target.value } : row)),
                        )
                      }
                    />
                    <SelectInput
                      value={item.importance}
                      onChange={(event) =>
                        setCompetencies((prev) =>
                          prev.map((row, i) => (i === index ? { ...row, importance: event.target.value } : row)),
                        )
                      }
                    >
                      {IMPORTANCE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </SelectInput>
                    <RemoveButton onClick={() => setCompetencies((prev) => prev.filter((_, i) => i !== index))} />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {COMPETENCY_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() =>
                      setCompetencies((prev) => [...prev, { name: suggestion, importance: "alta" }])
                    }
                    className="rounded-full bg-paper/70 px-2.5 py-1 text-[11px] text-ink-soft transition-colors hover:text-ink"
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
              <GhostButton
                className="mt-3"
                onClick={() => setCompetencies((prev) => [...prev, { name: "", importance: "alta" }])}
              >
                <Plus className="size-3.5" /> Adicionar competência
              </GhostButton>
            </Panel>

            <Panel>
              <SectionTitle title="Habilidades técnicas" hint="o que precisa saber fazer" />
              <div className="space-y-2">
                {skills.map((item, index) => (
                  <div key={index} className="grid gap-2 sm:grid-cols-[1fr_130px_130px_auto]">
                    <TextInput
                      value={item.name}
                      placeholder="Ex.: Excel"
                      onChange={(event) =>
                        setSkills((prev) =>
                          prev.map((row, i) => (i === index ? { ...row, name: event.target.value } : row)),
                        )
                      }
                    />
                    <SelectInput
                      value={item.level}
                      onChange={(event) =>
                        setSkills((prev) =>
                          prev.map((row, i) => (i === index ? { ...row, level: event.target.value } : row)),
                        )
                      }
                    >
                      {SKILL_LEVELS.map((level) => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </SelectInput>
                    <SelectInput
                      value={item.importance}
                      onChange={(event) =>
                        setSkills((prev) =>
                          prev.map((row, i) => (i === index ? { ...row, importance: event.target.value } : row)),
                        )
                      }
                    >
                      {SKILL_IMPORTANCE.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </SelectInput>
                    <RemoveButton onClick={() => setSkills((prev) => prev.filter((_, i) => i !== index))} />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {SKILL_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() =>
                      setSkills((prev) => [
                        ...prev,
                        { name: suggestion, level: "intermediario", importance: "importante" },
                      ])
                    }
                    className="rounded-full bg-paper/70 px-2.5 py-1 text-[11px] text-ink-soft transition-colors hover:text-ink"
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
              <GhostButton
                className="mt-3"
                onClick={() =>
                  setSkills((prev) => [...prev, { name: "", level: "intermediario", importance: "importante" }])
                }
              >
                <Plus className="size-3.5" /> Adicionar habilidade
              </GhostButton>
            </Panel>
          </div>
        ) : null}

        {step === 3 ? (
          <RequirementsQuestionsStep
            requirements={requirements}
            setRequirements={setRequirements}
            questions={questions}
            setQuestions={setQuestions}
            onRegenerate={() => void generateWithAI()}
            aiLoading={aiLoading}
            skillNames={skills.map((skill) => skill.name).filter((name) => name.trim())}
          />
        ) : null}

        {step === 4 ? (
          <AssessmentStep
            assessment={assessment}
            setAssessment={setAssessment}
            onRegenerate={() => void generateAssessment()}
            input={suggestionInput}
            loading={assessmentLoading}
          />
        ) : null}

        {step === 6 ? (
          <FormReviewStep
            questions={questions}
            setQuestions={setQuestions}
            assessment={assessment}
            approved={formApproved}
            approvedBy={session?.user.email ?? ""}
            approvedAt={formApprovedAt ? formatDateTime(formApprovedAt) : ""}
            version={1}
            onApprove={approveForm}
            onBack={() => setStep(3)}
          />
        ) : null}

        {step === 5 ? (
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <Panel>
              <SectionTitle title="Etapas do processo" hint="arraste a ordem que faz sentido" />
              <div className="space-y-2">
                {stages.map((stage, index) => (
                  <div key={`${stage.name}-${index}`} className="rounded-[12px] bg-paper/50 p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col">
                        <button type="button" className="text-ink-soft" onClick={() => moveStage(index, -1)}>
                          ▲
                        </button>
                        <button type="button" className="text-ink-soft" onClick={() => moveStage(index, 1)}>
                          ▼
                        </button>
                      </div>
                      <GripVertical className="size-4 text-ink-soft/60" />
                      <TextInput
                        value={stage.name}
                        onChange={(event) =>
                          setStages((prev) =>
                            prev.map((row, i) => (i === index ? { ...row, name: event.target.value } : row)),
                          )
                        }
                      />
                      <RemoveButton onClick={() => setStages((prev) => prev.filter((_, i) => i !== index))} />
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <TextInput
                        value={stage.objective}
                        placeholder="Objetivo da etapa"
                        onChange={(event) =>
                          setStages((prev) =>
                            prev.map((row, i) => (i === index ? { ...row, objective: event.target.value } : row)),
                          )
                        }
                      />
                      <TextInput
                        value={stage.owner}
                        placeholder="Responsável"
                        onChange={(event) =>
                          setStages((prev) =>
                            prev.map((row, i) => (i === index ? { ...row, owner: event.target.value } : row)),
                          )
                        }
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-soft">
                      {(
                        [
                          ["is_required", "Obrigatória"],
                          ["has_evaluation", "Tem avaliação"],
                          ["has_score", "Tem pontuação"],
                          ["needs_manual_approval", "Aprovação manual"],
                        ] as const
                      ).map(([key, label]) => (
                        <label key={key} className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={stage[key]}
                            onChange={(event) =>
                              setStages((prev) =>
                                prev.map((row, i) => (i === index ? { ...row, [key]: event.target.checked } : row)),
                              )
                            }
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <GhostButton
                className="mt-3"
                onClick={() =>
                  setStages((prev) => [
                    ...prev,
                    {
                      name: "Nova etapa",
                      stage_key: null,
                      objective: "",
                      owner: "",
                      is_required: true,
                      has_evaluation: false,
                      has_score: false,
                      needs_manual_approval: true,
                    },
                  ])
                }
              >
                <Plus className="size-3.5" /> Adicionar etapa
              </GhostButton>
            </Panel>

            <CaseStep
              config={caseConfig}
              onChange={setCaseConfig}
              stageNames={stages.map((stage) => stage.name)}
              extraEvaluateOptions={[
                ...competencies.map((item) => item.name),
                ...skills.map((item) => item.name),
              ]}
              aiLoading={caseLoading}
              onGenerate={() => void generateCaseWithAI()}
            />
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pb-12">
        <GhostButton onClick={() => setStep((prev) => Math.max(0, prev - 1))} disabled={step === 0}>
          <ArrowLeft className="size-3.5" /> Voltar
        </GhostButton>
        {step < STEPS.length - 1 ? (
          <BrandButton onClick={() => setStep((prev) => prev + 1)}>
            Continuar <ArrowRight className="size-3.5" />
          </BrandButton>
        ) : (
          <BrandButton onClick={handleSubmit} disabled={saving || !formApproved}>
            <Check className="size-3.5" /> Criar vaga e abrir processo
          </BrandButton>
        )}
      </div>
    </>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid size-9 place-items-center rounded-[10px] bg-paper text-ink-soft ring-1 ring-white/10 transition-colors hover:text-rose"
      aria-label="Remover"
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}
