export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { propertiesRepo } from "@/lib/properties/repository";
import { searchProperties } from "@/lib/properties/search";
import { propertyInput, searchInput } from "@/lib/properties/schema";
import { logEvent } from "@/lib/events";
import { ZodError } from "zod";

// Versioned, tenant-scoped (via RLS), bilingual. Also the contract future
// mobile apps and AI agents consume.
async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET(request: Request) {
  const { supabase, user } = await requireUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const url = new URL(request.url);
    const params = searchInput.parse(Object.fromEntries(url.searchParams));
    const data = await searchProperties(supabase, params);
    return NextResponse.json({ data });
  } catch (e) {
    if (e instanceof ZodError)
      return NextResponse.json({ error: e.flatten() }, { status: 422 });
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const { supabase, user } = await requireUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = propertyInput.parse(await request.json());
    const created = await propertiesRepo.create(supabase, body);
    await logEvent(supabase, {
      action: "created",
      entityType: "property",
      entityId: created.id,
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError)
      return NextResponse.json({ error: e.flatten() }, { status: 422 });
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
