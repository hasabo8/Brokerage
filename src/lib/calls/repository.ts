import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type { CallSummary } from "./summarize";

type DB = SupabaseClient<Database>;

export const callsRepo = {
  async list(supabase: DB, limit = 100) {
    const { data, error } = await supabase
      .from("calls")
      .select("*, lead:leads(id,name,phone)")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  async get(supabase: DB, id: string) {
    const { data, error } = await supabase
      .from("calls")
      .select("*, lead:leads(id,name,phone)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(
    supabase: DB,
    input: {
      lead_id?: string | null;
      title?: string | null;
      transcript: string;
      summary: CallSummary;
      source?: string;
      duration_seconds?: number | null;
    },
  ) {
    const { data, error } = await supabase
      .from("calls")
      .insert({
        lead_id: input.lead_id ?? null,
        title: input.title ?? null,
        transcript: input.transcript,
        summary: input.summary,
        sentiment: input.summary.sentiment ?? null,
        source: input.source ?? "manual",
        duration_seconds: input.duration_seconds ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },
};
