import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { aiConsolidateCompetencies, type ConsolidateResult, type InterviewAnalysis } from "@/lib/ai.functions";
import type { CompatibilityPayload } from "@/lib/compatibility";
import { Chip, Panel, SectionTitle } from "@/components/ui-bits";

type Row = Record<string, unknown>;
type AQ = { situation?: string; question?: string; competency?: string; options?: string[]; scoring?: number[] };

type Signal = "positivo" | "declarado" | "negativo" | "neutro" | "nao_realizada" | "na";
type Source = { stage: string; done: boolean; signal: Signal; summary: string; detail?: string | undefined };
type Status = ConsolidateResult["competencies"][number]["status"];

const NO_GAP = "Sem ponto crítico adicional de validação identificado até o momento.";

const STATUS: Record<Status, { label: string; tone: "brand" | "teal" | "amber" | "rose" | "neutral" }> = {
  consistente: { label: "Evidência consistente", tone: "brand" },
  parcial: { label: "Evidência parcial", tone: "teal" },
  nao_validada: { label: "Ainda não validada", tone: "neutral" },
  divergente: { label: "Evidências divergentes", tone: "amber" },
  contraria: { label: "Evidência contrária", tone: "rose" },
};

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const same = (a: string, b: string) => {
  const x = norm(a);
  const y = norm(b);
  return x === y || x.includes(y) || y.includes(x);
};
const lower1 = (s: string) => s.charAt(0).toLowerCase() + s.slice(1).replace(/\.$/, "");

const NEXT_FOCUS: Record<string, string> = {
  Entrevista: "a entrevista pode aprofundar como isso acontece na prática, qual foi o papel individual da pessoa e quais resultados concretos obteve",
  Case: "o case pode mostrar se a pessoa consegue executar isso diante de um problema real da vaga",
};

