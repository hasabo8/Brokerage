"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("q", value);
    else params.delete("q");
    router.push(`/properties?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. 2-bedroom under 3M in Maadi with a garden"
        className="flex-1 rounded-lg border border-slate-300 px-4 py-2 focus:border-slate-900 focus:outline-none"
      />
      <button
        type="submit"
        className="rounded-lg bg-slate-900 px-5 py-2 font-medium text-white hover:bg-slate-800"
      >
        Search
      </button>
    </form>
  );
}
