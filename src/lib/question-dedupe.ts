/** Remoção de perguntas duplicadas por significado (não só por texto idêntico). */

type Q = { question: string; field_key?: string | null | undefined; related_skill?: string | null | undefined; related_competency?: string | null | undefined };

const norm = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Temas de informação única: se um já foi coletado, outra pergunta do mesmo tema é duplicada. */
const TOPICS: { key: string; test: RegExp }[] = [
  { key: "name", test: /\b(seu nome|nome completo)\b/ },
  { key: "age", test: /\b(idade|quantos anos voce tem|data de nascimento)\b/ },
  { key: "email", test: /\be ?mail\b/ },
  { key: "phone", test: /\b(telefone|whatsapp|celular)\b/ },
  { key: "linkedin", test: /\blinkedin\b/ },
  { key: "resume", test: /\b(curriculo|cv)\b/ },
  { key: "education_status", test: /\b(formacao|curso).*(concluid|cursando|andamento)|(concluiu|esta cursando)\b/ },
  { key: "education_course", test: /\b(qual (e )?(o )?seu curso|curso ou area|area de formacao|curso de graduacao)\b/ },
  { key: "education_level", test: /\b(formacao|escolaridade|grau de instrucao|nivel de ensino|graduacao|ensino superior)\b/ },
  { key: "current_company", test: /\b(empresa atual|onde (voce )?trabalha|em qual empresa)\b/ },
  { key: "current_position", test: /\b(cargo atual|funcao atual|qual (e )?seu cargo)\b/ },
  { key: "employed_now", test: /\b(trabalhando atualmente|esta empregad|empregado atualmente|situacao profissional|atualmente trabalha)\b/ },
  { key: "occupation", test: /\b(ocupacao atual)\b/ },
  { key: "city", test: /\b(qual (e )?sua cidade|cidade onde mora|onde voce mora|em qual cidade)\b/ },
  { key: "state", test: /\b(qual (e )?seu estado|em qual estado)\b/ },
  { key: "contract", test: /\b(pj|clt|regime de contratacao|modelo de contratacao|pessoa juridica|cnpj)\b/ },
  { key: "work_mode", test: /\b(presencial|remoto|hibrido|home office|modelo de trabalho|formato de trabalho)\b/ },
  { key: "schedule", test: /\b(horario|carga horaria|jornada|escala|turno)\b/ },
  { key: "relocation", test: /\b(mudar de cidade|mudanca|realocar|deslocamento)\b/ },
  { key: "salary", test: /\b(pretensao|salari|remuneracao)\b/ },
  { key: "start", test: /\b(quando (voce )?pode comecar|disponibilidade para inicio|inicio imediato)\b/ },
  { key: "tools_used", test: /\b(quais ferramentas|ferramentas (que )?(voce )?(ja )?(utiliz|us))\b/ },
];

function topicsOf(q: Q): string[] {
  const text = norm(q.question);
  const found = new Set<string>();
  if (q.field_key) found.add(q.field_key === "occupation" ? "occupation" : q.field_key);
  for (const topic of TOPICS) if (topic.test.test(text)) found.add(topic.key);
  // formação detalhada não conta como nível de formação
  if (found.has("education_status") || found.has("education_course")) found.delete("education_level");
  // tempo de experiência em algo específico
  const time = text.match(/(tempo|quantos anos|ha quanto tempo).*experiencia (em|com|na|no) (.+)/);
  if (time) found.add(`exp_time:${(time[3] ?? "").split(" ").slice(0, 3).join(" ")}`);
  if (q.related_skill) found.add(`skill:${norm(q.related_skill)}:${/nivel|dominio/.test(text) ? "nivel" : "pratica"}`);
  if (q.related_competency) found.add(`comp:${norm(q.related_competency)}`);
  return [...found];
}

const STOP = new Set("a o e de da do das dos em no na nos nas um uma voce sua seu para por com que qual quais como ja ou se ao".split(" "));
const tokens = (value: string) => new Set(norm(value).split(" ").filter((w) => w.length > 2 && !STOP.has(w)));

function similar(a: string, b: string) {
  const x = tokens(a);
  const y = tokens(b);
  if (!x.size || !y.size) return false;
  let inter = 0;
  for (const w of x) if (y.has(w)) inter++;
  return inter / (x.size + y.size - inter) >= 0.6;
}

/** Topics that are "single information" — collected once per form. */

/**
 * Mantém só a primeira pergunta de cada informação.
 * `existing` são perguntas que já estão no formulário (ex.: dados pessoais).
 */
export function dedupeQuestions<T extends Q>(questions: T[], existing: Q[] = []): T[] {
  const seenTopics = new Set<string>();
  const seenTexts: string[] = [];
  for (const q of existing) {
    topicsOf(q).forEach((t) => seenTopics.add(t));
    seenTexts.push(q.question);
  }
  const out: T[] = [];
  for (const q of questions) {
    const topics = topicsOf(q);
    const dupTopic = topics.length > 0 && topics.every((t) => seenTopics.has(t));
    const dupText = seenTexts.some((text) => similar(text, q.question));
    if (dupTopic || dupText) continue;
    topics.forEach((t) => seenTopics.add(t));
    seenTexts.push(q.question);
    out.push(q);
  }
  return out;
}
