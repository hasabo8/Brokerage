export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { importListings } from "@/lib/ingestion/import";
import { csvToListings } from "@/lib/ingestion/adapters/csv";
import { getAdapter } from "@/lib/ingestion/registry";
import type { RawListing } from "@/lib/ingestion/types";

// POST /api/v1/import
// Body (one of):
//   { "source": "csv", "csv": "<raw csv text>" }
//   { "source": "my_source", "listings": [ { ...RawListing } ] }
//   { "source": "portal_template", "run": true, "query": "...", "limit": 20 }
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as {
      source?: string;
      csv?: string;
      listings?: RawListing[];
      run?: boolean;
      query?: string;
      city?: string;
      limit?: number;
    };

    const source = body.source?.trim();
    if (!source)
      return NextResponse.json(
        { error: "source is required" },
        { status: 422 },
      );

    let listings: RawListing[] = [];

    if (body.csv) {
      listings = csvToListings(body.csv);
    } else if (Array.isArray(body.listings)) {
      listings = body.listings;
    } else if (body.run) {
      const adapter = getAdapter(source);
      if (!adapter)
        return NextResponse.json(
          { error: `unknown adapter: ${source}` },
          { status: 404 },
        );
      listings = await adapter.fetchListings({
        query: body.query,
        city: body.city,
        limit: body.limit,
      });
    } else {
      return NextResponse.json(
        { error: "provide csv, listings, or run:true" },
        { status: 422 },
      );
    }

    const result = await importListings(supabase, source, listings);
    return NextResponse.json({ data: result });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
