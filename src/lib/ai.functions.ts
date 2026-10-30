import { createServerFn } from "@tanstack/react-start";
import { streamText, Output } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AI_MODEL, AI_PROVIDER_OPTIONS, createResponsesProvider } from "./ai-gateway.server";
import { skillTargets } from "./suggestions";

const SYSTEM = [
  "Você é um especialista em recrutamento e seleção que apoia empresários brasileiros sem experiência em RH.",
  "Escreva sempre em português do Brasil, com frases curtas, claras e objetivas.",
  "Nunca invente dados sobre a empresa ou a vaga: use apenas o que foi informado.",
  "A IA organiza e sugere; a decisão final é sempre do gestor.",
].join(" ");

async function run<T>(schema: z.ZodType<T>, prompt: string): Promise<T> {
  const provider = createResponsesProvider();
  const result = streamText({
    model: provider.responses(AI_MODEL),
    system: SYSTEM,
    prompt,
    output: Output.object({ schema }),
    providerOptions: AI_PROVIDER_OPTIONS as never,
  });
  return (await result.output) as T;
}

/* ------------------------------------------------------------------ */
/* 1. Contexto da vaga                                                 */
/* ------------------------------------------------------------------ */

const BasicsInput = z.object({
  title: z.string(),
  sector: z.string(),
  work_mode: z.string(),
  city: z.string(),
  state: z.string(),
  contract_model: z.string(),
  work_hours: z.string(),
  workload: z.string(),
  benefits: z.string(),
  company: z.string(),
  notes: z.string(),
});

const JobContextSchema = z.object({
  objective: z.string(),
  responsibilities: z.string(),
  expected_results: z.string(),
  routine: z.string(),
  challenges: z.string(),
});

export const aiGenerateJobContext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => BasicsInput.parse(input))
  .handler(async ({ data }) =>
    run(
      JobContextSchema,
      [
        "Escreva o contexto de uma vaga com base nos dados abaixo.",
        "Cada campo deve ter de 2 a 5 frases (ou itens separados por quebra de linha, quando for lista).",
        JSON.stringify(data, null, 2),
      ].join("\n\n"),
    ),
  );

/* ------------------------------------------------------------------ */
/* 2. Requisitos e perguntas                                           */
/* ------------------------------------------------------------------ */

const FormInput = z.object({
  basics: z.object({
    title: z.string(),
    sector: z.string(),
    work_mode: z.string(),
    city: z.string(),
    state: z.string(),
    contract_model: z.string(),
    work_hours: z.string(),
    workload: z.string(),
  }),
  context: z.object({
    objective: z.string(),
    responsibilities: z.string(),
    routine: z.string(),
    expected_results: z.string(),
    challenges: z.string(),
  }),
  competencies: z.array(z.object({ name: z.string(), importance: z.string() })),
  skills: z.array(z.object({ name: z.string(), level: z.string(), importance: z.string() })),
});

const RequirementSchema = z.object({
  description: z.string(),
  category: z.enum([
    "experiencia",
    "formacao",
    "certificacao",
    "ferramenta",
    "equipamento",
    "disponibilidade",
    "localizacao",
    "contratacao",
    "outro",
  ]),
  kind: z.enum(["obrigatorio", "desejavel"]),
  is_knockout: z.boolean(),
  detail: z.object({
    requires: z.boolean().nullable(),
    min_time: z.string().nullable(),
    area: z.string().nullable(),
    level: z.string().nullable(),
    courses: z.array(z.string()).nullable(),
    any_degree: z.boolean().nullable(),
    certification: z.string().nullable(),
  }),
});

const QuestionSchema = z.object({
  question: z.string(),
  kind: z.enum(["eliminatoria", "classificatoria"]),
  answer_type: z.enum(["curto", "aberta", "numero", "data", "selecao_unica", "selecao_multipla", "upload"]),
  options: z.array(z.string()),
  disqualifying_answer: z.string(),
  tag: z.string(),
  is_required: z.boolean(),
  origin_type: z.string(),
  origin_label: z.string(),
  related_competency: z.string(),
  related_skill: z.string(),
});

const JobFormSchema = z.object({
  requirements: z.array(RequirementSchema),
  questions: z.array(QuestionSchema),
});

