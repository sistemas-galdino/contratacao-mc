import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Copy, ExternalLink, Mail, Phone, Sparkles, UserX } from "lucide-react";
import { aiAnalyzeCompatibility, aiAnalyzeInterview, aiGenerateInterviewScript, type InterviewAnalysis } from "@/lib/ai.functions";
import { InterviewTab, hasInterviewContent, type InterviewRow } from "@/components/interview-tab";
import { CompatibilityPanel } from "@/components/compatibility-panel";
import { DIMENSION_LABELS, dimensionsForJob, finalize, type CompatibilityPayload } from "@/lib/compatibility";
import { supabase } from "@/integrations/supabase/client";
import { CaseEvaluationPanel } from "@/components/case-evaluation-panel";
import { ConsolidatedView } from "@/components/consolidated-view";
import { AssessmentResults } from "@/components/assessment-results";
import { computeAssessmentResult, type AnsweredRow } from "@/lib/assessment-scoring";
import type { AssessmentQuestion } from "@/lib/suggestions";
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
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/ui-bits";
import {
  CANDIDATE_STATUS_LABEL,
  REJECTION_REASONS,
  SCRIPT_CATEGORIES,
  formatDate,
  formatDateTime,
  labelFor,
} from "@/lib/hiring";

export const Route = createFileRoute("/vagas/$jobId/candidatos/$candidateId")({
  head: () => ({
    meta: [
      { title: "Perfil do candidato — Vetor" },
      {
        name: "description",
        content:
          "Tudo sobre o candidato em um só lugar: respostas do formulário, entrevistas, case, avaliações e histórico do processo.",
      },
      { property: "og:title", content: "Perfil do candidato — Vetor" },
      {
        property: "og:description",
        content: "Formulário, entrevistas, case, avaliações e histórico completo do candidato.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <CandidateView />
    </RequireAuth>
  ),
});

const TABS = ["Visão geral", "Visão consolidada", "Formulário", "Assessment", "Entrevistas", "Case", "Avaliações", "Histórico"] as const;

function CandidateView() {
  const { jobId, candidateId } = useParams({ from: "/vagas/$jobId/candidatos/$candidateId" });
  const { session } = useSession();
  const { data: company } = useCompany(Boolean(session));
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Visão geral");
  const [showHire, setShowHire] = useState(false);
  const [showReject, setShowReject] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["candidate", candidateId],
    enabled: Boolean(company?.id),
    queryFn: async () => {
      const [
        candidate,
        stages,
        answers,
        events,
        interviews,
        evaluations,
        submissions,
        assessments,
        scripts,
        job,
        hire,
        rejection,
      ] = await Promise.all([
        supabase.from("candidates").select("*").eq("id", candidateId).single(),
        supabase.from("job_stages").select("*").eq("job_id", jobId).order("position"),
        supabase.from("candidate_answers").select("*").eq("candidate_id", candidateId),
        supabase
          .from("candidate_events")
          .select("*")
          .eq("candidate_id", candidateId)
          .order("created_at", { ascending: false }),
        supabase.from("interviews").select("*").eq("candidate_id", candidateId).order("created_at"),
        supabase.from("evaluations").select("*").eq("candidate_id", candidateId).order("created_at"),
        supabase.from("case_submissions").select("*").eq("candidate_id", candidateId),
        supabase.from("assessment_responses").select("*").eq("candidate_id", candidateId),
        // Only this candidate's scripts (or the job's generic one) — never another candidate's.
        supabase
          .from("interview_scripts")
          .select("*, interview_script_questions(*)")
          .eq("job_id", jobId)
          .or(`candidate_id.eq.${candidateId},candidate_id.is.null`)
          .order("created_at", { ascending: false }),
        supabase.from("jobs").select("id,title,sector,work_mode,city,state,contract_model,workload,work_hours,objective,responsibilities,expected_results,routine,challenges").eq("id", jobId).single(),
        supabase.from("hires").select("*").eq("candidate_id", candidateId).maybeSingle(),
        supabase.from("rejections").select("*").eq("candidate_id", candidateId).maybeSingle(),
      ]);
      const [requirements, competencies, skills, jobCase, assignment, deliveries, analysis, caseEvals, jobAssessment] = await Promise.all([
        supabase.from("job_requirements").select("*").eq("job_id", jobId).order("position"),
        supabase.from("job_competencies").select("*").eq("job_id", jobId).order("position"),
        supabase.from("job_skills").select("*").eq("job_id", jobId).order("position"),
        supabase.from("job_cases").select("*").eq("job_id", jobId).maybeSingle(),
        supabase.from("case_assignments").select("*").eq("candidate_id", candidateId).maybeSingle(),
        supabase.from("case_deliveries").select("*").eq("candidate_id", candidateId).order("created_at"),
        supabase
          .from("candidate_analyses")
          .select("*")
          .eq("candidate_id", candidateId)
          .eq("job_id", jobId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("case_evaluations").select("*").eq("candidate_id", candidateId).order("created_at"),
        // Read the version answered by this candidate, not the newest version of the vacancy.
        supabase.from("assessments").select("*").eq("job_id", jobId).eq("id", assessments.data?.[0]?.assessment_id ?? "00000000-0000-0000-0000-000000000000").maybeSingle(),
      ]);
      if (candidate.error) throw candidate.error;
      return {
        candidate: candidate.data,
        stages: stages.data ?? [],
        answers: answers.data ?? [],
        events: events.data ?? [],
        interviews: interviews.data ?? [],
        evaluations: evaluations.data ?? [],
        submissions: submissions.data ?? [],
        assessments: assessments.data ?? [],
        scripts: scripts.data ?? [],
        job: job.data,
        hire: hire.data,
        rejection: rejection.data,
        requirements: requirements.data ?? [],
        competencies: competencies.data ?? [],
        skills: skills.data ?? [],
        jobCase: jobCase.data ?? null,
        caseAssignment: assignment.data ?? null,
        caseDeliveries: deliveries.data ?? [],
        analysis: analysis.data ?? null,
        caseEvaluations: caseEvals.data ?? [],
        jobAssessment: jobAssessment.data ?? null,
      };
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["candidate", candidateId] });
    queryClient.invalidateQueries({ queryKey: ["job", jobId] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const moveStage = useMutation({
    mutationFn: async (stageId: string) => {
      const stage = (data?.stages ?? []).find((item) => item.id === stageId);
      const { error } = await supabase
        .from("candidates")
        .update({ stage_id: stageId, status: "ativo" })
        .eq("id", candidateId);
      if (error) throw error;
      await supabase.from("candidate_events").insert({
        company_id: company!.id,
        candidate_id: candidateId,
        type: "etapa",
        title: `Movido para ${stage?.name ?? "nova etapa"}`,
      });
    },
    onSuccess: () => {
      toast.success("Candidato movido de etapa");
      refresh();
    },
  });

  const assessmentResult = (() => {
    const response = data?.assessments?.[0];
    const questions = ((data?.jobAssessment?.payload as { questions?: AssessmentQuestion[] } | null)?.questions ?? []);
    if (!response || !questions.length || !Array.isArray(response.payload)) return null;
    return computeAssessmentResult(questions, response.payload as AnsweredRow[], [
      ...(data?.competencies ?? []),
      ...(data?.skills ?? []),
    ]);
  })();

  // Persiste o resultado por habilidade no perfil do candidato.
  useEffect(() => {
    const response = data?.assessments?.[0];
    if (!response || !assessmentResult) return;
    const saved = (response.analysis as { skill_scores?: { skill: string; score: number }[] } | null)?.skill_scores;
    const fresh = assessmentResult.skills.map((s) => ({ skill: s.skill, score: s.score }));
    if (JSON.stringify(saved) === JSON.stringify(fresh) && response.score === assessmentResult.compatibility) return;
    void supabase
      .from("assessment_responses")
      .update({
        score: assessmentResult.compatibility,
        analysis: { ...((response.analysis as object) ?? {}), skill_scores: fresh, result: assessmentResult } as never,
      })
      .eq("id", response.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.assessments?.[0]?.id, assessmentResult?.compatibility]);

  const aiInput = () => ({
    job: [
      `Vaga: ${data?.job?.title ?? ""}`,
      `Setor: ${data?.job?.sector ?? ""}`,
      data?.job?.objective ? `Objetivo: ${data.job.objective}` : "",
      data?.job?.responsibilities ? `Responsabilidades: ${data.job.responsibilities}` : "",
      `Condições: formato ${data?.job?.work_mode ?? "-"}, local ${[data?.job?.city, data?.job?.state].filter(Boolean).join("/") || "-"}, contratação ${data?.job?.contract_model ?? "-"}, carga ${data?.job?.workload ?? "-"}, horário ${data?.job?.work_hours ?? "-"}`,
      ...(data?.requirements ?? []).map(
        (item) => `Requisito [${item.category}] (${item.kind}${item.is_knockout ? ", eliminatório" : ""}): ${item.description}`,
      ),
      ...(data?.competencies ?? []).map((item) => `Competência: ${item.name} (${item.importance})`),
      ...(data?.skills ?? []).map((item) => `Habilidade: ${item.name} (${item.level}, ${item.importance})`),
    ].join("\n"),
    candidate: [
      `Nome: ${data?.candidate.name ?? ""}`,
      `Local: ${[data?.candidate.city, data?.candidate.state].filter(Boolean).join("/")}`,
      `Cargo atual: ${data?.candidate.current_position ?? ""}`,
      `Pretensão: ${data?.candidate.salary_expectation ?? ""}`,
    ].join("\n"),
    answers: [
      ...(assessmentResult
        ? [{
            question: "Resultado interno do assessment por habilidade (NÃO revelar notas ao candidato; use para formular perguntas de investigação sobre as habilidades com menor evidência, sem citar números)",
            answer: assessmentResult.skills.map((s) => `${s.skill}: ${s.score}/100`).join("; "),
          }]
        : []),
      ...(data?.answers ?? []).map((item) => ({
        question: item.question_text ?? "",
        answer: item.answer ?? "",
      })),
      ...(data?.assessments ?? []).flatMap((response) =>
        Array.isArray(response.payload)
          ? (response.payload as { question?: string; answer?: string; competency?: string }[]).map((row) => ({
              question: `Assessment${row.competency ? ` (${row.competency})` : ""}: ${row.question ?? ""}`,
              answer: row.answer ?? "",
            }))
          : [],
      ),
    ],
    resume: data?.candidate.resume_text ?? "",
  });

  const screen = useMutation({
    mutationFn: async () => {
      const dims = dimensionsForJob({
        requirements: data?.requirements ?? [],
        competencies: data?.competencies ?? [],
        skills: data?.skills ?? [],
        hasConditions: Boolean(data?.job?.work_mode || data?.job?.contract_model || data?.job?.work_hours),
      });
      const raw = await aiAnalyzeCompatibility({
        data: { ...aiInput(), dimensions: dims.map((key) => `${key}: ${DIMENSION_LABELS[key]}`) },
      });
      raw.dimensions = raw.dimensions.map((d) => {
        const key = dims.find((k) => d.key.startsWith(k)) ?? d.key;
        return { ...d, key, label: DIMENSION_LABELS[key] ?? d.label };
      });
      const result = finalize(raw);
      const { error } = await supabase.from("candidate_analyses").insert({
        company_id: company!.id,
        candidate_id: candidateId,
        job_id: jobId,
        compatibility: result.compatibility,
        confidence: result.final_confidence,
        conclusive: result.conclusive,
        payload: result as never,
      });
      if (error) throw error;
      if (result.conclusive && result.compatibility !== null) {
        await supabase.from("candidates").update({ overall_score: result.compatibility }).eq("id", candidateId);
      }
      await supabase.from("candidate_events").insert({
        company_id: company!.id,
        candidate_id: candidateId,
        type: "avaliacao",
        title: result.conclusive
          ? `Compatibilidade com a vaga: ${result.compatibility}%`
          : "Compatibilidade ainda inconclusiva",
        detail: result.profile_summary,
      });
    },
    onSuccess: () => {
      toast.success("Análise de compatibilidade registrada");
      refresh();
    },
    onError: (error) => {
      console.error(error);
      toast.error("A IA não conseguiu analisar agora. Tente novamente.");
    },
  });

  const analyzeInterview = useMutation({
    mutationFn: async ({ interview }: { interview: InterviewRow }) => {
      const base = aiInput();
      const job = data?.job;
      const reqs = data?.requirements ?? [];
      const recruiterNotes = [
        ["Como foi a entrevista", interview.notes],
        ["Observações adicionais", interview.observations],
        ["Pontos positivos (recrutador)", interview.positives],
        ["Pontos de atenção (recrutador)", interview.attention_points],
      ]
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");
      const result = await aiAnalyzeInterview({
        data: {
          job: [
            `Nome: ${job?.title ?? ""}`,
            `Objetivo: ${job?.objective ?? ""}`,
            `Principais responsabilidades: ${job?.responsibilities ?? ""}`,
            `Resultados esperados: ${job?.expected_results ?? ""}`,
            `Rotina: ${job?.routine ?? ""}`,
            `Desafios: ${job?.challenges ?? ""}`,
            `Habilidades e competências esperadas: ${[...(data?.competencies ?? []).map((c) => c.name), ...(data?.skills ?? []).map((c) => `${c.name} (${c.level})`)].join("; ")}`,
            `Requisitos obrigatórios: ${reqs.filter((r) => r.kind === "obrigatorio").map((r) => r.description).join("; ")}`,
            `Requisitos desejáveis: ${reqs.filter((r) => r.kind !== "obrigatorio").map((r) => r.description).join("; ")}`,
          ].join("\n"),
          candidate: base.candidate,
          form: base.answers.filter((a) => !a.question.startsWith("Assessment")).map((a) => `${a.question}: ${a.answer}`).join("\n"),
          assessment: base.answers.filter((a) => a.question.startsWith("Assessment")).map((a) => `${a.question}: ${a.answer}`).join("\n"),
          previous: data?.analysis ? JSON.stringify(data.analysis.payload).slice(0, 6000) : "",
          transcript: interview.transcript ?? "",
          file_text: (interview.source_file_text ?? "").slice(0, 60000),
          recruiter_notes: recruiterNotes,
        },
      });
      const history = Array.isArray(interview.analysis_history) ? interview.analysis_history : [];
      const nextHistory = interview.ai_analysis
        ? [...history, { analysis: interview.ai_analysis, analyzed_at: interview.analyzed_at ?? interview.created_at }]
        : history;
      const { error } = await supabase
        .from("interviews")
        .update({ ai_analysis: result as never, analysis_history: nextHistory as never, analyzed_at: new Date().toISOString() })
        .eq("id", interview.id);
      if (error) throw error;
      await supabase.from("candidate_events").insert({
        company_id: company!.id,
        candidate_id: candidateId,
        type: "entrevista",
        title: "Entrevista analisada com IA",
        detail: result.resumo.slice(0, 280),
      });
    },
    onSuccess: () => {
      toast.success("Análise da entrevista pronta");
      refresh();
    },
    onError: (error) => {
      console.error(error);
      toast.error("A IA não conseguiu analisar a entrevista agora. Tente novamente.");
    },
  });

  const buildScript = useMutation({
    mutationFn: async () => {
      const result = await aiGenerateInterviewScript({ data: aiInput() });
      const { data: script, error } = await supabase
        .from("interview_scripts")
        .insert({
          company_id: company!.id,
          job_id: jobId,
          candidate_id: candidateId,
          title: result.title || `Roteiro — ${data?.candidate.name ?? ""}`,
          generated_by: "IA",
        })
        .select("id")
        .single();
      if (error) throw error;
      const rows = result.questions.map((item, index) => ({
        company_id: company!.id,
        script_id: script.id,
        question: item.question,
        category: item.category,
        looking_for: item.looking_for,
        position: index,
      }));
      if (rows.length) {
        const inserted = await supabase.from("interview_script_questions").insert(rows);
        if (inserted.error) throw inserted.error;
      }
      await supabase.from("candidate_events").insert({
        company_id: company!.id,
        candidate_id: candidateId,
        type: "entrevista",
        title: "Roteiro de entrevista gerado com IA",
      });
    },
    onSuccess: () => {
      toast.success("Roteiro de entrevista criado com IA");
      refresh();
    },
    onError: (error) => {
      console.error(error);
      toast.error("A IA não conseguiu montar o roteiro agora.");
    },
  });

  if (isLoading || !data) {
    return <p className="eyebrow py-10">Carregando candidato…</p>;
  }

  const { candidate, stages } = data;
  const currentStage = stages.find((stage) => stage.id === candidate.stage_id);

  return (
    <>
      <div className="flex items-center gap-2 py-3">
        <Link
          to="/vagas/$jobId"
          params={{ jobId }}
          className="inline-flex items-center gap-1.5 text-[12px] text-ink-soft hover:text-ink"
        >
          <ArrowLeft className="size-3.5" /> Funil da vaga
        </Link>
      </div>

      <section className="flex flex-wrap items-start justify-between gap-4 rounded-[18px] surface p-5">
        <div>
          <p className="eyebrow">
            {data.job?.title} · inscrição em {formatDate(candidate.applied_at)}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold leading-none tracking-tight">
            {candidate.name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px] text-ink-soft">
            <span>{[candidate.city, candidate.state].filter(Boolean).join("/") || "Local não informado"}</span>
            {candidate.phone ? (
              <span className="inline-flex items-center gap-1">
                <Phone className="size-3.5" /> {candidate.phone}
              </span>
            ) : null}
            {candidate.email ? (
              <span className="inline-flex items-center gap-1">
                <Mail className="size-3.5" /> {candidate.email}
              </span>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Chip tone={candidate.status === "ativo" ? "brand" : candidate.status === "contratado" ? "teal" : "rose"}>
              {CANDIDATE_STATUS_LABEL[candidate.status] ?? candidate.status}
            </Chip>
            {currentStage ? <Chip tone="teal">{currentStage.name}</Chip> : null}
            {candidate.tags?.map((tag) => <Chip key={tag}>{tag}</Chip>)}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {candidate.access_token && <><GhostButton onClick={() => { void navigator.clipboard.writeText(`${window.location.origin}/acompanhar/${candidate.access_token}`); toast.success("Link individual copiado"); }}><Copy className="size-3.5" /> Copiar acompanhamento</GhostButton><GhostButton onClick={() => window.open(`/acompanhar/${candidate.access_token}`, "_blank")}><ExternalLink className="size-3.5" /> Visualizar como candidato</GhostButton></>}
          <SelectInput
            className="w-48"
            value={candidate.stage_id ?? ""}
            onChange={(event) => moveStage.mutate(event.target.value)}
          >
            <option value="">Mover para etapa…</option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </SelectInput>
          <BrandButton onClick={() => setShowHire(true)}>
            <CheckCircle2 className="size-3.5" /> Contratar
          </BrandButton>
          <GhostButton onClick={() => setShowReject(true)}>
            <UserX className="size-3.5" /> Não avançou
          </GhostButton>
        </div>
      </section>

      {showHire ? (
        <HireForm
          candidate={candidate}
          companyId={company!.id}
          onDone={() => {
            setShowHire(false);
            refresh();
          }}
        />
      ) : null}

      {showReject ? (
        <RejectForm
          candidateId={candidateId}
          companyId={company!.id}
          onDone={() => {
            setShowReject(false);
            refresh();
          }}
        />
      ) : null}

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

      <div className="mt-5 grid gap-4 pb-12 lg:grid-cols-2">
        {tab === "Visão geral" ? (
          <>
            <CompatibilityPanel
              analysis={(data.analysis?.payload as unknown as CompatibilityPayload) ?? null}
              candidateName={candidate.name}
              jobTitle={data.job?.title ?? ""}
              createdAt={data.analysis?.created_at}
              loading={screen.isPending}
              onRun={() => screen.mutate()}
            />
            <Panel>
              <SectionTitle title="Dados do candidato" />
              <dl className="space-y-3 text-[13px]">
                {[
                  ["Situação profissional", candidate.employed_now === null ? null : candidate.employed_now ? "Trabalhando atualmente" : "Disponível"],
                  ["Cargo atual", candidate.current_position],
                  ["Empresa atual", candidate.current_company],
                  ["Tempo na empresa", candidate.current_tenure],
                  ["Pretensão", candidate.salary_expectation],
                  ["LinkedIn", candidate.linkedin],
                  ["Currículo", candidate.resume_url],
                ]
                  .filter(([, value]) => value)
                  .map(([label, value]) => (
                    <div key={String(label)}>
                      <dt className="text-[11px] uppercase tracking-wide text-ink-soft">{label}</dt>
                      <dd className="mt-0.5 break-all">{value}</dd>
                    </div>
                  ))}
              </dl>
              {candidate.resume_text ? (
                <div className="mt-4">
                  <p className="text-[11px] uppercase tracking-wide text-ink-soft">Currículo</p>
                  <p className="mt-1 whitespace-pre-line text-[13px]">{candidate.resume_text}</p>
                </div>
              ) : null}
            </Panel>

            <Panel>
              <SectionTitle title="Apoio da IA" hint="a decisão continua sua" />
              <p className="text-[13px] text-ink-soft">
                A IA prepara um roteiro de entrevista focado no que ainda precisa ser validado.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <GhostButton onClick={() => buildScript.mutate()} disabled={buildScript.isPending}>
                  <Sparkles className={`size-3.5 ${buildScript.isPending ? "animate-pulse" : ""}`} />
                  {buildScript.isPending ? "Montando roteiro..." : "Gerar roteiro de entrevista"}
                </GhostButton>
              </div>
            </Panel>

            {data.jobCase ? (
              <CaseEvaluationPanel
                jobCase={data.jobCase as Record<string, unknown>}
                assignment={data.caseAssignment as Record<string, unknown> | null}
                deliveries={(data.caseDeliveries ?? []) as Record<string, unknown>[]}
                candidateId={candidateId}
                companyId={candidate.company_id}
                onSaved={refresh}
              />
            ) : null}

            <Panel>
              <SectionTitle title="Roteiro de entrevista" hint="estrutura sugerida" />
              {data.scripts.length === 0 ? (
                <EmptyState
                  title="Sem roteiro por enquanto"
                  hint="Use o botão de gerar roteiro com IA para criar uma primeira versão a partir da vaga e das respostas."
                />
              ) : (
                <ol className="space-y-2">
                  {[data.scripts.find((script) => script.candidate_id === candidateId) ?? data.scripts[0]]
                    .filter(Boolean)
                    .flatMap((script) => script!.interview_script_questions ?? [])
                    .sort((a, b) => a.position - b.position)
                    .map((question) => (
                      <li key={question.id} className="rounded-[12px] bg-paper/50 p-3">
                        <p className="text-[13px] font-medium">{question.question}</p>
                        {question.looking_for ? (
                          <p className="mt-1 text-[12px] text-ink-soft">O que observar: {question.looking_for}</p>
                        ) : null}
                        <Chip>{labelFor(SCRIPT_CATEGORIES, question.category)}</Chip>
                      </li>
                    ))}
                </ol>
              )}
            </Panel>
          </>
        ) : null}

        {tab === "Visão consolidada" ? (
          <ConsolidatedView
            competencies={data.competencies.map((c) => c.name)}
            compat={(data.analysis?.payload as unknown as CompatibilityPayload) ?? null}
            hasApplication={data.answers.length > 0 || data.assessments.length > 0}
            assessmentQuestions={((data.jobAssessment?.payload as { questions?: unknown[] } | null)?.questions ?? []) as never}
            assessmentAnswers={(data.assessments[0]?.payload as never) ?? null}
            hasAssessment={!!data.jobAssessment}
            interviews={data.interviews.filter((i) => i.ai_analysis).map((i) => i.ai_analysis as unknown as InterviewAnalysis)}
            hasCase={!!data.jobCase}
            caseEvaluations={data.caseEvaluations as never}
            jobTitle={(data.job as { title?: string } | null)?.title ?? ""}
          />
        ) : null}

        {tab === "Formulário" ? (
          <Panel className="lg:col-span-2">
            <SectionTitle title="Respostas do formulário" />
            {data.answers.length === 0 ? (
              <EmptyState title="Nenhuma resposta registrada" />
            ) : (
              <ul className="space-y-2">
                {data.answers.map((answer) => (
                  <li
                    key={answer.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-paper/50 p-3"
                  >
                    <span className="text-[13px]">{answer.question_text}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-[13px] font-medium">{answer.answer}</span>
                      {answer.is_disqualifying ? <Chip tone="rose">Eliminatória</Chip> : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ) : null}

        {tab === "Assessment" ? (
          <Panel className="lg:col-span-2">
            <SectionTitle title="Assessment" hint="resultado por habilidades" />
            {assessmentResult ? <div className="mb-4"><AssessmentResults result={assessmentResult} /></div> : null}
            {data.assessments.length === 0 ? (
              <EmptyState
                title="Assessment ainda não respondido"
                hint="As respostas ficam guardadas aqui para a análise por competência."
              />
            ) : (
              <div className="space-y-3">
                {data.assessments.map((response) => {
                  const rows = Array.isArray(response.payload)
                    ? (response.payload as {
                        question?: string;
                        situation?: string;
                        competency?: string;
                        answer?: string;
                      }[])
                    : [];
                  return (
                    <div key={response.id} className="space-y-2">
                      {rows.map((row, index) => (
                        <div key={index} className="rounded-[12px] bg-paper/50 p-3 ring-1 ring-white/5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Chip tone="teal">{row.competency || "Competência"}</Chip>
                          </div>
                          {row.situation ? (
                            <p className="mt-1.5 text-[12px] text-ink-soft">{row.situation}</p>
                          ) : null}
                          <p className="mt-1 text-[13px]">{row.question}</p>
                          <p className="mt-1 text-[13px] font-medium text-brand">{row.answer || "Sem resposta"}</p>
                        </div>
                      ))}
                    </div>
                  );
                })}
                <p className="text-[11px] text-ink-soft">
                  O assessment não elimina candidatos: ele gera evidências para a análise com IA e para o roteiro de
                  entrevista.
                </p>
              </div>
            )}
          </Panel>
        ) : null}

        {tab === "Entrevistas" ? (
          <InterviewTab
            interviews={data.interviews as InterviewRow[]}
            companyId={company!.id}
            candidateId={candidateId}
            stages={stages}
            currentStageId={candidate.stage_id}
            analyzingId={analyzeInterview.isPending ? (analyzeInterview.variables?.interview.id ?? null) : null}
            onAnalyze={(interview) => analyzeInterview.mutate({ interview })}
            onChanged={(created) => {
              refresh();
              if (created && hasInterviewContent(created)) analyzeInterview.mutate({ interview: created });
            }}
          />
        ) : null}

        {tab === "Case" ? (
          <Panel className="lg:col-span-2">
            <SectionTitle title="Case" />
            {data.jobCase ? (
              <div className="mb-4 rounded-[12px] bg-paper/50 p-3">
                <p className="text-[13px] font-medium">Link do case (único para todos os candidatos)</p>
                <p className="mt-1 text-[12px] text-ink-soft">
                  O mesmo link serve para todos. Envie quando a pessoa chegar à etapa de case.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <BrandButton
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(`${window.location.origin}/case/${String((data.jobCase as Record<string, unknown>)["public_token"])}`);
                      toast.success("Link do case copiado");
                    }}
                  >
                    <Copy className="size-3.5" /> Copiar link do case
                  </BrandButton>
                  <GhostButton type="button" onClick={() => window.open(`/case/${String((data.jobCase as Record<string, unknown>)["public_token"])}`, "_blank")}>
                    <ExternalLink className="size-3.5" /> Abrir link
                  </GhostButton>
                </div>
                <p className="mt-2 text-[11px] text-ink-soft">
                  O link abre assim que o case estiver aprovado. Para entregar, a pessoa informa o e-mail da candidatura.
                </p>
              </div>
            ) : (
              <p className="mb-4 text-[12px] text-ink-soft">Esta vaga ainda não tem case técnico configurado.</p>
            )}
            {data.submissions.length === 0 ? (
              <EmptyState title="Nenhum case enviado ainda" />
            ) : (
              <div className="space-y-3">
                {data.submissions.map((submission) => (
                  <div key={submission.id} className="rounded-[12px] bg-paper/50 p-3 text-[13px]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Chip tone={submission.status === "entregue" ? "teal" : "amber"}>{submission.status}</Chip>
                      <span className="font-mono text-[11px] text-ink-soft">
                        enviado {formatDate(submission.sent_at)} · entregue {formatDate(submission.delivered_at)}
                      </span>
                    </div>
                    {submission.link ? (
                      <a href={submission.link} target="_blank" rel="noreferrer" className="mt-2 block text-brand">
                        {submission.link}
                      </a>
                    ) : null}
                    {submission.notes ? <p className="mt-2">{submission.notes}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        ) : null}

        {tab === "Avaliações" ? (
          <Panel className="lg:col-span-2">
            <SectionTitle title="Avaliações por competência" />
            {data.evaluations.length === 0 ? (
              <EmptyState title="Nenhuma avaliação registrada" />
            ) : (
              <ul className="space-y-2">
                {data.evaluations.map((evaluation) => (
                  <li
                    key={evaluation.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-paper/50 p-3 text-[13px]"
                  >
                    <span>{evaluation.competency ?? "Avaliação geral"}</span>
                    <span className="flex items-center gap-2">
                      {evaluation.notes ? <span className="text-ink-soft">{evaluation.notes}</span> : null}
                      <span className="font-display text-base font-semibold">{evaluation.score ?? "—"}</span>
                      <Chip tone={evaluation.source === "IA" ? "amber" : "teal"}>{evaluation.source}</Chip>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ) : null}

        {tab === "Histórico" ? (
          <Panel className="lg:col-span-2">
            <SectionTitle title="Histórico do candidato" hint="linha do tempo" />
            {data.events.length === 0 ? (
              <EmptyState title="Sem eventos registrados" />
            ) : (
              <ol className="relative space-y-4 border-l border-line pl-5">
                {data.events.map((event) => (
                  <li key={event.id} className="relative">
                    <span className="absolute -left-[26px] top-1.5 size-2 rounded-full bg-brand" />
                    <p className="text-[13px] font-medium">{event.title}</p>
                    {event.detail ? <p className="mt-0.5 text-[12px] text-ink-soft">{event.detail}</p> : null}
                    <p className="mt-0.5 font-mono text-[11px] text-ink-soft">{formatDateTime(event.created_at)}</p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        ) : null}
      </div>
    </>
  );
}

function InterviewForm({
  candidateId,
  companyId,
  stages,
  currentStageId,
  onDone,
}: {
  candidateId: string;
  companyId: string;
  stages: { id: string; name: string }[];
  currentStageId: string | null;
  onDone: (interviewId: string, transcript: string) => void;
}) {
  const [form, setForm] = useState({
    transcript: "",
    interviewer: "",
    stage_id: currentStageId ?? "",
    notes: "",
    positives: "",
    attention_points: "",
    observations: "",
    recommendation: "avancar",
  });

  const save = useMutation({
    mutationFn: async () => {
      const { data: row, error } = await supabase.from("interviews").insert({
        company_id: companyId,
        candidate_id: candidateId,
        stage_id: form.stage_id || null,
        interviewer: form.interviewer || null,
        interviewed_at: new Date().toISOString(),
        notes: form.notes || null,
        positives: form.positives || null,
        attention_points: form.attention_points || null,
        observations: form.observations || null,
        recommendation: form.recommendation,
        transcript: form.transcript.trim() || null,
      }).select("id").single();
      if (error) throw error;
      await supabase.from("candidate_events").insert({
        company_id: companyId,
        candidate_id: candidateId,
        type: "entrevista",
        title: "Entrevista registrada",
        detail: form.interviewer || null,
      });
      return { id: row.id, transcript: form.transcript.trim() };
    },
    onSuccess: (saved) => {
      toast.success("Entrevista registrada");
      setForm({ ...form, notes: "", positives: "", attention_points: "", observations: "", transcript: "" });
      onDone(saved.id, saved.transcript.length >= 50 ? saved.transcript : "");
    },
  });

  return (
    <Panel>
      <SectionTitle title="Registrar entrevista" hint="o que você observou" />
      <div className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Quem entrevistou">
            <TextInput
              value={form.interviewer}
              onChange={(event) => setForm({ ...form, interviewer: event.target.value })}
            />
          </Field>
          <Field label="Etapa">
            <SelectInput
              value={form.stage_id}
              onChange={(event) => setForm({ ...form, stage_id: event.target.value })}
            >
              <option value="">Selecione</option>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <Field
          label="Transcrição da entrevista"
          description="Cole aqui a transcrição da conversa. A IA analisa as falas em relação a esta vaga."
        >
          <TextArea
            rows={6}
            value={form.transcript}
            onChange={(event) => setForm({ ...form, transcript: event.target.value })}
          />
        </Field>
        <Field label="Notas da conversa">
          <TextArea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        </Field>
        <Field label="Pontos positivos">
          <TextArea
            rows={2}
            value={form.positives}
            onChange={(event) => setForm({ ...form, positives: event.target.value })}
          />
        </Field>
        <Field label="Pontos de atenção">
          <TextArea
            rows={2}
            value={form.attention_points}
            onChange={(event) => setForm({ ...form, attention_points: event.target.value })}
          />
        </Field>
        <Field label="Observações">
          <TextArea
            rows={2}
            value={form.observations}
            onChange={(event) => setForm({ ...form, observations: event.target.value })}
          />
        </Field>
        <Field label="Recomendação">
          <SelectInput
            value={form.recommendation}
            onChange={(event) => setForm({ ...form, recommendation: event.target.value })}
          >
            <option value="avancar">Recomendo avançar</option>
            <option value="nao_avancar">Não recomendo avançar</option>
          </SelectInput>
        </Field>
        <BrandButton onClick={() => save.mutate()} disabled={save.isPending}>
          Salvar entrevista
        </BrandButton>
        <p className="text-[11px] text-ink-soft">
          Se você colar a transcrição, a IA gera a análise da entrevista com base em evidências assim que salvar.
        </p>
      </div>
    </Panel>
  );
}

function HireForm({
  candidate,
  companyId,
  onDone,
}: {
  candidate: { id: string; name: string };
  companyId: string;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    role_title: "",
    agreed_salary: "",
    contract_model: "CLT",
    start_date: "",
    hired_at: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("hires").insert({
        company_id: companyId,
        candidate_id: candidate.id,
        role_title: form.role_title || null,
        agreed_salary: form.agreed_salary || null,
        contract_model: form.contract_model,
        start_date: form.start_date || null,
        hired_at: form.hired_at,
        notes: form.notes || null,
      });
      if (error) throw error;
      await supabase.from("candidates").update({ status: "contratado" }).eq("id", candidate.id);
      await supabase.from("candidate_events").insert({
        company_id: companyId,
        candidate_id: candidate.id,
        type: "contratacao",
        title: "Contratado",
        detail: form.role_title || null,
      });
    },
    onSuccess: () => {
      toast.success(`${candidate.name} foi contratado. Parabéns!`);
      onDone();
    },
  });

  return (
    <Panel className="mt-4">
      <SectionTitle title={`Contratar ${candidate.name}`} hint="a decisão final é sua" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Cargo">
          <TextInput value={form.role_title} onChange={(event) => setForm({ ...form, role_title: event.target.value })} />
        </Field>
        <Field label="Salário acordado">
          <TextInput
            value={form.agreed_salary}
            onChange={(event) => setForm({ ...form, agreed_salary: event.target.value })}
          />
        </Field>
        <Field label="Modelo de contratação">
          <SelectInput
            value={form.contract_model}
            onChange={(event) => setForm({ ...form, contract_model: event.target.value })}
          >
            {["CLT", "PJ", "Estágio", "Temporário"].map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Data da contratação">
          <TextInput
            type="date"
            value={form.hired_at}
            onChange={(event) => setForm({ ...form, hired_at: event.target.value })}
          />
        </Field>
        <Field label="Data de início">
          <TextInput
            type="date"
            value={form.start_date}
            onChange={(event) => setForm({ ...form, start_date: event.target.value })}
          />
        </Field>
        <Field label="Observações" className="sm:col-span-2">
          <TextArea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        </Field>
      </div>
      <div className="mt-3 flex gap-2">
        <BrandButton onClick={() => save.mutate()} disabled={save.isPending}>
          Confirmar contratação
        </BrandButton>
        <GhostButton onClick={onDone}>Cancelar</GhostButton>
      </div>
    </Panel>
  );
}

function RejectForm({
  candidateId,
  companyId,
  onDone,
}: {
  candidateId: string;
  companyId: string;
  onDone: () => void;
}) {
  const [reason, setReason] = useState(REJECTION_REASONS[0]!);
  const [notes, setNotes] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("rejections").insert({
        company_id: companyId,
        candidate_id: candidateId,
        reason,
        notes: notes || null,
      });
      if (error) throw error;
      await supabase.from("candidates").update({ status: "nao_avancou" }).eq("id", candidateId);
      await supabase.from("candidate_events").insert({
        company_id: companyId,
        candidate_id: candidateId,
        type: "status",
        title: "Não avançou no processo",
        detail: reason,
      });
    },
    onSuccess: () => {
      toast.success("Registrado. O candidato continua no histórico.");
      onDone();
    },
  });

  return (
    <Panel className="mt-4">
      <SectionTitle title="Não avançou" hint="nada é apagado" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Motivo">
          <SelectInput value={reason} onChange={(event) => setReason(event.target.value)}>
            {REJECTION_REASONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Observação">
          <TextInput value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>
      </div>
      <div className="mt-3 flex gap-2">
        <BrandButton onClick={() => save.mutate()} disabled={save.isPending}>
          Registrar
        </BrandButton>
        <GhostButton onClick={onDone}>Cancelar</GhostButton>
      </div>
    </Panel>
  );
}
