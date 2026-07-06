import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, LocalizedJson } from "@/lib/types/database";
import { embedder } from "@/lib/ai/embeddings";
import { llm, type ChatMessage } from "@/lib/ai/llm";
import { extractFilters } from "@/lib/properties/search";
import { pick } from "@/lib/i18n/localized";

type DB = SupabaseClient<Database>;

export type AssistantProperty = {
  id: string;
  ref_code: string | null;
  title: LocalizedJson;
  type: string | null;
  price: number | null;
  currency: string;
  bedrooms: number | null;
  area_sqm: number | null;
  city: string | null;
  district: string | null;
  score: number;
};

export type AssistantAnswer = {
  answer: string;
  properties: AssistantProperty[];
};

const SYSTEM = `You are the AI assistant for a real-estate brokerage in Egypt.
You help the broker (and their clients) by answering using ONLY the property
listings provided in the CONTEXT block.
Rules:
- Recommend the most relevant listings and briefly explain WHY each fits.
- Reference listings by their reference code when available.
- If nothing in the context fits, say so honestly and suggest what to adjust
  (budget, area, city). Never invent listings or details.
- Reply in the SAME language as the user's question (Arabic or English).
- Prices are in EGP unless stated otherwise. Be concise and practical.`;

function contextLine(p: AssistantProperty): string {
  const parts = [
    p.ref_code ? `[${p.ref_code}]` : "[no-ref]",
    pick(p.title, "en") || pick(p.title, "ar") || "Untitled",
    p.type ?? "",
    p.bedrooms != null ? `${p.bedrooms}BR` : "",
    p.area_sqm != null ? `${p.area_sqm}sqm` : "",
    [p.district, p.city].filter(Boolean).join(", "),
    p.price != null ? `${p.price.toLocaleString()} ${p.currency}` : "price N/A",
  ];
  return "- " + parts.filter(Boolean).join(" | ");
}

async function tryEmbed(q: string): Promise<number[] | null> {
  try {
    return await embedder.embed(q);
  } catch {
    return null;
  }
}

async function generate(
  properties: AssistantProperty[],
  question: string,
  history: ChatMessage[],
): Promise<string> {
  const context =
    properties.length > 0
      ? properties.map(contextLine).join("\n")
      : "(no matching listings found)";

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM },
    ...history.slice(-6),
    {
      role: "user",
      content: `CONTEXT (matching listings):\n${context}\n\nQUESTION: ${question}`,
    },
  ];

  try {
    return await llm.complete(messages, { temperature: 0.4 });
  } catch {
    return (
      "⚠️ The AI model is not configured yet. Add OPENAI_API_KEY (or " +
      "GROQ_API_KEY) to enable conversational answers. Matching listings are " +
      "shown below."
    );
  }
}

/**
 * RAG over the CURRENT USER's listings (session client, RLS-scoped).
 */
export async function answerQuestion(
  supabase: DB,
  question: string,
  history: ChatMessage[] = [],
): Promise<AssistantAnswer> {
  const embedding = await tryEmbed(question);
  const extracted = extractFilters(question);
  const { data, error } = await supabase.rpc("search_properties", {
    p_query_embedding: embedding,
    p_keywords: question,
    p_max_price: extracted.max_price ?? null,
    p_bedrooms: extracted.bedrooms ?? null,
    p_match_count: 8,
  });
  if (error) throw error;
  const properties = (data ?? []) as AssistantProperty[];
  const answer = await generate(properties, question, history);
  return { answer, properties };
}

/**
 * RAG for a SPECIFIC tenant using the service-role client (no user session).
 * Used by the WhatsApp webhook. Relies on search_properties_admin, which is
 * locked to the service role.
 */
export async function answerForTenant(
  admin: DB,
  tenantId: string,
  question: string,
  history: ChatMessage[] = [],
): Promise<AssistantAnswer> {
  const embedding = await tryEmbed(question);
  const { data, error } = await admin.rpc("search_properties_admin", {
    p_tenant: tenantId,
    p_query_embedding: embedding,
    p_keywords: question,
    p_match_count: 8,
  });
  if (error) throw error;
  const properties = (data ?? []) as AssistantProperty[];
  const answer = await generate(properties, question, history);
  return { answer, properties };
}
