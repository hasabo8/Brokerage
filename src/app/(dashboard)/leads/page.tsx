import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { leadsRepo } from "@/lib/leads/repository";

const QUAL_STYLES: Record<string, string> = {
  hot: "bg-red-100 text-red-700",
  warm: "bg-amber-100 text-amber-700",
  cold: "bg-sky-100 text-sky-700",
  unqualified: "bg-slate-100 text-slate-500",
};

export default async function LeadsPage() {
  const supabase = await createClient();
  const leads = await leadsRepo.list(supabase);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Leads</h1>
        <Link
          href="/leads/new"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Add lead
        </Link>
      </div>

      {leads.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">
          No leads yet. Add your first client to try AI qualification.
        </p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-start text-slate-500">
              <tr>
                <th className="px-4 py-3 text-start font-medium">Name</th>
                <th className="px-4 py-3 text-start font-medium">Status</th>
                <th className="px-4 py-3 text-start font-medium">Score</th>
                <th className="px-4 py-3 text-start font-medium">
                  Qualification
                </th>
                <th className="px-4 py-3 text-start font-medium">
                  Next action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {leads.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/leads/${l.id}`}
                      className="font-medium text-brand hover:underline"
                    >
                      {l.name || l.phone || "Unnamed lead"}
                    </Link>
                    <div className="text-xs text-slate-400">{l.phone}</div>
                  </td>
                  <td className="px-4 py-3">{l.status}</td>
                  <td className="px-4 py-3">{l.score ?? "—"}</td>
                  <td className="px-4 py-3">
                    {l.qualification ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          QUAL_STYLES[l.qualification] ??
                          QUAL_STYLES.unqualified
                        }`}
                      >
                        {l.qualification}
                      </span>
                    ) : (
                      <span className="text-slate-400">not qualified</span>
                    )}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-600">
                    {l.next_action ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
