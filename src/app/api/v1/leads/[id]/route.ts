export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import { leadsRepo } from "@/lib/leads/repository";
import { leadInput } from "@/lib/leads/schema";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await requireUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const data = await leadsRepo.get(supabase, id);
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await requireUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const body = leadInput.partial().parse(await request.json());
    const data = await leadsRepo.update(supabase, id, body);
    return NextResponse.json({ data });
  } catch (e) {
    if (e instanceof ZodError)
      return NextResponse.json({ error: e.flatten() }, { status: 422 });
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
