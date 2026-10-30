import { createOpenAI } from "@ai-sdk/openai";

/** Provider da Responses API da OpenAI, usando a chave da própria conta (OPENAI_API_KEY). */
export function createResponsesProvider() {
  const key = process.env["OPENAI_API_KEY"];
  if (!key) throw new Error("A IA não está configurada neste projeto.");

  return createOpenAI({
    baseURL: "https://api.openai.com/v1",
    apiKey: key,
  });
}

export const AI_MODEL = "gpt-6-astra";

export const AI_PROVIDER_OPTIONS = {
  openai: {
    forceReasoning: true,
    reasoningEffort: "low",
    reasoningSummary: "auto",
    store: false,
    include: ["reasoning.encrypted_content"],
  },
} as const;
