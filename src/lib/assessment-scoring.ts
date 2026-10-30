import type { AssessmentQuestion } from "@/lib/suggestions";

/** Pontuação interna (0–100) de cada alternativa para a habilidade principal. */
export function optionScores(q: AssessmentQuestion): number[] {
  if (q.option_scores && q.option_scores.length === q.options.length) return q.option_scores.map(clamp);
  const legacy = q.scoring ?? [];
  if (legacy.length === q.options.length) {
    const max = Math.max(...legacy, 1);
    return legacy.map((v) => clamp(Math.round((v / max) * 100) === 100 ? 100 : Math.round((v / max) * 100)));
  }
  return q.options.map(() => 50);
}

function clamp(v: number) {
  return Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
}

export type AnsweredRow = {
  question?: string;
  situation?: string;
  answer?: string;
  option_index?: number;
  question_index?: number;
};

export type SkillItem = {
  situation: string;
  answer: string;
  score: number;
  justification: string;
  role: "principal" | "secundaria";
};

export type SkillScore = {
  skill: string;
  score: number;
  items: SkillItem[];
  weight: number;
  importance: string;
  analysis: string;
};

export type AssessmentResult = {
  skills: SkillScore[];
  compatibility: number | null;
  strongest: string[];
  weakest: string[];
  to_deepen: string[];
  computed_at: string;
};

export const IMPORTANCE_WEIGHT: Record<string, number> = {
  essencial: 3,
  obrigatorio: 3,
  alta: 2,
  importante: 2,
  complementar: 1,
  desejavel: 1,
};

const norm = (s: string) => s.toLocaleLowerCase("pt-BR").trim();

function findQuestion(questions: AssessmentQuestion[], row: AnsweredRow, index: number) {
  if (typeof row.question_index === "number" && questions[row.question_index]) return questions[row.question_index];
  const bySituation = questions.find((q) => row.situation && norm(q.situation) === norm(row.situation));
  return bySituation ?? questions[index];
}

function findOption(q: AssessmentQuestion, row: AnsweredRow) {
  if (typeof row.option_index === "number" && q.options[row.option_index] !== undefined) return row.option_index;
  return q.options.findIndex((o) => norm(o) === norm(row.answer ?? ""));
}

function analysisFor(skill: string, items: SkillItem[], score: number) {
  const low = items.filter((i) => i.score < 50).length;
  const high = items.filter((i) => i.score >= 80).length;
  const n = items.length;
  const base =
    score >= 80
      ? `As escolhas indicam boa evidência de ${skill.toLowerCase()} nas situações apresentadas.`
      : score >= 60
        ? `As escolhas mostram evidência moderada de ${skill.toLowerCase()}.`
        : `As escolhas trouxeram pouca evidência de ${skill.toLowerCase()} nas situações apresentadas.`;
  const mix =
    high && low
      ? ` As respostas variaram: em ${high} situação(ões) a decisão foi mais consistente e em ${low} a abordagem foi menos efetiva — vale aprofundar na entrevista.`
      : "";
  const few = n < 2 ? " Apenas uma situação avaliou essa habilidade, então a evidência é limitada." : "";
  return base + mix + few;
}

export function computeAssessmentResult(
  questions: AssessmentQuestion[],
  rows: AnsweredRow[],
  importances: { name: string; importance: string }[],
): AssessmentResult {
  const map = new Map<string, SkillItem[]>();
  const push = (skill: string, item: SkillItem) => {
    const key = skill.trim();
    if (!key) return;
    map.set(key, [...(map.get(key) ?? []), item]);
  };
  rows.forEach((row, i) => {
    const q = findQuestion(questions, row, i);
    if (!q) return;
    const idx = findOption(q, row);
    if (idx < 0) return;
    const answer = q.options[idx] ?? "";
    const justification = q.justifications?.[idx] ?? "";
    push(q.competency, { situation: q.situation, answer, score: optionScores(q)[idx] ?? 0, justification, role: "principal" });
    for (const sec of q.secondary_scores ?? []) {
      const s = sec.scores?.[idx];
      if (typeof s === "number") push(sec.competency, { situation: q.situation, answer, score: clamp(s), justification, role: "secundaria" });
    }
  });
  const skills: SkillScore[] = [...map.entries()].map(([skill, items]) => {
    const principal = items.filter((i) => i.role === "principal");
    const used = principal.length ? principal : items;
    const score = Math.round(used.reduce((a, b) => a + b.score, 0) / used.length);
    const imp = importances.find((c) => norm(c.name) === norm(skill))?.importance ?? "importante";
    return { skill, score, items, weight: IMPORTANCE_WEIGHT[imp] ?? 2, importance: imp, analysis: analysisFor(skill, used, score) };
  });
  const totalW = skills.reduce((a, s) => a + s.weight, 0);
  const compatibility = totalW ? Math.round(skills.reduce((a, s) => a + s.score * s.weight, 0) / totalW) : null;
  const sorted = [...skills].sort((a, b) => b.score - a.score);
  return {
    skills,
    compatibility,
    strongest: sorted.filter((s) => s.score >= 75).slice(0, 3).map((s) => s.skill),
    weakest: [...sorted].reverse().filter((s) => s.score < 60).slice(0, 3).map((s) => s.skill),
    to_deepen: sorted.filter((s) => s.score < 70 || s.items.some((i) => i.score < 50)).map((s) => s.skill),
    computed_at: new Date().toISOString(),
  };
}

/** Deterministic shuffle so a melhor alternativa não fica sempre na mesma letra. */
export function shuffleQuestion(q: AssessmentQuestion, seed: number): AssessmentQuestion {
  const scores = optionScores(q);
  const order = q.options.map((_, i) => i);
  let s = seed * 9301 + 49297;
  for (let i = order.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    const tmp = order[i]!;
    order[i] = order[j]!;
    order[j] = tmp;
  }
  return {
    ...q,
    options: order.map((i) => q.options[i] ?? ""),
    option_scores: order.map((i) => scores[i] ?? 0),
    scoring: order.map((i) => q.scoring?.[i] ?? 1),
    justifications: order.map((i) => q.justifications?.[i] ?? ""),
    secondary_scores: (q.secondary_scores ?? []).map((sec) => ({ ...sec, scores: order.map((i) => sec.scores[i] ?? 0) })),
  };
}
