import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type SetStateAction } from "react";
import { toast } from "sonner";
import { ArrowLeft, ChevronLeft, ChevronRight, Copy, ExternalLink, Link2, Linkedin, MessageCircle, Share2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany, useSession } from "@/hooks/use-session";
import { RequireAuth } from "@/components/app-shell";
import {
  BrandButton,
  Chip,
  EmptyState,
  Field,
  GhostButton,
  Panel,
  SectionTitle,
  TextArea,
  TextInput,
} from "@/components/ui-bits";
import {
  CANDIDATE_STATUS_LABEL,
  IMPORTANCE_OPTIONS,
  SKILL_IMPORTANCE,
  SKILL_LEVELS,
  formatDate,
  jobShareText,
  labelFor,
  publicJobUrl,
  salaryLabel,
  stageAccent,
} from "@/lib/hiring";
import { JobCaseTab } from "@/components/job-case-tab";
import { AssessmentStep } from "@/components/assessment-step";
import { aiGenerateAssessment } from "@/lib/ai.functions";
import { completeAssessment, isAssessmentReady, suggestAssessment, type Assessment, type SuggestionInput } from "@/lib/suggestions";
import { shuffleQuestion } from "@/lib/assessment-scoring";

export const Route = createFileRoute("/vagas/$jobId/")({
  head: () => ({
    meta: [
      { title: "Processo da vaga — Vetor" },
      {
        name: "description",
        content:
          "Acompanhe o funil da vaga por etapa, veja quem precisa de atenção e execute a próxima ação do processo seletivo.",
      },
      { property: "og:title", content: "Processo da vaga — Vetor" },
      {
        property: "og:description",
        content: "Funil de candidatos por etapa, detalhes da vaga, roteiro de entrevista e divulgação.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <JobView />
    </RequireAuth>
  ),
});

const TABS = ["Funil", "Detalhes", "Assessment", "Roteiro", "Case", "Divulgar"] as const;

function ExistingAssessment({ data, companyId, jobId }: {
  data: {
    job: { title: string; sector: string | null; work_mode: string | null; city: string | null; state: string | null; contract_model: string | null; work_hours: string | null; workload: string | null; objective: string | null; responsibilities: string | null; routine: string | null; expected_results: string | null; challenges: string | null };
    competencies: { name: string; importance: string }[];
    skills: { name: string; importance: string; level: string }[];
    assessment: { payload: unknown; created_at: string } | null;
  };
  companyId: string;
  jobId: string;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const updateDraft = (value: SetStateAction<Assessment>) => setDraft((previous) =>
    typeof value === "function" ? value(previous!) : value,
  );
  const input: SuggestionInput = {
    basics: {
      title: data.job.title,
      sector: data.job.sector ?? "",
      work_mode: data.job.work_mode ?? "",
      city: data.job.city ?? "",
      state: data.job.state ?? "",
      contract_model: data.job.contract_model ?? "",
      work_hours: data.job.work_hours ?? "",
      workload: data.job.workload ?? "",
    },
    context: {
      objective: data.job.objective ?? "",
      responsibilities: data.job.responsibilities ?? "",
      routine: data.job.routine ?? "",
      expected_results: data.job.expected_results ?? "",
      challenges: data.job.challenges ?? "",
    },
    competencies: data.competencies.map(({ name, importance }) => ({ name, importance })),
    skills: data.skills.map(({ name, importance, level }) => ({ name, importance, level })),
  };

  async function generate() {
    if (draft && !window.confirm("Descartar as alterações desta versão e gerar novamente?")) return;
    setLoading(true);
    try {
      const result = await aiGenerateAssessment({ data: input });
      if (!result.questions.length) throw new Error("A IA não retornou situações.");
      if (result.questions.some((question) =>
        question.situation.split(/[.!?]+/).filter((sentence) => sentence.trim().length > 12).length < 2 ||
        question.options.length !== 4 || question.options.some((option) => !option.trim())
      )) throw new Error("A IA retornou cenários curtos ou alternativas incompletas.");
      const candidate = completeAssessment({
        title: result.title || `Assessment — ${data.job.title}`,
        questions: result.questions.map((item, i) => shuffleQuestion({ ...item, answer_type: "selecao_unica", scoring: item.scoring ?? [], looking_for: item.looking_for ?? "" }, i + 3)),
        estimated_minutes: Math.max(3, Math.round(result.estimated_minutes || result.questions.length)),
        generated_by: "IA",
        approved: false,
      }, input);
      setDraft(candidate);
      toast.success("Nova versão gerada. Revise e aprove para publicar.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar com IA. A versão atual permanece publicada.");
    } finally { setLoading(false); }
  }

  async function publish() {
    if (!draft?.approved || !isAssessmentReady(draft)) return;
    setSaving(true);
    try {
      const clean = completeAssessment(draft, input);
      const { error } = await supabase.from("assessments").insert({
        company_id: companyId,
        job_id: jobId,
        title: clean.title,
        generated_by: clean.generated_by,
        payload: { approved: true, estimated_minutes: clean.estimated_minutes, questions: clean.questions },
      });
      if (error) throw error;
      setDraft(null);
      await queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      await queryClient.invalidateQueries({ queryKey: ["public-job", jobId] });
      toast.success("Nova versão publicada. Respostas anteriores foram preservadas.");
    } catch (error) { console.error(error); toast.error("Não foi possível publicar o assessment."); }
    finally { setSaving(false); }
  }

  return <div className="space-y-4">
    <Panel>
      <SectionTitle title="Assessment da vaga" hint="versões anteriores e respostas são preservadas" />
      <p className="text-[13px] text-ink-soft">{data.assessment ? `Versão atual publicada em ${formatDate(data.assessment.created_at)}.` : "Esta vaga ainda não tem assessment."} Uma nova geração só substitui a versão pública depois da sua revisão e aprovação.</p>
      {!draft ? <BrandButton className="mt-4" disabled={loading} onClick={() => void generate()}>{loading ? "Gerando com IA…" : "Gerar nova versão com IA"}</BrandButton> : null}
    </Panel>
    {draft ? <>
      <AssessmentStep assessment={draft} setAssessment={updateDraft} input={input} onRegenerate={() => void generate()} loading={loading} />
      <div className="flex flex-wrap gap-2">
        <BrandButton disabled={!draft.approved || !isAssessmentReady(draft) || saving || loading} onClick={() => void publish()}>{saving ? "Publicando…" : "Publicar versão aprovada"}</BrandButton>
        <GhostButton disabled={saving} onClick={() => setDraft(null)}>Descartar rascunho</GhostButton>
      </div>
    </> : null}
  </div>;
}

function JobView() {
  const { jobId } = useParams({ from: "/vagas/$jobId/" });
  const { session } = useSession();
  const { data: company } = useCompany(Boolean(session));
  const companyId = company?.id;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Funil");
  const [editing, setEditing] = useState(false);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["job", jobId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const [job, stages, candidates, competencies, skills, requirements, questions, cases, scripts, assessment] =
        await Promise.all([
          supabase.from("jobs").select("*").eq("id", jobId).single(),
          supabase.from("job_stages").select("*").eq("job_id", jobId).order("position"),
          supabase.from("candidates").select("*").eq("job_id", jobId).order("applied_at", { ascending: false }),
          supabase.from("job_competencies").select("*").eq("job_id", jobId).order("position"),
          supabase.from("job_skills").select("*").eq("job_id", jobId).order("position"),
          supabase.from("job_requirements").select("*").eq("job_id", jobId).order("position"),
          supabase.from("job_questions").select("*").eq("job_id", jobId).order("position"),
          supabase.from("job_cases").select("*").eq("job_id", jobId),
          supabase
            .from("interview_scripts")
            .select("*, interview_script_questions(*)")
            .eq("job_id", jobId)
            .is("candidate_id", null),
          supabase.from("assessments").select("id,payload,created_at").eq("job_id", jobId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        ]);
      if (job.error) throw job.error;
      return {
        job: job.data,
        stages: stages.data ?? [],
        candidates: candidates.data ?? [],
        competencies: competencies.data ?? [],
        skills: skills.data ?? [],
        requirements: requirements.data ?? [],
        questions: questions.data ?? [],
        jobCase: (cases.data ?? [])[0] ?? null,
        scripts: scripts.data ?? [],
        assessment: assessment.data ?? null,
      };
    },
  });

  const closeJob = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("jobs")
        .update({ status: data?.job.status === "aberta" ? "encerrada" : "aberta" })
        .eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      toast.success("Status da vaga atualizado");
    },
  });

  async function moveCandidate(candidateId: string, targetId: string) {
    const candidate = data?.candidates.find((c) => c.id === candidateId);
    const target = funnelStagesOf().find((s) => s.id === targetId);
    if (!candidate || !target || !companyId) return;
    const toRejected = target.stage_key === "nao_avancou";
    const wasRejected = ["nao_avancou", "nao_atende_requisito"].includes(candidate.status);
    if (!toRejected && !wasRejected && candidate.stage_id === target.id) return;
    if (toRejected && wasRejected) return;
    const update = toRejected ? { status: "nao_avancou" } : { stage_id: target.id, status: "ativo" };
    queryClient.setQueryData(["job", jobId], (old: typeof data) =>
      old ? { ...old, candidates: old.candidates.map((c) => (c.id === candidateId ? { ...c, ...update } : c)) } : old,
    );
    const { error } = await supabase.from("candidates").update(update).eq("id", candidateId);
    if (error) {
      toast.error("Não foi possível mover o candidato.");
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      return;
    }
    await supabase.from("candidate_events").insert({
      company_id: companyId,
      candidate_id: candidateId,
      type: "etapa",
      title: toRejected ? "Movido para Não avançou" : `Movido para ${target.name}`,
      detail: "Movimentação pelo funil",
    });
    toast.success(`${candidate.name} → ${target.name}`);
  }

  function funnelStagesOf() {
    return [
      ...(data?.stages ?? []),
      { id: "__nao_avancou", name: "Não avançou", stage_key: "nao_avancou", position: 999 } as NonNullable<typeof data>["stages"][number],
    ];
  }

  if (isLoading || !data) {
    return <p className="eyebrow py-10">Carregando processo…</p>;
  }

  const { job, stages, candidates } = data;
  const funnelStages = [
    ...stages,
    {
      id: "__nao_avancou",
      name: "Não avançou",
      stage_key: "nao_avancou",
      position: 999,
    } as (typeof stages)[number],
  ];

  return (
    <>
      <div className="flex items-center gap-2 py-3">
        <Link to="/vagas" className="inline-flex items-center gap-1.5 text-[12px] text-ink-soft hover:text-ink">
          <ArrowLeft className="size-3.5" /> Minhas vagas
        </Link>
      </div>

      <section className="flex flex-wrap items-start justify-between gap-4 rounded-[18px] surface p-5">
        <div>
          <p className="eyebrow">
            {[job.sector, job.work_mode, [job.city, job.state].filter(Boolean).join("/")]
              .filter(Boolean)
              .join(" • ")}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold leading-none tracking-tight">{job.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Chip tone={job.status === "aberta" ? "brand" : "neutral"}>
              {job.status === "aberta" ? "Vaga aberta" : "Vaga encerrada"}
            </Chip>
            <span className="text-[13px] text-ink-soft">{salaryLabel(job)}</span>
            <span className="text-[13px] text-ink-soft">· {job.contract_model}</span>
            <span className="text-[13px] text-ink-soft">
              · {candidates.length} {candidates.length === 1 ? "candidato" : "candidatos"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <GhostButton onClick={() => setEditing((prev) => !prev)}>Editar vaga</GhostButton>
          <GhostButton onClick={() => window.open(`/vaga/${job.id}`, "_blank")}><ExternalLink className="size-3.5" /> Visualizar como candidato</GhostButton>
          <GhostButton
            onClick={() => {
              navigator.clipboard.writeText(publicJobUrl(job.id));
              toast.success("Link de inscrição copiado");
            }}
          >
            <Link2 className="size-3.5" /> Link de inscrição
          </GhostButton>
          <BrandButton onClick={() => setTab("Divulgar")}>
            <Share2 className="size-3.5" /> Divulgar vaga
          </BrandButton>
          <GhostButton onClick={() => closeJob.mutate()}>
            <XCircle className="size-3.5" />
            {job.status === "aberta" ? "Encerrar vaga" : "Reabrir vaga"}
          </GhostButton>
        </div>
      </section>

      {editing ? <EditJobPanel job={job} onDone={() => setEditing(false)} /> : null}

      <div className="mt-6 flex gap-1 overflow-x-auto rounded-full surface p-1">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] transition-colors ${
              tab === item ? "bg-brand text-brand-ink" : "text-ink-soft hover:text-ink"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-5 pb-12">
        {tab === "Funil" ? (
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
            {funnelStages.map((stage, stageIndex) => {
              const stageCandidates =
                stage.stage_key === "nao_avancou"
                  ? candidates.filter((candidate) =>
                      ["nao_avancou", "nao_atende_requisito"].includes(candidate.status),
                    )
                  : candidates.filter(
                      (candidate) =>
                        candidate.stage_id === stage.id &&
                        !["nao_avancou", "nao_atende_requisito"].includes(candidate.status),
                    );
              const accent = stageAccent(stage.stage_key);

              return (
                <div key={stage.id} className="w-[250px] shrink-0">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <p className={`text-[12px] font-medium uppercase tracking-wide ${accent.text}`}>
                      {stage.name}
                    </p>
                    <span className="font-mono text-[11px] text-ink-soft">{stageCandidates.length}</span>
                  </div>
                  <div
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragOver(stage.id);
                    }}
                    onDragLeave={() => setDragOver((v) => (v === stage.id ? null : v))}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDragOver(null);
                      const id = event.dataTransfer.getData("text/candidate");
                      if (id) void moveCandidate(id, stage.id);
                    }}
                    className={`min-h-[80px] space-y-2 rounded-[14px] p-2 transition-colors ${dragOver === stage.id ? "bg-brand/15 ring-1 ring-brand/60" : "bg-panel/50"}`}
                  >
                    {stageCandidates.length === 0 ? (
                      <p className="px-2 py-4 text-center text-[11px] text-ink-soft">Ninguém aqui</p>
                    ) : (
                      stageCandidates.map((candidate) => (
                        <div
                          key={candidate.id}
                          role="button"
                          tabIndex={0}
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.setData("text/candidate", candidate.id);
                            event.dataTransfer.effectAllowed = "move";
                          }}
                          onClick={() =>
                            navigate({
                              to: "/vagas/$jobId/candidatos/$candidateId",
                              params: { jobId, candidateId: candidate.id },
                            })
                          }
                          className="w-full cursor-grab rounded-[12px] bg-panel p-3 text-left ring-1 ring-white/10 transition-transform hover:-translate-y-0.5 active:cursor-grabbing"
                        >
                          <p className="text-[13px] font-medium">{candidate.name}</p>
                          <p className="mt-0.5 text-[11px] text-ink-soft">
                            {[candidate.city, candidate.state].filter(Boolean).join("/") || "Local não informado"}
                          </p>
                          {candidate.tags?.length ? (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {candidate.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full bg-paper/70 px-2 py-0.5 text-[10px] text-ink-soft"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          {candidate.status !== "ativo" ? (
                            <p className="mt-2 text-[10px] text-rose">
                              {CANDIDATE_STATUS_LABEL[candidate.status]}
                            </p>
                          ) : null}
                          <div className="mt-2 flex items-center justify-between">
                            <button
                              type="button"
                              aria-label="Mover para a etapa anterior"
                              disabled={stageIndex === 0}
                              onClick={(event) => {
                                event.stopPropagation();
                                void moveCandidate(candidate.id, funnelStages[stageIndex - 1]!.id);
                              }}
                              className="rounded-full p-1 text-ink-soft ring-1 ring-white/10 hover:text-brand disabled:opacity-30"
                            >
                              <ChevronLeft className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label="Mover para a próxima etapa"
                              disabled={stageIndex >= funnelStages.length - 2}
                              onClick={(event) => {
                                event.stopPropagation();
                                void moveCandidate(candidate.id, funnelStages[stageIndex + 1]!.id);
                              }}
                              className="rounded-full p-1 text-ink-soft ring-1 ring-white/10 hover:text-brand disabled:opacity-30"
                            >
                              <ChevronRight className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {tab === "Assessment" && companyId ? <ExistingAssessment data={data} companyId={companyId} jobId={jobId} /> : null}

        {tab === "Detalhes" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel className="lg:col-span-2"><SectionTitle title="Orientações para entrevistas" hint="Só aparecem quando o candidato chegar à etapa" /><div className="grid gap-4">{stages.filter((stage) => ["entrevista", "entrevista_gestor"].includes(stage.stage_key ?? "")).map((stage) => <div key={stage.id} className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2"><h3 className="sm:col-span-2">{stage.name}</h3>{([ ["public_description", "Objetivo e instruções"], ["public_format", "Formato (online ou presencial)"], ["public_duration_minutes", "Duração em minutos"], ["public_agenda_link", "Link da agenda"], ["public_meet_link", "Link da reunião"] ] as const).map(([key, label]) => <Field key={key} label={label}>{key === "public_description" ? <TextArea rows={3} defaultValue={stage[key] ?? ""} onBlur={async (event) => { const { error } = await supabase.from("job_stages").update({ public_description: event.target.value || null }).eq("id", stage.id); if (error) toast.error("Não foi possível salvar a orientação."); else void queryClient.invalidateQueries({ queryKey: ["job", jobId] }); }} /> : <TextInput type={key === "public_duration_minutes" ? "number" : "text"} defaultValue={stage[key] ?? ""} onBlur={async (event) => { const { error } = await supabase.from("job_stages").update({ public_format: key === "public_format" ? event.target.value || null : stage.public_format, public_duration_minutes: key === "public_duration_minutes" ? Number(event.target.value) || null : stage.public_duration_minutes, public_agenda_link: key === "public_agenda_link" ? event.target.value || null : stage.public_agenda_link, public_meet_link: key === "public_meet_link" ? event.target.value || null : stage.public_meet_link }).eq("id", stage.id); if (error) toast.error("Não foi possível salvar a orientação."); else void queryClient.invalidateQueries({ queryKey: ["job", jobId] }); }} />}</Field>)}</div>)}</div></Panel>
            <Panel className="lg:col-span-2">
              <SectionTitle title="Exibir para o candidato?" hint="As condições ficam ocultas por padrão" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {([ ["salary", "Salário e remuneração"], ["contract", "Contratação"], ["benefits", "Benefícios"], ["workload", "Carga horária"], ["work_hours", "Horário de trabalho"], ["location", "Cidade e estado"] ] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean((job as { public_visibility?: Record<string, boolean> }).public_visibility?.[key])} onChange={async (event) => { const { error } = await supabase.from("jobs").update({ public_visibility: { ...((job as { public_visibility?: Record<string, boolean> }).public_visibility ?? {}), [key]: event.target.checked } }).eq("id", job.id); if (error) toast.error("Não foi possível atualizar a visibilidade."); else void queryClient.invalidateQueries({ queryKey: ["job", jobId] }); }} />{label}</label>)}
              </div>
              <Field label="Mensagem de boas-vindas" className="mt-5"><TextArea rows={3} placeholder="Que bom ter você por aqui!" defaultValue={(job as { welcome_message?: string | null }).welcome_message ?? ""} onBlur={async (event) => { if (event.target.value === (job as { welcome_message?: string | null }).welcome_message) return; const { error } = await supabase.from("jobs").update({ welcome_message: event.target.value || null }).eq("id", job.id); if (error) toast.error("Não foi possível salvar a mensagem."); else { toast.success("Mensagem salva"); void queryClient.invalidateQueries({ queryKey: ["job", jobId] }); } }} /></Field>
            </Panel>
            <Panel>
              <SectionTitle title="Contexto da vaga" />
              <dl className="space-y-3 text-[13px]">
                {[
                  ["Objetivo", job.objective],
                  ["Responsabilidades", job.responsibilities],
                  ["Resultados esperados", job.expected_results],
                  ["Rotina", job.routine],
                  ["Desafios", job.challenges],
                  ["Benefícios", job.benefits],
                  ["Carga horária", job.workload],
                  ["Horário", job.work_hours],
                  ["Gestor", job.manager],
                  ["Data desejada", job.target_hire_date ? formatDate(job.target_hire_date) : null],
                ]
                  .filter(([, value]) => value)
                  .map(([label, value]) => (
                    <div key={String(label)}>
                      <dt className="text-[11px] uppercase tracking-wide text-ink-soft">{label}</dt>
                      <dd className="mt-0.5 whitespace-pre-line">{value}</dd>
                    </div>
                  ))}
              </dl>
            </Panel>

            <div className="space-y-4">
              <Panel>
                <SectionTitle title="O que essa pessoa precisa ter" />
                <p className="mb-2 text-[11px] uppercase tracking-wide text-ink-soft">Comportamentais</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.competencies.map((item) => (
                    <span key={item.id} className="rounded-full bg-paper/70 px-2.5 py-1 text-[12px]">
                      {item.name}
                      <span className="ml-1.5 text-[11px] text-ink-soft">
                        {labelFor(IMPORTANCE_OPTIONS, item.importance)}
                      </span>
                    </span>
                  ))}
                </div>
                <p className="mb-2 mt-4 text-[11px] uppercase tracking-wide text-ink-soft">Técnicas</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.skills.map((item) => (
                    <span key={item.id} className="rounded-full bg-paper/70 px-2.5 py-1 text-[12px]">
                      {item.name}
                      <span className="ml-1.5 text-[11px] text-ink-soft">
                        {labelFor(SKILL_LEVELS, item.level)} · {labelFor(SKILL_IMPORTANCE, item.importance)}
                      </span>
                    </span>
                  ))}
                </div>
              </Panel>

              <Panel>
                <SectionTitle title="Requisitos e perguntas" />
                <ul className="space-y-1.5 text-[13px]">
                  {data.requirements.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-2">
                      <span>{item.description}</span>
                      <span className="flex gap-1.5">
                        <Chip tone={item.kind === "obrigatorio" ? "brand" : "neutral"}>
                          {item.kind === "obrigatorio" ? "Obrigatório" : "Desejável"}
                        </Chip>
                        {item.is_knockout ? <Chip tone="rose">Eliminatório</Chip> : null}
                      </span>
                    </li>
                  ))}
                </ul>
                <ul className="mt-4 space-y-1.5 text-[13px]">
                  {data.questions.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-2">
                      <span>{item.question}</span>
                      {item.kind === "eliminatoria" ? (
                        <Chip tone="rose">Elimina se “{item.disqualifying_answer}”</Chip>
                      ) : (
                        <Chip tone="teal">{item.tag ?? "Classificatória"}</Chip>
                      )}
                    </li>
                  ))}
                </ul>
              </Panel>

              <Panel>
                <SectionTitle title="Etapas configuradas" />
                <ol className="space-y-1.5 text-[13px]">
                  {stages.map((stage, index) => (
                    <li key={stage.id} className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-ink-soft">{index + 1}</span>
                      <span>{stage.name}</span>
                      {stage.has_evaluation ? <Chip tone="teal">avaliação</Chip> : null}
                      {stage.needs_manual_approval ? <Chip>aprovação manual</Chip> : null}
                    </li>
                  ))}
                </ol>
              </Panel>
            </div>
          </div>
        ) : null}

        {tab === "Roteiro" ? (
          <div className="space-y-4">
            {data.scripts.length === 0 ? (
              <EmptyState
                title="Nenhum roteiro criado ainda"
                hint="O roteiro reúne as perguntas da entrevista. Em breve ele também poderá ser gerado com IA."
              />
            ) : (
              data.scripts.map((script) => (
                <Panel key={script.id}>
                  <SectionTitle title={script.title} hint={`${script.generated_by === "IA" ? "gerado com IA" : "manual"}`} />
                  <ol className="space-y-3">
                    {[...(script.interview_script_questions ?? [])]
                      .sort((a, b) => a.position - b.position)
                      .map((question) => (
                        <li key={question.id} className="rounded-[12px] bg-paper/50 p-3">
                          <p className="text-[13px] font-medium">{question.question}</p>
                          {question.looking_for ? (
                            <p className="mt-1 text-[12px] text-ink-soft">
                              O que observar: {question.looking_for}
                            </p>
                          ) : null}
                          <Chip>{question.category}</Chip>
                        </li>
                      ))}
                  </ol>
                </Panel>
              ))
            )}
          </div>
        ) : null}

        {tab === "Case" ? (
          <JobCaseTab
            jobCase={data.jobCase as Record<string, unknown> | null}
            job={{
              id: data.job.id,
              company_id: data.job.company_id,
              title: data.job.title,
              sector: data.job.sector,
              work_mode: data.job.work_mode,
              city: data.job.city,
              state: data.job.state,
              contract_model: data.job.contract_model,
              objective: data.job.objective,
              responsibilities: data.job.responsibilities,
              routine: data.job.routine,
              expected_results: data.job.expected_results,
              challenges: data.job.challenges,
              company_name: company?.name ?? null,
            }}
            competencies={(data.competencies ?? []).map((item) => item.name)}
            skills={(data.skills ?? []).map((item) => item.name)}
            requirements={(data.requirements ?? []).map((item) => item.description)}
            candidates={candidates.map((c) => ({ id: c.id, name: c.name, access_token: c.access_token, stage_id: c.stage_id }))}
            stages={stages.map((s) => ({ id: s.id, stage_key: s.stage_key, name: s.name }))}
            onSaved={() => void queryClient.invalidateQueries({ queryKey: ["job", jobId] })}
          />
        ) : null}

        {tab === "Divulgar" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <SectionTitle title="Link público de inscrição" />
              <div className="flex flex-wrap items-center gap-2 rounded-[12px] bg-paper/60 p-3">
                <code className="flex-1 break-all font-mono text-[12px]">{publicJobUrl(job.id)}</code>
                <GhostButton
                  onClick={() => {
                    navigator.clipboard.writeText(publicJobUrl(job.id));
                    toast.success("Link copiado");
                  }}
                >
                  <Copy className="size-3.5" /> Copiar
                </GhostButton>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <GhostButton onClick={() => window.open(`/vaga/${job.id}`, "_blank")}><ExternalLink className="size-3.5" /> Candidato — candidatura</GhostButton>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicJobUrl(job.id))}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3.5 py-2 text-[13px] ring-1 ring-white/10"
                >
                  <Linkedin className="size-3.5" /> LinkedIn
                </a>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(jobShareText(job))}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3.5 py-2 text-[13px] ring-1 ring-white/10"
                >
                  <MessageCircle className="size-3.5" /> WhatsApp
                </a>
              </div>
            </Panel>

            <Panel>
              <SectionTitle title="Texto para divulgação" hint="edite antes de publicar" />
              <TextArea rows={10} defaultValue={jobShareText(job)} id="share-text" />
              <GhostButton
                className="mt-3"
                onClick={() => {
                  const element = document.getElementById("share-text") as HTMLTextAreaElement | null;
                  navigator.clipboard.writeText(element?.value ?? jobShareText(job));
                  toast.success("Texto copiado");
                }}
              >
                <Copy className="size-3.5" /> Copiar texto
              </GhostButton>
              <div className="mt-4 flex items-center gap-2">
                <Chip tone="amber">Em breve</Chip>
                <span className="text-[12px] text-ink-soft">Gerar comunicação automaticamente</span>
              </div>
            </Panel>
          </div>
        ) : null}
      </div>
    </>
  );
}

