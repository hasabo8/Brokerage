import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../(auth)/actions";
import { SidebarNav } from "@/components/shell/sidebar-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const email = user.email ?? "";
  const initial = email.charAt(0).toUpperCase() || "U";

  return (
    <div className="flex min-h-screen bg-[#fafafa]">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-e border-slate-200 bg-white">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-[18px] w-[18px]"
            >
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5.25 9.75V19.5a.75.75 0 0 0 .75.75h3.75V15a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75v5.25H18a.75.75 0 0 0 .75-.75V9.75" />
            </svg>
          </div>
          <div className="text-sm font-semibold tracking-tight text-slate-900">
            Brokerage
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <SidebarNav />
        </div>

        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-600">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs text-slate-500">{email}</div>
            </div>
          </div>
          <form action={signOut}>
            <button className="mt-1 w-full rounded-lg px-3 py-2 text-start text-sm text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-6 py-10 sm:px-10">{children}</div>
      </main>
    </div>
  );
}
