import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, ExternalLink, Eye, EyeOff, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BrandButton, Chip, EmptyState, GhostButton, Panel, SectionTitle } from "@/components/ui-bits";
import { CaseStep } from "@/components/case-step";
import { CASE_STATUS_LABEL, emptyCaseConfig, fallbackCase, isCaseComplete, type CaseConfig } from "@/lib/case-module";
import { aiGenerateTechnicalCase } from "@/lib/ai.functions";

type Row = Record<string, unknown>;

const SEND_OPTIONS = [
  { value: "triagem", label: "Após a triagem", hint: "Quando o candidato for selecionado na triagem." },
  { value: "entrevista", label: "Após entrevista com RH", hint: "Depois da entrevista inicial." },
  { value: "entrevista_gestor", label: "Após entrevista com o gestor", hint: "Depois da conversa com o gestor da área." },
];

function toConfig(row: Row): CaseConfig {
  const base = emptyCaseConfig();
  const text = (key: string, fallbackValue = "") => (typeof row[key] === "string" ? (row[key] as string) : fallbackValue);
  const arr = (key: string) => (Array.isArray(row[key]) ? (row[key] as string[]) : []);
  return {
    ...base,
    enabled: true,
    title: text("title"),
    objective: text("objective"),
    evaluate_what: text("evaluate_what") ? text("evaluate_what").split(", ").filter(Boolean) : [],
    modality: text("modality", base.modality),
    tools: arr("tools"),
    tool_required: Boolean(row["tool_required"]),
    deliverables: arr("deliverables"),
    delivery_description: text("delivery_description"),
    prep_deadline: text("prep_deadline", base.prep_deadline),
    deadline_days: row["deadline_days"] ? String(row["deadline_days"]) : base.deadline_days,
    needs_presentation: row["needs_presentation"] !== false,
    presentation_format: text("presentation_format", base.presentation_format),
    presentation_minutes: Number(row["presentation_minutes"] ?? base.presentation_minutes),
    questions_minutes: Number(row["questions_minutes"] ?? base.questions_minutes),
    scheduling_mode: text("scheduling_mode", base.scheduling_mode),
    agenda_link: text("agenda_link"),
    meet_link: text("meet_link"),
    criteria: text("criteria") ? text("criteria").split(", ").filter(Boolean) : [],
    content: text("content"),
    sections: Array.isArray(row["sections"]) ? (row["sections"] as CaseConfig["sections"]) : [],
    evaluator_questions: arr("evaluator_questions"),
    status: text("status", "nao_gerado"),
    version: Number(row["version"] ?? 1),
  };
}

