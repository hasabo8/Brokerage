import Link from "next/link";
import { signIn } from "../actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fafafa] p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5.25 9.75V19.5a.75.75 0 0 0 .75.75h3.75V15a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75v5.25H18a.75.75 0 0 0 .75-.75V9.75" />
            </svg>
          </div>
          <div className="text-base font-semibold tracking-tight text-slate-900">
            Brokerage
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-card">
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to continue.</p>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <form action={signIn} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                name="email"
                type="email"
                required
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                name="password"
                type="password"
                required
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              Sign in
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            No account?{" "}
            <Link
              href="/signup"
              className="font-medium text-slate-900 hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
