import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Paperclip } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BrandButton, Chip, Field, GhostButton, SelectInput, TextArea, TextInput } from "@/components/ui-bits";
import { salaryLabel } from "@/lib/hiring";
import { profileQuestions } from "@/lib/suggestions";
import { dedupeQuestions } from "@/lib/question-dedupe";

export const Route = createFileRoute("/vaga/$jobId")({
  head: () => ({ meta: [
    { title: "Oportunidade de trabalho — Vetor" },
    { name: "description", content: "Conheça a oportunidade e envie sua candidatura." },
    { property: "og:title", content: "Oportunidade de trabalho — Vetor" },
    { property: "og:description", content: "Conheça a oportunidade e envie sua candidatura." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: PublicJobPage,
});

type Question = { id: string; question: string; options: string[]; answer_type: string | null; is_required: boolean | null; section: string | null; field_key: string | null };
type Scenario = { situation: string; question: string; answer_type?: string; options: string[] };
type Job = { id: string; title: string; sector: string | null; work_mode: string | null; city: string | null; state: string | null; objective: string | null; responsibilities: string | null; routine: string | null; welcome_message: string | null; salary_type: string | null; salary_min: number | null; salary_max: number | null; contract_model: string | null; benefits: string | null; workload: string | null; work_hours: string | null };
type PublicData = { job: Job; qualities: string[]; skills: string[]; questions: Question[]; assessment: { questions: Scenario[]; estimated_minutes?: number } | null };
const rpc = supabase.rpc.bind(supabase) as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
const DEFAULT_WELCOME = "Que bom ter você por aqui!\n\nQueremos conhecer um pouco mais sobre você, sua trajetória e sua forma de trabalhar.\n\nAntes de se candidatar, conheça melhor a oportunidade e o perfil que estamos buscando.";
const headings = ["Sobre você", "Sua experiência", "Conhecendo você melhor", "Revisão"];

function splitItems(value: string | null) {
  if (!value) return [];
  return value.split(/\n|;|(?<=\.)\s+/).map((item) => item.trim().replace(/^[•✓\-\d.)\s]+/, "").replace(/[.;]$/, "")).filter(Boolean);
}

function PublicJobPage() {
  const { jobId } = useParams({ from: "/vaga/$jobId" });
  const [phase, setPhase] = useState(-1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [assessmentAnswers, setAssessmentAnswers] = useState<Record<number, number>>({});
  const [sending, setSending] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["public-job", jobId],
    queryFn: async () => {
      const result = await rpc("get_public_job", { _job_id: jobId });
      if (result.error) throw result.error;
      return result.data as PublicData | null;
    },
  });
  const profile = useMemo(() => {
    const configured = (data?.questions ?? []).filter((q) => (q.section ?? "experiencia") === "perfil");
    if (configured.length) return configured;
    return profileQuestions().map((q) => ({ id: `standard:${q.field_key}`, question: q.question, options: q.options, answer_type: q.answer_type, is_required: q.is_required, section: q.section, field_key: q.field_key }));
  }, [data]);
  const experience = useMemo(() => {
    const list = (data?.questions ?? []).filter((q) => (q.section ?? "experiencia") !== "perfil");
    const existing = profile.map((q) => ({ question: q.question, field_key: q.field_key ?? undefined }));
    return dedupeQuestions(list, existing);
  }, [data, profile]);
  const scenarios = data?.assessment?.questions ?? [];
  const lastFormPhase = scenarios.length ? 2 : 1;
  const reviewPhase = lastFormPhase + 1;
  const total = lastFormPhase + 1;
  const valueOf = (key: string) => {
    const field = profile.find((q) => q.field_key === key);
    return field ? answers[field.id] ?? "" : "";
  };
  const employed = valueOf("employed_now").toLocaleLowerCase("pt-BR").trim().startsWith("sim");
  const visibleProfile = profile.filter((q) => employed || !["current_company", "current_position"].includes(q.field_key ?? ""));
  const relevantQuestions = [...visibleProfile, ...experience];
  function next() {
    const list = phase === 0 ? visibleProfile : experience;
    if (phase <= 1 && list.some((q) => q.is_required && !(answers[q.id] ?? "").trim())) {
      toast.error("Responda os campos obrigatórios para continuar."); return;
    }
    if (phase === 2 && scenarios.some((_, i) => assessmentAnswers[i] === undefined)) {
      toast.error("Responda as situações para continuar."); return;
    }
    setPhase((p) => p + 1);
  }
  async function send() {
    setSending(true);
    try {
      const result = await rpc("apply_to_job_with_access", {
        _job_id: jobId, _name: valueOf("name"), _email: valueOf("email"), _phone: valueOf("phone"),
        _city: valueOf("city"), _state: valueOf("state"), _linkedin: valueOf("linkedin"),
        _employed_now: employed, _current_company: employed ? valueOf("current_company") : "",
        _current_position: employed ? valueOf("current_position") : "", _current_tenure: "", _salary_expectation: "",
        _answers: relevantQuestions.map((q) => ({ question_id: q.id.startsWith("standard:") ? null : q.id, question_text: q.question, answer: answers[q.id] ?? "" })),
        _assessment: scenarios.map((q, i) => ({ question: q.question, situation: q.situation, question_index: i, option_index: assessmentAnswers[i] ?? null, answer: (q.options ?? [])[assessmentAnswers[i] ?? -1] ?? "" })),
      });
      if (result.error) throw result.error;
      if (typeof result.data !== "string") throw new Error("Link não retornado");
      setAccessToken(result.data);
    } catch (error) { console.error(error); toast.error("Não foi possível enviar sua candidatura agora."); }
    finally { setSending(false); }
  }
  if (isLoading) return <div className="grid min-h-screen place-items-center text-ink-soft">Carregando oportunidade…</div>;
  if (!data?.job) return <div className="grid min-h-screen place-items-center px-5 text-center"><p>Esta vaga não está aberta no momento.</p></div>;
  const job = data.job;
  if (accessToken) return <main className="mx-auto grid min-h-screen max-w-2xl content-center px-5 py-16">
    <CheckCircle2 className="mb-5 size-9 text-brand" />
    <h1 className="text-3xl">Candidatura recebida!</h1>
    <p className="mt-6 whitespace-pre-line leading-relaxed text-ink-soft">Obrigado pelo interesse em fazer parte do nosso time.{"\n\n"}Recebemos suas informações e agora nosso time irá analisar seu perfil considerando o que buscamos para esta oportunidade.{"\n\n"}Caso seu perfil avance no processo seletivo, entraremos em contato com as orientações para a próxima etapa.{"\n\n"}Boa sorte!</p>
    <Link to="/acompanhar/$token" params={{ token: accessToken }} className="mt-8 inline-flex w-fit items-center gap-2 rounded bg-brand px-5 py-3 font-semibold text-brand-ink">Acompanhar candidatura <ArrowRight className="size-4" /></Link>
    <p className="mt-4 text-xs text-ink-soft">Guarde o link de acompanhamento. Ele é pessoal e dá acesso às próximas etapas.</p>
  </main>;
  return <main className="min-h-screen bg-background">
    <div className="mx-auto max-w-[800px] px-5 pb-24 pt-10 sm:pt-16">
      <header className="border-b border-line pb-10">
        <p className="eyebrow text-brand">{job.sector || "Oportunidade"}</p>
        <h1 className="mt-3 text-3xl leading-tight sm:text-5xl">{job.title}</h1>
        <p className="mt-4 text-sm text-ink-soft">{[job.work_mode, [job.city, job.state].filter(Boolean).join("/")].filter(Boolean).join(" • ")}</p>
        <div className="mt-4 flex flex-wrap gap-2">{job.contract_model && <Chip>{job.contract_model}</Chip>}{(job.salary_min || job.salary_max) && <Chip>{salaryLabel(job)}</Chip>}{job.benefits && <Chip>{job.benefits}</Chip>}{job.workload && <Chip>{job.workload}</Chip>}{job.work_hours && <Chip>{job.work_hours}</Chip>}</div>
      </header>
      {phase === -1 ? <>
        <section className="border-b border-line py-10"><h2>Bem-vindo(a) ao nosso processo seletivo!</h2><p className="mt-4 whitespace-pre-line leading-relaxed text-ink-soft">{job.welcome_message || DEFAULT_WELCOME}</p></section>
        {job.objective && <section className="border-b border-line py-10"><h2>Sobre a vaga</h2><p className="mt-4 whitespace-pre-line leading-relaxed text-ink-soft">{job.objective}</p></section>}
        {job.responsibilities && <section className="border-b border-line py-10"><h2>O que você fará por aqui</h2><ul className="mt-5 grid gap-3">{splitItems(job.responsibilities).map((item, i) => <li key={i} className="flex gap-3 text-ink-soft"><Check className="mt-1 size-4 shrink-0 text-brand" />{item}</li>)}</ul></section>}
        {(data.qualities.length > 0 || data.skills.length > 0) && <section className="border-b border-line py-10"><h2>O que buscamos em você</h2><ul className="mt-5 grid gap-3 sm:grid-cols-2">{[...new Set([...data.qualities, ...data.skills])].map((item) => <li key={item} className="flex gap-3 text-ink-soft"><Check className="mt-1 size-4 shrink-0 text-brand" />{item}</li>)}</ul></section>}
        {job.routine && <section className="border-b border-line py-10"><h2>Como será sua rotina</h2><p className="mt-4 whitespace-pre-line leading-relaxed text-ink-soft">{job.routine}</p></section>}
        <section className="py-12"><h2>Quer fazer parte do nosso time?</h2><p className="my-4 text-ink-soft">Preencha as próximas etapas para que possamos conhecer melhor seu perfil e sua experiência.</p><BrandButton className="px-6 py-3 uppercase" onClick={() => setPhase(0)}>Começar candidatura <ArrowRight className="size-4" /></BrandButton></section>
      </> : <div className="py-8">
        <div className="mb-8"><p className="eyebrow">{phase === reviewPhase ? "Revisão da candidatura" : `${phase + 1} de ${total} — ${headings[phase]}`}</p><div className="mt-3 h-1 overflow-hidden rounded bg-line"><div className="h-full bg-brand transition-all" style={{ width: `${(Math.min(phase + 1, total) / total) * 100}%` }} /></div></div>
        <h2 className="text-2xl">{phase === 0 ? "Queremos te conhecer melhor" : phase === 1 ? "Queremos conhecer sua experiência" : phase === 2 && scenarios.length ? "Conhecendo você melhor" : "Revise sua candidatura"}</h2>
        <p className="mt-2 text-ink-soft">{phase === 0 ? "Para começar, conte um pouco sobre você." : phase === 1 ? "Agora queremos entender um pouco melhor sua trajetória profissional e suas experiências." : phase === 2 && scenarios.length ? "A seguir, você encontrará algumas situações que podem acontecer na rotina de trabalho. Leia cada cenário com atenção e responda considerando como você realmente agiria no seu dia a dia. Não precisa pensar demais — queremos conhecer um pouco melhor a sua forma de lidar com diferentes situações." : "Confira suas respostas antes de enviar."}</p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {phase < 2 && (phase === 0 ? visibleProfile : experience).map((q) => <QuestionField key={q.id} question={q} value={answers[q.id] ?? ""} onChange={(value) => setAnswers((prev) => ({ ...prev, [q.id]: value }))} />)}
          {phase === 2 && scenarios.length > 0 && scenarios.map((q, i) => <fieldset key={i} className="border-b border-line pb-5 sm:col-span-2"><legend className="mb-1 text-[11px] font-bold uppercase tracking-wider text-brand">Situação {i + 1}</legend><p className="mb-3 leading-relaxed text-ink-soft">{q.situation}</p><p className="mb-3 font-medium">{q.question}</p><div role="radiogroup" aria-label={q.question} className="grid gap-2">{(q.options ?? []).map((option, oi) => { const checked = assessmentAnswers[i] === oi; return <label key={oi} className={`flex cursor-pointer items-start gap-3 rounded-[12px] p-3 ring-1 transition-colors ${checked ? "bg-brand/10 ring-brand" : "bg-paper/40 ring-line hover:ring-ink-soft"}`}><input type="radio" name={`situacao-${i}`} className="mt-1 accent-[var(--brand)]" checked={checked} onChange={() => setAssessmentAnswers((prev) => ({ ...prev, [i]: oi }))} /><span><strong className="mr-1 text-brand">{String.fromCharCode(65 + oi)}.</strong>{option}</span></label>; })}</div></fieldset>)}
          {phase === reviewPhase && <><div className="sm:col-span-2"><h3>Suas respostas</h3></div>{relevantQuestions.map((q) => <div key={q.id} className="border-b border-line pb-3"><p className="text-xs text-ink-soft">{q.question}</p><p className="mt-1">{answers[q.id] || "—"}</p></div>)}{scenarios.map((q, i) => <div key={i} className="border-b border-line pb-3"><p className="text-xs text-ink-soft">{q.question}</p><p className="mt-1">{assessmentAnswers[i] !== undefined ? `${String.fromCharCode(65 + assessmentAnswers[i])}. ${(q.options ?? [])[assessmentAnswers[i]]}` : "—"}</p></div>)}</>}
        </div>
        <div className="mt-10 flex items-center justify-between gap-3"><GhostButton onClick={() => setPhase((p) => p - 1)}><ArrowLeft className="size-4" /> Voltar</GhostButton>{phase < reviewPhase ? <BrandButton onClick={next}>Continuar <ArrowRight className="size-4" /></BrandButton> : <BrandButton disabled={sending} onClick={() => void send()}>{sending ? "Enviando…" : "Enviar candidatura"}</BrandButton>}</div>
      </div>}
    </div>
  </main>;
}

function QuestionField({ question: q, value, onChange }: { question: Question; value: string; onChange: (value: string) => void }) {
  const options = Array.isArray(q.options) ? q.options.map(String) : [];
  const type = q.answer_type ?? "curto";
  const wide = ["aberta", "selecao_multipla", "upload"].includes(type);
  return <Field label={`${q.question}${q.is_required ? " *" : ""}`} className={wide ? "sm:col-span-2" : ""}>
    {type === "aberta" ? <TextArea value={value} onChange={(event) => onChange(event.target.value)} /> : type === "selecao_multipla" ? <MultiSelect options={options} value={value} onChange={onChange} /> : type === "selecao_unica" ? <SingleSelect options={options} value={value} onChange={onChange} /> : type === "upload" ? <ResumeUpload value={value} onChange={onChange} /> : <TextInput type={type === "numero" ? "number" : type === "data" ? "date" : q.field_key === "email" ? "email" : "text"} value={value} onChange={(event) => onChange(event.target.value)} />}
  </Field>;
}

function isOutro(option: string) {
  return /^outros?$/.test(option.trim().toLowerCase());
}

function SingleSelect({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) {
  const outroOpt = options.find(isOutro) ?? null;
  const hasOutro = !!outroOpt && value.startsWith(outroOpt);
  const detail = hasOutro && outroOpt ? value.slice(outroOpt.length).replace(/^\s*[:\-\u2014]?\s*/, "") : "";
  return <div className="grid gap-3">
    <SelectInput value={hasOutro && outroOpt ? outroOpt : value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Selecione</option>
      {(options.length ? options : ["Sim", "Não"]).map((option) => <option key={option} value={option}>{option}</option>)}
    </SelectInput>
    {outroOpt && hasOutro && <TextInput value={detail} placeholder="Qual? Especifique aqui" onChange={(event) => onChange(event.target.value.trim() ? `${outroOpt}: ${event.target.value.trim()}` : outroOpt!)} />}
  </div>;
}

function MultiSelect({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) {
  const outroOpt = options.find(isOutro) ?? null;
  const selected = value.split(" · ").filter(Boolean);
  const detailItem = outroOpt ? selected.find((item) => item.startsWith(outroOpt)) : undefined;
  const detail = detailItem && outroOpt ? detailItem.slice(outroOpt.length).replace(/^\s*[:\-\u2014]?\s*/, "") : "";
  const toggle = (option: string, checked: boolean) => {
    if (checked) onChange([...selected, option].join(" · "));
    else onChange(selected.filter((item) => item !== option && !(outroOpt && item.startsWith(outroOpt))).join(" · "));
  };
  return <div className="grid gap-2">
    {options.map((option) => <label key={option} className="flex gap-2"><input type="checkbox" checked={outroOpt && option === outroOpt ? !!detailItem : selected.includes(option)} onChange={(event) => toggle(option, event.target.checked)} />{option}</label>)}
    {outroOpt && !!detailItem && <TextInput value={detail} placeholder="Qual? Especifique aqui" onChange={(event) => {
      const text = event.target.value.trim();
      onChange(selected.map((item) => (outroOpt && item.startsWith(outroOpt) ? (text ? `${outroOpt}: ${text}` : outroOpt) : item)).join(" · "));
    }} />}
  </div>;
}

const FILE_PREFIX = "arquivo:";

function ResumeUpload({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const fileName = value.startsWith(FILE_PREFIX) ? value.slice(FILE_PREFIX.length).split("/").pop()?.replace(/^[0-9a-f-]{36}-/, "") : null;
  const linkValue = value.startsWith(FILE_PREFIX) ? "" : value;

  async function upload(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("O arquivo pode ter no máximo 10 MB.");
      return;
    }
    setUploading(true);
    try {
      const path = `${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const { error } = await supabase.storage.from("curriculos").upload(path, file);
      if (error) throw error;
      onChange(`${FILE_PREFIX}${path}`);
      toast.success("Currículo anexado!");
    } catch (error) {
      console.error(error);
      toast.error("Não conseguimos anexar o arquivo. Tente novamente ou cole o link.");
    } finally {
      setUploading(false);
    }
  }

  return <div className="grid gap-3">
    <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ""; }} />
    {fileName ? (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-brand/40 bg-brand/10 px-4 py-3 text-sm">
        <span className="flex items-center gap-2 truncate"><Paperclip className="size-4 shrink-0 text-brand" /> {fileName}</span>
        <button type="button" className="shrink-0 text-xs text-ink-soft underline" onClick={() => onChange("")}>remover</button>
      </div>
    ) : (
      <GhostButton type="button" disabled={uploading} onClick={() => inputRef.current?.click()}>
        <Paperclip className="size-4" /> {uploading ? "Anexando…" : "Anexar currículo (PDF, Word ou imagem)"}
      </GhostButton>
    )}
    {!fileName && <>
      <p className="text-center text-xs text-ink-soft">ou</p>
      <TextInput value={linkValue} onChange={(event) => onChange(event.target.value)} placeholder="Cole o link do currículo" />
    </>}
  </div>;
}