export const aiGenerateJobForm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FormInput.parse(input))
  .handler(async ({ data }) =>
    run(
      JobFormSchema,
      [
        "Gere os requisitos e o bloco 'Queremos conhecer melhor sua experiência' do formulário de candidatura.",
        "Regras:",
        "- NÃO gere dados básicos (nome, idade, cidade, telefone, e-mail, formação, LinkedIn, currículo): esse bloco já existe.",
        "- Use apenas dados da vaga; não repita ao gestor informações já cadastradas (modelo de contratação, formato, horário): transforme-as em perguntas de disponibilidade ao candidato.",
        "- Gere de 6 a 12 requisitos e de 10 a 18 perguntas.",
        "- Misture perguntas abertas, de seleção única e de seleção múltipla.",
        "- Nunca marque kind 'eliminatoria': use sempre 'classificatoria' e disqualifying_answer ''. Quem decide o critério eliminatório é o gestor.",
        "- Em perguntas de condição objetiva (contratação, formato, localidade, horário, equipamento, certificação) use answer_type 'selecao_unica' com options ['Sim','Não'] e origin_type correspondente (contratacao, formato, horario, localizacao, equipamento, requisito).",
        "- Perguntas abertas: answer_type 'aberta', options [] e disqualifying_answer ''.",
        "- Perguntas de tempo de experiência: options ['Não possuo experiência','Menos de 1 ano','1 a 2 anos','2 a 3 anos','Mais de 3 anos'].",
        "- Perguntas de ferramentas já usadas: answer_type 'selecao_multipla' com as ferramentas da vaga mais CRM, Google Workspace, Excel, ChatGPT, Notion, Trello / ClickUp / Asana e Outra.",
        "- Crie perguntas situacionais abertas para cada competência comportamental (related_competency) e práticas para cada habilidade técnica (related_skill).",
        "- origin_label explica de onde a pergunta veio, ex.: 'Habilidade: Excel (Intermediário)'.",
        "- Campos sem valor: strings vazias, listas vazias e detail com null.",
        "- NUNCA pergunte algo que já é coletado nos dados pessoais (formação, curso, situação da formação, se está trabalhando, empresa e cargo atuais, cidade, estado, idade, contato, LinkedIn, currículo).",
        "- Faça UMA única pergunta por informação: antes de incluir, verifique se outra pergunta (mesmo escrita de outro jeito) já busca a mesma informação. Vale para experiência, tempo de experiência, localização, disponibilidade, modelo de trabalho, contratação, ferramentas, conhecimentos técnicos, competências e perguntas comportamentais/técnicas.",
        JSON.stringify(data, null, 2),
      ].join("\n"),
    ),
  );

/* ------------------------------------------------------------------ */
/* 3. Triagem e análise de respostas                                   */
/* ------------------------------------------------------------------ */

const ScreeningInput = z.object({
  job: z.string(),
  candidate: z.string(),
  answers: z.array(z.object({ question: z.string(), answer: z.string() })),
  resume: z.string(),
});

const ScreeningSchema = z.object({
  summary: z.string(),
  fit_score: z.number(),
  strengths: z.array(z.string()),
  attention_points: z.array(z.string()),
  questions_to_validate: z.array(z.string()),
  recommendation: z.string(),
});

export const aiScreenCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ScreeningInput.parse(input))
  .handler(async ({ data }) =>
    run(
      ScreeningSchema,
      [
        "Analise as respostas deste candidato para a vaga e faça uma triagem de apoio.",
        "fit_score: nota de 0 a 100 de aderência, considerando apenas evidências nas respostas.",
        "attention_points: informações vagas, lacunas ou riscos. questions_to_validate: perguntas para confirmar na entrevista.",
        "recommendation: uma frase neutra sobre o que ainda precisa ser validado. Nunca diga para avançar, contratar, eliminar ou não recomendar: a decisão é do gestor.",
        JSON.stringify(data, null, 2),
      ].join("\n"),
    ),
  );

/* ------------------------------------------------------------------ */
/* 4. Roteiro de entrevista                                            */
/* ------------------------------------------------------------------ */

const ScriptSchema = z.object({
  title: z.string(),
  questions: z.array(
    z.object({
      question: z.string(),
      category: z.enum(["padrao", "situacional", "tecnica", "experiencia", "competencia", "candidato"]),
      looking_for: z.string(),
    }),
  ),
});

export const aiGenerateInterviewScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ScreeningInput.parse(input))
  .handler(async ({ data }) =>
    run(
      ScriptSchema,
      [
        "Monte um roteiro de entrevista personalizado para este candidato nesta vaga.",
        "De 8 a 14 perguntas, na ordem em que devem ser feitas, cobrindo experiência, competências, parte técnica e pontos específicos que o formulário deixou em aberto.",
        "looking_for: o que o gestor deve observar na resposta.",
        JSON.stringify(data, null, 2),
      ].join("\n"),
    ),
  );

