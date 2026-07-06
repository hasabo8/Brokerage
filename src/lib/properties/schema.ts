import { z } from "zod";

const localized = z
  .object({
    en: z.string().trim().optional(),
    ar: z.string().trim().optional(),
  })
  .refine((v) => Boolean(v.en || v.ar), {
    message: "Provide the title in at least one language (English or Arabic).",
  });

export const PROPERTY_TYPES = [
  "apartment",
  "villa",
  "land",
  "office",
  "chalet",
] as const;

export const PROPERTY_STATUSES = [
  "available",
  "reserved",
  "sold",
  "off_market",
] as const;

export const propertyInput = z.object({
  ref_code: z.string().trim().optional(),
  title: localized,
  description: z
    .object({ en: z.string().optional(), ar: z.string().optional() })
    .optional(),
  type: z.enum(PROPERTY_TYPES).optional(),
  status: z.enum(PROPERTY_STATUSES).default("available"),
  price: z.coerce.number().nonnegative().optional(),
  currency: z.string().default("EGP"),
  area_sqm: z.coerce.number().positive().optional(),
  bedrooms: z.coerce.number().int().nonnegative().optional(),
  bathrooms: z.coerce.number().int().nonnegative().optional(),
  amenities: z.array(z.string()).default([]),
  city: z.string().trim().optional(),
  district: z.string().trim().optional(),
  address: z
    .object({ en: z.string().optional(), ar: z.string().optional() })
    .optional(),
});

export type PropertyInput = z.infer<typeof propertyInput>;

/** Query params for the search endpoint. */
export const searchInput = z.object({
  q: z.string().trim().optional(),
  min_price: z.coerce.number().optional(),
  max_price: z.coerce.number().optional(),
  bedrooms: z.coerce.number().int().optional(),
  type: z.enum(PROPERTY_TYPES).optional(),
  city: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type SearchInput = z.infer<typeof searchInput>;
