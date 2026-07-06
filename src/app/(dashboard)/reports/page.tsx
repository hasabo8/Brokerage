import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Zero-dependency reporting dashboard: aggregates are computed with lightweight
// count queries + one grouped fetch, and rendered as CSS bar charts.

type Row = { label: string; value: number; color?: string };

function BarChart({ title, rows }: { title: string; rows: Row[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
      <div className="text-sm font-medium text-slate-500">{title}</div>
      <div className="mt-4 space-y-3">
        {rows.every((r) => r.value === 0) && (
          <div className="text-sm text-slate-400">No data yet.</div>
        )}
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3">
            <div className="w-28 shrink-0 text-sm capitalize text-slate-600">
              {r.label}
            </div>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${r.color ?? "bg-brand"}`}
                style={{ width: `${(r.value / max) * 100}%` }}
              />
            </div>
            <div className="w-8 shrink-0 text-right text-sm font-semibold text-slate-800">
              {r.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function countBy(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "properties" | "leads",
  column: string,
  value: string,
): Promise<number> {
  const { count } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(column, value);
  return count ?? 0;
}

export default async function ReportsPage() {
  const supabase = await createClient();

  const PROPERTY_STATUSES = ["available", "reserved", "sold", "off_market"];
  const PROPERTY_TYPES = ["apartment", "villa", "land", "office", "chalet"];
  const LEAD_STATUSES = [
    "new",
    "contacted",
    "qualified",
    "viewing",
    "negotiating",
    "won",
    "lost",
  ];
  const QUALS = ["hot", "warm", "cold", "unqualified"];

  const [
    propStatus,
    propType,
    leadStatus,
    quals,
    totalProps,
    totalLeads,
    totalCalls,
    pendingFollowUps,
  ] = await Promise.all([
    Promise.all(
      PROPERTY_STATUSES.map(async (s) => ({
        label: s.replace("_", " "),
        value: await countBy(supabase, "properties", "status", s),
      })),
    ),
    Promise.all(
      PROPERTY_TYPES.map(async (t) => ({
        label: t,
        value: await countBy(supabase, "properties", "type", t),
      })),
    ),
    Promise.all(
      LEAD_STATUSES.map(async (s) => ({
        label: s,
        value: await countBy(supabase, "leads", "status", s),
      })),
    ),
    Promise.all(
      QUALS.map(async (q) => ({
        label: q,
        value: await countBy(supabase, "leads", "qualification", q),
      })),
    ),
    supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .then((r) => r.count ?? 0),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .then((r) => r.count ?? 0),
    supabase
      .from("calls")
      .select("*", { count: "exact", head: true })
      .then((r) => r.count ?? 0),
    supabase
      .from("follow_ups")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .then((r) => r.count ?? 0),
  ]);

  const wonCount = leadStatus.find((r) => r.label === "won")?.value ?? 0;
  const conversion =
    totalLeads > 0 ? Math.round((wonCount / totalLeads) * 100) : 0;

  const kpis = [
    { label: "Total properties", value: totalProps },
    { label: "Total leads", value: totalLeads },
    { label: "Calls summarized", value: totalCalls },
    { label: "Pending follow-ups", value: pendingFollowUps },
    { label: "Win rate", value: `${conversion}%` },
  ];

  const QUAL_COLORS: Record<string, string> = {
    hot: "bg-red-500",
    warm: "bg-amber-500",
    cold: "bg-sky-500",
    unqualified: "bg-slate-400",
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <Link
          href="/dashboard"
          className="text-sm text-slate-500 hover:text-brand"
        >
          ← Dashboard
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-2xl bg-white p-5 ring-1 ring-slate-200"
          >
            <div className="text-2xl font-semibold text-slate-900">
              {k.value}
            </div>
            <div className="mt-1 text-xs text-slate-500">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <BarChart title="Leads by status (pipeline)" rows={leadStatus} />
        <BarChart
          title="Leads by AI qualification"
          rows={quals.map((r) => ({
            ...r,
            color: QUAL_COLORS[r.label] ?? "bg-brand",
          }))}
        />
        <BarChart title="Properties by status" rows={propStatus} />
        <BarChart title="Properties by type" rows={propType} />
      </div>
    </div>
  );
}