/* ------------------------------------------------------------------ */
/* 5. Assessment da vaga                                               */
/* ------------------------------------------------------------------ */

const AssessmentSchema = z.object({
  title: z.string(),
  estimated_minutes: z.number(),
  questions: z.array(
    z.object({
      situation: z.string(),
      question: z.string(),
      answer_type: z.enum(["selecao_unica", "selecao_multipla"]),
      options: z.array(z.string()),
      competency: z.string(),
      scoring: z.array(z.number()),
      option_scores: z.array(z.number()),
      justifications: z.array(z.string()),
      secondary_scores: z.array(z.object({ competency: z.string(), scores: z.array(z.number()) })),
      looking_for: z.string(),
    }),
  ),
});

export const aiGenerateAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FormInput.parse(input))
  .handler(async ({ data }) => {
    const rules = [
      "Regras obrigatórias:",
      "- TODOS os campos de TODAS as perguntas precisam vir preenchidos. Nunca devolva situação, pergunta, competência, alternativas, scoring ou looking_for vazios.",
      "- Gere as situações a partir das competências e habilidades CADASTRADAS nesta vaga (nunca uma lista genérica). Quantidade por habilidade conforme a importância: essencial/obrigatório = 3 situações, importante/alta = 2, complementar/desejável = 1.",
      "- ANTES de escrever, monte internamente uma matriz HABILIDADE → SUBCOMPETÊNCIA → CONTEXTO → TIPO DE DECISÃO. Cada pergunta da mesma habilidade testa uma subcompetência DIFERENTE, em um contexto DIFERENTE, com uma decisão DIFERENTE (ex.: Proatividade = antecipação de risco / iniciativa em falha de processo / acompanhamento preventivo de entrega).",
      "- Liste internamente os contextos reais da função (a partir de título, responsabilidades, rotina, desafios, resultados esperados, ferramentas e contexto do gestor) e distribua as perguntas entre contextos distintos; não reutilize um contexto se houver outro relevante disponível.",
      "- Varie os dilemas: urgência, informação incompleta, conflito de prioridades, cliente/pessoa insatisfeita, autonomia, agir ou escalar, comunicação difícil, erro próprio, erro de outro setor, pressão de prazo, múltiplas demandas, falta de resposta, análise, mudança inesperada.",
      "- PROIBIDO repetir: a mesma situação, o mesmo problema com outras palavras, o mesmo conflito, a mesma decisão, alternativas quase iguais ou cenários que avaliem exatamente o mesmo comportamento. Compare por SIGNIFICADO, não por texto (ex.: 'cliente há dias sem responder uma pendência' e 'cliente não responde e há tarefa pendente' são a MESMA situação).",
      "- 'situation': 2 a 4 frases curtas com CONTEXTO + PROBLEMA + RESTRIÇÃO/PRESSÃO + DECISÃO NECESSÁRIA, específicas da rotina desta vaga. Nunca uma frase genérica, nunca um textão.",
      "- 'question': use exatamente 'Como você agiria nessa situação?'.",
      "- answer_type sempre 'selecao_unica'.",
      "- Exatamente 4 alternativas, cada uma uma ESTRATÉGIA realista que um profissional escolheria de fato, com tamanho e nível de detalhe parecidos. A melhor NÃO pode ser óbvia (nada de 'ignoro', 'envio como está', 'refaço tudo' contra uma alternativa perfeita); as diferenças são nuances de priorização, comunicação e análise.",
      "- 'option_scores': pontuação interna 0 a 100 por alternativa, na mesma ordem (ex.: 100, 70, 45, 20). A melhor alternativa deve estar em posição VARIADA entre as perguntas (A/B/C/D, não sempre a mais longa).",
      "- 'scoring': mesmo tamanho de options, 3 para a melhor e 1 para as demais.",
      "- 'justifications': uma justificativa interna curta por alternativa.",
      "- 'secondary_scores': no máximo 2 habilidades secundárias da vaga, cada uma com 4 pontuações 0-100; lista vazia se não fizer sentido.",
      "- 'looking_for': o que o gestor deve observar nessa resposta.",
      "- 'competency' é o nome da competência ou habilidade avaliada.",
      "- Antes de responder, compare TODAS as perguntas entre si (1x2, 1x3, ...) e reescreva qualquer uma com cenário, problema ou decisão repetidos, contexto insuficiente ou resposta ideal óbvia.",
      "- estimated_minutes: tempo estimado de resposta em minutos.",
    ];
    const targets = skillTargets(data);
    const first = await run(
      AssessmentSchema,
      ["Monte um assessment situacional para esta vaga.", `Gere exatamente esta distribuição (habilidade: quantidade): ${targets.map(({ name, count }) => `${name}: ${count}`).join("; ")}.`, ...rules, JSON.stringify(data, null, 2)].join("\n"),
    );
    const dup = findSimilarSituations(first.questions.map((q) => `${q.situation} ${q.options.join(" ")}`));
    if (!dup.length) return first;
    try {
      const keep = first.questions.filter((_, i) => !dup.includes(i));
      const fix = await run(
        AssessmentSchema,
        [
          `Gere ${dup.length} novas perguntas para substituir situações repetidas, avaliando as competências: ${dup.map((i) => first.questions[i]!.competency).join(", ")} (na mesma ordem).`,
          "As novas situações NÃO podem repetir, nem por significado, nenhuma destas já existentes:",
          ...keep.map((q, i) => `${i + 1}. [${q.competency}] ${q.situation}`),
          ...rules,
          JSON.stringify(data, null, 2),
        ].join("\n"),
      );
      const replacements = [...fix.questions];
      return {
        ...first,
        questions: first.questions.map((q, i) => (dup.includes(i) && replacements.length ? replacements.shift()! : q)),
      };
    } catch {
      return { ...first, questions: first.questions.filter((_, i) => !dup.includes(i)) };
    }
  });

