import type { InterviewAnalysis } from "@/lib/ai.functions";
import { Chip, Panel, SectionTitle } from "@/components/ui-bits";

type Tone = "teal" | "amber" | "rose";

const FALA_LABEL: Record<string, [string, Tone]> = {
  evidencia_positiva: ["Evidência positiva", "teal"],
  ponto_de_atencao: ["Ponto de atenção", "rose"],
  informacao_relevante: ["Informação relevante", "amber"],
  precisa_aprofundar: ["Precisa aprofundar", "amber"],
};

const COMP_LABEL: Record<string, [string, Tone]> = {
  validada: ["Validada", "teal"],
  parcialmente_validada: ["Parcialmente validada", "amber"],
  "não_validada": ["Ainda não validada", "amber"],
  "evidência_contrária": ["Evidência contrária", "rose"],
};

const REQ_LABEL: Record<string, [string, Tone]> = {
  confirmado: ["Confirmado", "teal"],
  parcialmente_confirmado: ["Parcialmente confirmado", "amber"],
  "não_confirmado": ["Não confirmado", "amber"],
  "informação_conflitante": ["Informação conflitante", "rose"],
};

const ATT_LABEL: Record<string, string> = {
  "atenção": "Atenção",
  gap_de_experiencia: "Gap de experiência",
  "não_validado": "Não validado",
  "inconsistência": "Inconsistência",
};

