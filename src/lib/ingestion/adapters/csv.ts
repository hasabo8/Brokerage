// ===========================================================================
// CSV adapter — the SAFE, always-legal default source. Turns a spreadsheet
// export (from any portal, agency sheet, or your own data) into RawListings.
// Header matching is flexible & bilingual (English + Arabic aliases).
// ===========================================================================
import { parseCsv } from "@/lib/ingestion/csv";
import type { RawListing } from "@/lib/ingestion/types";

// Map many possible header spellings -> our canonical field.
const ALIASES: Record<string, keyof RawListing> = {
  external_id: "external_id",
  id: "external_id",
  listing_id: "external_id",
  url: "external_url",
  link: "external_url",
  external_url: "external_url",
  ref: "ref_code",
  ref_code: "ref_code",
  code: "ref_code",
  كود: "ref_code",
  title: "title_en",
  title_en: "title_en",
  name: "title_en",
  title_ar: "title_ar",
  العنوان: "title_ar",
  description: "description_en",
  description_en: "description_en",
  description_ar: "description_ar",
  الوصف: "description_ar",
  type: "type",
  النوع: "type",
  status: "status",
  الحالة: "status",
  price: "price",
  السعر: "price",
  currency: "currency",
  العملة: "currency",
  area: "area_sqm",
  area_sqm: "area_sqm",
  size: "area_sqm",
  المساحة: "area_sqm",
  bedrooms: "bedrooms",
  beds: "bedrooms",
  rooms: "bedrooms",
  غرف: "bedrooms",
  bathrooms: "bathrooms",
  baths: "bathrooms",
  حمامات: "bathrooms",
  amenities: "amenities",
  features: "amenities",
  مميزات: "amenities",
  city: "city",
  المدينة: "city",
  المحافظة: "city",
  district: "district",
  area_name: "district",
  neighborhood: "district",
  الحي: "district",
  المنطقة: "district",
};

const NUMERIC = new Set<keyof RawListing>([
  "price",
  "area_sqm",
  "bedrooms",
  "bathrooms",
]);

function toNumber(v: string): number | undefined {
  const n = Number(v.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && v.trim() !== "" ? n : undefined;
}

export function csvToListings(csv: string): RawListing[] {
  const rows = parseCsv(csv);
  return rows.map((row) => {
    const out: RawListing = {};
    for (const [rawKey, rawVal] of Object.entries(row)) {
      const key =
        ALIASES[rawKey.trim().toLowerCase()] ?? ALIASES[rawKey.trim()];
      if (!key || rawVal === "") continue;
      if (key === "amenities") {
        out.amenities = rawVal
          .split(/[;,|]/)
          .map((s) => s.trim())
          .filter(Boolean);
      } else if (NUMERIC.has(key)) {
        const n = toNumber(rawVal);
        if (n !== undefined) (out[key] as number) = n;
      } else {
        (out[key] as string) = rawVal;
      }
    }
    return out;
  });
}
