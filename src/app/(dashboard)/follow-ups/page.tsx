import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { followUpsRepo } from "@/lib/followups/repository";

type LeadJoin = { id: string; name: string | null; phone: string | null };

export default async function FollowUpsPage() {
  const supabase = await createClient();
  const items = await followUpsRepo.list(supabase);

  async function markDone(formData: FormData) {
    "use server";
    const sb = await createClient();
    await followUpsRepo.setStatus(sb, String(formData.get("id")), "done");
    redirect("/follow-ups");
  }

  async function cancel(formData: FormData) {
    "use server";
    const sb = await createClient();
    await followUpsRepo.setStatus(sb, String(formData.get("id")), "cancelled");
    redirect("/follow-ups");
  }

  const now = Date.now();
  const active = items.filter(
    (f) => f.status === "pending" || f.status === "sent",
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold">Follow-ups</h1>
      <p className="mt-1 text-sm text-slate-500">
        Auto-scheduled by qualification cadence (hot: 1d, warm: 3d, cold: 7d).
        When WhatsApp is connected, due items are sent automatically each day.
      </p>

      {active.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">
          Nothing scheduled. Qualify a lead to auto-schedule its first
          follow-up.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {active.map((f) => {
            const lead = (f as unknown as { lead?: LeadJoin }).lead;
            const overdue =
              f.status === "pending" && new Date(f.due_at).getTime() < now;
            return (
              <div
                key={f.id}
                className="flex items-start justify-between gap-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={lead ? `/leads/${lead.id}` : "/leads"}
                      className="font-medium text-brand hover:underline"
                    >
                      {lead?.name || lead?.phone || "Lead"}
                    </Link>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        overdue
                          ? "bg-red-100 text-red-700"
                          : f.status === "sent"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {overdue ? "overdue" : f.status}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(f.due_at).toLocaleString()}
                    </span>
                  </div>
                  {f.message && (
                    <p className="mt-1 truncate text-sm text-slate-600">
                      {f.message}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <form action={markDone}>
                    <input type="hidden" name="id" value={f.id} />
                    <button className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700">
                      Done
                    </button>
                  </form>
                  <form action={cancel}>
                    <input type="hidden" name="id" value={f.id} />
                    <button className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100">
                      Cancel
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
