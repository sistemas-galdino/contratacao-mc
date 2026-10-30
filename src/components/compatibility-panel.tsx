import { AlertTriangle, CheckCircle2, CircleHelp, CircleX, Sparkles } from "lucide-react";
import { BrandButton, Chip, Panel, SectionTitle } from "@/components/ui-bits";
import { analysisStatus, classify, MIN_CONFIDENCE, type CompatibilityPayload } from "@/lib/compatibility";

const REQ_STATUS: Record<string, { label: string; icon: typeof CheckCircle2; cls: string }> = {
  atende: { label: "Atende", icon: CheckCircle2, cls: "text-brand" },
  nao_atende: { label: "Não atende", icon: CircleX, cls: "text-rose" },
  nao_validado: { label: "Não foi possível validar", icon: CircleHelp, cls: "text-ink-soft" },
  declarado: { label: "Declarado — requer validação", icon: AlertTriangle, cls: "text-amber" },
};

const COMP_STATUS: Record<string, { label: string; tone: "brand" | "amber" | "neutral" | "rose" }> = {
  evidenciado: { label: "Evidência prática", tone: "brand" },
  autodeclarado: { label: "Autodeclarado", tone: "amber" },
  nao_validado: { label: "Não validado", tone: "neutral" },
  nao_atende: { label: "Não atende", tone: "rose" },
};

const DIM_TYPE: Record<string, string> = {
  evidencia: "Evidenciado",
  autodeclarado: "Autodeclarado",
  nao_validado: "Não validado",
  nao_atende: "Não atende",
};

function Dot({ status }: { status: string }) {
  const cls =
    status === "atende" ? "bg-brand" : status === "nao_atende" ? "bg-rose" : status === "declarado" ? "bg-amber" : "bg-ink-soft/50";
  return <span className={`inline-block size-2.5 shrink-0 rounded-full ${cls}`} />;
}

