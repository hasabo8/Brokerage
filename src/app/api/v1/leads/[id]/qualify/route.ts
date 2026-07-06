export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { leadsRepo } from "@/lib/leads/repository";
import { qualifyLead } from "@/lib/leads/qualify";
import { scheduleFollowUpsForLead } from "@/lib/followups/rules";
import { logEvent } from "@/lib/events";

// POST /api/v1/leads/:id/qualify  — run AI qualification and persist the result.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const lead = await leadsRepo.get(supabase, id);
    if (!lead)
      return NextResponse.json({ error: "not found" }, { status: 404 });

    const result = await qualifyLead(lead);
    const { data, error } = await supabase
      .from("leads")
      .update({
        score: result.score,
        qualification: result.qualification,
        ai_summary: result.ai_summary,
        next_action: result.next_action,
        qualified_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;

    // Automation: (re)schedule the next follow-up using the new cadence.
    await scheduleFollowUpsForLead(supabase, data, { reschedule: true });

    await logEvent(supabase, {
      action: "qualified",
      entityType: "lead",
      entityId: id,
      actorType: "agent",
      payload: { score: result.score, qualification: result.qualification },
    });
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
