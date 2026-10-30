import { createOpenAI } from "@ai-sdk/openai";

/** Provider da Responses API da OpenAI, usando a chave da própria conta (OPENAI_API_KEY). */
export function createResponsesProvider() {
  const key = process.env["OPENAI_API_KEY"];
  if (!key)
    throw new Error("A IA não está configurada neste projeto (falta a chave OPENAI_API_KEY).");

  return createOpenAI({
    baseURL: "https://api.openai.com/v1",
    apiKey: key,
  });
}

/** Modelo padrão; cada instalação pode trocar pela variável OPENAI_MODEL. */
const DEFAULT_AI_MODEL = "gpt-6-astra";

export function aiModel() {
  return process.env["OPENAI_MODEL"]?.trim() || DEFAULT_AI_MODEL;
}

export const AI_PROVIDER_OPTIONS = {
  openai: {
    forceReasoning: true,
    reasoningEffort: "low",
    reasoningSummary: "auto",
    store: false,
    include: ["reasoning.encrypted_content"],
  },
} as const;
