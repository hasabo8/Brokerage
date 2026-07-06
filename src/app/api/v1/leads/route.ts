export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import { leadsRepo } from "@/lib/leads/repository";
import { leadInput } from "@/lib/leads/schema";
import { scheduleFollowUpsForLead } from "@/lib/followups/rules";
import { logEvent } from "@/lib/events";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await requireUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const data = await leadsRepo.list(supabase);
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const { supabase, user } = await requireUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const body = leadInput.parse(await request.json());
    const created = await leadsRepo.create(supabase, body);
    await scheduleFollowUpsForLead(supabase, created);
    await logEvent(supabase, {
      action: "created",
      entityType: "lead",
      entityId: created.id,
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError)
      return NextResponse.json({ error: e.flatten() }, { status: 422 });
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
