"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { pick } from "@/lib/i18n/localized";
import type { LocalizedJson } from "@/lib/types/database";

type Msg = { role: "user" | "assistant"; content: string };
type MatchedProperty = {
  id: string;
  ref_code: string | null;
  title: LocalizedJson;
  price: number | null;
  currency: string;
  bedrooms: number | null;
  city: string | null;
  district: string | null;
};

export function AssistantChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [matches, setMatches] = useState<MatchedProperty[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function send() {
    const message = input.trim();
    if (!message || loading) return;
    const history = messages.slice(-6);
    setMessages((m) => [...m, { role: "user", content: message }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/v1/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: data.answer ?? data.error ?? "Something went wrong.",
        },
      ]);
      setMatches(data.properties ?? []);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Network error. Please try again." },
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() =>
        endRef.current?.scrollIntoView({ behavior: "smooth" }),
      );
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="flex h-[60vh] flex-col rounded-xl border border-slate-200 bg-white">
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.length === 0 && (
              <div className="text-sm text-slate-400">
                Ask in Arabic or English, e.g.{" "}
                <span className="italic">
                  “شقة غرفتين أقل من 3 مليون في المعادي”
                </span>{" "}
                or “show me villas with a garden”.
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={m.role === "user" ? "text-end" : "text-start"}
              >
                <div
                  className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-800"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && <div className="text-sm text-slate-400">Thinking…</div>}
            <div ref={endRef} />
          </div>
          <div className="flex gap-2 border-t border-slate-200 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask about your listings…"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
            />
            <button
              onClick={send}
              disabled={loading}
              className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      <div>
        <div className="text-sm font-medium text-slate-500">
          Matched listings
        </div>
        <div className="mt-3 space-y-3">
          {matches.length === 0 && (
            <div className="text-sm text-slate-400">
              Listings the assistant used will appear here.
            </div>
          )}
          {matches.map((p) => (
            <Link
              key={p.id}
              href={`/properties/${p.id}`}
              className="group block rounded-xl border border-slate-200 bg-white p-4 text-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="font-medium text-slate-800">
                {pick(p.title, "en") || pick(p.title, "ar") || "Untitled"}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {[p.bedrooms ? `${p.bedrooms}BR` : null, p.district, p.city]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
              {p.price != null && (
                <div className="mt-1 font-semibold text-brand">
                  {p.price.toLocaleString()} {p.currency}
                </div>
              )}
              <div className="mt-2 flex items-center justify-between">
                {p.ref_code ? (
                  <span className="text-xs text-slate-400">{p.ref_code}</span>
                ) : (
                  <span />
                )}
                <span className="text-xs font-medium text-slate-400 transition-colors group-hover:text-slate-700">
                  View details &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
