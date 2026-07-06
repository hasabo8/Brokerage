import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { leadInput } from "@/lib/leads/schema";
import { leadsRepo } from "@/lib/leads/repository";
import { scheduleFollowUpsForLead } from "@/lib/followups/rules";
import { logEvent } from "@/lib/events";
import { LeadForm } from "@/components/leads/lead-form";

export default function NewLeadPage() {
  async function create(formData: FormData) {
    "use server";
    const supabase = await createClient();

    const parsed = leadInput.parse({
      name: formData.get("name") || undefined,
      phone: formData.get("phone") || undefined,
      email: formData.get("email") || undefined,
      source: formData.get("source") || undefined,
      status: formData.get("status") || "new",
      budget_min: formData.get("budget_min") || undefined,
      budget_max: formData.get("budget_max") || undefined,
      preferred_city: formData.get("preferred_city") || undefined,
      preferred_type: formData.get("preferred_type") || undefined,
      bedrooms_min: formData.get("bedrooms_min") || undefined,
      notes: formData.get("notes") || undefined,
    });

    const created = await leadsRepo.create(supabase, parsed);
    // Automation: schedule an initial follow-up for the new lead.
    await scheduleFollowUpsForLead(supabase, created);
    await logEvent(supabase, {
      action: "created",
      entityType: "lead",
      entityId: created.id,
    });
    redirect(`/leads/${created.id}`);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Add lead</h1>
      <p className="mt-1 text-sm text-slate-500">
        Capture what the client wants. Then run AI qualification to get a score
        and the best next action.
      </p>
      <div className="mt-6">
        <LeadForm action={create} />
      </div>
    </div>
  );
}