function Quote({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  return <p className="mt-1 border-l-2 border-brand pl-2 text-[12px] italic text-ink">“{text}”</p>;
}

function List({ items, empty = "Nada a destacar." }: { items: string[]; empty?: string }) {
  if (!items?.length) return <p className="text-[12px] text-ink-soft">{empty}</p>;
  return (
    <ul className="list-disc space-y-1 pl-4 text-[13px]">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[12px] bg-paper/50 p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-brand">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export function InterviewAnalysisPanel({ analysis }: { analysis: InterviewAnalysis }) {
  const a = analysis;
  const notValidated = [
    ...a.competencias.filter((c) => c.status === "não_validada").map((c) => c.competencia),
    ...a.requisitos.filter((r) => r.status === "não_confirmado").map((r) => r.requisito),
    ...a.nao_validado.map((n) => n.ponto),
  ];

  return (
    <Panel className="lg:col-span-2">
      <SectionTitle title="Análise da entrevista" hint="apoio à decisão — quem decide é você" />
      <div className="space-y-4">
        <Box title="Resumo da entrevista">
          <p className="text-[13px]">{a.resumo}</p>
        </Box>

        <div className="grid gap-3 md:grid-cols-2">
          <Box title="Pontos fortes demonstrados">
            {a.pontos_fortes.length === 0 ? (
              <p className="text-[12px] text-ink-soft">Nenhum ponto forte sustentado por evidência.</p>
            ) : (
              a.pontos_fortes.map((p, i) => (
                <div key={i}>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-medium">{p.titulo}</p>
                    <Chip tone={p.forca_da_evidencia === "forte" ? "teal" : "amber"}>
                      evidência {p.forca_da_evidencia}
                    </Chip>
                  </div>
                  <p className="text-[12px] text-ink-soft">{p.o_que_demonstrou}</p>
                  <Quote text={p.fala_literal} />
                </div>
              ))
            )}
          </Box>
          <Box title="Pontos de atenção">
            {a.pontos_de_atencao.length === 0 ? (
              <p className="text-[12px] text-ink-soft">Nenhum ponto de atenção identificado.</p>
            ) : (
              a.pontos_de_atencao.map((p, i) => (
                <div key={i}>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-medium">{p.titulo}</p>
                    <Chip tone="amber">{ATT_LABEL[p.classificacao] ?? p.classificacao}</Chip>
                  </div>
                  <p className="text-[12px] text-ink-soft">{p.o_que_foi_observado}</p>
                  <Quote text={p.fala_literal} />
                  {p.como_validar ? <p className="mt-1 text-[12px]">Como validar: {p.como_validar}</p> : null}
                </div>
              ))
            )}
          </Box>
          <Box title="Competências observadas na entrevista">
            {a.competencias.length === 0 ? (
              <p className="text-[12px] text-ink-soft">Nenhuma competência da vaga avaliada.</p>
            ) : (
              a.competencias.map((c, i) => (
                <details key={i} className="group rounded-[10px] bg-paper/40 p-2">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2">
                    <span className="text-[13px] font-medium">{c.competencia}</span>
                    <Chip tone={COMP_LABEL[c.status]?.[1] ?? "amber"}>{COMP_LABEL[c.status]?.[0] ?? c.status}</Chip>
                  </summary>
                  <div className="mt-2 space-y-1 text-[12px]">
                    <p><span className="text-ink-soft">Evidência encontrada: </span>{c.evidencia || "Sem evidência na entrevista."}</p>
                    <Quote text={c.fala_literal} />
                    {c.observacao ? <p><span className="text-ink-soft">Por que recebeu esse status: </span>{c.observacao}</p> : null}
                  </div>
                </details>
              ))
            )}
            <p className="text-[11px] text-ink-soft">“Não validada” = sem evidência suficiente na entrevista, não que o candidato não tenha.</p>
          </Box>
          <Box title="Ainda precisamos validar">
            <List items={notValidated} empty="Tudo que era importante ganhou evidência." />
          </Box>
        </div>

        {a.falas.length ? (
          <div>
            <p className="mb-2 text-[15px] font-bold">O que o candidato disse</p>
            <div className="grid gap-3 md:grid-cols-2">
              {a.falas.map((f, i) => {
                const [label, tone] = FALA_LABEL[f.tipo] ?? [f.tipo, "amber" as Tone];
                return (
                  <div key={i} className="rounded-[12px] bg-paper/50 p-3 text-[12px]">
                    <Chip tone={tone}>{label}</Chip>
                    <Quote text={f.fala} />
                    <p className="mt-2">
                      <span className="text-ink-soft">Contexto: </span>
                      {f.contexto}
                    </p>
                    <p className="mt-1">
                      <span className="text-ink-soft">O que evidencia: </span>
                      {f.leitura_profissional}
                    </p>
                    <p className="mt-1">
                      <span className="text-ink-soft">Relação com a vaga: </span>
                      {f.relacao_com_a_vaga}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {a.palavras_recorrentes?.length ? (
          <Box title="Palavras e expressões recorrentes">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="text-ink-soft">
                  <tr>
                    <th className="py-1 pr-3 font-medium">Expressão</th>
                    <th className="py-1 pr-3 font-medium">Ocorrências</th>
                    <th className="py-1 pr-3 font-medium">Contexto</th>
                    <th className="py-1 font-medium">Relevância para a vaga</th>
                  </tr>
                </thead>
                <tbody>
                  {a.palavras_recorrentes.map((p, i) => (
                    <tr key={i} className="border-t border-line align-top">
                      <td className="py-1.5 pr-3 font-medium">“{p.expressao}”</td>
                      <td className="py-1.5 pr-3 font-mono text-brand">{p.ocorrencias}</td>
                      <td className="py-1.5 pr-3">{p.contexto}</td>
                      <td className="py-1.5">
                        {p.relevancia_para_vaga}
                        {p.interpretacao ? <p className="mt-1 text-ink-soft">{p.interpretacao}</p> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-ink-soft">A frequência de uma palavra, sozinha, não gera conclusão.</p>
          </Box>
        ) : null}

        {a.requisitos.length ? (
          <Box title="Requisitos da vaga">
            {a.requisitos.map((r, i) => (
              <div key={i} className="flex flex-wrap items-start justify-between gap-2 text-[13px]">
                <div>
                  <p className="font-medium">{r.requisito}</p>
                  <p className="text-[12px] text-ink-soft">{r.evidencia}</p>
                </div>
                <Chip tone={REQ_LABEL[r.status]?.[1] ?? "amber"}>{REQ_LABEL[r.status]?.[0] ?? r.status}</Chip>
              </div>
            ))}
          </Box>
        ) : null}

        {a.experiencias.length ? (
          <Box title="Exemplos trazidos pelo candidato">
            {a.experiencias.map((e, i) => (
              <div key={i} className="text-[12px]">
                <p className="text-[13px] font-medium">{e.situacao}</p>
                <p><span className="text-ink-soft">Papel: </span>{e.papel_do_candidato}</p>
                <p><span className="text-ink-soft">O que fez: </span>{e.acao_realizada}</p>
                <p><span className="text-ink-soft">Resultado: </span>{e.resultado || "Resultado não informado."}</p>
                {e.competencias_evidenciadas?.length ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {e.competencias_evidenciadas.map((c) => <Chip key={c}>{c}</Chip>)}
                  </div>
                ) : null}
              </div>
            ))}
          </Box>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <Box title="Validação das informações anteriores">
            <p className="text-[12px] font-medium">Confirmado</p>
            <List items={a.validacao_anterior.confirmado} />
            <p className="text-[12px] font-medium">Aprofundado</p>
            <List items={a.validacao_anterior.aprofundado} />
            <p className="text-[12px] font-medium">Não validado</p>
            <List items={a.validacao_anterior.nao_validado} />
            <p className="text-[12px] font-medium">Divergência identificada</p>
            <List items={a.validacao_anterior.divergencia} empty="Nenhuma divergência." />
          </Box>
          <Box title="Evolução da percepção">
            <p className="text-[12px]"><span className="text-ink-soft">Antes: </span>{a.evolucao.antes}</p>
            <p className="text-[12px]"><span className="text-ink-soft">Depois: </span>{a.evolucao.depois}</p>
            <p className="text-[12px] font-medium">Reforçou</p>
            <List items={a.evolucao.reforcou} />
            <p className="text-[12px] font-medium">Trouxe atenção para</p>
            <List items={a.evolucao.atencao} />
            <p className="text-[12px] font-medium">Continua sem evidência</p>
            <List items={a.evolucao.sem_evidencia} />
          </Box>
        </div>

        {a.inconsistencias.length ? (
          <Box title="Pontos para esclarecer">
            {a.inconsistencias.map((c, i) => (
              <div key={i} className="text-[12px]">
                <p>{c.informacao_1} × {c.informacao_2}</p>
                <p className="text-ink-soft">{c.por_que_precisa_validacao}</p>
                <p>Pergunta: {c.pergunta_para_esclarecer}</p>
              </div>
            ))}
          </Box>
        ) : null}

        {a.perguntas_aprofundamento.length ? (
          <Box title="Perguntas para aprofundar">
            {a.perguntas_aprofundamento.map((q, i) => (
              <div key={i} className="text-[12px]">
                <p className="text-[13px] font-medium">{q.pergunta}</p>
                <p className="text-ink-soft">Valida: {q.o_que_queremos_validar}</p>
              </div>
            ))}
          </Box>
        ) : null}

        <Box title="Síntese para o recrutador">
          <p className="text-[12px] font-medium">Principais evidências a favor</p>
          <List items={a.sintese.evidencias_a_favor} />
          <p className="text-[12px] font-medium">Principais pontos a validar</p>
          <List items={a.sintese.pontos_a_validar} />
          <p className="text-[13px]">{a.sintese.leitura}</p>
        </Box>
      </div>
    </Panel>
  );
}
