// ===========================================================================
// Turn a raw call/conversation transcript into a structured, actionable
// summary. Language-aware: the summary is written in the transcript's own
// language (Arabic or English).
// ===========================================================================
import { llm, parseJsonSafe, type ChatMessage } from "@/lib/ai/llm";

export type CallSummary = {
  summary: string;
  key_points: string[];
  requirements: string;
  budget: string | null;
  objections: string[];
  next_action: string;
  sentiment: "positive" | "neutral" | "negative";
};

export const EMPTY_SUMMARY: CallSummary = {
  summary: "",
  key_points: [],
  requirements: "",
  budget: null,
  objections: [],
  next_action: "",
  sentiment: "neutral",
};

const SYSTEM = `You are an assistant for a real estate broker. Summarize a phone call or chat transcript between the broker and a client.
Detect the transcript language and WRITE ALL TEXT FIELDS IN THAT SAME LANGUAGE (Arabic or English).
Return ONLY a JSON object with these keys:
- summary: 2-3 sentence overview of the call.
- key_points: array of short strings (the most important facts).
- requirements: the property the client is looking for (type, area, rooms, features) as one short string.
- budget: the client's budget as a short string, or null if not mentioned.
- objections: array of concerns/objections the client raised (empty array if none).
- next_action: the single best next step for the broker.
- sentiment: one of "positive", "neutral", "negative" (the client's overall attitude).`;

export async function summarizeCall(transcript: string): Promise<CallSummary> {
  const trimmed = transcript.trim();
  if (!trimmed) return { ...EMPTY_SUMMARY };

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: trimmed.slice(0, 12000) },
  ];
  const raw = await llm.complete(messages, { json: true, temperature: 0.2 });
  const parsed = parseJsonSafe<Partial<CallSummary>>(raw, {});
  return { ...EMPTY_SUMMARY, ...parsed };
}
