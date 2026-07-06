import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

type DB = SupabaseClient<Database>;

type LeadLike = {
  id: string;
  name?: string | null;
  qualification?: string | null;
};

// Cadence (in days) by qualification — hotter leads get chased sooner.
const CADENCE_DAYS: Record<string, number> = {
  hot: 1,
  warm: 3,
  cold: 7,
  unqualified: 5,
};

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

function defaultMessage(lead: LeadLike): string {
  const name = lead.name ? ` ${lead.name}` : "";
  // Bilingual template; the broker can edit before sending.
  return (
    `Hi${name}, following up on your property search — are you still ` +
    `interested? I have a few options that might fit. / مرحباً${name}، ` +
    `بتابع معاك بخصوص بحثك عن عقار — لسة مهتم؟ عندي كذا خيار ممكن يناسبك.`
  );
}

/**
 * Schedule the next follow-up for a lead.
 * - reschedule=false (default): only create one if none is pending (used on
 *   lead creation).
 * - reschedule=true: cancel pending AUTO follow-ups and create a fresh one
 *   using the new qualification cadence (used after AI qualification).
 */
export async function scheduleFollowUpsForLead(
  supabase: DB,
  lead: LeadLike,
  opts: { reschedule?: boolean } = {},
): Promise<void> {
  try {
    if (opts.reschedule) {
      await supabase
        .from("follow_ups")
        .update({ status: "cancelled" })
        .eq("lead_id", lead.id)
        .eq("status", "pending")
        .eq("auto", true);
    } else {
      const { data: existing } = await supabase
        .from("follow_ups")
        .select("id")
        .eq("lead_id", lead.id)
        .eq("status", "pending")
        .limit(1);
      if (existing && existing.length > 0) return;
    }

    const days = CADENCE_DAYS[lead.qualification ?? ""] ?? 3;
    await supabase.from("follow_ups").insert({
      lead_id: lead.id,
      due_at: daysFromNow(days),
      channel: "whatsapp",
      reason: `Auto follow-up (${lead.qualification ?? "new"})`,
      message: defaultMessage(lead),
      auto: true,
    });
  } catch (e) {
    // Never let scheduling break the primary action.
    console.error("scheduleFollowUpsForLead failed", e);
  }
}
