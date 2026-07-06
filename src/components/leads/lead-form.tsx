"use client";

import { LEAD_SOURCES, LEAD_STATUSES } from "@/lib/leads/schema";
import { PROPERTY_TYPES } from "@/lib/properties/schema";

export function LeadForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  const field =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-900 focus:outline-none";
  const label = "block text-sm font-medium text-slate-700";

  return (
    <form action={action} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Name</label>
          <input name="name" className={field} />
        </div>
        <div>
          <label className={label}>Phone</label>
          <input name="phone" className={field} />
        </div>
        <div>
          <label className={label}>Email</label>
          <input name="email" type="email" className={field} />
        </div>
        <div>
          <label className={label}>Source</label>
          <select name="source" className={field} defaultValue="whatsapp">
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Status</label>
          <select name="status" className={field} defaultValue="new">
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Preferred type</label>
          <select name="preferred_type" className={field} defaultValue="">
            <option value="">any</option>
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Budget min (EGP)</label>
          <input name="budget_min" type="number" className={field} />
        </div>
        <div>
          <label className={label}>Budget max (EGP)</label>
          <input name="budget_max" type="number" className={field} />
        </div>
        <div>
          <label className={label}>Preferred city</label>
          <input name="preferred_city" className={field} />
        </div>
        <div>
          <label className={label}>Min bedrooms</label>
          <input name="bedrooms_min" type="number" className={field} />
        </div>
      </div>

      <div>
        <label className={label}>Notes (what the client told you)</label>
        <textarea
          name="notes"
          rows={4}
          placeholder="e.g. Newly married couple, wants a 2-bed near Maadi metro, budget flexible, ready to buy this month."
          className={field}
        />
      </div>

      <button
        type="submit"
        className="rounded-lg bg-slate-900 px-5 py-2 font-medium text-white hover:bg-slate-800"
      >
        Save lead
      </button>
    </form>
  );
}