const STOP = new Set("a o e de da do das dos em no na nos nas um uma para por com que se seu sua você voce ao os as é esta está mais como ou".split(" "));
function tokens(text: string) {
  return new Set(
    text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !STOP.has(w)).map((w) => w.slice(0, 6)),
  );
}
/** Índices das perguntas cujo cenário é muito parecido com um anterior. */
function findSimilarSituations(texts: string[]) {
  const sets = texts.map(tokens);
  const out: number[] = [];
  for (let i = 1; i < sets.length; i++) {
    for (let j = 0; j < i; j++) {
      if (out.includes(j)) continue;
      const a = sets[i]!, b = sets[j]!;
      const inter = [...a].filter((w) => b.has(w)).length;
      const sim = inter / Math.max(1, Math.min(a.size, b.size));
      if (sim >= 0.6) { out.push(i); break; }
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 6. Case técnico                                                     */
/* ------------------------------------------------------------------ */

const CaseInput = z.object({
  basics: z.object({
    title: z.string(),
    sector: z.string(),
    work_mode: z.string(),
    city: z.string(),
    state: z.string(),
    contract_model: z.string(),
  }),
  context: z.object({
    objective: z.string(),
    responsibilities: z.string(),
    routine: z.string(),
    expected_results: z.string(),
    challenges: z.string(),
  }),
  company: z.string(),
  competencies: z.array(z.string()),
  skills: z.array(z.string()),
  requirements: z.array(z.string()),
  config: z.object({
    evaluate_what: z.array(z.string()),
    modality: z.string(),
    tools: z.array(z.string()),
    tool_required: z.boolean(),
    deliverables: z.array(z.string()),
    delivery_description: z.string(),
    prep_deadline: z.string(),
    needs_presentation: z.boolean(),
    presentation_format: z.string(),
    presentation_minutes: z.number(),
    questions_minutes: z.number(),
    criteria: z.array(z.string()),
  }),
});

const CaseSchema = z.object({
  title: z.string(),
  sections: z.array(z.object({ title: z.string(), content: z.string() })),
  evaluator_questions: z.array(z.string()),
});

export const aiGenerateTechnicalCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CaseInput.parse(input))
  .handler(async ({ data }) =>
    run(
      CaseSchema,
      [
        "Monte um case técnico completo e profissional para esta vaga, pronto para ser enviado ao candidato.",
        "Use apenas as informações da empresa e da vaga abaixo; não invente dados reais da empresa (dados fictícios do case podem ser criados e devem ser identificados como fictícios).",
        "Gere as seções nesta ordem e com estes títulos exatos:",
        "1. Contexto",
        "2. Cenário e desafio",
        "3. Briefing completo",
        "4. Sua missão",
        "5. O que você precisa desenvolver ou analisar",
        "6. Entregáveis",
        "7. Regras",
        "8. Materiais disponibilizados",
        "9. Prazo",
        "10. Instruções de apresentação",
        "11. Critérios de avaliação",
        "Regras de escrita:",
        "- Fale diretamente com o candidato, em português do Brasil, com frases curtas e listas quando ajudar.",
        "- Respeite a modalidade: em 'material_pronto' o candidato analisa o material fornecido e apresenta conclusões; em 'candidato_cria' ele desenvolve a própria entrega.",
        "- Respeite ferramentas, entregáveis, prazo, forma e tempo de apresentação e critérios informados na configuração.",
        "- 'evaluator_questions': de 5 a 8 perguntas que o avaliador deve fazer depois da apresentação.",
        "- Nenhuma seção pode ficar vazia.",
        JSON.stringify(data, null, 2),
      ].join("\n"),
    ),
  );

/* ------------------------------------------------------------------ */
/* 7. Compatibilidade do candidato com a vaga                          */
/* ------------------------------------------------------------------ */

const CompatInput = z.object({
  job: z.string(),
  candidate: z.string(),
  answers: z.array(z.object({ question: z.string(), answer: z.string() })),
  resume: z.string(),
  dimensions: z.array(z.string()),
});

const STATUS = z.enum(["atende", "nao_atende", "nao_validado", "declarado"]);

const CompatSchema = z.object({
  profile_summary: z.string(),
  justification: z.string(),
  why_compatible: z.string(),
  what_reduces: z.string(),
  dimensions: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      score: z.number().nullable(),
      evidence_type: z.enum(["evidencia", "autodeclarado", "nao_validado", "nao_atende"]),
      justification: z.string(),
    }),
  ),
  requirements: z.array(
    z.object({
      description: z.string(),
      mandatory: z.boolean(),
      knockout: z.boolean(),
      status: STATUS,
      evidence: z.string(),
    }),
  ),
  highlights: z.array(z.object({ label: z.string(), status: STATUS, short: z.string() })),
  competencies: z.array(
    z.object({
      name: z.string(),
      kind: z.enum(["competencia", "habilidade"]),
      status: z.enum(["evidenciado", "autodeclarado", "nao_validado", "nao_atende"]),
      evidence: z.string(),
    }),
  ),
  strengths: z.array(z.string()),
  attention_points: z.array(z.string()),
  evidences: z.array(z.object({ quote: z.string(), supports: z.string() })),
  to_validate: z.array(z.string()),
  interview_questions: z.array(z.string()),
  confidence: z.number(),
});

