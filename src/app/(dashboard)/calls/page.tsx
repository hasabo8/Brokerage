import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { callsRepo } from "@/lib/calls/repository";
import { leadsRepo } from "@/lib/leads/repository";
import { summarizeCall, type CallSummary } from "@/lib/calls/summarize";
import { transcribeAudio, transcriptionConfigured } from "@/lib/ai/transcribe";
import { logEvent } from "@/lib/events";

const SENTIMENT_STYLES: Record<string, string> = {
  positive: "bg-emerald-100 text-emerald-700",
  neutral: "bg-slate-100 text-slate-600",
  negative: "bg-red-100 text-red-700",
};

export default async function CallsPage() {
  const supabase = await createClient();
  const [calls, leads] = await Promise.all([
    callsRepo.list(supabase),
    leadsRepo.list(supabase, 200),
  ]);
  const canTranscribe = transcriptionConfigured();

  async function summarize(formData: FormData) {
    "use server";
    const sb = await createClient();

    const title = String(formData.get("title") || "").trim() || null;
    const leadId = String(formData.get("lead_id") || "").trim() || null;
    let transcript = String(formData.get("transcript") || "").trim();
    let source = "manual";

    // If an audio file was uploaded and no transcript pasted, transcribe it.
    const audio = formData.get("audio");
    if (
      (!transcript || transcript.length === 0) &&
      audio instanceof File &&
      audio.size > 0
    ) {
      transcript = await transcribeAudio(audio, audio.name);
      source = "upload";
    }
    if (!transcript) return;

    const summary: CallSummary = await summarizeCall(transcript);
    const call = await callsRepo.create(sb, {
      transcript,
      summary,
      title,
      lead_id: leadId,
      source,
    });

    // Log the call as an interaction on the lead's timeline too.
    if (leadId) {
      await leadsRepo.addInteraction(sb, leadId, {
        channel: "call",
        direction: "inbound",
        content: summary.summary || transcript.slice(0, 280),
      });
    }
    await logEvent(sb, {
      action: "call_summarized",
      entityType: "call",
      entityId: call.id,
      actorType: "agent",
      payload: { sentiment: summary.sentiment },
    });
    redirect("/calls");
  }

  const field =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-900 focus:outline-none";
  const label = "block text-sm font-medium text-slate-700";

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Call summaries</h1>
      <p className="mt-1 text-sm text-slate-500">
        Paste a call/chat transcript (or upload a recording) and the AI extracts
        the client&apos;s requirements, budget, objections, and the best next
        step — in the same language as the conversation.
      </p>

      <form action={summarize} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Title (optional)</label>
            <input
              name="title"
              placeholder="Call with Ahmed"
              className={field}
            />
          </div>
          <div>
            <label className={label}>Link to lead (optional)</label>
            <select name="lead_id" className={field} defaultValue="">
              <option value="">— none —</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name || l.phone || l.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={label}>Transcript</label>
          <textarea
            name="transcript"
            rows={7}
            className={field}
            placeholder={
              "الوسيط: أهلاً أستاذ أحمد...\nAgent: Hi Ahmed, how can I help?\n..."
            }
          />
        </div>

        <div>
          <label className={label}>
            … or upload a recording{" "}
            {!canTranscribe && (
              <span className="text-xs font-normal text-amber-600">
                (needs OPENAI_API_KEY for transcription)
              </span>
            )}
          </label>
          <input
            type="file"
            name="audio"
            accept="audio/*"
            disabled={!canTranscribe}
            className={field}
          />
        </div>

        <button className="rounded-lg bg-slate-900 px-5 py-2 font-medium text-white hover:bg-slate-800">
          Summarize
        </button>
      </form>

      <h2 className="mt-10 text-lg font-semibold">Recent calls</h2>
      <ul className="mt-4 space-y-4">
        {calls.length === 0 && (
          <li className="text-sm text-slate-400">No calls summarized yet.</li>
        )}
        {calls.map((c) => {
          const s = (c.summary ?? {}) as Partial<CallSummary>;
          const lead = (c as { lead?: { name?: string; phone?: string } }).lead;
          return (
            <li
              key={c.id}
              className="rounded-2xl bg-white p-5 ring-1 ring-slate-200"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-slate-900">
                  {c.title || "Untitled call"}
                  {lead && (
                    <span className="ml-2 text-sm font-normal text-slate-400">
                      · {lead.name || lead.phone}
                    </span>
                  )}
                </div>
                {c.sentiment && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      SENTIMENT_STYLES[c.sentiment] ?? SENTIMENT_STYLES.neutral
                    }`}
                  >
                    {c.sentiment}
                  </span>
                )}
              </div>
              {s.summary && (
                <p className="mt-2 text-sm text-slate-700">{s.summary}</p>
              )}
              {s.key_points && s.key_points.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
                  {s.key_points.map((k, i) => (
                    <li key={i}>{k}</li>
                  ))}
                </ul>
              )}
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                {s.requirements && (
                  <div>
                    <span className="font-medium text-slate-900">Wants: </span>
                    <span className="text-slate-600">{s.requirements}</span>
                  </div>
                )}
                {s.budget && (
                  <div>
                    <span className="font-medium text-slate-900">Budget: </span>
                    <span className="text-slate-600">{s.budget}</span>
                  </div>
                )}
              </div>
              {s.objections && s.objections.length > 0 && (
                <div className="mt-2 text-sm">
                  <span className="font-medium text-slate-900">
                    Objections:{" "}
                  </span>
                  <span className="text-slate-600">
                    {s.objections.join(", ")}
                  </span>
                </div>
              )}
              {s.next_action && (
                <div className="mt-3 rounded-lg bg-brand/5 px-3 py-2 text-sm">
                  <span className="font-medium text-brand-dark">
                    Next action:{" "}
                  </span>
                  <span className="text-slate-700">{s.next_action}</span>
                </div>
              )}
              <div className="mt-3 text-xs text-slate-400">
                {new Date(c.created_at).toLocaleString()}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