function Bar({ value }: { value: number | null }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
      {value !== null ? <div className="h-full rounded-full bg-brand" style={{ width: `${value}%` }} /> : null}
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-ink-soft">{title}</p>
      <ul className="mt-1.5 space-y-1 text-[13px]">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-brand">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CompatibilityPanel({
  analysis,
  candidateName,
  jobTitle,
  createdAt,
  loading,
  onRun,
}: {
  analysis: CompatibilityPayload | null;
  candidateName: string;
  jobTitle: string;
  createdAt?: string | undefined;
  loading: boolean;
  onRun: () => void;
}) {
  const runButton = (
    <BrandButton onClick={onRun} disabled={loading}>
      <Sparkles className={`size-3.5 ${loading ? "animate-pulse" : ""}`} />
      {loading ? "Analisando…" : analysis ? "Refazer análise" : "Analisar compatibilidade"}
    </BrandButton>
  );

  if (!analysis) {
    return (
      <Panel className="lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle title="Compatibilidade com a vaga" hint="compara as respostas com o que esta vaga exige" />
          {runButton}
        </div>
      </Panel>
    );
  }

  const knockouts = analysis.requirements.filter((r) => r.knockout && r.status === "nao_atende");
  const status = analysisStatus(analysis);
  const cls = analysis.compatibility !== null ? classify(analysis.compatibility) : null;
  const evidenced = analysis.competencies.filter((c) => c.status === "evidenciado");
  const declared = analysis.competencies.filter((c) => c.status === "autodeclarado");
  const StatusIcon = status.icon === "ok" ? CheckCircle2 : status.icon === "warn" ? AlertTriangle : CircleHelp;

  return (
    <>
      {/* VISÃO EXECUTIVA */}
      <Panel className="lg:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Visão executiva · {jobTitle}</p>
            <h2 className="mt-1 text-[18px] font-bold">{candidateName}</h2>
          </div>
          {runButton}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr]">
          <div className="rounded-2xl border border-line bg-paper p-4">
            <p className="text-[11px] uppercase tracking-wide text-ink-soft">Compatibilidade com a vaga</p>
            {analysis.conclusive && cls ? (
              <>
                <p className="mt-1 font-display text-5xl font-semibold text-brand">{analysis.compatibility}%</p>
                <div className="mt-2">
                  <Chip tone={cls.tone}>{cls.label}</Chip>
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 text-[15px] font-bold text-amber">Compatibilidade ainda inconclusiva</p>
                <p className="mt-1 text-[12px] text-ink-soft">
                  Não existem informações suficientes para determinar a compatibilidade com segurança.
                </p>
              </>
            )}
            <div className="mt-3">
              <div className="flex justify-between text-[11px] text-ink-soft">
                <span>Confiança da análise</span>
                <span>{analysis.final_confidence}%</span>
              </div>
              <Bar value={analysis.final_confidence} />
              <p className="mt-1 text-[10px] text-ink-soft">Mínimo para conclusão: {MIN_CONFIDENCE}%</p>
            </div>
          </div>

          <div className="grid content-start gap-3">
            <div className="flex flex-wrap gap-2">
              {analysis.highlights.map((h, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1 text-[12px]">
                  <Dot status={h.status} />
                  <span className="font-medium">{h.label}</span>
                  <span className="text-ink-soft">— {h.short}</span>
                </span>
              ))}
            </div>

            {knockouts.length ? (
              <div className="rounded-xl border border-rose/50 bg-rose/10 p-3">
                <p className="flex items-center gap-2 text-[13px] font-bold text-rose">
                  <AlertTriangle className="size-4" /> {knockouts.length} requisito
                  {knockouts.length > 1 ? "s eliminatórios não atendidos" : " eliminatório não atendido"}
                </p>
                {knockouts.map((r, i) => (
                  <div key={i} className="mt-2 text-[13px]">
                    <p className="font-medium">
                      {r.description} — <span className="text-rose">NÃO ATENDE</span>
                    </p>
                    {r.evidence ? <p className="text-[12px] text-ink-soft">Evidência: “{r.evidence}”</p> : null}
                  </div>
                ))}
              </div>
            ) : null}

            <p className="flex items-center gap-2 text-[13px]">
              <StatusIcon className={`size-4 ${status.icon === "ok" ? "text-brand" : status.icon === "warn" ? "text-rose" : "text-amber"}`} />
              <span className="font-medium">Status da análise:</span> {status.text}
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-line p-3">
                <p className="text-[11px] uppercase tracking-wide text-brand">Por que é compatível?</p>
                <p className="mt-1 text-[13px]">{analysis.why_compatible || "—"}</p>
              </div>
              <div className="rounded-xl border border-line p-3">
                <p className="text-[11px] uppercase tracking-wide text-amber">O que reduz a compatibilidade?</p>
                <p className="mt-1 text-[13px]">{analysis.what_reduces || "—"}</p>
              </div>
            </div>
          </div>
        </div>

        {!analysis.conclusive && analysis.to_validate.length ? (
          <div className="mt-4 rounded-xl border border-amber/40 p-3">
            <List title="Dados que ainda precisam ser validados" items={analysis.to_validate} />
          </div>
        ) : null}

        <p className="mt-3 text-[11px] text-ink-soft">
          A IA analisa e mostra as evidências. A decisão final é sempre do recrutador.
          {createdAt ? ` · Análise de ${new Date(createdAt).toLocaleString("pt-BR")}` : ""}
        </p>
      </Panel>

      {/* COMPOSIÇÃO */}
      <Panel>
        <SectionTitle title="Composição da compatibilidade" />
        <div className="grid gap-3">
          {analysis.dimensions.map((d) => (
            <div key={d.key}>
              <div className="flex items-center justify-between gap-2 text-[13px]">
                <span className="font-medium">{d.label}</span>
                <span className="flex items-center gap-2">
                  <span className="text-[11px] text-ink-soft">{DIM_TYPE[d.evidence_type]}</span>
                  <span className="font-mono text-brand">{d.score === null ? "—" : `${Math.round(d.score)}%`}</span>
                </span>
              </div>
              <Bar value={d.score === null ? null : Math.round(d.score)} />
              <p className="mt-1 text-[12px] text-ink-soft">{d.justification}</p>
            </div>
          ))}
        </div>
      </Panel>

      {/* REQUISITOS */}
      <Panel>
        <SectionTitle title="Requisitos da vaga" />
        <div className="grid gap-2">
          {analysis.requirements.map((r, i) => {
            const meta = (REQ_STATUS[r.status] ?? REQ_STATUS["nao_validado"])!;
            const Icon = meta.icon;
            return (
              <div key={i} className={`rounded-xl border p-2.5 ${r.knockout ? "border-rose/40" : "border-line"}`}>
                <div className="flex items-start gap-2 text-[13px]">
                  <Icon className={`mt-0.5 size-4 shrink-0 ${meta.cls}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{r.description}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Chip tone={r.status === "atende" ? "brand" : r.status === "nao_atende" ? "rose" : r.status === "declarado" ? "amber" : "neutral"}>
                        {meta.label}
                      </Chip>
                      {r.knockout ? <Chip tone="rose">Eliminatório</Chip> : r.mandatory ? <Chip>Obrigatório</Chip> : <Chip>Desejável</Chip>}
                    </div>
                    {r.evidence ? <p className="mt-1 text-[12px] text-ink-soft">{r.evidence}</p> : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* COMPETÊNCIAS */}
      <Panel>
        <SectionTitle title="Competências e habilidades" hint={`${evidenced.length} evidenciadas · ${declared.length} autodeclaradas`} />
        <div className="grid gap-2">
          {analysis.competencies.map((c, i) => {
            const meta = (COMP_STATUS[c.status] ?? COMP_STATUS["nao_validado"])!;
            return (
              <div key={i} className="text-[13px]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{c.name}</span>
                  <Chip tone={meta.tone}>{meta.label}</Chip>
                  <span className="text-[11px] text-ink-soft">{c.kind === "competencia" ? "Comportamental" : "Técnica"}</span>
                </div>
                {c.evidence ? <p className="mt-0.5 text-[12px] text-ink-soft">{c.evidence}</p> : null}
              </div>
            );
          })}
        </div>
      </Panel>

      {/* ANÁLISE COMPLETA */}
      <Panel>
        <SectionTitle title="Análise completa" />
        <div className="grid gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-ink-soft">Resumo do perfil</p>
            <p className="mt-1 text-[13px]">{analysis.profile_summary}</p>
          </div>
          {analysis.justification ? (
            <div>
              <p className="text-[11px] uppercase tracking-wide text-ink-soft">Justificativa da compatibilidade</p>
              <p className="mt-1 text-[13px]">{analysis.justification}</p>
            </div>
          ) : null}
          <List title="Pontos fortes" items={analysis.strengths} />
          <List title="Pontos de atenção" items={analysis.attention_points} />
        </div>
      </Panel>

      <Panel>
        <SectionTitle title="Evidências encontradas" />
        <div className="grid gap-2">
          {analysis.evidences.length ? (
            analysis.evidences.map((e, i) => (
              <div key={i} className="border-l-2 border-brand pl-3 text-[13px]">
                <p className="italic">“{e.quote}”</p>
                <p className="text-[12px] text-ink-soft">{e.supports}</p>
              </div>
            ))
          ) : (
            <p className="text-[13px] text-ink-soft">Nenhuma evidência prática encontrada nas respostas.</p>
          )}
        </div>
      </Panel>

      <Panel>
        <div className="grid gap-4">
          <List title="Informações que precisam ser validadas" items={analysis.to_validate} />
          <List title="Perguntas recomendadas para entrevista" items={analysis.interview_questions} />
        </div>
      </Panel>
    </>
  );
}
