/**
 * Case técnico — configuração, conteúdo, status e geração de reserva (sem IA).
 */

export const CASE_EVALUATE_OPTIONS = [
  "Conhecimento técnico",
  "Raciocínio",
  "Resolução de problemas",
  "Organização",
  "Comunicação",
  "Capacidade analítica",
  "Criatividade",
  "Proatividade",
  "Priorização",
  "Tomada de decisão",
  "Planejamento",
  "Execução",
  "Atenção aos detalhes",
  "Uso de ferramentas",
  "Uso de IA",
];

export const CASE_TOOL_OPTIONS = [
  "PowerPoint",
  "Google Slides",
  "Canva",
  "Excel",
  "Google Sheets",
  "Word",
  "Google Docs",
  "PDF",
  "Notion",
  "Lovable",
  "Ferramenta de IA",
  "Ferramenta de livre escolha",
];

export const CASE_DELIVERABLE_OPTIONS = [
  "Apresentação",
  "Documento",
  "Planilha",
  "Dashboard",
  "Análise",
  "Plano de ação",
  "Estratégia",
  "Diagnóstico",
  "Protótipo",
  "Processo",
  "Vídeo",
];

export const CASE_CRITERIA_OPTIONS = [
  "Clareza",
  "Qualidade da solução",
  "Raciocínio",
  "Aplicabilidade",
  "Organização",
  "Profundidade",
  "Criatividade",
  "Comunicação",
  "Qualidade da execução",
  "Cumprimento dos requisitos",
  "Atenção aos detalhes",
];

export const CASE_PREP_DEADLINES = ["24 horas", "48 horas", "3 dias", "5 dias", "7 dias", "Personalizado"];
export const CASE_PRESENTATION_FORMATS = ["Google Meet", "Presencial", "Outra plataforma online", "A definir"];
export const CASE_PRESENTATION_MINUTES = [10, 15, 20, 30, 45, 60];
export const CASE_QUESTION_MINUTES = [0, 5, 10, 15, 20, 30];
export const CASE_SCHEDULING_MODES = [
  "Inserir link da agenda",
  "Inserir link do Google Meet",
  "Agendamento será feito posteriormente",
  "Responsável agenda manualmente",
];

export const CASE_MODALITIES = [
  {
    value: "material_pronto",
    label: "O candidato recebe o material pronto",
    hint: "A empresa disponibiliza o material; o candidato analisa, se prepara e apresenta.",
  },
  {
    value: "candidato_cria",
    label: "O candidato precisa criar a entrega",
    hint: "O candidato recebe briefing, contexto e requisitos e desenvolve a própria solução.",
  },
];

export const CASE_STATUS_LABEL: Record<string, string> = {
  nao_gerado: "Não gerado",
  rascunho: "Rascunho",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovado: "Aprovado",
  enviado_ao_candidato: "Enviado ao candidato",
  em_preparacao: "Em preparação",
  pronto_para_apresentar: "Pronto para apresentar",
  entregue: "Entregue",
  apresentacao_agendada: "Apresentação agendada",
  apresentado: "Apresentado",
  avaliado: "Avaliado",
};

export type CaseSection = { title: string; content: string };

export type CaseConfig = {
  enabled: boolean;
  stageName: string;
  title: string;
  objective: string;
  evaluate_what: string[];
  modality: string;
  tools: string[];
  tool_required: boolean;
  deliverables: string[];
  delivery_description: string;
  prep_deadline: string;
  deadline_days: string;
  needs_presentation: boolean;
  presentation_format: string;
  presentation_minutes: number;
  questions_minutes: number;
  scheduling_mode: string;
  agenda_link: string;
  meet_link: string;
  criteria: string[];
  content: string;
  sections: CaseSection[];
  evaluator_questions: string[];
  status: string;
  version: number;
};

export function emptyCaseConfig(stageName = "Case técnico"): CaseConfig {
  return {
    enabled: false,
    stageName,
    title: "",
    objective: "",
    evaluate_what: [],
    modality: "candidato_cria",
    tools: [],
    tool_required: false,
    deliverables: [],
    delivery_description: "",
    prep_deadline: "48 horas",
    deadline_days: "3",
    needs_presentation: true,
    presentation_format: "Google Meet",
    presentation_minutes: 30,
    questions_minutes: 15,
    scheduling_mode: "Agendamento será feito posteriormente",
    agenda_link: "",
    meet_link: "",
    criteria: [],
    content: "",
    sections: [],
    evaluator_questions: [],
    status: "nao_gerado",
    version: 1,
  };
}

const list = (items: string[]) => items.filter(Boolean).map((item) => `• ${item}`).join("\n");

