// ===========================================================================
// LLM chat adapter (Constitution rule #2: replaceable).
// Swap OpenAI <-> Groq (or any OpenAI-compatible endpoint) via env vars.
//   AI_LLM_PROVIDER = openai | groq
//   LLM_MODEL       = e.g. gpt-4o-mini  (openai)  |  llama-3.3-70b-versatile (groq)
// ===========================================================================

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export interface Llm {
  complete(
    messages: ChatMessage[],
    opts?: { json?: boolean; temperature?: number },
  ): Promise<string>;
}

type ProviderConfig = { baseUrl: string; apiKey: string; model: string };

function providerConfig(): ProviderConfig {
  const provider = process.env.AI_LLM_PROVIDER ?? "openai";
  if (provider === "groq") {
    return {
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY ?? "",
      model: process.env.LLM_MODEL ?? "llama-3.3-70b-versatile",
    };
  }
  return {
    baseUrl: "https://api.openai.com/v1",
    apiKey: process.env.OPENAI_API_KEY ?? "",
    model: process.env.LLM_MODEL ?? "gpt-4o-mini",
  };
}

class OpenAiCompatibleLlm implements Llm {
  async complete(
    messages: ChatMessage[],
    opts: { json?: boolean; temperature?: number } = {},
  ): Promise<string> {
    const cfg = providerConfig();
    if (!cfg.apiKey) {
      throw new Error(
        "No LLM API key configured. Set OPENAI_API_KEY (or GROQ_API_KEY).",
      );
    }

    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: opts.temperature ?? 0.3,
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!res.ok) {
      throw new Error(`LLM error ${res.status}: ${await res.text()}`);
    }
    const json = await res.json();
    return json.choices?.[0]?.message?.content ?? "";
  }
}

export const llm: Llm = new OpenAiCompatibleLlm();

/** Safe JSON parse for LLM structured output. */
export function parseJsonSafe<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        /* ignore */
      }
    }
    return fallback;
  }
}
