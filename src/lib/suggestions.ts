import { optionScores, shuffleQuestion } from "@/lib/assessment-scoring";
// Motor de sugestões da etapa "Requisitos e perguntas".
// Regras determinísticas: usam tudo que já foi cadastrado nas etapas anteriores
// (vaga, setor, contexto, competências, habilidades, contratação, formato, horário).

export type RequirementCategory =
  | "experiencia"
  | "formacao"
  | "certificacao"
  | "ferramenta"
  | "equipamento"
  | "disponibilidade"
  | "localizacao"
  | "contratacao"
  | "outro";

export type RequirementDetail = {
  requires?: boolean;
  min_time?: string;
  area?: string;
  level?: string;
  courses?: string[];
  any_degree?: boolean;
  certification?: string;
};

export type Requirement = {
  description: string;
  category: RequirementCategory;
  kind: string; // obrigatorio | desejavel
  is_knockout: boolean;
  detail: RequirementDetail;
};

export type QuestionAnswerType =
  | "curto"
  | "aberta"
  | "numero"
  | "data"
  | "selecao_unica"
  | "selecao_multipla"
  | "upload";
export type QuestionStatus = "sugerida" | "aprovada" | "editada";
/** perfil = "Queremos te conhecer melhor"; experiencia = perguntas da vaga. */
export type QuestionSection = "perfil" | "experiencia";

export type Question = {
  question: string;
  kind: string; // eliminatoria | classificatoria
  answer_type: QuestionAnswerType;
  options: string[];
  disqualifying_answer: string;
  tag: string;
  status: QuestionStatus;
  is_required: boolean;
  origin_type: string;
  origin_label: string;
  related_competency: string;
  related_skill: string;
  section: QuestionSection;
  /** Quando o campo corresponde a um dado fixo do candidato (nome, e-mail...). */
  field_key: string;
};

export const REQUIREMENT_CATEGORIES: { value: RequirementCategory; label: string }[] = [
  { value: "experiencia", label: "Experiência mínima" },
  { value: "formacao", label: "Formação" },
  { value: "certificacao", label: "Certificação" },
  { value: "ferramenta", label: "Ferramenta ou conhecimento" },
  { value: "equipamento", label: "Equipamento / estrutura" },
  { value: "disponibilidade", label: "Disponibilidade" },
  { value: "localizacao", label: "Localização" },
  { value: "contratacao", label: "Modelo de contratação" },
  { value: "outro", label: "Outro" },
];

export const EXPERIENCE_TIMES = ["6 meses", "1 ano", "2 anos", "3 anos", "5+ anos", "Personalizado"];

export const EDUCATION_LEVELS = [
  "Ensino Médio",
  "Técnico",
  "Superior cursando",
  "Superior completo",
  "Pós-graduação",
  "Outro",
];

export const TOOL_LEVELS = ["Básico", "Intermediário", "Avançado"];

export const ANSWER_TYPES: { value: QuestionAnswerType; label: string }[] = [
  { value: "curto", label: "Campo curto" },
  { value: "aberta", label: "Resposta aberta" },
  { value: "numero", label: "Número" },
  { value: "data", label: "Data" },
  { value: "selecao_unica", label: "Seleção única" },
  { value: "selecao_multipla", label: "Seleção múltipla" },
  { value: "upload", label: "Upload de arquivo" },
];

export const SELECTION_TYPES: QuestionAnswerType[] = ["selecao_unica", "selecao_multipla"];

export const QUESTION_STATUS_LABEL: Record<QuestionStatus, string> = {
  sugerida: "Sugerida",
  aprovada: "Aprovada",
  editada: "Editada",
};

export const TIME_OPTIONS = [
  "Não possuo",
  "Menos de 1 ano",
  "1 a 2 anos",
  "2 a 3 anos",
  "Mais de 3 anos",
];

export type SuggestionInput = {
  basics: {
    title: string;
    sector: string;
    work_mode: string;
    city: string;
    state: string;
    contract_model: string;
    work_hours: string;
    workload: string;
  };
  context: {
    objective: string;
    responsibilities: string;
    routine: string;
    expected_results: string;
    challenges: string;
  };
  competencies: { name: string; importance: string }[];
  skills: { name: string; level: string; importance: string }[];
};

