/**
 * Domain helpers for the hiring platform.
 * Everything here is data-shape / label logic shared across screens.
 */

export type StageKey =
  | "inscricao"
  | "triagem"
  | "assessment"
  | "entrevista"
  | "case"
  | "entrevista_gestor"
  | "etapa_final"
  | "contratacao";

export const SUGGESTED_STAGES: { name: string; stage_key: StageKey; objective: string }[] = [
  { name: "Inscrição", stage_key: "inscricao", objective: "Receber candidaturas" },
  { name: "Triagem", stage_key: "triagem", objective: "Verificar requisitos objetivos" },
  { name: "Assessment", stage_key: "assessment", objective: "Avaliar competências principais" },
  { name: "Entrevista inicial", stage_key: "entrevista", objective: "Conhecer histórico e comportamento" },
  { name: "Case técnico", stage_key: "case", objective: "Ver a pessoa resolvendo na prática" },
  { name: "Entrevista com gestor", stage_key: "entrevista_gestor", objective: "Validar aderência ao time" },
  { name: "Etapa final", stage_key: "etapa_final", objective: "Decisão final" },
  { name: "Contratação", stage_key: "contratacao", objective: "Fechar proposta" },
];

export const SECTORS = [
  "Administrativo",
  "Comercial",
  "Financeiro",
  "Marketing",
  "Operações",
  "Customer Success",
  "RH",
  "Tecnologia",
  "Outro",
];

export const WORK_MODES = ["Presencial", "Híbrido", "Remoto"];
export const CONTRACT_MODELS = ["CLT", "PJ", "Estágio", "Temporário", "Outro"];

export const COMPETENCY_SUGGESTIONS = [
  "Organização",
  "Comunicação",
  "Proatividade",
  "Autonomia",
  "Capacidade analítica",
  "Atenção aos detalhes",
  "Liderança",
  "Negociação",
  "Resolução de problemas",
  "Gestão de prioridades",
];

export const SKILL_SUGGESTIONS = [
  "Excel",
  "CRM",
  "Google Workspace",
  "Gestão financeira",
  "Atendimento ao cliente",
  "Power BI",
  "Uso de IA",
];

export const REQUIREMENT_SUGGESTIONS = [
  "Experiência mínima",
  "Formação",
  "Certificação",
  "Disponibilidade de horário",
  "Disponibilidade para viagens",
  "Notebook próprio",
  "Celular próprio",
  "Internet estável",
  "Experiência no setor",
  "Disponibilidade para trabalho presencial",
  "Aceite do modelo de contratação PJ",
];

export const IMPORTANCE_OPTIONS = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "essencial", label: "Essencial" },
];

export const SKILL_LEVELS = [
  { value: "basico", label: "Básico" },
  { value: "intermediario", label: "Intermediário" },
  { value: "avancado", label: "Avançado" },
];

export const SKILL_IMPORTANCE = [
  { value: "desejavel", label: "Desejável" },
  { value: "importante", label: "Importante" },
  { value: "obrigatorio", label: "Obrigatório" },
];

export const REJECTION_REASONS = [
  "Não atendeu requisito objetivo",
  "Experiência incompatível",
  "Desistência",
  "Pretensão incompatível",
  "Indisponibilidade",
  "Não avançou após entrevista",
  "Não avançou após case",
  "Outro",
];

export const SCRIPT_CATEGORIES = [
  { value: "padrao", label: "Pergunta padrão da vaga" },
  { value: "situacional", label: "Situacional" },
  { value: "tecnica", label: "Técnica" },
  { value: "experiencia", label: "Experiência" },
  { value: "competencia", label: "Competência" },
  { value: "candidato", label: "Específica do candidato" },
];

export const CANDIDATE_STATUS_LABEL: Record<string, string> = {
  ativo: "Em processo",
  contratado: "Contratado",
  nao_avancou: "Não avançou",
  nao_atende_requisito: "Não atende requisito objetivo",
};

export function labelFor(list: { value: string; label: string }[], value?: string | null) {
  return list.find((item) => item.value === value)?.label ?? value ?? "—";
}

export function formatMoney(value?: number | null) {
  if (value === null || value === undefined) return null;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function salaryLabel(job: {
  salary_type?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
}) {
  if (job.salary_type === "combinar") return "A combinar";
  const min = formatMoney(job.salary_min);
  const max = formatMoney(job.salary_max);
  if (job.salary_type === "faixa" && min && max) return `${min} – ${max}`;
  return min ?? max ?? "A combinar";
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Colour accent per funnel stage, using design tokens only. */
export function stageAccent(stageKey?: string | null) {
  switch (stageKey) {
    case "triagem":
      return { text: "text-brand", chip: "bg-brand/10 text-brand", ring: "ring-brand/20" };
    case "assessment":
      return { text: "text-teal", chip: "bg-teal/10 text-teal", ring: "ring-teal/20" };
    case "entrevista":
    case "entrevista_gestor":
      return { text: "text-amber", chip: "bg-amber/10 text-amber", ring: "ring-amber/20" };
    case "case":
      return { text: "text-rose", chip: "bg-rose/10 text-rose", ring: "ring-rose/20" };
    case "etapa_final":
    case "contratacao":
      return { text: "text-teal", chip: "bg-teal/10 text-teal", ring: "ring-teal/30" };
    default:
      return { text: "text-ink-soft", chip: "bg-paper/80 text-ink-soft", ring: "ring-white/10" };
  }
}

export function publicJobUrl(jobId: string) {
  if (typeof window === "undefined") return `/vaga/${jobId}`;
  return `${window.location.origin}/vaga/${jobId}`;
}

export function jobShareText(job: {
  title: string;
  sector?: string | null;
  work_mode?: string | null;
  contract_model?: string | null;
  city?: string | null;
  state?: string | null;
  objective?: string | null;
  id: string;
}) {
  const place = [job.city, job.state].filter(Boolean).join("/");
  return [
    `Vaga aberta: ${job.title}`,
    [job.sector, job.contract_model, job.work_mode, place].filter(Boolean).join(" • "),
    job.objective ? `\n${job.objective}` : "",
    `\nInscrições: ${publicJobUrl(job.id)}`,
  ]
    .filter(Boolean)
    .join("\n");
}
