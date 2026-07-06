// ===========================================================================
// The importer: normalize RawListings -> property rows, de-duplicate against
// what's already stored, then insert new / update existing. Works with the
// session client (RLS stamps tenant_id) or the admin client.
// ===========================================================================
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, LocalizedJson } from "@/lib/types/database";
import type { RawListing } from "@/lib/ingestion/types";
import { PROPERTY_STATUSES, PROPERTY_TYPES } from "@/lib/properties/schema";

type DB = SupabaseClient<Database>;

export type ImportResult = {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
};

const TYPES = new Set<string>(PROPERTY_TYPES);
const STATUSES = new Set<string>(PROPERTY_STATUSES);

function localized(en?: string, ar?: string): LocalizedJson {
  const out: LocalizedJson = {};
  if (en) out.en = en;
  if (ar) out.ar = ar;
  return out;
}

/** Map a RawListing to a properties row, dropping empties + invalid enums. */
function toRow(raw: RawListing, source: string) {
  const title = localized(raw.title_en, raw.title_ar);
  const description = localized(raw.description_en, raw.description_ar);
  const type = raw.type && TYPES.has(raw.type) ? raw.type : null;
  const status =
    raw.status && STATUSES.has(raw.status) ? raw.status : "available";

  return {
    source,
    external_id: raw.external_id ?? null,
    external_url: raw.external_url ?? null,
    ref_code: raw.ref_code ?? null,
    title,
    description,
    type,
    status,
    price: raw.price ?? null,
    currency: raw.currency ?? "EGP",
    area_sqm: raw.area_sqm ?? null,
    bedrooms: raw.bedrooms ?? null,
    bathrooms: raw.bathrooms ?? null,
    amenities: raw.amenities ?? [],
    city: raw.city ?? null,
    district: raw.district ?? null,
  };
}

function hasTitle(row: { title: LocalizedJson }): boolean {
  return Boolean(row.title.en || row.title.ar);
}

/**
 * Import a batch. De-dupes on (source, external_id) when present, otherwise on
 * ref_code. Records a row in import_batches for auditing.
 */
export async function importListings(
  supabase: DB,
  source: string,
  listings: RawListing[],
): Promise<ImportResult> {
  const result: ImportResult = {
    total: listings.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (let i = 0; i < listings.length; i++) {
    const row = toRow(listings[i], source);
    if (!hasTitle(row)) {
      // Fall back to a generated title so keyword search still works.
      const label = [row.type, row.district, row.city]
        .filter(Boolean)
        .join(" - ");
      if (label) {
        row.title = { en: label };
      } else {
        result.skipped++;
        result.errors.push(`Row ${i + 1}: no title and nothing to infer one.`);
        continue;
      }
    }

    try {
      // Find an existing match to update (idempotent re-imports).
      let existingId: string | null = null;
      if (row.external_id) {
        const { data } = await supabase
          .from("properties")
          .select("id")
          .eq("source", source)
          .eq("external_id", row.external_id)
          .maybeSingle();
        existingId = data?.id ?? null;
      } else if (row.ref_code) {
        const { data } = await supabase
          .from("properties")
          .select("id")
          .eq("ref_code", row.ref_code)
          .maybeSingle();
        existingId = data?.id ?? null;
      }

      if (existingId) {
        const { error } = await supabase
          .from("properties")
          .update(row)
          .eq("id", existingId);
        if (error) throw error;
        result.updated++;
      } else {
        const { error } = await supabase.from("properties").insert(row);
        if (error) throw error;
        result.inserted++;
      }
    } catch (e) {
      result.skipped++;
      result.errors.push(`Row ${i + 1}: ${String(e)}`);
    }
  }

  // Audit trail (best-effort).
  try {
    await supabase.from("import_batches").insert({
      source,
      total: result.total,
      inserted: result.inserted,
      updated: result.updated,
      skipped: result.skipped,
      errors: result.errors.slice(0, 50),
    });
  } catch {
    // ignore audit failures
  }

  return result;
}
