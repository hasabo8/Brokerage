import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type { PropertyInput } from "./schema";

type DB = SupabaseClient<Database>;
type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];

/**
 * Data-access layer for properties. Keeps Supabase calls in one place so the
 * API routes stay thin and the storage engine remains replaceable.
 */
export const propertiesRepo = {
  async list(supabase: DB, limit = 50): Promise<PropertyRow[]> {
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  async get(supabase: DB, id: string): Promise<PropertyRow | null> {
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(supabase: DB, input: PropertyInput): Promise<PropertyRow> {
    const { data, error } = await supabase
      .from("properties")
      .insert({
        ref_code: input.ref_code ?? null,
        title: input.title,
        description: input.description ?? {},
        type: input.type ?? null,
        status: input.status,
        price: input.price ?? null,
        currency: input.currency,
        area_sqm: input.area_sqm ?? null,
        bedrooms: input.bedrooms ?? null,
        bathrooms: input.bathrooms ?? null,
        amenities: input.amenities,
        city: input.city ?? null,
        district: input.district ?? null,
        address: input.address ?? {},
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async update(
    supabase: DB,
    id: string,
    input: Partial<PropertyInput>,
  ): Promise<PropertyRow> {
    const { data, error } = await supabase
      .from("properties")
      .update(input as Record<string, unknown>)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  /** Soft-delete: keep history, drop from availability. */
  async remove(supabase: DB, id: string): Promise<void> {
    const { error } = await supabase
      .from("properties")
      .update({ status: "off_market" })
      .eq("id", id);
    if (error) throw error;
  },
};
