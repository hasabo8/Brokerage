export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callsRepo } from "@/lib/calls/repository";
import { summarizeCall } from "@/lib/calls/summarize";

// GET /api/v1/calls  — list recent calls
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const data = await callsRepo.list(supabase);
  return NextResponse.json({ data });
}

// POST /api/v1/calls  — summarize + store a transcript
// Body: { transcript: string, lead_id?: string, title?: string }
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as {
      transcript?: string;
      lead_id?: string;
      title?: string;
    };
    const transcript = body.transcript?.trim();
    if (!transcript)
      return NextResponse.json(
        { error: "transcript is required" },
        { status: 422 },
      );

    const summary = await summarizeCall(transcript);
    const call = await callsRepo.create(supabase, {
      transcript,
      summary,
      lead_id: body.lead_id ?? null,
      title: body.title ?? null,
      source: "manual",
    });
    return NextResponse.json({ data: call });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