function EditJobPanel({
  job,
  onDone,
}: {
  job: { id: string; title: string; sector: string | null; manager: string | null; benefits: string | null; objective: string | null };
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: job.title,
    sector: job.sector ?? "",
    manager: job.manager ?? "",
    benefits: job.benefits ?? "",
    objective: job.objective ?? "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("jobs")
        .update({
          title: form.title,
          sector: form.sector || null,
          manager: form.manager || null,
          benefits: form.benefits || null,
          objective: form.objective || null,
        })
        .eq("id", job.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", job.id] });
      toast.success("Vaga atualizada");
      onDone();
    },
  });

  return (
    <Panel className="mt-4">
      <SectionTitle title="Editar vaga" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome da vaga">
          <TextInput value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        </Field>
        <Field label="Setor">
          <TextInput value={form.sector} onChange={(event) => setForm({ ...form, sector: event.target.value })} />
        </Field>
        <Field label="Gestor">
          <TextInput value={form.manager} onChange={(event) => setForm({ ...form, manager: event.target.value })} />
        </Field>
        <Field label="Benefícios">
          <TextInput value={form.benefits} onChange={(event) => setForm({ ...form, benefits: event.target.value })} />
        </Field>
        <Field label="Objetivo da vaga" className="sm:col-span-2">
          <TextArea value={form.objective} onChange={(event) => setForm({ ...form, objective: event.target.value })} />
        </Field>
      </div>
      <div className="mt-3 flex gap-2">
        <BrandButton onClick={() => save.mutate()} disabled={save.isPending}>
          Salvar
        </BrandButton>
        <GhostButton onClick={onDone}>Cancelar</GhostButton>
      </div>
    </Panel>
  );
}
