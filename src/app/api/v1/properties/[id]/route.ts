export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { propertiesRepo } from "@/lib/properties/repository";
import { propertyInput } from "@/lib/properties/schema";
import { logEvent } from "@/lib/events";
import { ZodError } from "zod";

type Params = { params: Promise<{ id: string }> };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const data = await propertiesRepo.get(supabase, id);
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = propertyInput.partial().parse(await request.json());
    const updated = await propertiesRepo.update(supabase, id, body);
    await logEvent(supabase, {
      action: "updated",
      entityType: "property",
      entityId: id,
    });
    return NextResponse.json({ data: updated });
  } catch (e) {
    if (e instanceof ZodError)
      return NextResponse.json({ error: e.flatten() }, { status: 422 });
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await propertiesRepo.remove(supabase, id);
  await logEvent(supabase, {
    action: "deleted",
    entityType: "property",
    entityId: id,
  });
  return NextResponse.json({ data: { id, status: "off_market" } });
}
