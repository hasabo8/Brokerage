import { llm, parseJsonSafe, type ChatMessage } from "@/lib/ai/llm";
import { QUALIFICATIONS } from "./schema";

export type QualificationResult = {
  score: number; // 0..100
  qualification: (typeof QUALIFICATIONS)[number];
  ai_summary: string;
  next_action: string;
};

type LeadLike = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  source?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  preferred_city?: string | null;
  preferred_type?: string | null;
  bedrooms_min?: number | null;
  notes?: string | null;
};

const SYSTEM_PROMPT = `You are a senior real-estate sales manager in Egypt.
Qualify the lead using BANT (Budget, Authority, Need, Timeline) plus data completeness.
Return STRICT JSON with keys:
- score: integer 0-100 (readiness/likelihood to transact)
- qualification: one of "hot" | "warm" | "cold" | "unqualified"
- ai_summary: 1-2 sentence summary of who this lead is and what they want
- next_action: the single best next step the broker should take now
Write ai_summary and next_action in the SAME language as the lead's notes
(Arabic if the notes are Arabic, otherwise English). Be concise and practical.`;

export async function qualifyLead(
  lead: LeadLike,
): Promise<QualificationResult> {
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: JSON.stringify({
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        source: lead.source,
        budget_min: lead.budget_min,
        budget_max: lead.budget_max,
        preferred_city: lead.preferred_city,
        preferred_type: lead.preferred_type,
        bedrooms_min: lead.bedrooms_min,
        notes: lead.notes,
      }),
    },
  ];

  const raw = await llm.complete(messages, { json: true, temperature: 0.2 });
  const parsed = parseJsonSafe<QualificationResult>(raw, {
    score: 0,
    qualification: "unqualified",
    ai_summary: "Could not qualify automatically.",
    next_action: "Review the lead manually.",
  });

  // clamp + validate
  parsed.score = Math.max(0, Math.min(100, Math.round(parsed.score || 0)));
  if (!QUALIFICATIONS.includes(parsed.qualification)) {
    parsed.qualification =
      parsed.score >= 75 ? "hot" : parsed.score >= 45 ? "warm" : "cold";
  }
  return parsed;
}
