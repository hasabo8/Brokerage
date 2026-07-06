import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

type DB = SupabaseClient<Database>;

export const followUpsRepo = {
  /** Pending + recently handled, newest due first. */
  async list(supabase: DB, limit = 200) {
    const { data, error } = await supabase
      .from("follow_ups")
      .select("*, lead:leads(id,name,phone,qualification)")
      .order("due_at", { ascending: true })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  async setStatus(supabase: DB, id: string, status: string) {
    const { error } = await supabase
      .from("follow_ups")
      .update({ status })
      .eq("id", id);
    if (error) throw error;
  },

  async addManual(
    supabase: DB,
    input: {
      lead_id: string;
      due_at: string;
      message?: string;
      channel?: string;
    },
  ) {
    const { data, error } = await supabase
      .from("follow_ups")
      .insert({
        lead_id: input.lead_id,
        due_at: input.due_at,
        message: input.message ?? null,
        channel: input.channel ?? "manual",
        reason: "Manual follow-up",
        auto: false,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },
};
