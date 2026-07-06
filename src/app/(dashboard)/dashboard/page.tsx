import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { count: propertyCount },
    { count: availableCount },
    { count: leadCount },
    { count: hotCount },
  ] = await Promise.all([
    supabase.from("properties").select("*", { count: "exact", head: true }),
    supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("status", "available"),
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("qualification", "hot"),
  ]);

  const stats = [
    { label: "Total properties", value: propertyCount ?? 0 },
    { label: "Available", value: availableCount ?? 0 },
    { label: "Leads", value: leadCount ?? 0 },
    { label: "Hot leads", value: hotCount ?? 0 },
  ];

  const actions = [
    {
      href: "/assistant",
      title: "Ask the AI Assistant",
      desc: "Search your listings in plain language, in Arabic or English.",
    },
    {
      href: "/leads",
      title: "Qualify leads",
      desc: "Score each client and see the next best action.",
    },
    {
      href: "/calls",
      title: "Summarize a call",
      desc: "Turn a call or chat into clear requirements and next steps.",
    },
    {
      href: "/reports",
      title: "View reports",
      desc: "Pipeline, client mix, inventory, and win rate.",
    },
  ];

  return (
    <div>
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          A quick overview of your workspace.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white p-5">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              {s.label}
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-[11px] font-medium uppercase tracking-wider text-slate-400">
        Quick actions
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-slate-900">{a.title}</div>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-500 rtl:-scale-x-100"
              >
                <path d="M4.5 12h15m0 0l-6-6m6 6l-6 6" />
              </svg>
            </div>
            <p className="mt-1 text-sm text-slate-500">{a.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
