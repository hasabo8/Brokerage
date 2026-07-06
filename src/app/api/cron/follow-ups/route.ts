export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsappText, whatsappConfigured } from "@/lib/whatsapp/client";

// GET /api/cron/follow-ups
// Runs on a schedule (see vercel.json). Finds due follow-ups and, when
// WhatsApp is configured, sends them; otherwise leaves them pending so they
// surface as "overdue" reminders in the UI.
//
// Auth: Vercel Cron automatically adds `Authorization: Bearer <CRON_SECRET>`
// when CRON_SECRET is set. We reject anything else.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: due, error } = await admin
    .from("follow_ups")
    .select("*, lead:leads(id,phone,name,tenant_id)")
    .eq("status", "pending")
    .lte("due_at", now)
    .limit(100);
  if (error)
    return NextResponse.json({ error: String(error) }, { status: 500 });

  let sent = 0;
  let skipped = 0;

  for (const f of due ?? []) {
    const lead = (f as { lead?: { phone?: string | null } }).lead;
    const phone = lead?.phone ?? null;
    const canSend =
      f.channel === "whatsapp" && phone && whatsappConfigured() && f.message;

    if (!canSend) {
      skipped++;
      continue; // stays pending -> shows as overdue reminder for manual action
    }

    try {
      await sendWhatsappText(phone, f.message as string);
      await admin
        .from("follow_ups")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", f.id);
      await admin.from("lead_interactions").insert({
        tenant_id: f.tenant_id,
        lead_id: f.lead_id,
        channel: "whatsapp",
        direction: "outbound",
        content: f.message as string,
      });
      sent++;
    } catch (e) {
      console.error("follow-up send failed", f.id, e);
      skipped++;
    }
  }

  return NextResponse.json({ processed: due?.length ?? 0, sent, skipped });
}
