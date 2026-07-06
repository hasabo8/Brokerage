// ===========================================================================
// SCRAPER ADAPTER TEMPLATE  —  copy this file per portal (aqarmap, olx, ...).
//
// ⚠️ LEGAL / ETHICAL NOTICE
// Many portals forbid automated scraping in their Terms of Service. Before
// enabling any scraper:
//   1. Read the site's robots.txt and Terms.
//   2. Prefer an OFFICIAL API / partner feed when available.
//   3. Keep request rates low and cache results.
// This template is DISABLED by default (returns []) and is NOT registered as
// a "safe" source. You are responsible for how you use it.
//
// Implementation notes:
// - For real HTML parsing, add a parser dep (e.g. cheerio) and map DOM nodes
//   to RawListing. For JSON endpoints you can parse directly with fetch().
// - Always set `external_id` + `external_url` so re-imports de-duplicate.
// ===========================================================================
import type {
  FetchParams,
  RawListing,
  SourceAdapter,
} from "@/lib/ingestion/types";

async function fetchListings(params: FetchParams): Promise<RawListing[]> {
  const enabled = process.env.SCRAPER_PORTAL_TEMPLATE_ENABLED === "true";
  if (!enabled) return [];

  const limit = Math.min(params.limit ?? 20, 50);

  // Example skeleton for a JSON-style endpoint. Replace URL + mapping with the
  // real source you are authorized to use.
  //
  // const res = await fetch(buildUrl(params), {
  //   headers: { "User-Agent": "AI-Brokerage-OS/1.0 (contact@yourdomain)" },
  // });
  // if (!res.ok) return [];
  // const json = await res.json();
  // return (json.items ?? []).slice(0, limit).map((it: any): RawListing => ({
  //   external_id: String(it.id),
  //   external_url: it.url,
  //   title_ar: it.title,
  //   type: mapType(it.category),
  //   price: Number(it.price) || undefined,
  //   currency: "EGP",
  //   area_sqm: Number(it.area) || undefined,
  //   bedrooms: Number(it.rooms) || undefined,
  //   city: it.city,
  //   district: it.district,
  // }));

  void limit;
  return [];
}

export const portalTemplateAdapter: SourceAdapter = {
  name: "portal_template",
  label: "Portal scraper (template — configure before use)",
  safe: false,
  fetchListings,
};