const LEVEL_LABEL: Record<string, string> = {
  basico: "Básico",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

function levelLabel(level: string) {
  return LEVEL_LABEL[level] ?? level;
}

function isAiSkill(name: string) {
  const value = name.toLowerCase();
  return value.includes("ia") || value.includes("inteligência artificial") || value.includes("inteligencia artificial");
}

function mentionsClient(input: SuggestionInput) {
  const blob = [
    input.basics.title,
    input.basics.sector,
    input.context.objective,
    input.context.responsibilities,
    input.context.routine,
  ]
    .join(" ")
    .toLowerCase();
  return blob.includes("cliente") || blob.includes("atendimento") || blob.includes("carteira") || blob.includes("vendas");
}

const ROLE_PREFIXES = [
  "analista de",
  "analista",
  "assistente de",
  "assistente",
  "auxiliar de",
  "auxiliar",
  "coordenador de",
  "coordenadora de",
  "gerente de",
  "especialista em",
  "especialista",
  "tecnico de",
  "técnico de",
  "estagiario de",
  "estagiário de",
];

/** Tira o prefixo do cargo para gerar textos naturais ("Analista de Customer Success" -> "Customer Success"). */
function experienceArea(input: SuggestionInput) {
  const title = input.basics.title.trim();
  if (title) {
    const lower = title.toLowerCase();
    const prefix = ROLE_PREFIXES.find((item) => lower.startsWith(`${item} `));
    const clean = prefix ? title.slice(prefix.length).trim() : title;
    return clean || title;
  }
  if (input.basics.sector) return input.basics.sector;
  return "a área da vaga";
}

/** Texto legível de um requisito, derivado do detalhamento estruturado. */
export function requirementLabel(item: Requirement): string {
  const detail = item.detail ?? {};
  switch (item.category) {
    case "experiencia": {
      if (detail.requires === false) return "Não exige experiência anterior";
      const time = detail.min_time && detail.min_time !== "Personalizado" ? detail.min_time : detail.area ? "" : "";
      const area = detail.area?.trim();
      const parts = ["Experiência"];
      if (time) parts.push(`mínima de ${time}`);
      if (area) parts.push(`em ${area}`);
      return parts.join(" ");
    }
    case "formacao": {
      if (detail.requires === false) return "Não exige formação específica";
      if (detail.any_degree) return "Qualquer curso superior";
      const courses = (detail.courses ?? []).filter((course) => course.trim());
      const level = detail.level ?? "";
      if (!courses.length) return level ? `Formação: ${level}` : "Formação";
      return `${level ? `${level} em ` : ""}${courses.join(", ")}`;
    }
    case "certificacao":
      return detail.certification?.trim() ? `Certificação: ${detail.certification}` : "Certificação";
    case "ferramenta":
      return `${item.description || detail.area || "Ferramenta"}${detail.level ? ` — nível ${detail.level}` : ""}`;
    default:
      return item.description;
  }
}

export function suggestRequirements(input: SuggestionInput): Requirement[] {
  const list: Requirement[] = [];
  const { basics } = input;

  // Experiência mínima, a partir do cargo/setor.
  list.push({
    category: "experiencia",
    kind: "obrigatorio",
    is_knockout: false,
    detail: { requires: true, min_time: "1 ano", area: experienceArea(input) },
    description: "",
  });

  // Formação (sugerida como desejável, o gestor decide).
  list.push({
    category: "formacao",
    kind: "desejavel",
    is_knockout: false,
    detail: {
      requires: true,
      level: "Superior cursando",
      courses: [basics.sector ? `${basics.sector} ou áreas correlatas` : "áreas correlatas à vaga"],
      any_degree: false,
    },
    description: "",
  });

  // Habilidades técnicas cadastradas viram requisitos de ferramenta.
  input.skills
    .filter((skill) => skill.name.trim())
    .forEach((skill) => {
      list.push({
        category: "ferramenta",
        kind: skill.importance === "obrigatorio" ? "obrigatorio" : "desejavel",
        is_knockout: false,
        detail: { level: levelLabel(skill.level) },
        description: skill.name,
      });
    });

  // Modelo de contratação.
  list.push({
    category: "contratacao",
    kind: "obrigatorio",
    is_knockout: true,
    detail: {},
    description: `Disponibilidade para contratação ${basics.contract_model}`,
  });

  // Estrutura para trabalho remoto ou híbrido.
  if (basics.work_mode !== "Presencial") {
    list.push({
      category: "equipamento",
      kind: "obrigatorio",
      is_knockout: true,
      detail: {},
      description: "Notebook próprio para trabalhar",
    });
    list.push({
      category: "equipamento",
      kind: "obrigatorio",
      is_knockout: true,
      detail: {},
      description: "Internet estável",
    });
  }

  // Localização, quando presencial ou híbrido.
  if (basics.work_mode !== "Remoto" && (basics.city || basics.state)) {
    list.push({
      category: "localizacao",
      kind: "obrigatorio",
      is_knockout: true,
      detail: {},
      description: `Disponibilidade para atuar em ${[basics.city, basics.state].filter(Boolean).join("/")}`,
    });
  }

  // Horário.
  if (basics.work_hours.trim()) {
    list.push({
      category: "disponibilidade",
      kind: "obrigatorio",
      is_knockout: true,
      detail: {},
      description: `Disponibilidade para o horário ${basics.work_hours}`,
    });
  }

  return list;
}

function selection(
  question: string,
  options: string[],
  origin_type: string,
  origin_label: string,
  extra: Partial<Question> = {},
): Question {
  return {
    question,
    kind: "classificatoria",
    answer_type: "selecao_unica",
    options,
    disqualifying_answer: "Não",
    tag: "",
    status: "sugerida",
    is_required: true,
    origin_type,
    origin_label,
    related_competency: "",
    related_skill: "",
    section: "experiencia",
    field_key: "",
    ...extra,
  };
}

function open(
  question: string,
  origin_type: string,
  origin_label: string,
  extra: Partial<Question> = {},
): Question {
  return {
    question,
    kind: "classificatoria",
    answer_type: "aberta",
    options: [],
    disqualifying_answer: "",
    tag: "",
    status: "sugerida",
    is_required: false,
    origin_type,
    origin_label,
    related_competency: "",
    related_skill: "",
    section: "experiencia",
    field_key: "",
    ...extra,
  };
}

const COMPETENCY_SITUATIONS: { match: string; question: string }[] = [
  {
    match: "organiza",
    question: "Conte como você organiza suas tarefas e prazos em um dia com muitas demandas ao mesmo tempo.",
  },
  {
    match: "comunica",
    question: "Conte uma situação em que precisou alinhar uma informação difícil com alguém do time ou com um cliente.",
  },
  {
    match: "proativ",
    question: "Conte uma situação em que você percebeu um problema antes de alguém pedir e resolveu por conta própria.",
  },
  {
    match: "detalhe",
    question: "Como você confere seus próprios trabalhos para evitar erros em informações e números?",
  },
  {
    match: "prazo",
    question: "Como você age quando percebe que um prazo combinado não vai ser cumprido?",
  },
];

export function suggestQuestions(input: SuggestionInput, requirements: Requirement[]): Question[] {
  const list: Question[] = [];
  const { basics } = input;

  // Modelo de contratação (dado já cadastrado — perguntamos só a disponibilidade).
  list.push(
    selection(
      `Você possui disponibilidade e interesse em atuar no modelo ${basics.contract_model}?`,
      ["Sim", "Não"],
      "contratacao",
      `Modelo de contratação: ${basics.contract_model}`,
      { kind: "eliminatoria", disqualifying_answer: "Não" },
    ),
  );

  // Formato de trabalho e localidade.
  if (basics.work_mode !== "Remoto") {
    const place = [basics.city, basics.state].filter(Boolean).join("/");
    list.push(
      selection(
        `Você tem disponibilidade para trabalhar no formato ${basics.work_mode.toLowerCase()}${place ? ` em ${place}` : ""}?`,
        ["Sim", "Não"],
        "formato",
        `Formato de trabalho: ${basics.work_mode}${place ? ` — ${place}` : ""}`,
        { kind: "eliminatoria", disqualifying_answer: "Não" },
      ),
    );
  } else {
    list.push(
      selection(
        "Você possui notebook próprio e internet estável para trabalhar de forma remota?",
        ["Sim", "Não"],
        "formato",
        "Formato de trabalho: Remoto",
        { kind: "eliminatoria", disqualifying_answer: "Não" },
      ),
    );
  }

  // Horário.
  if (basics.work_hours.trim()) {
    list.push(
      selection(
        `Você tem disponibilidade para o horário ${basics.work_hours}?`,
        ["Sim", "Não"],
        "horario",
        `Horário: ${basics.work_hours}`,
        { kind: "eliminatoria", disqualifying_answer: "Não" },
      ),
    );
  }

  // Situação profissional atual.
  list.push(
    selection("Você está trabalhando atualmente?", ["Sim", "Não"], "processo", "Situação profissional atual", {
      tag: "TRABALHANDO ATUALMENTE",
    }),
  );

  // Experiência mínima.
  const experience = requirements.find((item) => item.category === "experiencia" && item.detail?.requires !== false);
  if (experience) {
    const area = experience.detail?.area?.trim() || experienceArea(input);
    list.push(
      selection(
        `Você possui experiência profissional com ${area}?`,
        ["Sim", "Não"],
        "requisito",
        `Requisito: experiência em ${area}`,
        experience.is_knockout ? { kind: "eliminatoria", disqualifying_answer: "Não" } : {},
      ),
    );
    list.push(
      selection(
        `Quanto tempo de experiência você possui com ${area}?`,
        TIME_OPTIONS,
        "requisito",
        `Requisito: experiência mínima de ${experience.detail?.min_time ?? ""}`.trim(),
      ),
    );
    list.push(
      open(`Conte brevemente sobre sua experiência com ${area}.`, "requisito", `Requisito: experiência em ${area}`),
    );
  }

  // Formação.
  const education = requirements.find((item) => item.category === "formacao" && item.detail?.requires !== false);
  if (education) {
    list.push(
      selection("Qual é a sua formação?", EDUCATION_LEVELS, "requisito", "Requisito: formação"),
    );
    list.push(open("Qual curso você fez ou está cursando?", "requisito", "Requisito: formação"));
  }

  // Certificações.
  requirements
    .filter((item) => item.category === "certificacao" && item.detail?.certification?.trim())
    .forEach((item) => {
      list.push(
        selection(
          `Você possui a certificação ${item.detail.certification}?`,
          ["Sim", "Não"],
          "requisito",
          `Certificação: ${item.detail.certification}`,
          item.is_knockout ? { kind: "eliminatoria", disqualifying_answer: "Não" } : {},
        ),
      );
    });

  // Habilidades técnicas.
  input.skills
    .filter((skill) => skill.name.trim())
    .forEach((skill) => {
      list.push(
        selection(
          `Qual é o seu nível de conhecimento em ${skill.name}?`,
          ["Não tenho experiência", ...TOOL_LEVELS],
          "habilidade",
          `Habilidade: ${skill.name} (${levelLabel(skill.level)})`,
          { related_skill: skill.name },
        ),
      );
      list.push(
        open(
          isAiSkill(skill.name)
            ? "Como você utiliza Inteligência Artificial atualmente na sua rotina profissional?"
            : `Como você usa ${skill.name} no seu dia a dia de trabalho? Dê um exemplo prático.`,
          "habilidade",
          `Habilidade: ${skill.name}`,
          { related_skill: skill.name },
        ),
      );
    });

  // Rotina com clientes.
  if (mentionsClient(input)) {
    list.push(
      open(
        "Conte como era o seu contato com clientes: quantos clientes você acompanhava e como organizava os follow-ups?",
        "responsabilidades",
        "Responsabilidades: relacionamento com clientes",
      ),
    );
    list.push(
      open(
        "Conte uma situação em que precisou cobrar uma ação de um cliente que não estava respondendo.",
        "responsabilidades",
        "Responsabilidades: relacionamento com clientes",
      ),
    );
  }

  // Competências comportamentais → perguntas situacionais.
  input.competencies
    .filter((competency) => competency.name.trim())
    .forEach((competency) => {
      const name = competency.name.toLowerCase();
      const match = COMPETENCY_SITUATIONS.find((item) => name.includes(item.match));
      list.push(
        open(
          match?.question ??
            `Conte uma situação recente em que ${competency.name.toLowerCase()} foi decisivo para o seu resultado.`,
          "competencia",
          `Competência: ${competency.name} (${competency.importance})`,
          { related_competency: competency.name },
        ),
      );
    });

  // Fechamento.
  list.push(
    open(
      "Por que essa vaga faz sentido para você neste momento da sua carreira?",
      "processo",
      "Motivação do candidato",
    ),
  );

  // Remove perguntas duplicadas pelo texto.
  const seen = new Set<string>();
  return list.filter((item) => {
    const key = item.question.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function emptyQuestion(section: QuestionSection = "experiencia"): Question {
  return {
    question: "",
    kind: "classificatoria",
    answer_type: "selecao_unica",
    options: ["Sim", "Não"],
    disqualifying_answer: "Não",
    tag: "",
    status: "editada",
    is_required: true,
    origin_type: "manual",
    origin_label: "Criada pelo gestor",
    related_competency: "",
    related_skill: "",
    section,
    field_key: "",
  };
}

export function emptyRequirement(category: RequirementCategory = "outro"): Requirement {
  const base: Requirement = {
    description: "",
    category,
    kind: "obrigatorio",
    is_knockout: category !== "ferramenta",
    detail: {},
  };
  if (category === "experiencia") base.detail = { requires: true, min_time: "1 ano", area: "" };
  if (category === "formacao") base.detail = { requires: true, level: "Superior completo", courses: [""] };
  if (category === "certificacao") base.detail = { certification: "" };
  if (category === "ferramenta") base.detail = { level: "Intermediário" };
  return base;
}

/* ------------------------------------------------------------------ */
/* Bloco 1 — "Queremos te conhecer melhor"                             */
/* ------------------------------------------------------------------ */

export const EDUCATION_STATUS = ["Concluída", "Cursando", "Trancada / não concluída"];

function profileField(
  question: string,
  answer_type: QuestionAnswerType,
  field_key: string,
  extra: Partial<Question> = {},
): Question {
  return {
    question,
    kind: "classificatoria",
    answer_type,
    options: [],
    disqualifying_answer: "",
    tag: "",
    status: "sugerida",
    is_required: true,
    origin_type: "perfil",
    origin_label: "Dados do candidato",
    related_competency: "",
    related_skill: "",
    section: "perfil",
    field_key,
    ...extra,
  };
}

/** Campos básicos do candidato, criados automaticamente em toda vaga. */
export function profileQuestions(): Question[] {
  return [
    profileField("Nome completo", "curto", "name"),
    profileField("Idade", "numero", "age"),
    profileField("Cidade", "curto", "city"),
    profileField("Estado", "curto", "state"),
    profileField("Telefone / WhatsApp", "curto", "phone"),
    profileField("E-mail", "curto", "email"),
    profileField("Formação", "selecao_unica", "education_level", { options: EDUCATION_LEVELS }),
    profileField("Curso ou área de formação", "curto", "education_course", { is_required: false }),
    profileField("Formação concluída ou cursando?", "selecao_unica", "education_status", {
      options: EDUCATION_STATUS,
      is_required: false,
    }),
    profileField("Ocupação atual", "curto", "occupation", { is_required: false }),
    profileField("Você está trabalhando atualmente?", "selecao_unica", "employed_now", {
      options: ["Sim", "Não"],
      tag: "TRABALHANDO ATUALMENTE",
    }),
    profileField("Empresa atual", "curto", "current_company", { is_required: false }),
    profileField("Cargo atual", "curto", "current_position", { is_required: false }),
    profileField("LinkedIn", "curto", "linkedin", { is_required: false }),
    profileField("Currículo", "upload", "resume", { is_required: false }),
  ];
}

/* ------------------------------------------------------------------ */
/* Critério eliminatório: só faz sentido em condição objetiva          */
/* ------------------------------------------------------------------ */

const OBJECTIVE_ORIGINS = [
  "contratacao",
  "formato",
  "horario",
  "localizacao",
  "requisito",
  "certificacao",
  "equipamento",
  "disponibilidade",
  "habilidade",
  "manual",
];

/** A opção "usar como critério eliminatório" aparece só quando cabe. */
export function canBeKnockout(question: Question) {
  if (question.section === "perfil") return false;
  if (!SELECTION_TYPES.includes(question.answer_type)) return false;
  if (question.related_competency) return false;
  return OBJECTIVE_ORIGINS.includes(question.origin_type || "manual");
}

/* ------------------------------------------------------------------ */
/* Assessment da vaga                                                  */
/* ------------------------------------------------------------------ */

export type AssessmentQuestion = {
  situation: string;
  question: string;
  answer_type: "selecao_unica" | "selecao_multipla";
  options: string[];
  competency: string;
  /** Peso interno de cada alternativa (0 a 3), na mesma ordem das alternativas. */
  scoring: number[];
  /** O que essa pergunta observa — usado na análise com IA. */
  looking_for: string;
  /** Pontuação interna 0–100 de cada alternativa para a habilidade principal (invisível ao candidato). */
  option_scores?: number[];
  /** Justificativa interna da pontuação de cada alternativa. */
  justifications?: string[];
  /** Até 2 habilidades secundárias com pontuação por alternativa. */
  secondary_scores?: { competency: string; scores: number[] }[];
};

export type Assessment = {
  title: string;
  questions: AssessmentQuestion[];
  estimated_minutes: number;
  generated_by: string;
  /** Somente assessments aprovados pelo gestor ficam disponíveis ao candidato. */
  approved?: boolean;
};

/** Quantidade padrão de situações por nível de importância da habilidade. */
export const QUESTIONS_PER_IMPORTANCE: Record<string, number> = { essencial: 3, obrigatorio: 3, alta: 2, importante: 2, complementar: 1, desejavel: 1 };

/** Pontuação 0–100 por alternativa: a melhor recebe 100, as demais ficam graduadas. */
function gradedScores(total: number, best: number) {
  const others = [60, 30, 10, 5, 0];
  let k = 0;
  return Array.from({ length: total }, (_, i) => (i === best ? 100 : others[k++] ?? 0));
}

function gradedJustifications(options: string[], scores: number[]) {
  return options.map((_, i) => {
    const v = scores[i] ?? 0;
    return v >= 90
      ? "Decisão mais completa: analisa o contexto, age e comunica."
      : v >= 50
        ? "Atitude parcial: resolve parte do problema, mas deixa lacunas."
        : v >= 20
          ? "Abordagem reativa ou dependente de terceiros."
          : "Pouca evidência da habilidade nessa escolha.";
  });
}

/** Pesos internos: 3 para a melhor alternativa, 1 para as demais. */
function weights(total: number, best: number) {
  return Array.from({ length: total }, (_, i) => (i === best ? 3 : 1));
}

export function emptyAssessmentQuestion(competency = "Competência"): AssessmentQuestion {
  return {
    situation: "Descreva aqui a situação do dia a dia que o candidato vai avaliar.",
    question: "Como você agiria nessa situação?",
    answer_type: "selecao_unica",
    options: [
      "Aguardo orientação antes de agir.",
      "Resolvo por conta própria sem comunicar ninguém.",
      "Avalio o contexto, decido com base no impacto e comunico o que fiz.",
      "Repasso a situação para outra pessoa resolver.",
    ],
    competency,
    scoring: weights(4, 2),
    option_scores: [30, 10, 100, 60],
    justifications: gradedJustifications(["", "", "", ""], [30, 10, 100, 60]),
    looking_for: `Evidências de ${competency.toLowerCase()} na prática.`,
  };
}

function situationFor(competency: string, input: SuggestionInput): AssessmentQuestion {
  const area = experienceArea(input);
  const name = competency.toLowerCase();
  const build = (situation: string, options: string[], best: number): AssessmentQuestion => ({
    situation,
    question: "Como você agiria nessa situação?",
    answer_type: "selecao_unica",
    options,
    competency,
    scoring: weights(options.length, best),
    option_scores: gradedScores(options.length, best),
    justifications: gradedJustifications(options, gradedScores(options.length, best)),
    looking_for: `Como a pessoa aplica ${name} em uma situação real de ${area}.`,
  });

  if (name.includes("organiza") || name.includes("prioriz")) {
    return build(
      "Você começa o dia com três demandas urgentes e uma tarefa combinada para hoje que ainda não foi iniciada.",
      [
        "Começo pela tarefa mais rápida para sentir que avancei.",
        "Faço tudo ao mesmo tempo, alternando entre as demandas.",
        "Organizo prazos e impactos, resolvo o que trava outras pessoas e combino um novo prazo para o que não cabe hoje.",
        "Peço ao gestor para decidir a ordem antes de começar.",
      ],
      2,
    );
  }
  if (name.includes("comunica")) {
    return build(
      "Você percebeu um erro seu que afeta a entrega combinada com outra área.",
      [
        "Corrijo em silêncio e só falo se alguém notar.",
        "Aviso a outra área explicando o que aconteceu, o impacto e o novo prazo.",
        "Espero a próxima reunião para comentar o assunto.",
        "Explico que a falha veio de uma informação recebida errada.",
      ],
      1,
    );
  }
  if (name.includes("proativ")) {
    return build(
      "Você percebe que um cliente importante está há alguns dias sem responder e possui uma ação pendente que pode atrasar o andamento do trabalho.",
      [
        "Aguardo o cliente entrar em contato quando estiver disponível.",
        "Envio uma nova mensagem perguntando se ele precisa de ajuda.",
        "Consulto o histórico, identifico a pendência, faço um contato com direcionamento claro e registro a ação realizada.",
        "Encaminho imediatamente o caso para outra pessoa resolver.",
      ],
      2,
    );
  }
  if (name.includes("cobran") || name.includes("negocia")) {
    return build(
      "Um contato importante está há vários dias sem responder e tem uma pendência em aberto.",
      [
        "Aguardo mais alguns dias para não pressionar.",
        "Envio uma mensagem perguntando se precisa de ajuda.",
        "Reviso o histórico, identifico a pendência e retomo o contato com um direcionamento claro e prazo.",
        "Encaminho a situação imediatamente ao gestor.",
      ],
      2,
    );
  }
  if (name.includes("problema") || name.includes("analit") || name.includes("analít")) {
    return build(
      "Um número do seu relatório está diferente do que a área esperava e a reunião é em uma hora.",
      [
        "Envio como está e explico na reunião.",
        "Refaço o relatório inteiro do zero.",
        "Confiro a origem dos dados, isolo a diferença e levo o número com a explicação do que mudou.",
        "Peço para adiar a reunião até entender tudo.",
      ],
      2,
    );
  }
  if (name.includes("detalhe")) {
    return build(
      `Você precisa enviar uma informação de ${area} para um cliente e o prazo termina em minutos.`,
      [
        "Envio rápido e corrijo depois, se precisar.",
        "Confiro os pontos que mais geram erro, envio e sinalizo o que ainda será validado.",
        "Peço para outra pessoa revisar e envio só depois.",
        "Envio o material incompleto avisando que falta uma parte.",
      ],
      1,
    );
  }
  return build(
    `No dia a dia de ${area}, surge uma situação em que ${name} é decisivo para o resultado.`,
    [
      "Sigo o procedimento padrão, mesmo sem resolver o problema.",
      "Avalio o contexto, decido com base no impacto e comunico o que fiz.",
      "Espero orientação antes de qualquer ação.",
      "Resolvo por conta própria sem registrar nem comunicar.",
    ],
    1,
  );
}

/** Situações adicionais para avaliar a mesma habilidade mais de uma vez. */
function variantFor(competency: string, input: SuggestionInput, variant: number): AssessmentQuestion {
  if (variant === 0) return situationFor(competency, input);
  const area = experienceArea(input);
  const name = competency.toLowerCase();
  const templates: [string, string[]][] = [
    [
      `Um prazo importante de ${area} foi antecipado e uma parte do trabalho que depende de ${name} ainda não está pronta.`,
      [
        "Reorganizo o que falta, priorizo o que gera mais impacto e aviso os envolvidos sobre o que será entregue e quando.",
        "Mantenho o plano original e tento acelerar o ritmo para entregar tudo.",
        "Entrego o que estiver pronto e explico depois o que ficou pendente.",
        "Peço a alguém mais experiente para assumir essa parte.",
      ],
    ],
    [
      `Um colega traz uma sugestão diferente da sua para uma tarefa de ${area} que exige ${name}.`,
      [
        "Sigo a minha forma, porque já sei que funciona.",
        "Comparo as duas abordagens com dados ou exemplos e combinamos qual usar.",
        "Aceito a sugestão dele para evitar desgaste.",
        "Levo a decisão ao gestor para ele escolher.",
      ],
    ],
    [
      `Você recebe uma demanda nova de ${area}, pouco detalhada, que vai exigir ${name} para ser bem feita.`,
      [
        "Começo imediatamente com o que entendi e ajusto depois se precisar.",
        "Aguardo alguém detalhar melhor antes de começar.",
        "Faço perguntas objetivas para entender o resultado esperado, monto um plano curto e valido antes de executar.",
        "Faço uma versão rápida e envio para ver se está no caminho.",
      ],
    ],
  ];
  const [situation, options] = templates[(variant - 1) % templates.length]!;
  const best = options.findIndex((o) => /plano|dados ou exemplos|priorizo/.test(o));
  const option_scores = options.map((o, i) =>
    i === best ? 100 : /versão rápida|Mantenho|Entrego o que/.test(o) ? 55 : /Aceito|Começo imediatamente/.test(o) ? 30 : 15,
  );
  return {
    situation,
    question: "Como você agiria nessa situação?",
    answer_type: "selecao_unica",
    options,
    competency,
    scoring: option_scores.map((v) => (v === 100 ? 3 : 1)),
    option_scores,
    justifications: gradedJustifications(options, option_scores),
    looking_for: `Como a pessoa aplica ${name} em uma situação real de ${area}.`,
  };
}

/** Assessment determinístico (reserva quando a IA não responde). */
const DEFAULT_ASSESSMENT_COMPETENCIES = [
  "Organização",
  "Comunicação",
  "Proatividade",
  "Resolução de problemas",
  "Atenção aos detalhes",
];

export function skillTargets(input: SuggestionInput) {
  const list = [
    ...input.competencies.map((c) => ({ name: c.name.trim(), importance: c.importance })),
    ...input.skills.map((c) => ({ name: c.name.trim(), importance: c.importance })),
  ].filter((c) => c.name);
  const seen = new Set<string>();
  const unique = list.filter((c) => (seen.has(c.name.toLowerCase()) ? false : (seen.add(c.name.toLowerCase()), true)));
  const base = unique.length ? unique : DEFAULT_ASSESSMENT_COMPETENCIES.map((name) => ({ name, importance: "importante" }));
  return base.slice(0, 10).map((c) => ({ ...c, count: QUESTIONS_PER_IMPORTANCE[c.importance] ?? 2 }));
}

/** Nova situação para uma habilidade (usada no botão "Adicionar situação"). */
export function extraAssessmentQuestion(competency: string, input: SuggestionInput, existing: number): AssessmentQuestion {
  return shuffleQuestion(variantFor(competency, input, existing), existing + competency.length);
}

export function suggestAssessment(input: SuggestionInput): Assessment {
  const questions: AssessmentQuestion[] = [];
  skillTargets(input).forEach((target, t) => {
    for (let v = 0; v < target.count; v++) questions.push(shuffleQuestion(variantFor(target.name, input, v), t * 7 + v));
  });

  return completeAssessment(
    {
      title: `Assessment — ${input.basics.title || "vaga"}`,
      questions,
      estimated_minutes: Math.max(5, Math.round(questions.length * 0.7)),
      generated_by: "sistema",
      approved: false,
    },
    input,
  );
}

/* ------------------------------------------------------------------ */
/* Validação: nenhuma pergunta pode chegar incompleta ao gestor        */
/* ------------------------------------------------------------------ */

const MIN_OPTIONS = 2;

export function isAssessmentQuestionComplete(item: AssessmentQuestion) {
  const options = item.options.map((option) => option.trim()).filter(Boolean);
  return Boolean(
    item.situation.trim() &&
      item.question.trim() &&
      item.competency.trim() &&
      options.length >= MIN_OPTIONS &&
      options.length === item.options.length,
  );
}

export function isAssessmentReady(assessment: Assessment) {
  return assessment.questions.length > 0 && assessment.questions.every(isAssessmentQuestionComplete);
}

/**
 * Completa automaticamente qualquer questão incompleta (situação, pergunta,
 * competência, alternativas e pesos internos) antes de o assessment ser
 * apresentado como "Pronto para uso".
 */
export function completeAssessment(assessment: Assessment, input: SuggestionInput): Assessment {
  const fallbackNames = [
    ...input.competencies.map((item) => item.name),
    ...input.skills.map((item) => item.name),
    ...DEFAULT_ASSESSMENT_COMPETENCIES,
  ].filter((name) => name.trim());

  const questions = assessment.questions
    .map((raw, index) => {
      const competency = raw.competency.trim() || fallbackNames[index % fallbackNames.length] || "Competência";
      const model = situationFor(competency, input);

      let options = raw.options.map((option) => option.trim()).filter(Boolean);
      if (options.length < MIN_OPTIONS) options = model.options;

      const scoring =
        raw.scoring && raw.scoring.length === options.length
          ? raw.scoring
          : options.length === model.options.length
            ? model.scoring
            : weights(options.length, options.length - 1);

      return {
        situation: raw.situation.trim() || model.situation,
        question: raw.question.trim() || model.question,
        answer_type: "selecao_unica",
        options,
        competency,
        scoring,
        option_scores: raw.option_scores?.length === options.length ? raw.option_scores : optionScores({ ...raw, options, scoring }),
        justifications: raw.justifications?.length === options.length ? raw.justifications : undefined,
        secondary_scores: (raw.secondary_scores ?? [])
          .filter((sec) => sec.competency?.trim() && sec.scores?.length === options.length)
          .slice(0, 2),
        looking_for: raw.looking_for?.trim() || model.looking_for,
      } as AssessmentQuestion;
    })
    .filter((item) => isAssessmentQuestionComplete(item));

  const finalQuestions = questions.length ? questions : suggestAssessmentFallback(input).questions;

  return {
    title: assessment.title.trim() || `Assessment — ${input.basics.title || "vaga"}`,
    questions: finalQuestions,
    estimated_minutes: Math.max(3, assessment.estimated_minutes || Math.round(finalQuestions.length * 0.7)),
    generated_by: assessment.generated_by || "sistema",
    approved: assessment.approved ?? false,
  };
}

function suggestAssessmentFallback(input: SuggestionInput): Assessment {
  const questions = DEFAULT_ASSESSMENT_COMPETENCIES.map((name) => situationFor(name, input));
  return {
    title: `Assessment — ${input.basics.title || "vaga"}`,
    questions,
    estimated_minutes: Math.max(5, Math.round(questions.length * 0.7)),
    generated_by: "sistema",
  };
}
