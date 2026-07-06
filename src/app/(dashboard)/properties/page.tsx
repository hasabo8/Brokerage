import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { searchProperties } from "@/lib/properties/search";
import { searchInput } from "@/lib/properties/schema";
import { PropertyCard } from "@/components/properties/property-card";
import { SearchBar } from "@/components/properties/search-bar";
import { logEvent } from "@/lib/events";

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const params = searchInput.parse(sp);
  const results = await searchProperties(supabase, params);

  if (params.q) {
    await logEvent(supabase, {
      action: "searched",
      entityType: "property",
      payload: { q: params.q, results: results.length },
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Properties</h1>
        <Link
          href="/properties/new"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Add property
        </Link>
      </div>

      <div className="mt-6">
        <SearchBar defaultValue={params.q ?? ""} />
      </div>

      {results.length === 0 ? (
        <p className="mt-10 text-center text-slate-500">No properties found.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      )}
    </div>
  );
}
