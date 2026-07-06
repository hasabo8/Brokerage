import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { embedder } from "@/lib/ai/embeddings";
import type { SearchInput } from "./schema";

type DB = SupabaseClient<Database>;

/**
 * Lightweight natural-language filter extraction. Pulls obvious hard
 * constraints out of the query so vector search + SQL filters work together.
 * In Milestone 4 this is replaced/augmented by an LLM tool-call planner.
 */
export function extractFilters(q: string): Partial<SearchInput> {
  const filters: Partial<SearchInput> = {};
  const lower = q.toLowerCase();

  // "under 3m" / "below 3,000,000" / "أقل من 3 مليون"
  const underMatch = lower.match(
    /(?:under|below|less than|أقل من|تحت)\s*([\d.,]+)\s*(m|million|مليون|k|ألف)?/,
  );
  if (underMatch) {
    filters.max_price = normalizeAmount(underMatch[1], underMatch[2]);
  }

  // bedrooms: "2-bedroom", "3 bed", "غرفتين", "3 غرف"
  const bedMatch = lower.match(/(\d+)\s*(?:-)?\s*(?:bed|bedroom|br|غرف)/);
  if (bedMatch) filters.bedrooms = parseInt(bedMatch[1], 10);

  return filters;
}

function normalizeAmount(num: string, unit?: string): number {
  const base = parseFloat(num.replace(/,/g, ""));
  if (!unit) return base;
  const u = unit.toLowerCase();
  if (u.startsWith("m") || u.includes("مليون")) return base * 1_000_000;
  if (u.startsWith("k") || u.includes("ألف")) return base * 1_000;
  return base;
}

/**
 * Hybrid search: embed the query for semantic ranking, merge with any hard
 * filters (explicit params override extracted ones), then call the DB RPC.
 */
export async function searchProperties(supabase: DB, params: SearchInput) {
  let embedding: number[] | null = null;
  const extracted = params.q ? extractFilters(params.q) : {};

  if (params.q) {
    try {
      embedding = await embedder.embed(params.q);
    } catch {
      embedding = null; // degrade gracefully to keyword-only search
    }
  }

  const { data, error } = await supabase.rpc("search_properties", {
    p_query_embedding: embedding,
    p_keywords: params.q ?? null,
    p_min_price: params.min_price ?? null,
    p_max_price: params.max_price ?? extracted.max_price ?? null,
    p_bedrooms: params.bedrooms ?? extracted.bedrooms ?? null,
    p_type: params.type ?? null,
    p_city: params.city ?? null,
    p_match_count: params.limit,
  });

  if (error) throw error;
  return data ?? [];
}
