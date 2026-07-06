// ===========================================================================
// Ingestion contracts. Every data source (CSV upload, a portal scraper, an
// official API) produces the SAME normalized shape: RawListing. That keeps the
// importer, the de-duplication, and the DB schema decoupled from any one
// source (Constitution rule #2: replaceable components).
// ===========================================================================

export type RawListing = {
  /** Stable id from the source (listing id / URL slug). Enables re-sync. */
  external_id?: string;
  external_url?: string;
  ref_code?: string;

  title_en?: string;
  title_ar?: string;
  description_en?: string;
  description_ar?: string;

  type?: string; // apartment | villa | land | office | chalet
  status?: string; // available | reserved | sold | off_market
  price?: number;
  currency?: string;
  area_sqm?: number;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  city?: string;
  district?: string;
};

export type FetchParams = {
  /** Free-text query or area, passed through to the source when supported. */
  query?: string;
  city?: string;
  /** Safety cap so a scraper never runs away. */
  limit?: number;
};

/**
 * A pluggable data source. Add a file under adapters/, implement this, and
 * register it in registry.ts — nothing else in the app needs to change.
 */
export interface SourceAdapter {
  /** Unique, stored on each imported property as `source`. */
  name: string;
  /** Human label for the UI. */
  label: string;
  /** true = safe/legal (CSV, official API). false = scraper (use with care). */
  safe: boolean;
  fetchListings(params: FetchParams): Promise<RawListing[]>;
}