export function ConsolidatedView({
  competencies,
  compat,
  hasApplication,
  assessmentQuestions,
  assessmentAnswers,
  hasAssessment,
  interviews,
  hasCase,
  caseEvaluations,
  jobTitle = "",
}: {
  competencies: string[];
  compat: CompatibilityPayload | null;
  hasApplication: boolean;
  assessmentQuestions: AQ[];
  assessmentAnswers: { situation?: string; answer?: string }[] | null;
  hasAssessment: boolean;
  interviews: InterviewAnalysis[];
  hasCase: boolean;
  caseEvaluations: Row[];
  jobTitle?: string;
}) {
  const lastInterview = interviews[interviews.length - 1] ?? null;
  const lastCase = caseEvaluations[caseEvaluations.length - 1] ?? null;
  const caseScores = (lastCase?.["scores"] as Record<string, number> | undefined) ?? {};

  function sourcesFor(c: string): Source[] {
    const out: Source[] = [];

    // Candidatura
    if (!hasApplication) out.push({ stage: "Candidatura", done: false, signal: "nao_realizada", summary: "Ainda não realizada." });
    else {
      const hit = compat?.competencies?.find((x) => same(x.name, c));
      if (!hit)
        out.push({
          stage: "Candidatura",
          done: true,
          signal: "neutro",
          summary: compat ? "Não trouxe informação sobre essa competência." : "Recebida; análise de compatibilidade ainda não gerada.",
        });
      else {
        const signal: Signal =
          hit.status === "evidenciado" ? "positivo" : hit.status === "autodeclarado" ? "declarado" : hit.status === "nao_atende" ? "negativo" : "neutro";
        out.push({ stage: "Candidatura", done: true, signal, summary: hit.evidence });
      }
    }

    // Assessment
    if (!hasAssessment) out.push({ stage: "Assessment", done: false, signal: "na", summary: "Não faz parte desta vaga." });
    else if (!assessmentAnswers?.length) out.push({ stage: "Assessment", done: false, signal: "nao_realizada", summary: "Ainda não realizado." });
    else {
      const qs = assessmentQuestions.filter((q) => q.competency && same(q.competency, c));
      let best = 0;
      let answered = 0;
      const lines: string[] = [];
      for (const q of qs) {
        const a = assessmentAnswers.find((x) => x.situation === q.situation);
        if (!a?.answer) continue;
        answered++;
        const idx = (q.options ?? []).indexOf(a.answer);
        const max = Math.max(...(q.scoring ?? [0]));
        const ok = idx >= 0 && q.scoring?.[idx] === max;
        if (ok) best++;
        lines.push(`${ok ? "✓" : "!"} ${q.situation ?? q.question ?? "Cenário"} — escolheu: "${a.answer}"`);
      }
      if (!answered) out.push({ stage: "Assessment", done: true, signal: "neutro", summary: "Nenhum cenário respondido ligado a essa competência." });
      else {
        const signal: Signal = best === answered ? "positivo" : best === 0 ? "negativo" : "neutro";
        const summary =
          signal === "positivo"
            ? `Escolheu a ação mais aderente ${answered > 1 ? `nos ${answered} cenários relacionados` : "no cenário relacionado"}.`
            : signal === "negativo"
              ? `Não escolheu a alternativa mais aderente ${answered > 1 ? `nos ${answered} cenários relacionados` : "no cenário relacionado"}.`
              : `Escolheu a ação mais aderente em ${best} de ${answered} cenários relacionados.`;
        out.push({ stage: "Assessment", done: true, signal, summary, detail: lines.join("\n") });
      }
    }

    // Entrevista
    if (!lastInterview) out.push({ stage: "Entrevista", done: false, signal: "nao_realizada", summary: "Ainda não realizada." });
    else {
      const hit = lastInterview.competencias?.find((x) => same(x.competencia, c));
      if (!hit) out.push({ stage: "Entrevista", done: true, signal: "neutro", summary: "Não foi abordada na entrevista." });
      else {
        const st = norm(hit.status);
        const signal: Signal = st.includes("contraria") ? "negativo" : st === "validada" ? "positivo" : st.includes("parcial") ? "positivo" : "neutro";
        out.push({
          stage: "Entrevista",
          done: true,
          signal,
          summary: hit.evidencia,
          detail: [hit.fala_literal ? `"${hit.fala_literal}"` : "", hit.observacao].filter(Boolean).join("\n"),
        });
      }
    }

    // Case
    if (!hasCase) out.push({ stage: "Case", done: false, signal: "na", summary: "Não faz parte desta vaga." });
    else if (!lastCase) out.push({ stage: "Case", done: false, signal: "nao_realizada", summary: "Ainda não realizado." });
    else {
      const key = Object.keys(caseScores).find((k) => same(k, c));
      if (!key) out.push({ stage: "Case", done: true, signal: "neutro", summary: "Avaliado, sem critério específico para essa competência." });
      else {
        const n = caseScores[key] ?? 0;
        const signal: Signal = n >= 4 ? "positivo" : n <= 2 ? "negativo" : "neutro";
        out.push({
          stage: "Case",
          done: true,
          signal,
          summary: n >= 4 ? `Demonstrou na execução (nota ${n}/5 em "${key}").` : n <= 2 ? `Teve dificuldade na execução (nota ${n}/5 em "${key}").` : `Execução mediana (nota ${n}/5 em "${key}").`,
          detail: (lastCase["strengths"] as string) || undefined,
        });
      }
    }
    return out;
  }

  function fallback(c: string, src: Source[]) {
    const done = src.filter((s) => s.done);
    const pos = done.filter((s) => s.signal === "positivo");
    const decl = done.filter((s) => s.signal === "declarado");
    const neg = done.filter((s) => s.signal === "negativo");
    const strongNeg = neg.some((s) => s.stage === "Entrevista" || s.stage === "Case");
    const status: Status =
      strongNeg && !pos.length ? "contraria" : neg.length && (pos.length || decl.length) ? "divergente" : pos.length >= 2 && !neg.length ? "consistente" : pos.length || decl.length ? "parcial" : "nao_validada";

    const parts: string[] = [];
    for (const s of [...pos, ...decl]) {
      const verb = s.stage === "Candidatura" ? (s.signal === "declarado" ? "declarou" : "apresentou") : s.stage === "Assessment" ? "mostrou" : s.stage === "Entrevista" ? "sustentou" : "executou";
      parts.push(`Na ${s.stage.toLowerCase()}, ${verb}: ${lower1(s.summary)}.`);
    }
    for (const s of neg) parts.push(`Já no ${s.stage === "Entrevista" || s.stage === "Candidatura" ? "a " : ""}${s.stage.toLowerCase()}, ${lower1(s.summary)}.`.replace("Já no a ", "Já na "));
    let synthesis = parts.join(" ");
    if (!synthesis) synthesis = done.length ? `As etapas realizadas ainda não trouxeram informação concreta sobre ${c.toLowerCase()}.` : "Nenhuma etapa foi realizada ainda.";
    else if (decl.length && !pos.length) synthesis += " Por enquanto é uma declaração, ainda sem comprovação prática.";

    const divergence =
      status === "divergente"
        ? `${[...pos, ...decl].map((s) => s.stage).join(" e ")} ${pos.length + decl.length > 1 ? "apontam" : "aponta"} sinais favoráveis, enquanto ${neg.map((s) => s.stage).join(" e ")} ${neg.length > 1 ? "mostram" : "mostra"} outro comportamento. Isso não significa ausência da competência — vale entender o motivo da diferença.`
        : "";

    const next = src.find((s) => !s.done && s.signal === "nao_realizada" && NEXT_FOCUS[s.stage]);
    let to_validate = NO_GAP;
    if (status !== "consistente" && next) {
      const f = NEXT_FOCUS[next.stage] ?? "";
      to_validate = (status === "divergente" ? `Para esclarecer a divergência, ${f}.` : `${f.charAt(0).toUpperCase()}${f.slice(1)}.`).replace("isso", c.toLowerCase());
    } else if (status !== "consistente" && !next && status !== "nao_validada") to_validate = `Confirmar com referências ou em conversa com o gestor como ${c.toLowerCase()} aparece no dia a dia.`;
    return { name: c, status, synthesis, divergence, to_validate };
  }

  const items = competencies.map((c) => ({ name: c, sources: sourcesFor(c) }));
  const anyDone = items.some((i) => i.sources.some((s) => s.done && s.signal !== "neutro"));
  const payload = {
    job_title: jobTitle,
    competencies: items.map((i) => ({
      name: i.name,
      sources: i.sources.filter((s) => s.signal !== "na").map((s) => ({ stage: s.stage, done: s.done, signal: s.signal, evidence: [s.summary, s.detail].filter(Boolean).join(" | ") })),
    })),
  };

  const consolidate = useServerFn(aiConsolidateCompetencies);
  const ai = useQuery({
    queryKey: ["consolidated", JSON.stringify(payload)],
    queryFn: () => consolidate({ data: payload }),
    enabled: anyDone && items.length > 0,
    staleTime: Infinity,
    retry: false,
  });

  const stages = [
    { label: "Candidatura", fn: "O que declarou e apresentou.", done: hasApplication, na: false },
    { label: "Assessment", fn: "Como escolhe agir nos cenários.", done: !!assessmentAnswers?.length, na: !hasAssessment },
    { label: "Entrevista", fn: "O que sustentou e exemplificou.", done: !!lastInterview, na: false },
    { label: "Case", fn: "O que conseguiu executar.", done: !!lastCase, na: !hasCase },
  ];

  return (
    <Panel className="lg:col-span-2">
      <SectionTitle title="Visão consolidada" hint="o que as etapas já mostraram e o que ainda precisamos descobrir — quem decide é você" />
      <div className="flex flex-wrap gap-2">
        {stages.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5 rounded-full bg-paper/50 px-3 py-1 text-[12px]" title={s.fn}>
            <span className={s.done ? "text-brand" : "text-ink-soft"}>{s.na ? "–" : s.done ? "✓" : "○"}</span>
            <span className={s.done ? "" : "text-ink-soft"}>{s.label}</span>
          </span>
        ))}
        <span className="self-center text-[11px] text-ink-soft">
          {ai.isFetching ? "Cruzando evidências com IA…" : "Etapa não realizada não conta como ponto negativo."}
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {items.length === 0 ? (
          <p className="text-[13px] text-ink-soft">Nenhuma competência cadastrada na vaga.</p>
        ) : (
          items.map((it) => {
            const aiHit = ai.data?.competencies?.find((x) => same(x.name, it.name));
            const r = aiHit ?? fallback(it.name, it.sources);
            return <CompetencyCard key={it.name} name={it.name} r={r} sources={it.sources} />;
          })
        )}
      </div>
    </Panel>
  );
}

