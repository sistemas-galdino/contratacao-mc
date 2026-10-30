import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { AssessmentResult } from "@/lib/assessment-scoring";
import { Chip } from "@/components/ui-bits";

export function AssessmentResults({ result }: { result: AssessmentResult }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!result.skills.length) return <p className="text-[13px] text-ink-soft">Não foi possível relacionar as respostas às situações cadastradas.</p>;
  return (
    <div className="space-y-4">
      {result.compatibility !== null ? (
        <div className="rounded-[12px] bg-paper/50 p-4 ring-1 ring-white/5">
          <p className="text-[11px] uppercase tracking-wider text-ink-soft">Compatibilidade com as habilidades</p>
          <p className="font-display text-[28px] font-bold text-brand">{result.compatibility}%</p>
          <p className="text-[11px] text-ink-soft">Média ponderada pela importância (essencial 3, importante 2, complementar 1). Apoia a análise — não decide.</p>
          <div className="mt-3 grid gap-3 text-[13px] sm:grid-cols-3">
            <List title="Pontos com maior evidência" items={result.strongest} />
            <List title="Pontos com menor evidência" items={result.weakest} />
            <List title="Aprofundar na entrevista" items={result.to_deepen} />
          </div>
        </div>
      ) : null}
      <div>
        <p className="mb-2 text-[12px] font-bold uppercase tracking-wider text-ink-soft">Resultado por habilidades</p>
        <div className="space-y-2">
          {result.skills.map((s) => (
            <div key={s.skill} className="rounded-[12px] bg-paper/50 ring-1 ring-white/5">
              <button type="button" onClick={() => setOpen(open === s.skill ? null : s.skill)} className="w-full p-3 text-left">
                <div className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="font-medium">{s.skill} <Chip>{s.importance}</Chip></span>
                  <span className="flex items-center gap-1 font-bold text-brand">{s.score}/100 <ChevronDown className={`size-4 transition-transform ${open === s.skill ? "rotate-180" : ""}`} /></span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-brand" style={{ width: `${s.score}%` }} /></div>
              </button>
              {open === s.skill ? (
                <div className="space-y-2 border-t border-line p-3">
                  <p className="text-[12px] font-bold text-ink-soft">Questões que avaliaram essa habilidade</p>
                  {s.items.map((it, i) => (
                    <div key={i} className="rounded-[10px] bg-paper/40 p-2 text-[12px]">
                      <p className="text-ink-soft">Situação {i + 1}{it.role === "secundaria" ? " (secundária)" : ""}: {it.situation}</p>
                      <p className="mt-1">Resposta: <span className="font-medium">{it.answer}</span></p>
                      <p className="mt-1">Pontuação: <strong className="text-brand">{it.score}</strong></p>
                      {it.justification ? <p className="mt-1 text-ink-soft">Justificativa: {it.justification}</p> : null}
                    </div>
                  ))}
                  <p className="text-[12px] font-bold text-ink-soft">Análise da habilidade</p>
                  <p className="text-[13px]">{s.analysis}</p>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-[11px] text-ink-soft">{title}</p>
      <p className="mt-1">{items.length ? items.join(", ") : "—"}</p>
    </div>
  );
}
