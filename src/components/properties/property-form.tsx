"use client";

import { useState } from "react";
import { PROPERTY_TYPES } from "@/lib/properties/schema";

type Tab = "en" | "ar";

export function PropertyForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>("en");

  const field =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-900 focus:outline-none";
  const label = "block text-sm font-medium text-slate-700";

  return (
    <form action={action} className="space-y-5">
      {/* Bilingual tabs */}
      <div className="flex gap-2">
        {(["en", "ar"] as Tab[]).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setTab(l)}
            className={`rounded-lg px-3 py-1 text-sm ${
              tab === l ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {l === "en" ? "English" : "العربية"}
          </button>
        ))}
      </div>

      <div className={tab === "en" ? "" : "hidden"}>
        <label className={label}>Title (EN)</label>
        <input name="title_en" className={field} />
        <label className={`${label} mt-3`}>Description (EN)</label>
        <textarea name="description_en" rows={3} className={field} />
      </div>

      <div dir="rtl" className={tab === "ar" ? "" : "hidden"}>
        <label className={label}>العنوان (عربي)</label>
        <input name="title_ar" className={field} />
        <label className={`${label} mt-3`}>الوصف (عربي)</label>
        <textarea name="description_ar" rows={3} className={field} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Type</label>
          <select name="type" className={field} defaultValue="apartment">
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Reference code</label>
          <input name="ref_code" className={field} />
        </div>
        <div>
          <label className={label}>Price (EGP)</label>
          <input name="price" type="number" className={field} />
        </div>
        <div>
          <label className={label}>Area (sqm)</label>
          <input name="area_sqm" type="number" className={field} />
        </div>
        <div>
          <label className={label}>Bedrooms</label>
          <input name="bedrooms" type="number" className={field} />
        </div>
        <div>
          <label className={label}>Bathrooms</label>
          <input name="bathrooms" type="number" className={field} />
        </div>
        <div>
          <label className={label}>City</label>
          <input name="city" className={field} />
        </div>
        <div>
          <label className={label}>District</label>
          <input name="district" className={field} />
        </div>
      </div>

      <div>
        <label className={label}>Amenities (comma-separated)</label>
        <input
          name="amenities"
          placeholder="garden, pool, elevator"
          className={field}
        />
      </div>

      <button
        type="submit"
        className="rounded-lg bg-slate-900 px-5 py-2 font-medium text-white hover:bg-slate-800"
      >
        Save
      </button>
    </form>
  );
}
