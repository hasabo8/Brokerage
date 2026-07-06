import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { leadsRepo } from "@/lib/leads/repository";
import { qualifyLead } from "@/lib/leads/qualify";
import { scheduleFollowUpsForLead } from "@/lib/followups/rules";
import { interactionInput } from "@/lib/leads/schema";
import { logEvent } from "@/lib/events";

const QUAL_STYLES: Record<string, string> = {
  hot: "bg-red-100 text-red-700",
  warm: "bg-amber-100 text-amber-700",
  cold: "bg-sky-100 text-sky-700",
  unqualified: "bg-slate-100 text-slate-500",
};

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const lead = await leadsRepo.get(supabase, id);
  if (!lead) notFound();
  const interactions = await leadsRepo.interactions(supabase, id);

  // --- Server actions -------------------------------------------------------
  async function runQualify() {
    "use server";
    const sb = await createClient();
    const fresh = await leadsRepo.get(sb, id);
    if (!fresh) return;
    const result = await qualifyLead(fresh);
    const { data: updated } = await sb
      .from("leads")
      .update({
        score: result.score,
        qualification: result.qualification,
        ai_summary: result.ai_summary,
        next_action: result.next_action,
        qualified_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    // Automation: (re)schedule the next follow-up using the new cadence.
    if (updated)
      await scheduleFollowUpsForLead(sb, updated, { reschedule: true });
    await logEvent(sb, {
      action: "qualified",
      entityType: "lead",
      entityId: id,
      actorType: "agent",
      payload: { score: result.score, qualification: result.qualification },
    });
    redirect(`/leads/${id}`);
  }

  async function addNote(formData: FormData) {
    "use server";
    const sb = await createClient();
    const parsed = interactionInput.parse({
      channel: "note",
      direction: "internal",
      content: formData.get("content"),
    });
    await leadsRepo.addInteraction(sb, id, parsed);
    redirect(`/leads/${id}`);
  }

  const field =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-900 focus:outline-none";

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {lead.name || lead.phone || "Unnamed lead"}
          </h1>
          <div className="mt-1 text-sm text-slate-500">
            {[lead.phone, lead.email, lead.source].filter(Boolean).join(" · ")}
          </div>
        </div>
        <form action={runQualify}>
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            {lead.qualified_at ? "Re-run AI qualify" : "AI qualify"}
          </button>
        </form>
      </div>

      {/* AI qualification card */}
      <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-500">
            AI qualification
          </span>
          {lead.qualification && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                QUAL_STYLES[lead.qualification] ?? QUAL_STYLES.unqualified
              }`}
            >
              {lead.qualification}
            </span>
          )}
          {lead.score != null && (
            <span className="text-sm font-semibold text-slate-900">
              {lead.score}/100
            </span>
          )}
        </div>
        {lead.ai_summary ? (
          <>
            <p className="mt-3 text-sm text-slate-700">{lead.ai_summary}</p>
            {lead.next_action && (
              <p className="mt-2 text-sm">
                <span className="font-medium text-slate-900">
                  Next action:{" "}
                </span>
                <span className="text-slate-700">{lead.next_action}</span>
              </p>
            )}
          </>
        ) : (
          <p className="mt-3 text-sm text-slate-400">
            Not qualified yet. Click “AI qualify” to score this lead and get the
            best next step.
          </p>
        )}
      </div>

      {/* Requirements */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <Info
          label="Budget"
          value={budgetLabel(lead.budget_min, lead.budget_max)}
        />
        <Info label="City" value={lead.preferred_city} />
        <Info label="Type" value={lead.preferred_type} />
        <Info label="Min beds" value={lead.bedrooms_min?.toString()} />
      </div>
      {lead.notes && (
        <div className="mt-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
          <div className="text-sm font-medium text-slate-500">Notes</div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
            {lead.notes}
          </p>
        </div>
      )}

      {/* Interactions timeline */}
      <h2 className="mt-8 text-lg font-semibold">Interactions</h2>
      <form action={addNote} className="mt-3 flex gap-2">
        <input
          name="content"
          placeholder="Add a note about your last contact…"
          className={field}
        />
        <button className="shrink-0 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
          Add
        </button>
      </form>
      <ul className="mt-4 space-y-3">
        {interactions.length === 0 && (
          <li className="text-sm text-slate-400">
            No interactions logged yet.
          </li>
        )}
        {interactions.map((it) => (
          <li
            key={it.id}
            className="rounded-xl bg-white p-4 text-sm ring-1 ring-slate-200"
          >
            <div className="mb-1 flex gap-2 text-xs text-slate-400">
              <span className="uppercase">{it.channel}</span>
              <span>·</span>
              <span>{new Date(it.created_at).toLocaleString()}</span>
            </div>
            <div className="whitespace-pre-wrap text-slate-700">
              {it.content}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 font-medium text-slate-800">{value || "—"}</div>
    </div>
  );
}

function budgetLabel(min?: number | null, max?: number | null): string {
  if (min == null && max == null) return "—";
  const f = (n: number) => n.toLocaleString();
  if (min != null && max != null) return `${f(min)} – ${f(max)}`;
  if (max != null) return `≤ ${f(max)}`;
  return `≥ ${f(min as number)}`;
}