function CompetencyCard({
  name,
  r,
  sources,
}: {
  name: string;
  r: { status: Status; synthesis: string; divergence: string; to_validate: string };
  sources: Source[];
}) {
  const [open, setOpen] = useState(false);
  const st = STATUS[r.status] ?? STATUS.nao_validada;
  const icon = (s: Source) =>
    !s.done ? { i: s.signal === "na" ? "–" : "○", c: "text-ink-soft" } : s.signal === "positivo" ? { i: "✓", c: "text-brand" } : s.signal === "declarado" ? { i: "✓", c: "text-teal" } : s.signal === "negativo" ? { i: "!", c: "text-amber" } : { i: "·", c: "text-ink-soft" };

  return (
    <div className="rounded-[12px] bg-paper/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[14px] font-bold uppercase tracking-wide">{name}</p>
        <Chip tone={st.tone}>● {st.label}</Chip>
      </div>

      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-brand">O que as evidências mostram</p>
      <p className="mt-1 text-[13px] leading-relaxed">{r.synthesis}</p>

      {r.divergence ? (
        <div className="mt-2 rounded-[10px] border border-ink/10 bg-panel/60 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Divergência para validação</p>
          <p className="mt-1 text-[12px]">{r.divergence}</p>
        </div>
      ) : null}

      <div className="mt-3 border-t border-ink/10 pt-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Evidências encontradas</p>
          <button type="button" onClick={() => setOpen((v) => !v)} className="text-[11px] text-brand hover:underline">
            {open ? "Ocultar detalhes" : "Ver detalhes"}
          </button>
        </div>
        <ul className="mt-1.5 space-y-1">
          {sources.map((s) => {
            const ic = icon(s);
            return (
              <li key={s.stage} className={`text-[12px] ${s.done ? "" : "text-ink-soft"}`}>
                <span className={`mr-1.5 inline-block w-3 font-bold ${ic.c}`}>{ic.i}</span>
                <span className="font-semibold">{s.stage}</span>
                <span className={s.done ? "text-ink-soft" : ""}> — {s.summary}</span>
                {open && s.detail ? <p className="ml-[18px] mt-0.5 whitespace-pre-line text-[11px] text-ink-soft">{s.detail}</p> : null}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-3 border-t border-ink/10 pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">O que ainda precisa ser validado</p>
        <p className="mt-1 text-[12px]">{r.to_validate || NO_GAP}</p>
      </div>
    </div>
  );
}