export function JobCaseTab({
  jobCase,
  job,
  competencies,
  skills,
  requirements,
  candidates = [],
  stages = [],
  onSaved,
}: {
  jobCase: Row | null;
  candidates: { id: string; name: string; access_token: string; stage_id: string | null }[];
  stages: { id: string; stage_key: string | null; name: string }[];
  job: { id: string; company_id: string; title: string; sector?: string | null; work_mode?: string | null; city?: string | null; state?: string | null; contract_model?: string | null; objective?: string | null; responsibilities?: string | null; routine?: string | null; expected_results?: string | null; challenges?: string | null; company_name?: string | null };
  competencies: string[];
  skills: string[];
  requirements: string[];
  onSaved: () => void;
}) {
  const [config, setConfig] = useState<CaseConfig>(() => (jobCase ? toConfig(jobCase) : { ...emptyCaseConfig(), enabled: true }));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const approved = Boolean(jobCase?.["approved_at"]);
  const [sendAfter, setSendAfter] = useState<string>(String(jobCase?.["send_after"] ?? "entrevista"));
  const [preview, setPreview] = useState(false);
  const [shareCandidateId, setShareCandidateId] = useState<string>(candidates[0]?.id ?? "");
  const shareCandidate = candidates.find((c) => c.id === shareCandidateId) ?? candidates[0] ?? null;
  const caseStage = stages.find((s) => s.stage_key === "case") ?? null;
  const shareStage = shareCandidate ? stages.find((s) => s.id === shareCandidate.stage_id) ?? null : null;
  const shareInCaseStage = Boolean(shareStage && shareStage.stage_key === "case");
  const [moving, setMoving] = useState(false);

  async function moveToCaseStage() {
    if (!shareCandidate || !caseStage) return;
    setMoving(true);
    try {
      const { error } = await supabase.from("candidates").update({ stage_id: caseStage.id }).eq("id", shareCandidate.id);
      if (error) throw error;
      await supabase.from("candidate_events").insert({
        company_id: job.company_id,
        candidate_id: shareCandidate.id,
        type: "etapa",
        title: "Movido para Case técnico",
        detail: "Movido ao divulgar o case",
      });
      toast.success(`${shareCandidate.name.split(" ")[0]} agora está na etapa Case técnico. O link já abre o case.`);
      onSaved();
    } catch (error) {
      console.error(error);
      toast.error("Não conseguimos mover o candidato agora.");
    } finally {
      setMoving(false);
    }
  }

  useEffect(() => {
    if (jobCase) {
      setConfig(toConfig(jobCase));
      setSendAfter(String(jobCase["send_after"] ?? "entrevista"));
    }
  }, [jobCase]);

  const context = {
    objective: job.objective ?? "",
    responsibilities: job.responsibilities ?? "",
    routine: job.routine ?? "",
    expected_results: job.expected_results ?? "",
    challenges: job.challenges ?? "",
  };

  async function generate() {
    setLoading(true);
    const reserva = fallbackCase({
      jobTitle: job.title,
      companyName: job.company_name ?? "a empresa",
      context,
      config,
      competencies,
      skills,
    });
    try {
      const result = await aiGenerateTechnicalCase({
        data: {
          basics: {
            title: job.title,
            sector: job.sector ?? "",
            work_mode: job.work_mode ?? "",
            city: job.city ?? "",
            state: job.state ?? "",
            contract_model: job.contract_model ?? "",
          },
          context,
          company: job.company_name ?? "",
          competencies,
          skills,
          requirements,
          config: {
            evaluate_what: config.evaluate_what,
            modality: config.modality,
            tools: config.tools,
            tool_required: config.tool_required,
            deliverables: config.deliverables,
            delivery_description: config.delivery_description,
            prep_deadline: config.prep_deadline,
            needs_presentation: config.needs_presentation,
            presentation_format: config.presentation_format,
            presentation_minutes: config.presentation_minutes,
            questions_minutes: config.questions_minutes,
            criteria: config.criteria,
          },
        },
      });
      const sections = result.sections.filter((section) => section.title.trim() && section.content.trim());
      setConfig((prev) => ({
        ...prev,
        title: result.title || reserva.title,
        sections: sections.length ? sections : reserva.sections,
        evaluator_questions: result.evaluator_questions.length ? result.evaluator_questions : reserva.evaluator_questions,
        status: "aguardando_aprovacao",
      }));
      toast.success("Case gerado com IA. Revise antes de aprovar.");
    } catch (error) {
      console.error(error);
      setConfig((prev) => ({
        ...prev,
        title: prev.title || reserva.title,
        sections: reserva.sections,
        evaluator_questions: reserva.evaluator_questions,
        status: "aguardando_aprovacao",
      }));
      toast.error("A IA não respondeu agora. Montei uma primeira versão para você revisar.");
    } finally {
      setLoading(false);
    }
  }

  function payload(status: string, extra: Row = {}) {
    return {
      company_id: job.company_id,
      job_id: job.id,
      title: config.title || `Case — ${job.title}`,
      objective: config.objective || null,
      evaluate_what: config.evaluate_what.join(", ") || null,
      deadline_days: config.deadline_days ? Number(config.deadline_days) : null,
      delivery_format: config.deliverables.join(", ") || null,
      criteria: config.criteria.join(", ") || null,
      content: config.content || null,
      modality: config.modality,
      tools: config.tools,
      tool_required: config.tool_required,
      deliverables: config.deliverables,
      delivery_description: config.delivery_description || null,
      prep_deadline: config.prep_deadline || null,
      needs_presentation: config.needs_presentation,
      presentation_format: config.presentation_format || null,
      presentation_minutes: config.presentation_minutes,
      questions_minutes: config.questions_minutes,
      scheduling_mode: config.scheduling_mode || null,
      agenda_link: config.agenda_link || null,
      meet_link: config.meet_link || null,
      sections: config.sections,
      evaluator_questions: config.evaluator_questions,
      status,
      send_after: sendAfter,
      ...extra,
    };
  }

  async function persist(status: string, extra: Row = {}) {
    setSaving(true);
    try {
      if (jobCase?.["id"]) {
        const { error } = await supabase
          .from("job_cases")
          .update(payload(status, extra))
          .eq("id", jobCase["id"] as string);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("job_cases").insert(payload(status, extra));
        if (error) throw error;
      }
      await placeCaseStage();
      onSaved();
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Não conseguimos salvar o case agora.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  // Coloca a etapa de case logo após a etapa escolhida, para o acesso ser liberado no momento certo.
  async function placeCaseStage() {
    const { data: stages } = await supabase.from("job_stages").select("id,stage_key,position").eq("job_id", job.id).order("position");
    if (!stages?.length) return;
    const caseStage = stages.find((s) => s.stage_key === "case");
    const rest = stages.filter((s) => s.stage_key !== "case");
    if (!caseStage) return;
    const anchor = rest.findIndex((s) => s.stage_key === sendAfter);
    if (anchor < 0) return;
    const ordered = [...rest.slice(0, anchor + 1), caseStage, ...rest.slice(anchor + 1)];
    await Promise.all(
      ordered.map((s, index) => (s.position === index ? null : supabase.from("job_stages").update({ position: index }).eq("id", s.id))),
    );
  }

  async function save() {
    // Editar um case já aprovado gera nova versão e exige nova aprovação.
    const needsNewApproval = approved;
    const ok = await persist(needsNewApproval ? "aguardando_aprovacao" : config.sections.length ? "aguardando_aprovacao" : "rascunho", {
      ...(needsNewApproval ? { approved_at: null, approved_by: null, version: config.version + 1 } : {}),
    });
    if (ok) {
      toast.success(needsNewApproval ? "Nova versão salva. Aprove novamente para atualizar o link do candidato." : "Case salvo.");
    }
  }

  async function approve() {
    if (!isCaseComplete(config)) {
      toast.error("Complete todas as seções antes de aprovar.");
      return;
    }
    const { data: user } = await supabase.auth.getUser();
    const ok = await persist("aprovado", {
      approved_at: new Date().toISOString(),
      approved_by: user.user?.id ?? null,
      version: config.version,
    });
    if (ok) toast.success("Case aprovado. Cada candidato terá acesso quando chegar à etapa de case.");
  }

  return (
    <div className="grid gap-4">
      {jobCase ? (
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <SectionTitle title={config.title || `Case — ${job.title}`} hint={`versão ${config.version}`} />
              <div className="flex items-center gap-2">
                <Chip tone={approved ? "brand" : "amber"}>
                  {approved ? "Publicado" : CASE_STATUS_LABEL[config.status] ?? config.status}
                </Chip>
                {jobCase["approved_at"] ? (
                  <span className="text-[12px] text-ink-soft">
                    aprovado em {new Date(String(jobCase["approved_at"])).toLocaleDateString("pt-BR")}
                  </span>
                ) : null}
              </div>
            </div>
            <GhostButton type="button" onClick={() => setPreview((v) => !v)} disabled={!config.sections.length}>
              {preview ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />} {preview ? "Fechar visualização" : "Ver o case como o candidato"}
            </GhostButton>
          </div>
        </Panel>
      ) : (
        <EmptyState
          title="Esta vaga ainda não tem case técnico"
          hint="Configure abaixo, gere com IA, revise e aprove para publicar o link do candidato."
        />
      )}

      <Panel>
        <SectionTitle title="Quando o case será enviado ao candidato?" hint="envio" />
        <div className="grid gap-2 sm:grid-cols-3">
          {SEND_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSendAfter(option.value)}
              className={`rounded-[12px] p-3 text-left text-[13px] ring-1 transition-colors ${sendAfter === option.value ? "bg-brand text-brand-ink ring-brand" : "bg-paper/50 ring-white/10 hover:ring-brand/60"}`}
            >
              <p className="font-medium">{option.label}</p>
              <p className={`mt-1 text-[12px] ${sendAfter === option.value ? "text-brand-ink/80" : "text-ink-soft"}`}>{option.hint}</p>
            </button>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-ink-soft">
          O candidato só recebe o case quando você o mover para a etapa "Case técnico" no funil. Nada é enviado antes disso, e só depois que o case estiver aprovado.
        </p>
      </Panel>

      <Panel>
        <SectionTitle title="Divulgar o case" hint="link único" />
        {!jobCase || !approved ? (
          <p className="text-[12px] text-ink-soft">Aprove o case para liberar o link. O mesmo link serve para todos os candidatos.</p>
        ) : (
          <>
            <p className="text-[12px] text-ink-soft">
              Este é o link do case desta vaga, igual para todos os candidatos. Ao abrir, a pessoa vê o objetivo, o briefing, o que entregar, o prazo, os critérios e o link da agenda.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="rounded-[12px] bg-paper/60 px-3 py-2 text-[12px] ring-1 ring-white/10">{`/case/${String(jobCase["public_token"])}`}</code>
              <BrandButton
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(`${window.location.origin}/case/${String(jobCase["public_token"])}`);
                  toast.success("Link do case copiado");
                }}
              >
                <Copy className="size-3.5" /> Copiar link do case
              </BrandButton>
              <GhostButton type="button" onClick={() => window.open(`/case/${String(jobCase["public_token"])}`, "_blank")}>
                <ExternalLink className="size-3.5" /> Abrir link
              </GhostButton>
            </div>
            <p className="mt-2 text-[11px] text-ink-soft">Para enviar a entrega, o candidato informa o e-mail usado na candidatura.</p>
          </>
        )}
      </Panel>

      {preview ? (
        <Panel>
          {approved ? (
            <div className="mb-4 rounded-[12px] bg-brand/15 p-3 text-[13px] ring-1 ring-brand/40">
              <Check className="mr-1 inline size-4 text-brand" /> <strong>Aprovado.</strong> É isso aqui que o candidato vai ver.
            </div>
          ) : (
            <div className="mb-4 rounded-[12px] bg-amber/15 p-3 text-[13px] ring-1 ring-amber/40">
              Prévia do que o candidato vai ver. Aprove o case para que ele possa ser enviado.
            </div>
          )}
          <h3 className="font-display text-[18px] font-bold">{config.title || `Case — ${job.title}`}</h3>
          <div className="mt-3 grid gap-3">
            {config.sections.map((section, index) => (
              <div key={index} className="rounded-[12px] bg-paper/50 p-3">
                <p className="text-[13px] font-semibold">{section.title}</p>
                <p className="mt-1 whitespace-pre-line text-[14px] text-ink-soft">{section.content}</p>
              </div>
            ))}
          </div>
          {!approved ? (
            <div className="mt-4">
              <BrandButton type="button" onClick={() => void approve()} disabled={saving || !isCaseComplete(config)}>
                <Check className="size-3.5" /> Aprovar este case
              </BrandButton>
            </div>
          ) : null}
        </Panel>
      ) : null}

      <CaseStep
        config={config}
        onChange={setConfig}
        showEnabledToggle={false}
        extraEvaluateOptions={[...competencies, ...skills]}
        aiLoading={loading}
        onGenerate={() => void generate()}
      />

      <div className="flex flex-wrap gap-2 pb-8">
        <GhostButton type="button" onClick={() => void save()} disabled={saving}>
          <Check className="size-3.5" /> {saving ? "Salvando…" : "Salvar case"}
        </GhostButton>
        <BrandButton type="button" onClick={() => void approve()} disabled={saving || !isCaseComplete(config)}>
          <Check className="size-3.5" /> Aprovar case
        </BrandButton>
      </div>
    </div>
  );
}
