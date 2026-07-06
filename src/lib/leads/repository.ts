import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type { InteractionInput, LeadInput } from "./schema";

type DB = SupabaseClient<Database>;

export const leadsRepo = {
  async list(supabase: DB, limit = 100) {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  async get(supabase: DB, id: string) {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(supabase: DB, input: LeadInput) {
    const { data, error } = await supabase
      .from("leads")
      .insert({
        name: input.name ?? null,
        phone: input.phone ?? null,
        email: input.email || null,
        source: input.source ?? null,
        status: input.status,
        budget_min: input.budget_min ?? null,
        budget_max: input.budget_max ?? null,
        preferred_city: input.preferred_city ?? null,
        preferred_type: input.preferred_type ?? null,
        bedrooms_min: input.bedrooms_min ?? null,
        notes: input.notes ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async update(supabase: DB, id: string, input: Partial<LeadInput>) {
    const { data, error } = await supabase
      .from("leads")
      .update(input as Record<string, unknown>)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async interactions(supabase: DB, leadId: string) {
    const { data, error } = await supabase
      .from("lead_interactions")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async addInteraction(supabase: DB, leadId: string, input: InteractionInput) {
    const { data, error } = await supabase
      .from("lead_interactions")
      .insert({
        lead_id: leadId,
        channel: input.channel,
        direction: input.direction,
        content: input.content,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },
};