export type CompatibilityResult = z.infer<typeof CompatSchema>;

export const aiAnalyzeCompatibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CompatInput.parse(input))
  .handler(async ({ data }) =>
    run(
      CompatSchema,
      [
        "Analise a COMPATIBILIDADE deste candidato com ESTA vaga específica, comparando perfil da vaga, requisitos, competências, habilidades técnicas e condições com as respostas do próprio candidato.",
        "Regras obrigatórias:",
        "- Considere SOMENTE critérios cadastrados nesta vaga. Nunca penalize por conhecimentos que a vaga não pede.",
        "- Use apenas o que está nas respostas/currículo. Nunca invente informação.",
        "- Formação declarada como 'superior incompleto', 'formação superior incompleta' ou equivalente É uma resposta sobre a formação: reproduza o nível e a situação como a pessoa informou. Não diga que ela não esclareceu a formação, não marque a dimensão Formação como 'nao_validado' só porque não informou se está cursando atualmente e não transforme essa ausência em ponto de atenção. 'Incompleto' não significa necessariamente 'cursando' nem 'trancado': não presuma nenhum dos dois sem declaração explícita. Se a vaga exigir curso concluído, compare esse requisito com a informação declarada, sem inventar conclusão, matrícula ou interrupção.",
        "- Diferencie: 'evidencia' (exemplo prático descrito nas respostas), 'autodeclarado' (só afirmou nível ou 'sim', sem exemplo), 'nao_validado' (não respondeu / sem informação), 'nao_atende' (respondeu algo que contraria o requisito).",
        "- Ausência de informação NUNCA é 'nao_atende': é 'nao_validado'.",
        "- dimensions: uma entrada para cada chave em 'dimensions' do input (use a chave em key). score de 0 a 100 considerando só o que a vaga exige; autodeclarado vale menos que evidência; score null quando não houver informação para avaliar. justification: 1 frase com o fato concreto (ex.: 'Possui 2 anos em CS para mínimo de 1 ano').",
        "- requirements: um item para CADA requisito da vaga, com mandatory (obrigatório), knockout (eliminatório) e status: atende | nao_atende | nao_validado | declarado (afirmou, requer validação). evidence: trecho ou fato da resposta que justifica.",
        "- highlights: de 5 a 8 indicadores curtos para visão executiva (ex.: label 'Experiência', short 'Forte aderência').",
        "- competencies: cada competência e habilidade da vaga com seu status.",
        "- strengths: só o que for sustentado pelas respostas. attention_points: lacunas, inconsistências, conhecimentos não comprovados, riscos.",
        "- evidences: citações curtas das respostas e o que elas sustentam.",
        "- to_validate: exatamente o que falta confirmar. interview_questions: 4 a 8 perguntas personalizadas para validar esses pontos.",
        "- why_compatible e what_reduces: 1 a 3 frases objetivas cada.",
        "- confidence: 0 a 100 — quanto das informações necessárias para avaliar esta vaga foi coberto (requisitos respondidos e verificáveis, exemplos práticos, consistência, obrigatórios validados, habilidades verificadas, competências demonstradas, experiência suficiente).",
        "- NUNCA diga 'recomendo contratar', 'sugiro não avançar', 'deve ser eliminado' ou similares. Apenas analise e apresente evidências: a decisão é do recrutador.",
        JSON.stringify(data, null, 2),
      ].join("\n"),
    ),
  );

