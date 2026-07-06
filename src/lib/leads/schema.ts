import { z } from "zod";

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "viewing",
  "negotiating",
  "won",
  "lost",
] as const;

export const LEAD_SOURCES = [
  "whatsapp",
  "referral",
  "facebook",
  "walk_in",
  "website",
  "other",
] as const;

export const QUALIFICATIONS = ["hot", "warm", "cold", "unqualified"] as const;

export const leadInput = z.object({
  name: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().email().optional().or(z.literal("")),
  source: z.enum(LEAD_SOURCES).optional(),
  status: z.enum(LEAD_STATUSES).default("new"),
  budget_min: z.coerce.number().nonnegative().optional(),
  budget_max: z.coerce.number().nonnegative().optional(),
  preferred_city: z.string().trim().optional(),
  preferred_type: z.string().trim().optional(),
  bedrooms_min: z.coerce.number().int().nonnegative().optional(),
  notes: z.string().trim().optional(),
});

export type LeadInput = z.infer<typeof leadInput>;

export const interactionInput = z.object({
  channel: z.enum(["note", "whatsapp", "call", "email"]).default("note"),
  direction: z.enum(["inbound", "outbound", "internal"]).default("internal"),
  content: z.string().trim().min(1),
});

export type InteractionInput = z.infer<typeof interactionInput>;
