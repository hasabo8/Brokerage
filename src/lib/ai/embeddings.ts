// ===========================================================================
// Embeddings adapter.
// Constitution rule #2 (replaceable components): everything that needs a
// vector goes through this interface. Swap providers by changing ONE env var
// (AI_EMBEDDING_PROVIDER) — no business logic changes anywhere else.
// ===========================================================================

export const EMBEDDING_DIMENSIONS = 1536; // must match vector(1536) in SQL

export interface Embedder {
  embed(text: string): Promise<number[]>;
}

/** OpenAI text-embedding-3-small — multilingual (AR+EN), ~free at low volume. */
class OpenAIEmbedder implements Embedder {
  async embed(text: string): Promise<number[]> {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text.slice(0, 8000),
      }),
    });
    if (!res.ok) throw new Error(`OpenAI embedding error: ${res.status}`);
    const json = await res.json();
    return json.data[0].embedding as number[];
  }
}

/** Self-hosted BGE-M3 (multilingual, zero API cost). Point BGE_EMBEDDING_URL at it. */
class BgeEmbedder implements Embedder {
  async embed(text: string): Promise<number[]> {
    const res = await fetch(process.env.BGE_EMBEDDING_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: text.slice(0, 8000) }),
    });
    if (!res.ok) throw new Error(`BGE embedding error: ${res.status}`);
    const json = await res.json();
    return (json.embedding ?? json.data?.[0]?.embedding) as number[];
  }
}

function resolveEmbedder(): Embedder {
  switch (process.env.AI_EMBEDDING_PROVIDER) {
    case "bge":
      return new BgeEmbedder();
    case "openai":
    default:
      return new OpenAIEmbedder();
  }
}

export const embedder: Embedder = resolveEmbedder();