/* ------------------------------------------------------------------ */
/* 8. Análise da entrevista                                            */
/* ------------------------------------------------------------------ */

import INTERVIEW_PROMPT from "./prompts/interview-analysis.md?raw";

const InterviewInput = z
  .object({
    job: z.string(),
    candidate: z.string(),
    form: z.string(),
    assessment: z.string(),
    previous: z.string(),
    transcript: z.string().default(""),
    file_text: z.string().default(""),
    recruiter_notes: z.string().default(""),
  })
  .refine((d) => (d.transcript + d.file_text).trim().length >= 50 || d.recruiter_notes.trim().length >= 50, {
    message: "Adicione a transcrição, um arquivo ou anotações suficientes.",
  });

function countOccurrences(text: string, term: string) {
  const t = term.trim().toLowerCase();
  if (!t) return 0;
  const esc = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (text.toLowerCase().match(new RegExp(`(?<![\\p{L}\\p{N}])${esc}(?![\\p{L}\\p{N}])`, "gu")) ?? []).length;
}

const quote = z.string().nullable();

const InterviewSchema = z.object({
  resumo: z.string(),
  pontos_fortes: z.array(
    z.object({
      titulo: z.string(),
      o_que_demonstrou: z.string(),
      evidencia: z.string(),
      fala_literal: quote,
      relacao_com_a_vaga: z.string(),
      forca_da_evidencia: z.enum(["forte", "moderada", "limitada"]),
    }),
  ),
  pontos_de_atencao: z.array(
    z.object({
      titulo: z.string(),
      o_que_foi_observado: z.string(),
      evidencia: z.string(),
      fala_literal: quote,
      impacto_potencial_na_vaga: z.string(),
      classificacao: z.enum(["atenção", "gap_de_experiencia", "não_validado", "inconsistência"]),
      precisa_aprofundar: z.boolean(),
      como_validar: z.string(),
    }),
  ),
  falas: z.array(
    z.object({
      fala: z.string(),
      contexto: z.string(),
      leitura_profissional: z.string(),
      relacao_com_a_vaga: z.string(),
      tipo: z.enum(["evidencia_positiva", "ponto_de_atencao", "informacao_relevante", "precisa_aprofundar"]),
    }),
  ),
  competencias: z.array(
    z.object({
      competencia: z.string(),
      status: z.enum(["validada", "parcialmente_validada", "não_validada", "evidência_contrária"]),
      evidencia: z.string(),
      fala_literal: quote,
      observacao: z.string(),
    }),
  ),
  requisitos: z.array(
    z.object({
      requisito: z.string(),
      status: z.enum(["confirmado", "parcialmente_confirmado", "não_confirmado", "informação_conflitante"]),
      evidencia: z.string(),
      observacao: z.string(),
    }),
  ),
  experiencias: z.array(
    z.object({
      situacao: z.string(),
      papel_do_candidato: z.string(),
      acao_realizada: z.string(),
      resultado: z.string(),
      competencias_evidenciadas: z.array(z.string()),
    }),
  ),
  validacao_anterior: z.object({
    confirmado: z.array(z.string()),
    aprofundado: z.array(z.string()),
    nao_validado: z.array(z.string()),
    divergencia: z.array(z.string()),
  }),
  inconsistencias: z.array(
    z.object({
      informacao_1: z.string(),
      informacao_2: z.string(),
      por_que_precisa_validacao: z.string(),
      pergunta_para_esclarecer: z.string(),
    }),
  ),
  nao_validado: z.array(
    z.object({ ponto: z.string(), por_que_importa_para_vaga: z.string(), o_que_faltou: z.string() }),
  ),
  perguntas_aprofundamento: z.array(
    z.object({ pergunta: z.string(), o_que_queremos_validar: z.string(), origem: z.string() }),
  ),
  evolucao: z.object({
    antes: z.string(),
    depois: z.string(),
    reforcou: z.array(z.string()),
    atencao: z.array(z.string()),
    sem_evidencia: z.array(z.string()),
  }),
  sintese: z.object({
    evidencias_a_favor: z.array(z.string()),
    pontos_a_validar: z.array(z.string()),
    leitura: z.string(),
  }),
  palavras_recorrentes: z.array(
    z.object({
      expressao: z.string(),
      ocorrencias: z.number(),
      contexto: z.string(),
      relevancia_para_vaga: z.string(),
      interpretacao: z.string().nullable(),
    }),
  ),
});