/** Geração de reserva, usada quando a IA não responder. */
export function fallbackCase(input: {
  jobTitle: string;
  companyName: string;
  context: { objective: string; responsibilities: string; expected_results: string; challenges: string };
  config: CaseConfig;
  competencies: string[];
  skills: string[];
}): { title: string; sections: CaseSection[]; evaluator_questions: string[] } {
  const { config } = input;
  const criar = config.modality === "candidato_cria";
  const avaliar = config.evaluate_what.length ? config.evaluate_what : input.competencies;
  const criterios = config.criteria.length ? config.criteria : ["Clareza", "Raciocínio", "Comunicação"];
  const ferramentas = config.tools.length ? config.tools : ["Ferramenta de livre escolha"];
  const entregaveis = config.deliverables.length ? config.deliverables : ["Apresentação"];
  const prazo = config.prep_deadline || `${config.deadline_days} dias`;

  const sections: CaseSection[] = [
    {
      title: "Contexto",
      content: `Você está participando do processo seletivo para ${input.jobTitle} na ${input.companyName}.\n${
        input.context.objective || "Esta posição existe para apoiar diretamente os resultados da área."
      }`,
    },
    {
      title: "Cenário e desafio",
      content:
        input.context.challenges ||
        `A área precisa avançar em ${avaliar.slice(0, 3).join(", ") || "organização e execução"}. Neste case você vai atuar sobre uma situação parecida com o dia a dia da vaga (dados fictícios).`,
    },
    {
      title: "Briefing completo",
      content: `${
        criar
          ? "Você recebe o contexto, o problema e os requisitos e deverá desenvolver a sua própria solução."
          : "Você recebe o material pronto na seção 'Materiais disponibilizados' e deverá analisá-lo, preparar suas conclusões e apresentá-las."
      }\nPrincipais responsabilidades da vaga:\n${
        list(input.context.responsibilities.split("\n")) || "• A definir com o gestor"
      }`,
    },
    {
      title: "Sua missão",
      content: config.objective || `Demonstrar ${avaliar.slice(0, 4).join(", ") || "sua forma de pensar e executar"} em uma situação real da vaga.`,
    },
    {
      title: criar ? "O que você precisa desenvolver" : "O que você precisa analisar",
      content: `${config.delivery_description || (criar ? "Desenvolva a solução completa, com raciocínio, decisões e próximos passos." : "Analise o material, identifique oportunidades e monte suas conclusões.")}\nResultados esperados na função:\n${
        list(input.context.expected_results.split("\n")) || "• A combinar"
      }`,
    },
    { title: "Entregáveis", content: list(entregaveis) },
    {
      title: "Regras",
      content: list([
        `Prazo de preparação: ${prazo}`,
        config.tool_required
          ? `Ferramentas obrigatórias: ${ferramentas.join(", ")}`
          : `Ferramentas sugeridas (você pode escolher): ${ferramentas.join(", ")}`,
        "Os dados apresentados são fictícios e servem apenas para este case",
        "Pode usar inteligência artificial, desde que saiba explicar suas decisões",
      ]),
    },
    {
      title: "Materiais disponibilizados",
      content: criar
        ? "Este case não exige material adicional: todo o contexto necessário está neste documento."
        : "O material do case está disponível nesta página, na seção de materiais.",
    },
    { title: "Prazo", content: `Você tem ${prazo} a partir do recebimento deste case.` },
    {
      title: "Instruções de apresentação",
      content: config.needs_presentation
        ? `Formato: ${config.presentation_format}\nTempo de apresentação: ${config.presentation_minutes} minutos\nTempo para perguntas: ${config.questions_minutes} minutos\nDuração total: ${config.presentation_minutes + config.questions_minutes} minutos`
        : "Não haverá apresentação ao vivo. Sua entrega será avaliada pelo material enviado.",
    },
    { title: "Critérios de avaliação", content: list(criterios) },
  ];

  return {
    title: config.title || `Case — ${input.jobTitle}`,
    sections,
    evaluator_questions: [
      "Como você organizou o trabalho dentro do prazo?",
      "Quais premissas você assumiu e por quê?",
      "O que faria diferente com mais tempo ou mais dados?",
      "Como mediria o resultado da sua proposta?",
      "Quais partes você achou mais difíceis?",
      "Como usou ferramentas ou IA nesse processo?",
    ],
    ...(input.skills.length ? {} : {}),
  };
}

export function isCaseComplete(config: CaseConfig) {
  return config.sections.length > 0 && config.sections.every((section) => section.title.trim() && section.content.trim());
}

export function publicCaseUrl(token: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/case/${token}`;
}
