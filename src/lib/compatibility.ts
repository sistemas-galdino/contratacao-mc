import type { CompatibilityResult } from "./ai.functions";

export const MIN_CONFIDENCE = 70;

export const DIMENSION_LABELS: Record<string, string> = {
  experiencia: "Experiência profissional",
  formacao: "Formação",
  competencias: "Competências comportamentais",
  habilidades: "Habilidades técnicas",
  ferramentas: "Ferramentas",
  certificacao: "Certificações",
  disponibilidade: "Disponibilidade e condições",
};

const WEIGHTS: Record<string, number> = {
  experiencia: 25,
  competencias: 20,
  habilidades: 20,
  disponibilidade: 15,
  formacao: 10,
  ferramentas: 10,
  certificacao: 5,
};

type Req = { category?: string | null };

/** Só as dimensões que esta vaga realmente exige. */
export function dimensionsForJob(input: {
  requirements: Req[];
  competencies: unknown[];
  skills: unknown[];
  hasConditions: boolean;
}) {
  const cats = new Set(input.requirements.map((r) => r.category ?? "outro"));
  const dims = ["experiencia"];
  if (cats.has("formacao")) dims.push("formacao");
  if (input.competencies.length) dims.push("competencias");
  if (input.skills.length) dims.push("habilidades");
  if (cats.has("ferramenta")) dims.push("ferramentas");
  if (cats.has("certificacao")) dims.push("certificacao");
  if (input.hasConditions || ["disponibilidade", "localizacao", "contratacao", "equipamento"].some((c) => cats.has(c)))
    dims.push("disponibilidade");
  return dims;
}

export type CompatibilityPayload = CompatibilityResult & {
  compatibility: number | null;
  coverage: number;
  final_confidence: number;
  conclusive: boolean;
};

export function finalize(result: CompatibilityResult): CompatibilityPayload {
  const scored = result.dimensions.filter((d) => typeof d.score === "number");
  const totalWeight = scored.reduce((sum, d) => sum + (WEIGHTS[d.key] ?? 10), 0);
  const compatibility = totalWeight
    ? Math.round(
        scored.reduce((sum, d) => sum + Math.max(0, Math.min(100, d.score as number)) * (WEIGHTS[d.key] ?? 10), 0) /
          totalWeight,
      )
    : null;
  const items = [...result.requirements.map((r) => r.status), ...result.competencies.map((c) => c.status)];
  const coverage = items.length ? items.filter((s) => s !== "nao_validado").length / items.length : 0;
  const dimCoverage = result.dimensions.length ? scored.length / result.dimensions.length : 0;
  const final_confidence = Math.round(
    (Math.max(0, Math.min(100, result.confidence)) + coverage * 100 + dimCoverage * 100) / 3,
  );
  return {
    ...result,
    compatibility,
    coverage: Math.round(coverage * 100),
    final_confidence,
    conclusive: compatibility !== null && final_confidence >= MIN_CONFIDENCE,
  };
}

export function classify(value: number) {
  if (value >= 80) return { label: "Alta compatibilidade", tone: "brand" as const };
  if (value >= 60) return { label: "Boa compatibilidade", tone: "teal" as const };
  if (value >= 40) return { label: "Compatibilidade moderada", tone: "amber" as const };
  return { label: "Baixa compatibilidade", tone: "rose" as const };
}

export function analysisStatus(p: CompatibilityPayload) {
  const mandatory = p.requirements.filter((r) => r.mandatory || r.knockout);
  if (mandatory.some((r) => r.status === "nao_atende"))
    return { icon: "warn", text: "Existe requisito obrigatório não atendido" };
  if (mandatory.some((r) => r.status === "nao_validado" || r.status === "declarado"))
    return { icon: "unknown", text: "Existem requisitos que ainda não puderam ser validados" };
  return { icon: "ok", text: "Todos os requisitos obrigatórios atendidos" };
}