export type InterviewAnalysis = z.infer<typeof InterviewSchema>;

export const aiAnalyzeInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InterviewInput.parse(input))
  .handler(async ({ data }) => {
    const provider = createResponsesProvider();
    const system = INTERVIEW_PROMPT.replace(/\{\{[^}]+\}\}/g, "(ver dados enviados na mensagem)");
    const spoken = [data.transcript, data.file_text].filter((s) => s.trim()).join("\n\n");
    const result = streamText({
      model: provider.responses(AI_MODEL),
      system: `${SYSTEM}\n\n${system}`,
      prompt: [
        "Analise a entrevista abaixo seguindo exatamente as regras do sistema. Responda no formato estruturado solicitado.",
        "Se não houver análise anterior, deixe validacao_anterior e evolucao com listas vazias e textos 'Sem análise anterior.'.",
        "FONTES: a TRANSCRIÇÃO e o ARQUIVO são a única base para falas literais do candidato. As ANOTAÇÕES DO RECRUTADOR são percepções de quem entrevistou: use como contexto, cite como 'segundo o recrutador', e NUNCA coloque entre aspas como fala do candidato. Se não houver transcrição, todos os campos fala_literal devem ser null e 'falas' deve ficar vazio.",
        "Falas literais: copie exatamente do texto, sem corrigir nem melhorar. Se não houver trecho literal, use null.",
        "pontos_fortes: 3 a 6 itens, cada um com evidência real. Pontos de atenção não são motivo de reprovação: explique por que chamou atenção e o que validar.",
        "competencias: use SOMENTE as competências/habilidades cadastradas para a vaga; 'não_validada' = sem evidência suficiente, não significa que não possui.",
        "perguntas_aprofundamento: personalizadas, citando o contexto real que o candidato trouxe (ex.: 'Você comentou que acompanhava ~45 clientes...').",
        "experiencias: se o resultado não foi informado, escreva 'Resultado não informado.' — não complete informações.",
        "inconsistencias: cruze candidatura, assessment e entrevista; nunca use 'mentiu' ou 'informação falsa', apenas sinalize.",
        "palavras_recorrentes: 4 a 10 palavras/expressões profissionalmente relevantes (atividades, clientes, resultados, ferramentas, processos, indicadores, decisões, competências) que o candidato repetiu. Ignore palavras funcionais (tipo, né, assim, então, eu, aí). Escreva a expressão exatamente como aparece no texto. interpretacao só quando houver contexto suficiente; senão null. Frequência sozinha não gera conclusão.",
        "Não faça análise psicológica, não avalie sotaque/vícios de linguagem nem características pessoais.",
        `[VAGA]\n${data.job}`,
        `[CANDIDATO]\n${data.candidate}`,
        `[FORMULÁRIO]\n${data.form || "Não disponível."}`,
        `[ASSESSMENT]\n${data.assessment || "Não disponível."}`,
        `[ANÁLISE ANTERIOR]\n${data.previous || "Não disponível."}`,
        `[TRANSCRIÇÃO DA ENTREVISTA]\n${data.transcript || "Não fornecida."}`,
        `[ARQUIVO DA ENTREVISTA]\n${data.file_text || "Não fornecido."}`,
        `[ANOTAÇÕES DO RECRUTADOR — não são falas do candidato]\n${data.recruiter_notes || "Não fornecidas."}`,
      ].join("\n\n"),
      output: Output.object({ schema: InterviewSchema }),
      providerOptions: AI_PROVIDER_OPTIONS as never,
    });
    const out = (await result.output) as InterviewAnalysis;
    if (spoken.trim()) {
      const norm = spoken.toLowerCase();
      out.palavras_recorrentes = (out.palavras_recorrentes ?? [])
        .map((p) => ({ ...p, ocorrencias: countOccurrences(norm, p.expressao) }))
        .filter((p) => p.ocorrencias >= 2)
        .sort((a, b) => b.ocorrencias - a.ocorrencias);
      // Descarta citações que não existem literalmente no texto
      const exists = (q: string | null) => {
        if (!q) return null;
        const clean = (s: string) => s.toLowerCase().replace(/[“”"'.,!?…]/g, "").replace(/\s+/g, " ").trim();
        return clean(spoken).includes(clean(q)) ? q : null;
      };
      out.pontos_fortes.forEach((p) => (p.fala_literal = exists(p.fala_literal)));
      out.pontos_de_atencao.forEach((p) => (p.fala_literal = exists(p.fala_literal)));
      out.competencias.forEach((p) => (p.fala_literal = exists(p.fala_literal)));
      out.falas = out.falas.filter((f) => exists(f.fala));
    } else {
      out.palavras_recorrentes = [];
      out.falas = [];
      out.pontos_fortes.forEach((p) => (p.fala_literal = null));
      out.pontos_de_atencao.forEach((p) => (p.fala_literal = null));
      out.competencias.forEach((p) => (p.fala_literal = null));
    }
    return out;
  });

/* ------------------------------------------------------------------ */
/* Visão consolidada — síntese por competência                         */
/* ------------------------------------------------------------------ */

const ConsolidateInput = z.object({
  job_title: z.string(),
  competencies: z.array(
    z.object({
      name: z.string(),
      sources: z.array(z.object({ stage: z.string(), done: z.boolean(), signal: z.string(), evidence: z.string() })),
    }),
  ),
});

const ConsolidateSchema = z.object({
  competencies: z.array(
    z.object({
      name: z.string(),
      status: z.enum(["consistente", "parcial", "nao_validada", "divergente", "contraria"]),
      synthesis: z.string(),
      divergence: z.string(),
      to_validate: z.string(),
    }),
  ),
});

export type ConsolidateResult = z.infer<typeof ConsolidateSchema>;

export const aiConsolidateCompetencies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ConsolidateInput.parse(input))
  .handler(async ({ data }) =>
    run(
      ConsolidateSchema,
      [
        "Monte a visão consolidada por competência deste candidato, CRUZANDO as evidências das etapas.",
        "Natureza das fontes: Candidatura = o que declarou/apresentou; Assessment = como escolheu agir nos cenários; Entrevista = o que sustentou, explicou e exemplificou; Case = o que executou. Declaração NÃO é competência comprovada.",
        "Etapa com done=false NÃO é evidência negativa e não reduz o status; cite-a no máximo discretamente.",
        "status: consistente (etapas realizadas convergem, com evidência concreta em 2+ fontes); parcial (há evidência relevante mas insuficiente); nao_validada (sem evidência suficiente); divergente (fontes mostram coisas diferentes); contraria (só com evidência concreta que contraria diretamente).",
        "synthesis: 2 a 4 frases curtas respondendo 'o que conseguimos entender sobre essa competência considerando tudo o que já foi realizado?'. Sempre diga QUAL evidência, O QUE demonstra e DE ONDE veio. Proibido frases genéricas como 'Competência com evidência na candidatura', 'Bom desempenho', 'Perfil aderente'. Um único cenário de assessment não prova ausência da competência.",
        "divergence: se divergente, explique o que cada etapa mostrou e o que validar, sem concluir que mentiu ou que não possui a competência; senão string vazia.",
        "to_validate: o que especificamente precisa ser descoberto na próxima etapa para essa competência e esse candidato. Se nada relevante, exatamente: 'Sem ponto crítico adicional de validação identificado até o momento.' Não invente gaps nem evidências. Nunca use porcentagens.",
        "Devolva uma entrada para cada competência, com o mesmo name.",
        JSON.stringify(data, null, 2),
      ].join("\n"),
    ),
  );
